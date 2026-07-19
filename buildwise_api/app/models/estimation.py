import uuid
from sqlalchemy import Column, String, ForeignKey, Float, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class MaterialEstimation(Base):
    __tablename__ = "material_estimations"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    concrete_volume_m3 = Column(Float, nullable=False)
    steel_weight_kg = Column(Float, nullable=False)
    bricks_count = Column(Integer, nullable=False)
    cement_bags = Column(Integer, nullable=False)
    sand_volume_m3 = Column(Float, nullable=False)
    aggregate_volume_m3 = Column(Float, nullable=False)
    plaster_area_sq_m = Column(Float, nullable=False)
    paint_area_sq_m = Column(Float, nullable=False)
    tile_area_sq_m = Column(Float, nullable=False)
    waterproofing_area_sq_m = Column(Float, default=0.0)
    excavation_volume_m3 = Column(Float, default=0.0)
    
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    project = relationship("Project", back_populates="estimations")


class RoomEstimation(Base):
    __tablename__ = "room_estimations"

    room_id = Column(String, ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    bricks = Column(Integer, default=0)
    cement = Column(Integer, default=0)
    sand = Column(Float, default=0.0)
    concrete = Column(Float, default=0.0)
    steel = Column(Float, default=0.0)
    plaster = Column(Float, default=0.0)
    paint = Column(Float, default=0.0)
    flooring = Column(Float, default=0.0)
    cost = Column(Float, default=0.0)


class WallEstimation(Base):
    __tablename__ = "wall_estimations"

    wall_id = Column(String, ForeignKey("walls.id", ondelete="CASCADE"), primary_key=True)
    bricks = Column(Integer, default=0)
    cement = Column(Integer, default=0)
    sand = Column(Float, default=0.0)
    plaster = Column(Float, default=0.0)
    paint = Column(Float, default=0.0)
    wall_cost = Column(Float, default=0.0)


class BuildingParameters(Base):
    __tablename__ = "building_parameters"

    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    floors = Column(Integer, default=1)
    floor_height = Column(Float, default=3.00)
    wall_thickness = Column(Float, default=0.230)
    slab_thickness = Column(Float, default=0.120)
    roof_type = Column(String, default="flat_rcc")
    foundation_type = Column(String, default="isolated")
    concrete_grade = Column(String, default="M20")
    steel_grade = Column(String, default="Fe500")
    brick_type = Column(String, default="red_brick")
    mortar_ratio = Column(String, default="1:5")
    waste_factor = Column(Float, default=5.00)
