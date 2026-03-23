import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class RequirementSession(Base):
    __tablename__ = "requirement_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("requirement_documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    # mode: guided | gap_analysis
    mode: Mapped[str] = mapped_column(String(32), nullable=False)
    # status: in_progress | complete | abandoned
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    current_section: Mapped[str | None] = mapped_column(String(64), nullable=True)
    completeness_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    sections: Mapped[list["RequirementSection"]] = relationship(
        "RequirementSection", back_populates="session", cascade="all, delete-orphan"
    )
