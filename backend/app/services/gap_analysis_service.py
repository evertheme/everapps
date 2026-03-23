"""
Gap Analysis Service — Phase 1 & 2

Phase 1: Maps an uploaded document's parsed text to the 12 canonical requirement
sections, scores each section for completeness, and persists the results as a
RequirementSession + RequirementSection records.

Phase 2: Adds interactive gap fill — draft AI content for missing/thin sections,
approve customer-edited content, and serialise all approved sections into a new
DocumentVersion.

LLM strategy (Phase 1): single prompt with the full document text for documents
up to ~60k chars. Larger documents fall back to a chunked multi-pass approach
that aggregates section content before scoring.
"""
import json
import logging
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.document import DocumentVersion, RequirementDocument
from app.models.requirement_section import RequirementSection
from app.models.requirement_session import RequirementSession
from app.services.llm.base import BaseLLMProvider
from app.services.requirement_template_service import requirement_template_service

logger = logging.getLogger(__name__)

# Documents larger than this threshold use a two-pass approach:
# pass 1 — extract section content per chunk; pass 2 — score aggregated content.
_SINGLE_PASS_CHAR_LIMIT = 60_000

# Characters per chunk for large-document multi-pass
_CHUNK_SIZE = 15_000
_CHUNK_OVERLAP = 500

_SECTION_TYPES = [s.section_type for s in requirement_template_service.get_taxonomy()]

_SYSTEM_PROMPT = """You are an expert requirements analyst. Analyse the provided requirements document and map its content to the 12 canonical sections of an industry-standard requirements document.

The 12 canonical sections are:
1. document_header — Document title, version, date, authors, approval status
2. executive_summary — Problem statement, target users, intended outcome (1-3 paragraphs)
3. project_context — Business problem, objectives, current vs future state, organisational alignment
4. scope — In-scope features/boundaries, out-of-scope exclusions, integration touchpoints
5. stakeholders — Stakeholder roles, user personas, goals, pain points
6. functional_requirements — Feature requirements with IDs (FR-NNN), "shall" statements, priorities, acceptance criteria
7. non_functional_requirements — Performance, security, scalability, reliability, usability, maintainability
8. data_requirements — Data entities, retention policies, integrations, migration requirements
9. constraints — Fixed constraints (budget/tech/regulatory) and assumptions
10. success_metrics — Definition of Done, KPIs, UAT criteria
11. timeline — Milestones, prioritisation, release phasing
12. glossary — Terms, acronyms, abbreviations

For each section:
- Extract and summarise relevant content from the document (keep it concise but complete)
- Score it 0–100:
  * 0 = no content found (missing)
  * 1–39 = very thin — exists but missing key elements
  * 40–69 = partial — some required elements present but significant gaps
  * 70–89 = good — mostly complete, minor gaps
  * 90–100 = complete — meets all content standards
- Set gap_status: "missing" (score=0), "thin" (score 1-59), "present" (score 60+)
- Provide specific, actionable feedback describing what is missing or incomplete

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "sections": {
    "document_header": {"content": "...", "score": 85, "gap_status": "present", "feedback": "..."},
    "executive_summary": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."},
    "project_context": {"content": "...", "score": 55, "gap_status": "thin", "feedback": "..."},
    "scope": {"content": "...", "score": 70, "gap_status": "present", "feedback": "..."},
    "stakeholders": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."},
    "functional_requirements": {"content": "...", "score": 75, "gap_status": "present", "feedback": "..."},
    "non_functional_requirements": {"content": "...", "score": 30, "gap_status": "thin", "feedback": "Missing security"},
    "data_requirements": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."},
    "constraints": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."},
    "success_metrics": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."},
    "timeline": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."},
    "glossary": {"content": "...", "score": 0, "gap_status": "missing", "feedback": "..."}
  }
}"""

_USER_PROMPT_TEMPLATE = """Analyse this requirements document and produce the gap analysis JSON:

----
{document_content}
----"""

