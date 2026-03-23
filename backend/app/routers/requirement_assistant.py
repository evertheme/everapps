"""
Requirements Document Assistant API — Phase 1: Gap Analysis

Endpoints:
  POST /{project_id}/gap-analysis          Run gap analysis on an uploaded document
  GET  /{project_id}/gap-analysis/report   Retrieve the latest gap analysis report
  GET  /{project_id}/taxonomy              Return the canonical section taxonomy

Later phases will add session management and guided creation endpoints.
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
    SectionStatusOut,
    SectionTemplateOut,
)
from app.services.auth import CurrentUser
from app.services.gap_analysis_service import get_latest_gap_analysis, run_gap_analysis
from app.services.llm.factory import get_provider_for_user
from app.services.requirement_template_service import requirement_template_service

router = APIRouter(prefix="/req-assistant", tags=["requirement-assistant"])


def _assert_project_access(project_id: uuid.UUID, user_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


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
            gap_status = (
                "missing" if sec.completeness_score == 0
                else "thin" if sec.completeness_score < 60
                else "present"
            )
            section_outs.append(
                SectionStatusOut(
                    section_type=sec.section_type,
                    display_name=taxonomy[sec.section_type].display_name,
                    required_level=taxonomy[sec.section_type].required_level,
                    gap_status=gap_status,
                    completeness_score=sec.completeness_score,
                    ai_feedback=sec.ai_feedback,
                    content=sec.content,
                )
            )
        else:
            # Section not yet analysed — treat as missing
            section_outs.append(
                SectionStatusOut(
                    section_type=template.section_type,
                    display_name=template.display_name,
                    required_level=template.required_level,
                    gap_status="missing",
                    completeness_score=0,
                    ai_feedback=None,
                    content="",
                )
            )

    return GapAnalysisReportOut(
        session_id=session.id,
        document_id=session.document_id,
        overall_score=session.completeness_score,
        status=session.status,
        sections=section_outs,
        created_at=session.created_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

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

    Runs the LLM-based section mapping and completeness scoring, persists
    the results as a RequirementSession + RequirementSection records, and
    returns the full gap analysis report.
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

    Pass ?document_id=<uuid> to retrieve the report for a specific document,
    or omit it to get the most recent report across all project documents.
    """
    _assert_project_access(project_id, current_user.id, db)

    if document_id:
        doc = db.get(RequirementDocument, document_id)
        if not doc or doc.project_id != project_id:
            raise HTTPException(status_code=404, detail="Document not found")
        session = get_latest_gap_analysis(project_id, document_id, db)
    else:
        # Find the most recent gap_analysis session for any document in this project
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
