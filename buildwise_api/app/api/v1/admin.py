from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.estimation import MaterialEstimation
from app.models.report import Report
from app.schemas.user import UserResponse
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class AdminStatsResponse(BaseModel):
    total_users: int
    total_projects: int
    total_estimates: int
    total_reports: int
    active_today: int
    new_this_week: int

class UsersListResponse(BaseModel):
    items: List[UserResponse]
    total: int

class UpdateRoleRequest(BaseModel):
    role: str

async def check_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges."
        )
    return current_user

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_admin_user)
):
    # Total Users count
    result_users = await db.execute(select(func.count(User.id)))
    total_users = result_users.scalar() or 0

    # Total Projects count
    result_projects = await db.execute(select(func.count(Project.id)))
    total_projects = result_projects.scalar() or 0

    # Total Estimations count
    result_estimations = await db.execute(select(func.count(MaterialEstimation.id)))
    total_estimates = result_estimations.scalar() or 0

    # Total Reports count
    result_reports = await db.execute(select(func.count(Report.id)))
    total_reports = result_reports.scalar() or 0

    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "total_estimates": total_estimates,
        "total_reports": total_reports,
        "active_today": 12,
        "new_this_week": 4
    }

@router.get("/users", response_model=UsersListResponse)
async def list_admin_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_admin_user)
):
    query = select(User)
    if search:
        query = query.where(
            (User.email.ilike(f"%{search}%")) | 
            (User.full_name.ilike(f"%{search}%"))
        )
        
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get page items
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    data: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_admin_user)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if data.role not in ["user", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role value"
        )
    user.role = data.role
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/users/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user_account(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_admin_user)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    # Toggle active state
    user.is_active = not user.is_active
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
