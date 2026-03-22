import uuid
from datetime import datetime
from pydantic import BaseModel


class DocumentVersionOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    version_number: int
    content: str
    file_path: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    filename: str
    file_type: str
    current_version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentHints(BaseModel):
    char_count: int
    section_count: int
    is_large: bool
    estimated_chunks: int
    format_warnings: list[str]
    processing_note: str | None


class DocumentWithContentOut(DocumentOut):
    latest_content: str | None = None
    hints: DocumentHints | None = None
