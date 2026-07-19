import uuid
from sqlalchemy import Column, String, ForeignKey, Float, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class CostEstimation(Base):
    __tablename__ = "cost_estimations"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
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


class LabourAllocation(Base):
    __tablename__ = "labour_allocations"

    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    masons = Column(Integer, default=0)
    helpers = Column(Integer, default=0)
    carpenters = Column(Integer, default=0)
    electricians = Column(Integer, default=0)
    plumbers = Column(Integer, default=0)
    painters = Column(Integer, default=0)
    tile_installers = Column(Integer, default=0)
    supervisors = Column(Integer, default=0)


class LabourRate(Base):
    __tablename__ = "labour_rates"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    labour_type = Column(String, unique=True, index=True, nullable=False) # e.g. Mason, Helper
    daily_rate = Column(Float, nullable=False)


class EquipmentRental(Base):
    __tablename__ = "equipment_rentals"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    equipment_name = Column(String, nullable=False)
    rental_days = Column(Integer, default=1)
    daily_rate = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)


class TransportationLog(Base):
    __tablename__ = "transportation_logs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    material_category = Column(String, nullable=False)
    distance_km = Column(Float, nullable=False)
    vehicle_type = Column(String, nullable=False)
    transport_cost = Column(Float, nullable=False)


class CostSummary(Base):
    __tablename__ = "cost_summaries"

    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    material_cost = Column(Float, default=0.0)
    labour_cost = Column(Float, default=0.0)
    equipment_cost = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    contractor_margin = Column(Float, default=0.0)
    contingency = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)


class BOQItem(Base):
    __tablename__ = "boq_items"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    item_no = Column(String, nullable=False)
    category = Column(String, nullable=False) # e.g. Earthwork, Foundation, RCC, Masonry
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
