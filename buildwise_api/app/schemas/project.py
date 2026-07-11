from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    building_type: str
    is_favorite: Optional[bool] = False
    status: Optional[str] = "draft"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    building_type: Optional[str] = None
    status: Optional[str] = None
    is_favorite: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
