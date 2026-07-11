from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    company_name: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRegisterFirebase(UserBase):
    firebase_uid: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    company_name: Optional[str] = None
    profile_picture_url: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: str
    role: str = "user"
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
