"""
Requirements Document Assistant API — Phase 1 & 2

Phase 1 endpoints:
  POST /{project_id}/gap-analysis          Run gap analysis on an uploaded document
  GET  /{project_id}/gap-analysis/report   Retrieve the latest gap analysis report
  GET  /{project_id}/taxonomy              Return the canonical section taxonomy

Phase 2 endpoints (interactive gap fill):
  POST /{project_id}/gap-analysis/section/{section_type}/fill     AI-draft a section
  PUT  /{project_id}/gap-analysis/section/{section_type}          Auto-save edits
  POST /{project_id}/gap-analysis/section/{section_type}/approve  Approve a section
  POST /{project_id}/gap-analysis/save-document                   Save as new version
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import RequirementDocument, DocumentVersion
from app.models.project import Project
from app.models.requirement_section import RequirementSection
from app.models.requirement_session import RequirementSession
from app.models.settings import LLMSettings
from app.schemas.requirement_assistant import (
    GapAnalysisReportOut,
    GapAnalysisRunRequest,
    SaveDocumentResponse,
    SectionApproveRequest,
    SectionFillOut,
    SectionSaveRequest,
    SectionStatusOut,
    SectionTemplateOut,
)
from app.services.auth import CurrentUser
from app.services.gap_analysis_service import (
    approve_section,
    draft_gap_fill,
    gap_status_from_score,
    get_latest_gap_analysis,
    run_gap_analysis,
    save_gap_fill_document,
)
from app.services.llm.factory import get_provider_for_user
from app.services.requirement_template_service import requirement_template_service

router = APIRouter(prefix="/req-assistant", tags=["requirement-assistant"])

# Approval threshold: these two sections must be complete before save-document is allowed.
_SAVE_REQUIRED = {"document_header", "executive_summary"}


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _assert_project_access(project_id: uuid.UUID, user_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _validate_section_type(section_type: str) -> None:
    try:
        requirement_template_service.get_section(section_type)
    except ValueError:
        raise HTTPException(
            status_code=422, detail=f"Unknown section type: {section_type!r}"
        )


def _get_active_gap_session(
    project_id: uuid.UUID,
    document_id: uuid.UUID | None,
    db: Session,
) -> RequirementSession | None:
    """Return the most recent non-abandoned gap_analysis session for the project."""
    query = (
        db.query(RequirementSession)
        .join(RequirementDocument, RequirementSession.document_id == RequirementDocument.id)
        .filter(
            RequirementDocument.project_id == project_id,
            RequirementSession.mode == "gap_analysis",
            RequirementSession.status != "abandoned",
        )
    )
    if document_id:
        query = query.filter(RequirementSession.document_id == document_id)
    return query.order_by(RequirementSession.created_at.desc()).first()


def _build_report(session: RequirementSession, db: Session) -> GapAnalysisReportOut:
    """Assemble a GapAnalysisReportOut from a session and its sections."""
    taxonomy = {t.section_type: t for t in requirement_template_service.get_taxonomy()}

    sections_db = (
        db.query(RequirementSection)
        .filter(RequirementSection.session_id == session.id)
        .all()
    )
    sections_by_type = {s.section_type: s for s in sections_db}

    section_outs: list[SectionStatusOut] = []
    for template in requirement_template_service.get_taxonomy():
        sec = sections_by_type.get(template.section_type)
        if sec:
            gap_status = gap_status_from_score(sec.completeness_score)
            section_outs.append(
                SectionStatusOut(
                    section_type=sec.section_type,
                    display_name=taxonomy[sec.section_type].display_name,
                    required_level=taxonomy[sec.section_type].required_level,
                    gap_status=gap_status,
                    completeness_score=sec.completeness_score,
                    ai_feedback=sec.ai_feedback,
                    content=sec.content,
                    status=sec.status,
                )
            )
        else:
            section_outs.append(
                SectionStatusOut(
                    section_type=template.section_type,
                    display_name=template.display_name,
                    required_level=template.required_level,
                    gap_status="missing",
                    completeness_score=0,
                    ai_feedback=None,
                    content="",
                    status="pending",
                )
            )

    statuses_by_type = {s.section_type: s.status for s in section_outs}
    can_save = all(
        statuses_by_type.get(st) == "complete" for st in _SAVE_REQUIRED
    )

    return GapAnalysisReportOut(
        session_id=session.id,
        document_id=session.document_id,
        overall_score=session.completeness_score,
        status=session.status,
        sections=section_outs,
        created_at=session.created_at,
        can_save=can_save,
    )


# ── Phase 1 endpoints ─────────────────────────────────────────────────────────

@router.get("/{project_id}/taxonomy", response_model=list[SectionTemplateOut])
def get_taxonomy(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """Return the canonical 12-section taxonomy with metadata."""
    _assert_project_access(project_id, current_user.id, db)
    return [
        SectionTemplateOut(
            section_type=t.section_type,
            display_name=t.display_name,
            standard_source=t.standard_source,
            required_level=t.required_level,
            order=t.order,
            content_standard=t.content_standard,
            prompt_questions=t.prompt_questions,
        )
        for t in requirement_template_service.get_taxonomy()
    ]


@router.post(
    "/{project_id}/gap-analysis",
    response_model=GapAnalysisReportOut,
    status_code=status.HTTP_201_CREATED,
)
async def run_gap_analysis_endpoint(
    project_id: uuid.UUID,
    payload: GapAnalysisRunRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Trigger gap analysis on an already-uploaded document.

    Runs LLM-based section mapping and completeness scoring, persists the results
    as RequirementSession + RequirementSection records, and returns the full report.
    """
    _assert_project_access(project_id, current_user.id, db)

    doc = db.get(RequirementDocument, payload.document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")

    latest_version = (
        db.query(DocumentVersion)
        .filter(
            DocumentVersion.document_id == doc.id,
            DocumentVersion.version_number == doc.current_version,
        )
        .first()
    )
    if not latest_version or not latest_version.content:
        raise HTTPException(status_code=422, detail="Document has no parsed content")

    llm_settings = (
        db.query(LLMSettings).filter(LLMSettings.user_id == current_user.id).first()
    )
    provider = get_provider_for_user(llm_settings)

    session = await run_gap_analysis(
        document_text=latest_version.content,
        document_version_id=latest_version.id,
        project_id=project_id,
        document_id=doc.id,
        provider=provider,
        db=db,
    )

    return _build_report(session, db)


@router.get("/{project_id}/gap-analysis/report", response_model=GapAnalysisReportOut)
def get_gap_analysis_report(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    document_id: uuid.UUID | None = None,
):
    """
    Retrieve the latest gap analysis report for a project.

    Pass ?document_id=<uuid> to scope the report to a specific document.
    """
    _assert_project_access(project_id, current_user.id, db)

    if document_id:
        doc = db.get(RequirementDocument, document_id)
        if not doc or doc.project_id != project_id:
            raise HTTPException(status_code=404, detail="Document not found")
        session = get_latest_gap_analysis(project_id, document_id, db)
    else:
        session = (
            db.query(RequirementSession)
            .join(RequirementDocument, RequirementSession.document_id == RequirementDocument.id)
            .filter(
                RequirementDocument.project_id == project_id,
                RequirementSession.mode == "gap_analysis",
                RequirementSession.status != "abandoned",
            )
            .order_by(RequirementSession.created_at.desc())
            .first()
        )

    if not session:
        raise HTTPException(status_code=404, detail="No gap analysis report found")

    return _build_report(session, db)


# ── Phase 2 endpoints ─────────────────────────────────────────────────────────

@router.post(
    "/{project_id}/gap-analysis/section/{section_type}/fill",
    response_model=SectionFillOut,
)
async def fill_gap_section(
    project_id: uuid.UUID,
    section_type: str,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    document_id: uuid.UUID | None = None,
):
    """
    Request an AI-drafted content for a missing or thin section.

    Uses all other sections in the session as context so the draft is grounded
    in the same project domain.  Returns the drafted content for the customer
    to review before approving.
    """
    _assert_project_access(project_id, current_user.id, db)
    _validate_section_type(section_type)

    session = _get_active_gap_session(project_id, document_id, db)
    if not session:
        raise HTTPException(
            status_code=404, detail="No active gap analysis session found"
        )

    llm_settings = (
        db.query(LLMSettings).filter(LLMSettings.user_id == current_user.id).first()
    )
    provider = get_provider_for_user(llm_settings)

    section = await draft_gap_fill(
        session_id=session.id,
        section_type=section_type,
        provider=provider,
        db=db,
    )

    return SectionFillOut(
        section_type=section.section_type,
        content=section.content,
        ai_feedback=section.ai_feedback,
    )


@router.put(
    "/{project_id}/gap-analysis/section/{section_type}",
    response_model=SectionStatusOut,
)
def save_gap_section(
    project_id: uuid.UUID,
    section_type: str,
    payload: SectionSaveRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    document_id: uuid.UUID | None = None,
):
    """
    Auto-save edited content for a section without marking it complete.

    Intended for debounced saves while the customer is editing — does not
    change the section status or trigger a score recomputation.
    """
    _assert_project_access(project_id, current_user.id, db)
    _validate_section_type(section_type)

    session = _get_active_gap_session(project_id, document_id, db)
    if not session:
        raise HTTPException(
            status_code=404, detail="No active gap analysis session found"
        )

    section = (
        db.query(RequirementSection)
        .filter(
            RequirementSection.session_id == session.id,
            RequirementSection.section_type == section_type,
        )
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    section.content = payload.content
    db.commit()
    db.refresh(section)

    tmpl = requirement_template_service.get_section(section_type)
    return SectionStatusOut(
        section_type=section.section_type,
        display_name=tmpl.display_name,
        required_level=tmpl.required_level,
        gap_status=gap_status_from_score(section.completeness_score),
        completeness_score=section.completeness_score,
        ai_feedback=section.ai_feedback,
        content=section.content,
        status=section.status,
    )


@router.post(
    "/{project_id}/gap-analysis/section/{section_type}/approve",
    response_model=SectionStatusOut,
)
def approve_gap_section(
    project_id: uuid.UUID,
    section_type: str,
    payload: SectionApproveRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    document_id: uuid.UUID | None = None,
):
    """
    Approve a section's content, marking it complete.

    Saves the customer-edited content, sets status='complete', records
    approved_at, and recomputes the session's overall completeness score.
    """
    _assert_project_access(project_id, current_user.id, db)
    _validate_section_type(section_type)

    session = _get_active_gap_session(project_id, document_id, db)
    if not session:
        raise HTTPException(
            status_code=404, detail="No active gap analysis session found"
        )

    try:
        section = approve_section(
            session_id=session.id,
            section_type=section_type,
            content=payload.content,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    tmpl = requirement_template_service.get_section(section_type)
    return SectionStatusOut(
        section_type=section.section_type,
        display_name=tmpl.display_name,
        required_level=tmpl.required_level,
        gap_status="present",
        completeness_score=section.completeness_score,
        ai_feedback=section.ai_feedback,
        content=section.content,
        status=section.status,
    )


@router.post(
    "/{project_id}/gap-analysis/save-document",
    response_model=SaveDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_gap_document(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    document_id: uuid.UUID | None = None,
):
    """
    Serialise all approved sections into a new DocumentVersion (Markdown format).

    Requires document_header and executive_summary to be approved.
    The new version appears in the document list and can be used for story
    generation — which is triggered manually by the customer.
    """
    _assert_project_access(project_id, current_user.id, db)

    session = _get_active_gap_session(project_id, document_id, db)
    if not session:
        raise HTTPException(
            status_code=404, detail="No active gap analysis session found"
        )

    try:
        new_version = save_gap_fill_document(
            session_id=session.id,
            user_id=current_user.id,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return SaveDocumentResponse(
        document_id=str(new_version.document_id),
        version_number=new_version.version_number,
        message=f"Document saved as version {new_version.version_number}.",
    )
