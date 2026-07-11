from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # UUID or Firebase UID
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True) # Null if using social/phone auth directly
    phone_number = Column(String, unique=True, index=True, nullable=True)
    company_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    role = Column(String, default="user", nullable=False)
    
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
