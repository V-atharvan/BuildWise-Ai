import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.schemas.user import UserCreate, UserRegisterFirebase
from app.core.security import get_password_hash, verify_password, create_access_token

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            id=str(uuid.uuid4()),
            email=user_in.email,
            full_name=user_in.full_name,
            hashed_password=hashed_password,
            phone_number=user_in.phone_number,
            company_name=user_in.company_name,
            profile_picture_url=user_in.profile_picture_url,
            is_verified=False
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def register_or_get_firebase_user(db: AsyncSession, user_in: UserRegisterFirebase) -> User:
        result = await db.execute(select(User).where(User.id == user_in.firebase_uid))
        db_user = result.scalars().first()
        
        if db_user:
            return db_user

        db_user = User(
            id=user_in.firebase_uid,
            email=user_in.email,
            full_name=user_in.full_name,
            phone_number=user_in.phone_number,
            company_name=user_in.company_name,
            profile_picture_url=user_in.profile_picture_url,
            is_verified=True
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
        db_user = await AuthService.get_user_by_email(db, email)
        if not db_user or not db_user.hashed_password:
            return None
        if not verify_password(password, db_user.hashed_password):
            return None
        return db_user
