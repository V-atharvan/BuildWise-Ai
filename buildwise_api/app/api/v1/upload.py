import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.schemas.plan import PlanResponse
from app.core.config import settings

router = APIRouter()

# Create a local upload dir if it doesn't exist
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/plan", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def upload_plan(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
    
    # Save file path locally or upload to S3 if credentials exist
    filename_saved = f"{file_id}.{file_ext}"
    local_path = os.path.join(UPLOAD_DIR, filename_saved)
    
    try:
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file locally: {str(e)}"
        )

    file_url = f"/uploads/{filename_saved}" # Mock local URL route

    # If AWS S3 configuration is fully filled, upload there instead
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_STORAGE_BUCKET_NAME:
        try:
            import boto3
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            s3_client.upload_file(local_path, settings.AWS_STORAGE_BUCKET_NAME, filename_saved)
            file_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{filename_saved}"
        except Exception as e:
            # Fallback to local and log warning
            print(f"Warning: S3 upload failed, falling back to local: {e}")

    # Register plan in database
    db_plan = Plan(
        id=file_id,
        filename=file.filename,
        file_url=file_url,
        file_type=file_ext,
        status="uploaded",
        project_id=project_id
    )
    
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan
