from sqlalchemy import Column, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False) # Local or S3 path
    file_type = Column(String, nullable=False) # pdf, dwg, png, etc.
    status = Column(String, default="uploaded") # uploaded, processing, completed, failed
    
    # AI Detection outputs (walls, rooms, windows, doors, text metadata)
    detected_data = Column(JSON, nullable=True)
    
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    project = relationship("Project", back_populates="plans")
