import uuid
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Annotated

from app.database import get_db
from app.models.document import RequirementDocument, DocumentVersion
from app.models.project import Project
from app.schemas.document import DocumentOut, DocumentVersionOut, DocumentWithContentOut
from app.services.auth import CurrentUser
from app.services.document_parser import parse_document, analyse_document, SUPPORTED_TYPES

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))


def _assert_project_access(project_id: uuid.UUID, user_id: uuid.UUID, db: Session) -> Project:
    project = db.get(Project, project_id)
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/{project_id}/upload", response_model=DocumentWithContentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: uuid.UUID,
    file: UploadFile,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported file type '{suffix}'")

    raw = await file.read()
    text_content = parse_document(raw, file.filename or "upload")

    # Save raw file to disk
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4()
    dest = UPLOAD_DIR / f"{file_id}{suffix}"
    dest.write_bytes(raw)

    doc = RequirementDocument(
        project_id=project_id,
        created_by=current_user.id,
        filename=file.filename,
        file_type=suffix.lstrip("."),
        current_version=1,
    )
    db.add(doc)
    db.flush()

    version = DocumentVersion(
        document_id=doc.id,
        created_by=current_user.id,
        version_number=1,
        content=text_content,
        file_path=str(dest),
    )
    db.add(version)
    db.commit()
    db.refresh(doc)

    out = DocumentWithContentOut.model_validate(doc)
    out.latest_content = text_content
    out.hints = analyse_document(text_content, suffix)
    return out


@router.get("/{project_id}/", response_model=list[DocumentOut])
def list_documents(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    return db.query(RequirementDocument).filter(RequirementDocument.project_id == project_id).all()


@router.get("/{project_id}/{document_id}", response_model=DocumentWithContentOut)
def get_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    doc = db.get(RequirementDocument, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")

    latest = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == document_id, DocumentVersion.version_number == doc.current_version)
        .first()
    )
    out = DocumentWithContentOut.model_validate(doc)
    out.latest_content = latest.content if latest else None
    if latest and latest.content:
        out.hints = analyse_document(latest.content, f".{doc.file_type}")
    return out


@router.get("/{project_id}/{document_id}/versions", response_model=list[DocumentVersionOut])
def list_versions(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    doc = db.get(RequirementDocument, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return db.query(DocumentVersion).filter(DocumentVersion.document_id == document_id).order_by(DocumentVersion.version_number).all()


@router.post("/{project_id}/{document_id}/reupload", response_model=DocumentWithContentOut)
async def reupload_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    file: UploadFile,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    """Upload a new version of an existing document."""
    _assert_project_access(project_id, current_user.id, db)
    doc = db.get(RequirementDocument, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported file type '{suffix}'")

    raw = await file.read()
    text_content = parse_document(raw, file.filename or "upload")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4()
    dest = UPLOAD_DIR / f"{file_id}{suffix}"
    dest.write_bytes(raw)

    new_version = doc.current_version + 1
    version = DocumentVersion(
        document_id=doc.id,
        created_by=current_user.id,
        version_number=new_version,
        content=text_content,
        file_path=str(dest),
    )
    db.add(version)
    doc.current_version = new_version
    doc.filename = file.filename or doc.filename
    db.commit()
    db.refresh(doc)

    out = DocumentWithContentOut.model_validate(doc)
    out.latest_content = text_content
    out.hints = analyse_document(text_content, f".{doc.file_type}")
    return out


@router.delete("/{project_id}/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    _assert_project_access(project_id, current_user.id, db)
    doc = db.get(RequirementDocument, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
