from sqlalchemy import Column, String, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class CostEstimation(Base):
    __tablename__ = "cost_estimations"

    id = Column(String, primary_key=True, index=True)
    material_cost = Column(Float, nullable=False)
    labour_cost = Column(Float, nullable=False)
    equipment_cost = Column(Float, nullable=False)
    transportation_cost = Column(Float, nullable=False)
    taxes = Column(Float, nullable=False)
    profit_margin = Column(Float, nullable=False)
    contingency = Column(Float, nullable=False)
    grand_total = Column(Float, nullable=False)
    
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    project = relationship("Project", back_populates="costs")
