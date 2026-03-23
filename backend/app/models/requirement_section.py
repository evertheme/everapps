import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class RequirementSection(Base):
    __tablename__ = "requirement_sections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requirement_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    document_version_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    # section_type: document_header | executive_summary | project_context | scope |
    #   stakeholders | functional_requirements | non_functional_requirements |
    #   data_requirements | constraints | success_metrics | timeline | glossary
    section_type: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # source: human | ai_draft | ai_gap_fill | imported
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    # status: pending | in_progress | complete | skipped
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    completeness_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    session: Mapped["RequirementSession"] = relationship(
        "RequirementSession", back_populates="sections"
    )
