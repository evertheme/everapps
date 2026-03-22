import uuid
from datetime import datetime
from pydantic import BaseModel


class LLMSettingsUpdate(BaseModel):
    provider: str
    api_key: str | None = None
    model: str
    base_url: str | None = None
    azure_deployment: str | None = None


class LLMSettingsOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    provider: str
    model: str
    base_url: str | None
    azure_deployment: str | None
    has_api_key: bool
    updated_at: datetime

    model_config = {"from_attributes": True}
