from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    building_type = Column(String, nullable=False) # e.g. House, Villa, Commercial
    status = Column(String, default="draft") # draft, estimating, completed, archived
    is_favorite = Column(Boolean, default=False)
    
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    plans = relationship("Plan", back_populates="project", cascade="all, delete-orphan")
    estimations = relationship("MaterialEstimation", back_populates="project", cascade="all, delete-orphan")
    costs = relationship("CostEstimation", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
