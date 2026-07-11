from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    pdf_url = Column(String, nullable=False) # Local path or S3 url
    
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    project = relationship("Project", back_populates="reports")
