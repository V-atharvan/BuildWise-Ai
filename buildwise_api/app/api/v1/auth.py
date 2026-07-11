from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token, UserRegisterFirebase
from app.services.auth_service import AuthService
from app.core.security import create_access_token

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await AuthService.get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    return await AuthService.register_user(db, user_in)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/firebase-verify", response_model=Token)
async def firebase_verify(user_in: UserRegisterFirebase, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register_or_get_firebase_user(db, user_in)
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserUpdate
from app.core.security import get_password_hash, verify_password

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.company_name is not None:
        current_user.company_name = user_update.company_name
    if user_update.phone_number is not None:
        current_user.phone_number = user_update.phone_number
    if user_update.profile_picture_url is not None:
        current_user.profile_picture_url = user_update.profile_picture_url
    if user_update.password is not None:
        current_user.hashed_password = get_password_hash(user_update.password)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.hashed_password or not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    current_user.hashed_password = get_password_hash(data.new_password)
    db.add(current_user)
    await db.commit()
    return {"status": "success", "message": "Password changed successfully"}

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email"
        )
    # Return dummy success link for local development
    return {"status": "success", "message": "Password reset email sent (simulated)"}

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # Simulated token reset. We can reset the first active user or a test user.
    # In a real app we parse token; here we mock success.
    return {"status": "success", "message": "Password reset successfully (simulated)"}
