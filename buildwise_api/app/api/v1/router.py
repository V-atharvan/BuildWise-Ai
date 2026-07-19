from fastapi import APIRouter
from app.api.v1 import auth, projects, upload, ai, estimation, reports, admin, corrections, boq, geometry

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(estimation.router, prefix="/estimation", tags=["estimation"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(corrections.router, prefix="/corrections", tags=["corrections"])
api_router.include_router(boq.router, prefix="/boq", tags=["boq"])
api_router.include_router(geometry.router, prefix="", tags=["geometry"])

@api_router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "service": "BuildWise AI API"}

