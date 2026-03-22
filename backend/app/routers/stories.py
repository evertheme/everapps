import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from app.database import get_db
from app.models.story import Story, StoryVersion, StoryReview
from app.models.document import RequirementDocument, DocumentVersion
from app.models.project import Project
from app.models.settings import LLMSettings
from app.schemas.story import (
    StoryCreate, StoryUpdate, StoryOut, StoryVersionOut, StoryReviewOut,
    GenerateStoriesRequest,
)
from app.services.auth import CurrentUser
from app.services.story_generator import generate_stories
from app.services.story_reviewer import review_story
from app.services.llm.factory import get_provider_for_user

router = APIRouter(prefix="/stories", tags=["stories"])


def _assert_project_access(project_id: uuid.UUID, user_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _snapshot(story: Story) -> dict:
    return {
        "title": story.title,
        "description": story.description,
        "acceptance_criteria": story.acceptance_criteria,
        "priority": story.priority,
        "story_points": story.story_points,
        "status": story.status,
    }


# ── Generate ──────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=list[StoryOut], status_code=status.HTTP_201_CREATED)
async def generate_stories_endpoint(
    payload: GenerateStoriesRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(payload.project_id, current_user.id, db)

    doc = db.get(RequirementDocument, payload.document_id)
    if not doc or doc.project_id != payload.project_id:
        raise HTTPException(status_code=404, detail="Document not found")

    latest_version = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc.id, DocumentVersion.version_number == doc.current_version)
        .first()
    )
    if not latest_version:
        raise HTTPException(status_code=422, detail="Document has no parsed content")

    llm_settings = db.query(LLMSettings).filter(LLMSettings.user_id == current_user.id).first()
    provider = get_provider_for_user(llm_settings)

    try:
        raw_stories = await generate_stories(latest_version.content, provider)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {str(e)}")

    created = []
    for raw in raw_stories:
        story = Story(
            project_id=payload.project_id,
            document_id=payload.document_id,
            created_by=current_user.id,
            title=raw.get("title", "Untitled Story")[:512],
            description=raw.get("description", ""),
            acceptance_criteria=raw.get("acceptance_criteria"),
            priority=raw.get("priority", "medium"),
            story_points=raw.get("story_points"),
            status="draft",
            current_version=1,
        )
        db.add(story)
        db.flush()

        version = StoryVersion(
            story_id=story.id,
            created_by=current_user.id,
            version_number=1,
            content=_snapshot(story),
        )
        db.add(version)
        created.append(story)

    db.commit()
    for s in created:
        db.refresh(s)
    return created


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/", response_model=list[StoryOut])
def list_stories(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    return db.query(Story).filter(Story.project_id == project_id).all()


@router.post("/{project_id}/", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
def create_story(
    project_id: uuid.UUID,
    payload: StoryCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = Story(
        project_id=project_id,
        created_by=current_user.id,
        **payload.model_dump(exclude={"project_id"}),
    )
    db.add(story)
    db.flush()
    version = StoryVersion(story_id=story.id, created_by=current_user.id, version_number=1, content=_snapshot(story))
    db.add(version)
    db.commit()
    db.refresh(story)
    return story


@router.get("/{project_id}/{story_id}", response_model=StoryOut)
def get_story(
    project_id: uuid.UUID,
    story_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = db.get(Story, story_id)
    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.put("/{project_id}/{story_id}", response_model=StoryOut)
def update_story(
    project_id: uuid.UUID,
    story_id: uuid.UUID,
    payload: StoryUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = db.get(Story, story_id)
    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(story, field, value)

    new_version = story.current_version + 1
    story.current_version = new_version
    version = StoryVersion(
        story_id=story.id,
        created_by=current_user.id,
        version_number=new_version,
        content=_snapshot(story),
    )
    db.add(version)
    db.commit()
    db.refresh(story)
    return story


@router.delete("/{project_id}/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    project_id: uuid.UUID,
    story_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = db.get(Story, story_id)
    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")
    db.delete(story)
    db.commit()


# ── Versions ──────────────────────────────────────────────────────────────────

@router.get("/{project_id}/{story_id}/versions", response_model=list[StoryVersionOut])
def list_story_versions(
    project_id: uuid.UUID,
    story_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = db.get(Story, story_id)
    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")
    return db.query(StoryVersion).filter(StoryVersion.story_id == story_id).order_by(StoryVersion.version_number).all()


# ── Review ────────────────────────────────────────────────────────────────────

@router.post("/{project_id}/{story_id}/review", response_model=StoryReviewOut)
async def review_story_endpoint(
    project_id: uuid.UUID,
    story_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = db.get(Story, story_id)
    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")

    llm_settings = db.query(LLMSettings).filter(LLMSettings.user_id == current_user.id).first()
    provider = get_provider_for_user(llm_settings)

    try:
        result = await review_story(story.title, story.description, story.acceptance_criteria, provider)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM review failed: {str(e)}")

    db_review = StoryReview(
        story_id=story.id,
        overall_status=result.get("overall_status", "ambiguous"),
        feedback=result.get("feedback", {}),
        suggestions=result.get("suggestions"),
    )
    db.add(db_review)

    if db_review.overall_status == "clear":
        story.status = "reviewed"

    db.commit()
    db.refresh(db_review)
    return db_review


@router.get("/{project_id}/{story_id}/reviews", response_model=list[StoryReviewOut])
def list_reviews(
    project_id: uuid.UUID,
    story_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    story = db.get(Story, story_id)
    if not story or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="Story not found")
    return db.query(StoryReview).filter(StoryReview.story_id == story_id).order_by(StoryReview.created_at.desc()).all()
