"""
BuildWise AI — Corrections API Routes
========================================
Endpoints for user corrections to AI analysis results.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.ai.user_corrections import UserCorrections
from app.schemas.analysis import (
    RenameRoomRequest, MergeRoomsRequest, SplitRoomRequest,
    AddRoomRequest, AddWallRequest,
)

router = APIRouter()


async def _get_plan_with_data(plan_id: str, db: AsyncSession) -> Plan:
    """Fetch a plan and validate it has analysis data."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")
    if not plan.detected_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan has no analysis data.")
    return plan


@router.put("/{plan_id}/room/{room_id}/rename")
async def rename_room(
    plan_id: str,
    room_id: str,
    payload: RenameRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a detected room."""
    plan = await _get_plan_with_data(plan_id, db)

    updated = UserCorrections.rename_room(plan.detected_data, room_id, payload.new_label)
    plan.detected_data = updated
    await db.commit()
    await db.refresh(plan)

    return {"status": "ok", "message": f"Room renamed to '{payload.new_label}'", "data": updated}


@router.post("/{plan_id}/rooms/merge")
async def merge_rooms(
    plan_id: str,
    payload: MergeRoomsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Merge two adjacent rooms."""
    plan = await _get_plan_with_data(plan_id, db)

    updated = UserCorrections.merge_rooms(
        plan.detected_data, payload.room_id_a, payload.room_id_b, payload.merged_label
    )
    plan.detected_data = updated
    await db.commit()
    await db.refresh(plan)

    return {"status": "ok", "message": "Rooms merged successfully", "data": updated}


@router.post("/{plan_id}/rooms/split")
async def split_room(
    plan_id: str,
    payload: SplitRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Split a room into two by drawing a dividing line."""
    plan = await _get_plan_with_data(plan_id, db)

    split_line = (
        tuple(payload.split_line_start),
        tuple(payload.split_line_end),
    )
    updated = UserCorrections.split_room(
        plan.detected_data, payload.room_id, split_line,
        payload.label_a, payload.label_b
    )
    plan.detected_data = updated
    await db.commit()
    await db.refresh(plan)

    return {"status": "ok", "message": "Room split successfully", "data": updated}


@router.delete("/{plan_id}/room/{room_id}")
async def delete_room(
    plan_id: str,
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a false-positive room."""
    plan = await _get_plan_with_data(plan_id, db)

    updated = UserCorrections.delete_room(plan.detected_data, room_id)
    plan.detected_data = updated
    await db.commit()
    await db.refresh(plan)

    return {"status": "ok", "message": "Room deleted", "data": updated}


@router.post("/{plan_id}/room")
async def add_room(
    plan_id: str,
    payload: AddRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a manually drawn room polygon."""
    plan = await _get_plan_with_data(plan_id, db)

    polygon = [tuple(p) for p in payload.polygon]
    scale = plan.detected_data.get("scale_factor_m_per_px", 0.015)
    updated = UserCorrections.add_room(
        plan.detected_data, polygon, payload.label, scale
    )
    plan.detected_data = updated
    await db.commit()
    await db.refresh(plan)

    return {"status": "ok", "message": f"Room '{payload.label}' added", "data": updated}


@router.post("/{plan_id}/wall")
async def add_wall(
    plan_id: str,
    payload: AddWallRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a manually drawn wall segment."""
    plan = await _get_plan_with_data(plan_id, db)

    updated = UserCorrections.add_wall(
        plan.detected_data, tuple(payload.start), tuple(payload.end), payload.thickness_px
    )
    plan.detected_data = updated
    await db.commit()
    await db.refresh(plan)

    return {"status": "ok", "message": "Wall added", "data": updated}