_EXTRACTION_SYSTEM_PROMPT = """You are an expert requirements analyst. Extract content from this chunk of a requirements document and map it to the relevant canonical requirement sections.

Only extract content that is clearly present in this chunk. For sections with no relevant content, return an empty string "".

Return ONLY valid JSON:
{
  "document_header": "extracted content or empty string",
  "executive_summary": "extracted content or empty string",
  "project_context": "extracted content or empty string",
  "scope": "extracted content or empty string",
  "stakeholders": "extracted content or empty string",
  "functional_requirements": "extracted content or empty string",
  "non_functional_requirements": "extracted content or empty string",
  "data_requirements": "extracted content or empty string",
  "constraints": "extracted content or empty string",
  "success_metrics": "extracted content or empty string",
  "timeline": "extracted content or empty string",
  "glossary": "extracted content or empty string"
}"""

_SCORING_SYSTEM_PROMPT = """You are an expert requirements analyst. Score the extracted content for each of the 12 canonical requirement sections.

For each section score 0–100:
  * 0 = no content found (missing)
  * 1–39 = very thin
  * 40–69 = partial
  * 70–89 = good
  * 90–100 = complete

Set gap_status: "missing" (score=0), "thin" (score 1-59), "present" (score 60+)

Return ONLY valid JSON:
{
  "sections": {
    "document_header": {"score": 85, "gap_status": "present", "feedback": "specific gaps or confirmation"},
    ... (all 12 sections)
  }
}"""

_GAP_FILL_SYSTEM_PROMPT = """You are an expert requirements analyst. Your task is to draft a single section of a requirements document.

You will be given:
1. A content standard describing what the section must contain
2. Context from other sections already present in the document

Use the context to make your draft contextually grounded (consistent names, same project, same domain). Follow the content standard precisely.

Output ONLY the section content in plain markdown — no JSON, no section heading, no preamble, no postamble."""


# ── Private helpers ───────────────────────────────────────────────────────────

def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks, preferring section boundary splits."""
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            boundary = text.rfind("[§", start + chunk_size // 2, end)
            if boundary == -1:
                boundary = text.rfind("\n\n", start + chunk_size // 2, end)
            if boundary != -1:
                end = boundary
        chunks.append(text[start:end])
        start = end - overlap if end - overlap > start else end
    return chunks


def _parse_json_response(raw: str) -> dict:
    """Strip markdown fences and parse JSON from LLM response."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"LLM did not return valid JSON. Response: {cleaned[:500]}")
        return json.loads(match.group())


def gap_status_from_score(score: int) -> str:
    """Derive gap status label from a numeric completeness score."""
    if score == 0:
        return "missing"
    if score < 60:
        return "thin"
    return "present"


# ── Phase 1: gap analysis ─────────────────────────────────────────────────────

async def _single_pass_analysis(document_text: str, provider: BaseLLMProvider) -> dict:
    """Single LLM call — used when document fits within the context budget."""
    user_prompt = _USER_PROMPT_TEMPLATE.format(document_content=document_text)
    raw = await provider.complete(_SYSTEM_PROMPT, user_prompt)
    return _parse_json_response(raw)


async def _multi_pass_analysis(document_text: str, provider: BaseLLMProvider) -> dict:
    """
    Two-pass approach for large documents:
    1. Extract section content from each chunk independently.
    2. Score the aggregated extracted content.
    """
    chunks = _chunk_text(document_text, _CHUNK_SIZE, _CHUNK_OVERLAP)
    logger.info("Gap analysis: document chunked into %d parts (multi-pass)", len(chunks))

    aggregated: dict[str, list[str]] = {st: [] for st in _SECTION_TYPES}

    for i, chunk in enumerate(chunks):
        logger.debug("Gap analysis: extracting chunk %d/%d", i + 1, len(chunks))
        try:
            raw = await provider.complete(
                _EXTRACTION_SYSTEM_PROMPT,
                f"Extract section content from this document chunk:\n\n----\n{chunk}\n----",
            )
            extracted = _parse_json_response(raw)
            for section_type in _SECTION_TYPES:
                content = extracted.get(section_type, "")
                if content and content.strip():
                    aggregated[section_type].append(content.strip())
        except Exception as exc:
            logger.warning("Gap analysis: chunk %d extraction failed: %s", i + 1, exc)

    combined: dict[str, str] = {
        st: "\n\n".join(parts) for st, parts in aggregated.items()
    }

    scoring_input = json.dumps(combined, ensure_ascii=False)
    raw = await provider.complete(
        _SCORING_SYSTEM_PROMPT,
        f"Score this aggregated section content:\n\n{scoring_input}",
    )
    scores_data = _parse_json_response(raw)

    result_sections: dict[str, dict] = {}
    for section_type in _SECTION_TYPES:
        section_score_data = scores_data.get("sections", {}).get(section_type, {})
        score = max(0, min(100, int(section_score_data.get("score", 0))))
        result_sections[section_type] = {
            "content": combined.get(section_type, ""),
            "score": score,
            "gap_status": section_score_data.get("gap_status", gap_status_from_score(score)),
            "feedback": section_score_data.get("feedback", ""),
        }

    return {"sections": result_sections}


