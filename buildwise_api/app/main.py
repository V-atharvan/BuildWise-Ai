from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables in 3NF layout on startup with a retry mechanism to handle database startup/wakeup delay
    import asyncio
    from sqlalchemy.exc import DBAPIError
    
    max_retries = 10
    retry_delay = 2 # seconds
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Connecting to database (attempt {attempt}/{max_retries})...")
            async with engine.begin() as conn:
                from app.models.user import User
                from app.models.project import Project
                from app.models.plan import Plan
                from app.models.estimation import MaterialEstimation, RoomEstimation, WallEstimation, BuildingParameters
                from app.models.cost import CostEstimation, LabourAllocation, LabourRate, EquipmentRental, TransportationLog, CostSummary, BOQItem
                from app.models.report import Report
                from app.models.geometry import Room, Wall, Door, Window, ColumnGeom, StairsGeom
                from app.models.catalog import BricksCatalog, CementCatalog, SteelCatalog, SandCatalog, AggregateCatalog, ProjectMaterialSelection
                from app.models.audit import ProjectVersion, AuditLog
                
                await conn.run_sync(Base.metadata.create_all)
            print("Successfully connected to the database and initialized tables!")
            break
        except (DBAPIError, OSError) as e:
            if attempt == max_retries:
                print(f"Failed to connect to the database after {max_retries} attempts: {e}")
                raise e
            print(f"Database connection failed: {e}. Retrying in {retry_delay} seconds...")
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 15)
            
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan
    )

    # CORS Middleware configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount static directory for uploaded drawing files
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

    # Register router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app

app = create_app()
