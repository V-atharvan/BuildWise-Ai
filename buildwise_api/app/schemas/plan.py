from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class PlanBase(BaseModel):
    filename: str
    file_url: str
    file_type: str
    status: Optional[str] = "uploaded"
    detected_data: Optional[Dict[str, Any]] = None

class PlanCreate(PlanBase):
    project_id: str

class PlanUpdate(BaseModel):
    status: Optional[str] = None
    detected_data: Optional[Dict[str, Any]] = None

class PlanResponse(PlanBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
