import os
from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def parse_cors(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

def validate_database_url(v: str) -> str:
    if isinstance(v, str):
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
    return v

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "BuildWise AI"

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors)
    ] = Field(default=["*"])

    # Security
    SECRET_KEY: str = "supersecretkeychangeinproduction12345678"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "buildwise"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Annotated[
        str, BeforeValidator(validate_database_url)
    ] = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/buildwise")

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # S3 Storage (AWS fallback to local if empty)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_STORAGE_BUCKET_NAME: str = ""
    AWS_S3_REGION_NAME: str = "us-east-1"

    # Firebase Auth (set up in production)
    FIREBASE_CREDENTIALS_PATH: str = ""

settings = Settings()
