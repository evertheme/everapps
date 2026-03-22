import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

from app.database import get_db
from app.models.integration import PMIntegration
from app.models.story import Story
from app.models.project import Project
from app.schemas.integration import (
    PMIntegrationCreate, PMIntegrationUpdate, PMIntegrationOut,
    ExportRequest, ExportResult,
)
from app.services.auth import CurrentUser
from app.services.integrations.factory import get_integration
from app.utils.security import encrypt

router = APIRouter(prefix="/integrations", tags=["integrations"])


def _assert_project_access(project_id: uuid.UUID, user_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/", response_model=list[PMIntegrationOut])
def list_integrations(current_user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    project_ids = [p.id for p in current_user.projects]
    return db.query(PMIntegration).filter(PMIntegration.project_id.in_(project_ids)).all()


@router.get("/{integration_id}", response_model=PMIntegrationOut)
def get_integration_endpoint(
    integration_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.get(PMIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    _assert_project_access(integration.project_id, current_user.id, db)
    return integration


@router.post("/", response_model=PMIntegrationOut, status_code=status.HTTP_201_CREATED)
def create_integration(
    payload: PMIntegrationCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(payload.project_id, current_user.id, db)
    integration = PMIntegration(
        project_id=payload.project_id,
        provider=payload.provider,
        name=payload.name,
        credentials_encrypted=encrypt(json.dumps(payload.credentials)),
        config=payload.config,
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


@router.put("/{integration_id}", response_model=PMIntegrationOut)
def update_integration(
    integration_id: uuid.UUID,
    payload: PMIntegrationUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.get(PMIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    _assert_project_access(integration.project_id, current_user.id, db)

    if payload.name is not None:
        integration.name = payload.name
    if payload.credentials is not None:
        integration.credentials_encrypted = encrypt(json.dumps(payload.credentials))
    if payload.config is not None:
        integration.config = payload.config

    db.commit()
    db.refresh(integration)
    return integration


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(
    integration_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.get(PMIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    _assert_project_access(integration.project_id, current_user.id, db)
    db.delete(integration)
    db.commit()


@router.post("/{integration_id}/export", response_model=list[ExportResult])
async def export_stories(
    integration_id: uuid.UUID,
    payload: ExportRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    integration = db.get(PMIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    _assert_project_access(integration.project_id, current_user.id, db)

    pm = get_integration(integration)
    results: list[ExportResult] = []

    for story_id in payload.story_ids:
        story = db.get(Story, story_id)
        if not story or story.project_id != integration.project_id:
            results.append(ExportResult(story_id=story_id, success=False, error="Story not found"))
            continue

        try:
            issued = await pm.create_issue({
                "title": story.title,
                "description": story.description,
                "acceptance_criteria": story.acceptance_criteria,
                "priority": story.priority,
                "story_points": story.story_points,
            })
            story.status = "exported"
            results.append(ExportResult(
                story_id=story_id,
                success=True,
                external_id=issued.external_id,
                external_url=issued.external_url,
            ))
        except Exception as e:
            results.append(ExportResult(story_id=story_id, success=False, error=str(e)))

    db.commit()
    return results
