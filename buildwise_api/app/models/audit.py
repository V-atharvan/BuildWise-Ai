import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, JSON
from sqlalchemy.sql import func
from app.db.database import Base

class ProjectVersion(Base):
    __tablename__ = "project_versions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    edited_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    edited_at = Column(DateTime(timezone=True), server_default=func.now())
    change_summary = Column(String, nullable=False)
    state_snapshot = Column(JSON, nullable=False) # Full JSON dump of project estimation parameters & data


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False) # e.g. Login, Room Edit, Material Change, BOQ Export
    entity_name = Column(String, nullable=False) # e.g. Project, Room, Material
    entity_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
