"""
BuildWise AI — BOQ API Routes
================================
Endpoints for generating and exporting Bill of Quantities.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import io

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.engine.boq_generator import BOQGenerator
from app.engine.material_engine import MaterialEngine
from app.engine.cost_engine import CostEngine

router = APIRouter()


@router.post("/generate/{project_id}")
async def generate_boq(
    project_id: str,
    payload: dict = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate BOQ from the latest analysis results for a project."""
    # Find the latest completed plan for this project
    result = await db.execute(
        select(Plan)
        .where(Plan.project_id == project_id, Plan.status == "completed")
        .order_by(Plan.created_at.desc())
    )
    plan = result.scalars().first()

    if not plan or not plan.detected_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis found for this project."
        )

    analysis = plan.detected_data

    # Extract parameters
    params = payload or {}
    user_inputs = {
        "total_area": analysis.get("building_area_sq_ft", 0),
        "floors": params.get("floors", 1),
        "floor_height": params.get("floor_height_m", 3.0),
        "wall_thickness": params.get("wall_thickness_m", 0.230),
        "concrete_grade": params.get("concrete_grade", "M20"),
        "brick_type": params.get("brick_type", "red_brick"),
        "rooms": analysis.get("rooms", []),
        "doors_count": analysis.get("door_count", 5),
        "windows_count": analysis.get("window_count", 6),
    }

    # Merge brand selections if provided
    for key in ["brick_brand_id", "cement_brand_id", "steel_brand_id",
                "paint_brand_id", "tile_brand_id", "plumbing_brand_id",
                "electrical_brand_id"]:
        if key in params:
            user_inputs[key] = params[key]

    # Run estimation engines
    materials = MaterialEngine.run_estimation(user_inputs)
    costs = CostEngine.calculate_cost(materials, params.get("custom_rates"))

    # Generate BOQ
    boq = BOQGenerator.generate(
        analysis=analysis,
        materials=materials,
        costs=costs,
        project_name=params.get("project_name", "BuildWise Project"),
        floor_height_m=user_inputs["floor_height"],
        wall_thickness_m=user_inputs["wall_thickness"],
    )

    return boq


@router.get("/{project_id}/download")
async def download_boq(
    project_id: str,
    format: str = Query("pdf", description="Export format: pdf, excel, csv"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download BOQ in the specified format."""
    # Find latest plan
    result = await db.execute(
        select(Plan)
        .where(Plan.project_id == project_id, Plan.status == "completed")
        .order_by(Plan.created_at.desc())
    )
    plan = result.scalars().first()

    if not plan or not plan.detected_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed analysis found."
        )

    analysis = plan.detected_data

    # Run estimation with default params
    user_inputs = {
        "total_area": analysis.get("building_area_sq_ft", 0),
        "floors": 1,
        "rooms": analysis.get("rooms", []),
        "doors_count": analysis.get("door_count", 5),
        "windows_count": analysis.get("window_count", 6),
    }

    materials = MaterialEngine.run_estimation(user_inputs)
    costs = CostEngine.calculate_cost(materials)

    boq = BOQGenerator.generate(
        analysis=analysis,
        materials=materials,
        costs=costs,
    )

    format_lower = format.lower()

    if format_lower == "pdf":
        pdf_bytes = BOQGenerator.export_pdf(boq)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=BOQ_{project_id}.pdf"},
        )
    elif format_lower in ("excel", "xlsx"):
        excel_bytes = BOQGenerator.export_excel(boq)
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=BOQ_{project_id}.xlsx"},
        )
    elif format_lower == "csv":
        csv_str = BOQGenerator.export_csv(boq)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=BOQ_{project_id}.csv"},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format: {format}. Use 'pdf', 'excel', or 'csv'.",
        )


@router.get("/{project_id}/room/{room_id}")
async def get_room_boq(
    project_id: str,
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get BOQ for a specific room."""
    result = await db.execute(
        select(Plan)
        .where(Plan.project_id == project_id, Plan.status == "completed")
        .order_by(Plan.created_at.desc())
    )
    plan = result.scalars().first()

    if not plan or not plan.detected_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No analysis found.")

    analysis = plan.detected_data

    # Find the room
    target_room = None
    for room in analysis.get("rooms", []):
        if room.get("id") == room_id:
            target_room = room
            break

    if not target_room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    # Generate room-level BOQ
    from app.engine.is_codes import CPWD_BASE_RATES_2024
    room_boqs = BOQGenerator._generate_room_wise_boq(
        rooms=[target_room],
        floor_height_m=3.0,
        wall_thickness_m=0.230,
        brick_type="red_brick",
        rates=CPWD_BASE_RATES_2024,
    )

    return room_boqs[0] if room_boqs else {"error": "Could not generate BOQ for this room"}
