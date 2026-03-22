import uuid
from datetime import datetime
from pydantic import BaseModel


class PMIntegrationCreate(BaseModel):
    project_id: uuid.UUID
    provider: str
    name: str
    credentials: dict
    config: dict | None = None


class PMIntegrationUpdate(BaseModel):
    name: str | None = None
    credentials: dict | None = None
    config: dict | None = None


class PMIntegrationOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    provider: str
    name: str
    config: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExportRequest(BaseModel):
    story_ids: list[uuid.UUID]
    integration_id: uuid.UUID


class ExportResult(BaseModel):
    story_id: uuid.UUID
    success: bool
    external_id: str | None = None
    external_url: str | None = None
    error: str | None = None
