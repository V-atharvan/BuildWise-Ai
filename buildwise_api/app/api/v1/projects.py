from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.services.project_service import ProjectService

router = APIRouter()

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await ProjectService.create_project(db, current_user.id, project_in)

@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    building_type: str | None = Query(None),
    status: str | None = Query(None),
    is_favorite: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total = await ProjectService.list_projects(
        db, current_user.id, skip, limit, search, building_type, status, is_favorite
    )
    return {"items": items, "total": total}

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.get_project(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.update_project(db, project_id, current_user.id, project_in)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = await ProjectService.delete_project(db, project_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

@router.post("/{project_id}/duplicate", response_model=ProjectResponse)
async def duplicate_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await ProjectService.duplicate_project(db, project_id, current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )
    return project
