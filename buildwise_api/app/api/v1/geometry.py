from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.geometry import Room, Wall, Door, Window, ColumnGeom, StairsGeom
from app.models.estimation import RoomEstimation, WallEstimation

router = APIRouter()

# ── Pydantic Request/Response Schemas ──────────────────────────────────────────

class RoomUpdatePayload(BaseModel):
    room_name: Optional[str] = None
    area: Optional[float] = None
    perimeter: Optional[float] = None
    centroid: Optional[List[float]] = None

class WallUpdatePayload(BaseModel):
    length: Optional[float] = None
    height: Optional[float] = None
    thickness: Optional[float] = None

class RoomResponseSchema(BaseModel):
    id: str
    project_id: str
    room_name: str
    polygon: list
    area: float
    perimeter: float
    centroid: Optional[list] = None
    confidence: float
    edited: bool

    class Config:
        from_attributes = True

class WallResponseSchema(BaseModel):
    id: str
    room_id: str
    length: float
    height: float
    thickness: float
    volume: float
    confidence: float

    class Config:
        from_attributes = True


# ── Rooms Endpoints ──────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/rooms", response_model=List[RoomResponseSchema])
async def get_project_rooms(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all rooms associated with a project."""
    stmt = select(Room).where(Room.project_id == project_id)
    result = await db.execute(stmt)
    rooms = result.scalars().all()
    return rooms


@router.put("/rooms/{room_id}", response_model=RoomResponseSchema)
async def update_room_geometry(
    room_id: str,
    payload: RoomUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a specific room's metadata and area parameters."""
    stmt = select(Room).where(Room.id == room_id)
    result = await db.execute(stmt)
    room = result.scalars().first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )

    if payload.room_name is not None:
        room.room_name = payload.room_name
    if payload.area is not None:
        room.area = payload.area
    if payload.perimeter is not None:
        room.perimeter = payload.perimeter
    if payload.centroid is not None:
        room.centroid = payload.centroid
    
    room.edited = True
    await db.commit()
    await db.refresh(room)
    return room


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_geometry(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a room from the database."""
    stmt = select(Room).where(Room.id == room_id)
    result = await db.execute(stmt)
    room = result.scalars().first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )

    await db.delete(room)
    await db.commit()
    return None


# ── Walls Endpoints ──────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/walls", response_model=List[WallResponseSchema])
async def get_project_walls(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all wall segments for all rooms in a project."""
    # Select walls where the associated room belongs to the project
    stmt = select(Wall).join(Room).where(Room.project_id == project_id)
    result = await db.execute(stmt)
    walls = result.scalars().all()
    return walls


@router.put("/walls/{wall_id}", response_model=WallResponseSchema)
async def update_wall_geometry(
    wall_id: str,
    payload: WallUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a specific wall segment's physical dimensions."""
    stmt = select(Wall).where(Wall.id == wall_id)
    result = await db.execute(stmt)
    wall = result.scalars().first()
    if not wall:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wall segment not found."
        )

    if payload.length is not None:
        wall.length = payload.length
    if payload.height is not None:
        wall.height = payload.height
    if payload.thickness is not None:
        wall.thickness = payload.thickness

    await db.commit()
    await db.refresh(wall)
    return wall