async def run_gap_analysis(
    document_text: str,
    document_version_id: uuid.UUID,
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    provider: BaseLLMProvider,
    db: Session,
) -> RequirementSession:
    """
    Run full gap analysis on a document version.

    Creates a RequirementSession (mode=gap_analysis) and one RequirementSection
    per canonical section. Returns the session with sections loaded.

    If a gap_analysis session already exists for this document, it is replaced
    (the old session is abandoned and a new one created).
    """
    existing = (
        db.query(RequirementSession)
        .filter(
            RequirementSession.project_id == project_id,
            RequirementSession.document_id == document_id,
            RequirementSession.mode == "gap_analysis",
            RequirementSession.status != "abandoned",
        )
        .all()
    )
    for old in existing:
        old.status = "abandoned"
    db.flush()

    session = RequirementSession(
        project_id=project_id,
        document_id=document_id,
        mode="gap_analysis",
        status="in_progress",
    )
    db.add(session)
    db.flush()

    if len(document_text) <= _SINGLE_PASS_CHAR_LIMIT:
        analysis = await _single_pass_analysis(document_text, provider)
    else:
        analysis = await _multi_pass_analysis(document_text, provider)

    sections_data = analysis.get("sections", {})

    section_scores: dict[str, int] = {}
    for template in requirement_template_service.get_taxonomy():
        st = template.section_type
        data = sections_data.get(st, {})
        score = max(0, min(100, int(data.get("score", 0))))
        gap_status = data.get("gap_status") or gap_status_from_score(score)
        content = data.get("content", "")
        feedback = data.get("feedback", "")
        status = "complete" if gap_status == "present" else "pending"

        section = RequirementSection(
            session_id=session.id,
            document_version_id=document_version_id,
            section_type=st,
            content=content,
            source="imported",
            status=status,
            completeness_score=score,
            ai_feedback=feedback or None,
            is_ai_generated=False,
        )
        db.add(section)
        section_scores[st] = score

    session.completeness_score = requirement_template_service.compute_overall_score(section_scores)
    session.status = "complete"

    db.commit()
    db.refresh(session)
    return session


def get_latest_gap_analysis(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Session,
) -> RequirementSession | None:
    """Return the most recent non-abandoned gap_analysis session for a document."""
    return (
        db.query(RequirementSession)
        .filter(
            RequirementSession.project_id == project_id,
            RequirementSession.document_id == document_id,
            RequirementSession.mode == "gap_analysis",
            RequirementSession.status != "abandoned",
        )
        .order_by(RequirementSession.created_at.desc())
        .first()
    )


# ── Phase 2: interactive gap fill ────────────────────────────────────────────

