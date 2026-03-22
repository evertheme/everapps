import uuid
from datetime import datetime
from pydantic import BaseModel


class StoryCreate(BaseModel):
    project_id: uuid.UUID
    document_id: uuid.UUID | None = None
    title: str
    description: str
    acceptance_criteria: str | None = None
    priority: str = "medium"
    story_points: int | None = None


class StoryUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    acceptance_criteria: str | None = None
    priority: str | None = None
    story_points: int | None = None
    status: str | None = None


class StoryVersionOut(BaseModel):
    id: uuid.UUID
    story_id: uuid.UUID
    version_number: int
    content: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class StoryReviewOut(BaseModel):
    id: uuid.UUID
    story_id: uuid.UUID
    overall_status: str
    feedback: dict
    suggestions: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StoryOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    document_id: uuid.UUID | None
    title: str
    description: str
    acceptance_criteria: str | None
    priority: str
    story_points: int | None
    status: str
    current_version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateStoriesRequest(BaseModel):
    project_id: uuid.UUID
    document_id: uuid.UUID


class ReviewStoryRequest(BaseModel):
    story_id: uuid.UUID
