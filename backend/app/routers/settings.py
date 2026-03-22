from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Annotated

from app.config import get_settings
from app.database import get_db
from app.models.settings import LLMSettings
from app.schemas.settings import LLMSettingsUpdate, LLMSettingsOut
from app.services.auth import CurrentUser
from app.utils.security import encrypt

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/llm", response_model=LLMSettingsOut)
def get_llm_settings(current_user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    env = get_settings()
    s = db.query(LLMSettings).filter(LLMSettings.user_id == current_user.id).first()
    if not s:
        # No saved settings — return the server defaults so the UI pre-fills correctly.
        # has_env_key tells the frontend the server already has a key configured.
        return LLMSettingsOut(
            id="00000000-0000-0000-0000-000000000000",
            user_id=current_user.id,
            provider=env.default_llm_provider,
            model=env.default_llm_model,
            base_url=None,
            azure_deployment=None,
            has_api_key=bool(env.get_env_api_key(env.default_llm_provider)),
            updated_at=current_user.created_at,
        )
    # has_api_key is true if the user stored a key OR the server env var covers this provider
    has_key = bool(s.api_key_encrypted) or bool(env.get_env_api_key(s.provider))
    return LLMSettingsOut(
        id=s.id,
        user_id=s.user_id,
        provider=s.provider,
        model=s.model,
        base_url=s.base_url,
        azure_deployment=s.azure_deployment,
        has_api_key=has_key,
        updated_at=s.updated_at,
    )


@router.put("/llm", response_model=LLMSettingsOut, status_code=status.HTTP_200_OK)
def update_llm_settings(
    payload: LLMSettingsUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    env = get_settings()
    s = db.query(LLMSettings).filter(LLMSettings.user_id == current_user.id).first()
    if not s:
        s = LLMSettings(user_id=current_user.id)
        db.add(s)

    s.provider = payload.provider
    s.model = payload.model
    s.base_url = payload.base_url
    s.azure_deployment = payload.azure_deployment
    if payload.api_key is not None:
        s.api_key_encrypted = encrypt(payload.api_key)

    db.commit()
    db.refresh(s)
    has_key = bool(s.api_key_encrypted) or bool(env.get_env_api_key(s.provider))
    return LLMSettingsOut(
        id=s.id,
        user_id=s.user_id,
        provider=s.provider,
        model=s.model,
        base_url=s.base_url,
        azure_deployment=s.azure_deployment,
        has_api_key=has_key,
        updated_at=s.updated_at,
    )
