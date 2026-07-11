from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Load configuration from app context if needed
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# Auto-discover tasks in backend folders
celery_app.autodiscover_tasks(['app.tasks'])
