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


# ── Gap Analysis — read (Phase 1 + 2) ─────────────────────────────────────────

class SectionStatusOut(BaseModel):
    section_type: str
    display_name: str
    required_level: str
    # gap_status: missing | thin | present
    gap_status: str
    completeness_score: int
    ai_feedback: str | None
    content: str
    # status: pending | in_progress | complete | skipped
    status: str

    model_config = {"from_attributes": True}


class GapAnalysisReportOut(BaseModel):
    session_id: uuid.UUID
    document_id: uuid.UUID
    overall_score: int
    status: str
    sections: list[SectionStatusOut]
    created_at: datetime
    # True when document_header and executive_summary are both approved
    can_save: bool

    model_config = {"from_attributes": True}


class GapAnalysisRunRequest(BaseModel):
    document_id: uuid.UUID


# ── Gap Analysis — write (Phase 2) ────────────────────────────────────────────

class SectionFillOut(BaseModel):
    """Returned after an AI draft is generated for a section."""
    section_type: str
    content: str
    ai_feedback: str | None


class SectionSaveRequest(BaseModel):
    """Auto-save edited content without marking the section complete."""
    content: str


class SectionApproveRequest(BaseModel):
    """Approve a section with the (possibly edited) content."""
    content: str


class SaveDocumentResponse(BaseModel):
    """Returned after approved sections are serialised into a new DocumentVersion."""
    document_id: str
    version_number: int
    message: str


# ── Wizard (Phase 3 — guided document creation) ──────────────────────────────

CURRENT_STATE_TYPES = {
    "new_product": "New Product (no current state)",
    "launch_mvp": "Launch MVP",
    "enhance_existing": "Enhance Existing Product",
    "replace_legacy": "Replace Legacy System",
    "other": "Other",
}


class WizardSuggestionsRequest(BaseModel):
    product_name: str
    description: str
    executive_summary: str


class WizardSuggestionsOut(BaseModel):
    business_problem: str
    business_objectives: list[str]
    current_state_notes: str
    desired_state_notes: str


class WizardFeature(BaseModel):
    """A single feature from the wizard with its priority classification."""
    description: str
    # must_have | nice_to_have | future
    priority: str = "must_have"


class WizardFeatureSuggestionsRequest(BaseModel):
    product_name: str
    description: str
    executive_summary: str
    business_problem: str
    business_objectives: list[str]


class WizardFeatureSuggestionsOut(BaseModel):
    features: list[WizardFeature]


class WizardGenerateRequest(BaseModel):
    product_name: str
    description: str
    executive_summary: str
    business_problem: str
    business_objectives: list[str]
    # new_product | launch_mvp | enhance_existing | replace_legacy | other
    current_state_type: str
    current_state_notes: str = ""
    desired_state_notes: str = ""
    # web | ios | android | desktop | api_service | other
    deploy_targets: list[str] = []
    features: list[WizardFeature] = []


class WizardGenerateOut(BaseModel):
    document_id: str
    message: str


class WizardPrefillOut(BaseModel):
    """Wizard fields extracted from an existing document for pre-population."""
    product_name: str
    description: str
    executive_summary: str
    business_problem: str
    business_objectives: list[str]
    current_state_type: str
    current_state_notes: str
    desired_state_notes: str
    deploy_targets: list[str]
    features: list[WizardFeature]


class WizardUpdateOut(BaseModel):
    """Returned after saving a new version of an existing document via the wizard."""
    document_id: str
    version_number: int
    message: str


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
