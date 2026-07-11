from sqlalchemy import Column, String, ForeignKey, Float, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class MaterialEstimation(Base):
    __tablename__ = "material_estimations"

    id = Column(String, primary_key=True, index=True)
    concrete_volume_m3 = Column(Float, nullable=False)
    steel_weight_kg = Column(Float, nullable=False)
    bricks_count = Column(Integer, nullable=False)
    cement_bags = Column(Integer, nullable=False)
    sand_volume_m3 = Column(Float, nullable=False)
    aggregate_volume_m3 = Column(Float, nullable=False)
    plaster_area_sq_m = Column(Float, nullable=False)
    paint_area_sq_m = Column(Float, nullable=False)
    tile_area_sq_m = Column(Float, nullable=False)
    waterproofing_area_sq_m = Column(Float, nullable=False)
    excavation_volume_m3 = Column(Float, nullable=False)
    
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    project = relationship("Project", back_populates="estimations")