async def draft_gap_fill(
    session_id: uuid.UUID,
    section_type: str,
    provider: BaseLLMProvider,
    db: Session,
) -> RequirementSection:
    """
    Draft AI content for a missing or thin section.

    Uses all other sections in the session as context so the draft is
    grounded in the same project domain.  Updates (or creates) the
    RequirementSection record with source='ai_gap_fill' and status='in_progress'.
    """
    session = db.get(RequirementSession, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    template = requirement_template_service.get_section(section_type)

    existing_sections = (
        db.query(RequirementSection)
        .filter(RequirementSection.session_id == session_id)
        .all()
    )
    sections_by_type = {s.section_type: s for s in existing_sections}

    # Build context from all other sections that have content
    context_parts: list[str] = []
    for tmpl in requirement_template_service.get_taxonomy():
        if tmpl.section_type == section_type:
            continue
        sec = sections_by_type.get(tmpl.section_type)
        if sec and sec.content and sec.content.strip():
            context_parts.append(f"### {tmpl.display_name}\n{sec.content.strip()}")

    context = "\n\n".join(context_parts) if context_parts else "(No other sections have content yet.)"

    user_prompt = (
        f"Content standard for the '{template.display_name}' section:\n"
        f"{template.content_standard}\n\n"
        f"Existing document sections for context:\n\n{context}\n\n"
        f"Draft the complete '{template.display_name}' section now."
    )

    raw = await provider.complete(_GAP_FILL_SYSTEM_PROMPT, user_prompt)
    drafted_content = raw.strip()

    section = sections_by_type.get(section_type)
    if section:
        section.content = drafted_content
        section.source = "ai_gap_fill"
        section.status = "in_progress"
        section.is_ai_generated = True
        section.ai_feedback = None
    else:
        section = RequirementSection(
            session_id=session_id,
            section_type=section_type,
            content=drafted_content,
            source="ai_gap_fill",
            status="in_progress",
            completeness_score=0,
            is_ai_generated=True,
        )
        db.add(section)

    db.commit()
    db.refresh(section)
    return section


def approve_section(
    session_id: uuid.UUID,
    section_type: str,
    content: str,
    db: Session,
) -> RequirementSection:
    """
    Save customer-edited content, mark the section complete, and recompute the
    session's overall completeness score.

    Approved sections are given a score of 75 (human-confirmed AI draft = good)
    so the gap_status derives to 'present'.
    """
    section = (
        db.query(RequirementSection)
        .filter(
            RequirementSection.session_id == session_id,
            RequirementSection.section_type == section_type,
        )
        .first()
    )
    if not section:
        raise ValueError(
            f"Section '{section_type}' not found in session {session_id}"
        )

    section.content = content
    section.status = "complete"
    section.approved_at = datetime.now(timezone.utc)
    section.completeness_score = 75

    # Recompute session completeness after this approval
    all_sections = (
        db.query(RequirementSection)
        .filter(RequirementSection.session_id == session_id)
        .all()
    )
    section_scores = {s.section_type: s.completeness_score for s in all_sections}
    session = db.get(RequirementSession, session_id)
    session.completeness_score = requirement_template_service.compute_overall_score(
        section_scores
    )

    db.commit()
    db.refresh(section)
    return section


def save_gap_fill_document(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session,
) -> DocumentVersion:
    """
    Serialise all complete sections into a Markdown document and save it as a
    new DocumentVersion on the session's RequirementDocument.

    Raises ValueError when the minimum required sections (document_header and
    executive_summary) are not yet approved.
    """
    session = db.get(RequirementSession, session_id)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    sections = (
        db.query(RequirementSection)
        .filter(RequirementSection.session_id == session_id)
        .all()
    )
    sections_by_type = {s.section_type: s for s in sections}

    for required_type in ("document_header", "executive_summary"):
        sec = sections_by_type.get(required_type)
        if not sec or sec.status != "complete":
            raise ValueError(
                f"Section '{required_type}' must be approved before saving the document."
            )

    taxonomy = requirement_template_service.get_taxonomy()
    md_parts = ["# Requirements Document\n"]
    for i, tmpl in enumerate(taxonomy, 1):
        sec = sections_by_type.get(tmpl.section_type)
        if sec and sec.content and sec.content.strip():
            md_parts.append(f"## {i}. {tmpl.display_name}\n\n{sec.content.strip()}\n")

    markdown_content = "\n".join(md_parts)

    doc = db.get(RequirementDocument, session.document_id)
    if not doc:
        raise ValueError(f"Document {session.document_id} not found")

    new_version_number = doc.current_version + 1
    doc.current_version = new_version_number

    new_version = DocumentVersion(
        document_id=doc.id,
        created_by=user_id,
        version_number=new_version_number,
        content=markdown_content,
        file_path=None,
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    logger.info(
        "Saved gap-fill document: doc=%s version=%d", doc.id, new_version_number
    )
    return new_version
