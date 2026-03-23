"""
Canonical section taxonomy for the Requirements Document Assistant.

This is the single source of truth for section ordering, classification,
and content standards. It drives both the gap analysis scoring and (in
later phases) the guided creation wizard.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class SectionTemplate:
    section_type: str
    display_name: str
    standard_source: str
    # required | recommended | optional
    required_level: str
    order: int
    content_standard: str
    prompt_questions: list[str] = field(default_factory=list)

    @property
    def is_required(self) -> bool:
        return self.required_level == "required"

    @property
    def affects_score(self) -> bool:
        return self.required_level in ("required", "recommended")


# ── Canonical 12-section taxonomy ─────────────────────────────────────────────

_TAXONOMY: list[SectionTemplate] = [
    SectionTemplate(
        section_type="document_header",
        display_name="Document Header",
        standard_source="IEEE 29148 §5.1",
        required_level="required",
        order=1,
        content_standard=(
            "Must include: document title, version number, date, author(s), "
            "approval status (draft | in-review | approved), and a one-line project description."
        ),
        prompt_questions=[
            "What is the title of this project or system?",
            "Who is the primary author or owner of this document?",
            "What is the current document version and date?",
            "What is the approval status? (draft / in-review / approved)",
            "Provide a one-sentence description of the project.",
        ],
    ),
    SectionTemplate(
        section_type="executive_summary",
        display_name="Executive Summary",
        standard_source="BRD convention",
        required_level="required",
        order=2,
        content_standard=(
            "1–3 paragraph narrative covering: the problem being solved, "
            "who it is for, and the intended outcome. Should be intelligible "
            "to a non-technical stakeholder."
        ),
        prompt_questions=[
            "What problem does this project solve?",
            "Who are the primary users or beneficiaries?",
            "What is the intended outcome or value delivered?",
        ],
    ),
    SectionTemplate(
        section_type="project_context",
        display_name="Project Context & Business Objectives",
        standard_source="BRD / IEEE 29148 §5.2",
        required_level="required",
        order=3,
        content_standard=(
            "Must include: business problem statement, measurable business objectives "
            "(3–7 bullet points), current state vs. desired future state, "
            "and alignment to organisational goals."
        ),
        prompt_questions=[
            "What is the core business problem or opportunity being addressed?",
            "List 3–7 measurable business objectives this project must achieve.",
            "Describe the current state and what the desired future state looks like.",
            "How does this project align with broader organisational goals?",
        ],
    ),
    SectionTemplate(
        section_type="scope",
        display_name="Scope",
        standard_source="IEEE 29148 §5.2",
        required_level="required",
        order=4,
        content_standard=(
            "Must include: explicit in-scope features/user groups/system boundaries, "
            "explicit out-of-scope exclusions, and integration touchpoints."
        ),
        prompt_questions=[
            "What features, user groups, or system boundaries are explicitly in scope?",
            "What is explicitly out of scope for this project?",
            "What external systems or services does this product integrate with?",
        ],
    ),
    SectionTemplate(
        section_type="stakeholders",
        display_name="Stakeholders & User Personas",
        standard_source="BRD / PRD",
        required_level="required",
        order=5,
        content_standard=(
            "For each stakeholder or persona: name/role, goals and needs, "
            "pain points, and how they interact with the system."
        ),
        prompt_questions=[
            "Who are the primary stakeholders (internal and external)?",
            "Describe the key user personas — who will use this system day-to-day?",
            "What are their main goals, pain points, and how do they interact with the system?",
        ],
    ),
    SectionTemplate(
        section_type="functional_requirements",
        display_name="Functional Requirements",
        standard_source="IEEE 29148 §5.4",
        required_level="required",
        order=6,
        content_standard=(
            "Organised by domain or feature area. Each requirement must have: "
            "unique ID (FR-NNN), 'The system shall…' statement, MoSCoW priority, "
            "and acceptance criteria (Given/When/Then preferred)."
        ),
        prompt_questions=[
            "What are the main functional areas or feature domains?",
            "For each feature, describe what the system must do using 'The system shall…' language.",
            "What is the priority of each feature? (must-have / should-have / nice-to-have)",
            "What are the acceptance criteria for key features?",
        ],
    ),
    SectionTemplate(
        section_type="non_functional_requirements",
        display_name="Non-Functional Requirements",
        standard_source="IEEE 29148 §5.4",
        required_level="required",
        order=7,
        content_standard=(
            "Must cover minimum categories: Performance (response time, throughput), "
            "Security (auth, encryption, audit), Scalability, Reliability (SLA, RTO), "
            "Usability (WCAG 2.1 AA, browsers/devices), Maintainability."
        ),
        prompt_questions=[
            "What are the performance requirements? (response time, concurrent users)",
            "What security requirements apply? (authentication, encryption, compliance)",
            "What are the reliability and uptime requirements?",
            "What usability and accessibility standards must be met?",
        ],
    ),
    SectionTemplate(
        section_type="data_requirements",
        display_name="Data & Integration Requirements",
        standard_source="IEEE 29148 §5.4",
        required_level="recommended",
        order=8,
        content_standard=(
            "Should include: key data entities and relationships, data retention/deletion "
            "policies, external system integrations (name, protocol, data exchanged), "
            "and data migration requirements if applicable."
        ),
        prompt_questions=[
            "What are the key data entities and how do they relate?",
            "What are the data retention and deletion policies?",
            "What external systems does this integrate with and what data is exchanged?",
            "Are there data migration requirements from legacy systems?",
        ],
    ),
    SectionTemplate(
        section_type="constraints",
        display_name="Constraints & Assumptions",
        standard_source="IEEE 29148 §5.3",
        required_level="recommended",
        order=9,
        content_standard=(
            "Must distinguish: constraints (budget, technology stack, regulatory, timeline "
            "limitations that cannot change) vs. assumptions (conditions believed true). "
            "Include dependencies on external teams or decisions."
        ),
        prompt_questions=[
            "What constraints cannot be changed? (budget, technology, regulatory, timeline)",
            "What assumptions are being made that, if false, would change requirements?",
            "What external dependencies or decisions are you waiting on?",
        ],
    ),
    SectionTemplate(
        section_type="success_metrics",
        display_name="Success Metrics & Acceptance Criteria",
        standard_source="BRD / PRD",
        required_level="recommended",
        order=10,
        content_standard=(
            "Should include: Definition of Done for the project, measurable KPIs "
            "defining post-launch success, and UAT criteria."
        ),
        prompt_questions=[
            "What does 'done' look like for this project as a whole?",
            "What measurable KPIs will define success 30/60/90 days after launch?",
            "What are the user acceptance testing criteria?",
        ],
    ),
    SectionTemplate(
        section_type="timeline",
        display_name="Timeline & Prioritisation",
        standard_source="PRD convention",
        required_level="optional",
        order=11,
        content_standard=(
            "High-level milestones with target dates, MoSCoW prioritisation of feature areas, "
            "and release phasing (MVP vs. later releases)."
        ),
        prompt_questions=[
            "What are the key milestones and their target dates?",
            "How are feature areas prioritised? (MVP vs. later releases)",
        ],
    ),
    SectionTemplate(
        section_type="glossary",
        display_name="Glossary",
        standard_source="IEEE 29148 §5.1",
        required_level="recommended",
        order=12,
        content_standard=(
            "Domain-specific terms, acronyms, and abbreviations defined for all readers."
        ),
        prompt_questions=[
            "List any domain-specific terms, acronyms, or abbreviations that need defining.",
        ],
    ),
]

_TAXONOMY_BY_TYPE: dict[str, SectionTemplate] = {s.section_type: s for s in _TAXONOMY}


class RequirementTemplateService:
    """Single source of truth for the canonical 12-section taxonomy."""

    def get_taxonomy(self) -> list[SectionTemplate]:
        """All 12 sections in canonical order."""
        return list(_TAXONOMY)

    def get_section(self, section_type: str) -> SectionTemplate:
        """Metadata for one section by section_type ID."""
        section = _TAXONOMY_BY_TYPE.get(section_type)
        if section is None:
            raise ValueError(f"Unknown section_type: {section_type!r}")
        return section

    def get_required_sections(self) -> list[SectionTemplate]:
        """Only the sections marked required=True."""
        return [s for s in _TAXONOMY if s.is_required]

    def get_scoring_sections(self) -> list[SectionTemplate]:
        """Sections that contribute to the completeness score (required + recommended)."""
        return [s for s in _TAXONOMY if s.affects_score]

    def compute_overall_score(self, section_scores: dict[str, int]) -> int:
        """
        Weighted overall score using only required and recommended sections.

        Required sections are weighted 2×; recommended sections 1×.
        Optional sections do not contribute.
        """
        total_weight = 0
        weighted_sum = 0
        for section in _TAXONOMY:
            if not section.affects_score:
                continue
            weight = 2 if section.is_required else 1
            score = section_scores.get(section.section_type, 0)
            weighted_sum += score * weight
            total_weight += weight

        if total_weight == 0:
            return 0
        return round(weighted_sum / total_weight)


requirement_template_service = RequirementTemplateService()
