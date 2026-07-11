import os
from celery import shared_task
from sqlalchemy.orm import Session
from app.core.celery_app import celery_app
from app.db.database import AsyncSessionLocal
from app.models.plan import Plan
from app.ai.pipeline import AiPipeline

# Create a sync session loader specifically for Celery workers
from sqlalchemy import create_engine
from app.core.config import settings

# Parse the asyncpg URL to standard psycopg2 for sync worker usage if needed,
# or run using an event loop inside Celery. Let's run a simple async wrapper in Celery
import asyncio

async def run_async_pipeline(plan_id: str):
    from app.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        # Retrieve plan
        from sqlalchemy import select
        result = await session.execute(select(Plan).where(Plan.id == plan_id))
        plan = result.scalars().first()
        if not plan:
            return
            
        plan.status = "processing"
        await session.commit()
        
        try:
            # Resolve local filepath
            # Strip '/uploads/' mock URL route to get local filename
            filename = plan.file_url.split("/")[-1]
            local_path = os.path.join(os.getcwd(), "uploads", filename)
            
            # Run pipeline
            detected = AiPipeline.run_analysis(local_path)
            
            # Save results
            plan.detected_data = detected
            plan.status = "completed"
        except Exception as e:
            plan.status = "failed"
            plan.detected_data = {"error": str(e)}
            
        await session.commit()

@celery_app.task(name="app.tasks.analysis_tasks.analyze_plan_task")
def analyze_plan_task(plan_id: str):
    # Run the async database loop blockingly inside the sync worker process thread
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # Use an alternative loop or execute in thread
        future = asyncio.run_coroutine_threadsafe(run_async_pipeline(plan_id), loop)
        future.result()
    else:
        loop.run_until_complete(run_async_pipeline(plan_id))
    return {"plan_id": plan_id, "status": "completed"}
