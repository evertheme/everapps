import uuid
from datetime import datetime
from pydantic import BaseModel


# ── Taxonomy ───────────────────────────────────────────────────────────────────

class SectionTemplateOut(BaseModel):
    section_type: str
    display_name: str
    standard_source: str
    required_level: str
    order: int
    content_standard: str
    prompt_questions: list[str]


# ── Gap Analysis ───────────────────────────────────────────────────────────────

class SectionStatusOut(BaseModel):
    section_type: str
    display_name: str
    required_level: str
    # gap_status: missing | thin | present
    gap_status: str
    completeness_score: int
    ai_feedback: str | None
    content: str

    model_config = {"from_attributes": True}


class GapAnalysisReportOut(BaseModel):
    session_id: uuid.UUID
    document_id: uuid.UUID
    overall_score: int
    status: str
    sections: list[SectionStatusOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class GapAnalysisRunRequest(BaseModel):
    document_id: uuid.UUID


# ── Session (shared base, used by Phase 2+ wizard) ───────────────────────────

class RequirementSessionOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    document_id: uuid.UUID | None
    mode: str
    status: str
    completeness_score: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
