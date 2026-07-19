import uuid
from sqlalchemy import Column, String, ForeignKey, Float, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String, nullable=True) # Tracks AI Processing Job ID
    room_name = Column(String, index=True, nullable=False)
    polygon = Column(JSON, nullable=False) # Array of points: [[x1,y1], ...]
    area = Column(Float, nullable=False)
    perimeter = Column(Float, nullable=False)
    centroid = Column(JSON, nullable=True)
    confidence = Column(Float, default=100.0)
    edited = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    walls = relationship("Wall", back_populates="room", cascade="all, delete-orphan")


class Wall(Base):
    __tablename__ = "walls"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    length = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    thickness = Column(Float, nullable=False)
    polygon = Column(JSON, nullable=True)
    confidence = Column(Float, default=100.0)

    # Relationships
    room = relationship("Room", back_populates="walls")
    doors = relationship("Door", back_populates="wall", cascade="all, delete-orphan")
    windows = relationship("Window", back_populates="wall", cascade="all, delete-orphan")


class Door(Base):
    __tablename__ = "doors"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    wall_id = Column(String, ForeignKey("walls.id", ondelete="CASCADE"), nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    position = Column(JSON, nullable=True)
    type = Column(String, default="single_swing")

    # Relationship
    wall = relationship("Wall", back_populates="doors")


class Window(Base):
    __tablename__ = "windows"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    wall_id = Column(String, ForeignKey("walls.id", ondelete="CASCADE"), nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    sill_height = Column(Float, default=0.9)
    type = Column(String, default="sliding")

    # Relationship
    wall = relationship("Wall", back_populates="windows")


class ColumnGeom(Base):
    __tablename__ = "columns_geom"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    shape = Column(String, default="rectangular") # square, rectangular, circular
    size = Column(JSON, nullable=False) # [width, height] or [radius]
    location = Column(JSON, nullable=False) # [x, y]


class StairsGeom(Base):
    __tablename__ = "stairs_geom"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stair_type = Column(String, default="dog_legged")
    width = Column(Float, nullable=False)
    flights = Column(Float, default=2.0)
