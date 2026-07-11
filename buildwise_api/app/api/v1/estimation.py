import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.estimation import MaterialEstimation
from app.models.cost import CostEstimation
from app.engine.material_engine import MaterialEngine
from app.engine.cost_engine import CostEngine

router = APIRouter()

@router.post("/calculate", status_code=status.HTTP_201_CREATED)
async def create_estimation(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project_id = payload.get("project_id")
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id is required."
        )

    user_inputs = payload.get("user_inputs", {})
    # Ensure project_id is injected in inputs if needed
    user_inputs["project_id"] = project_id

    # 1. Run Material Engine (IS Codes calculation)
    materials = MaterialEngine.run_estimation(user_inputs)

    # 2. Run Cost Engine (CPWD Delhi 2024 Base Rates and Cost Build-up)
    costs = CostEngine.calculate_cost(materials, payload.get("custom_rates"))

    # Share the exact same UUID to easily link material and cost takeoff records
    estimation_id = str(uuid.uuid4())

    # 3. Store Material Takeoff
    db_materials = MaterialEstimation(
        id=estimation_id,
        concrete_volume_m3=float(materials["concrete_volume_m3"]),
        steel_weight_kg=float(materials["steel_weight_kg"]),
        bricks_count=int(materials["bricks_count"]),
        cement_bags=int(materials["cement_bags"]),
        sand_volume_m3=float(materials["sand_volume_m3"]),
        aggregate_volume_m3=float(materials["aggregate_volume_m3"]),
        plaster_area_sq_m=float(materials["plaster_area_sq_m"]),
        paint_area_sq_m=float(materials["paint_area_sq_m"]),
        tile_area_sq_m=float(materials["tile_area_sq_m"]),
        waterproofing_area_sq_m=float(materials["waterproofing_area_sq_m"]),
        excavation_volume_m3=float(materials["excavation_volume_m3"]),
        project_id=project_id
    )

    # 4. Store Cost Takeoff
    db_costs = CostEstimation(
        id=estimation_id,
        material_cost=float(costs["total_material_cost"]),
        labour_cost=float(costs["labour_cost"]),
        equipment_cost=float(costs["equipment_cost"]),
        transportation_cost=0.0,
        taxes=float(costs["gst_amount"]),
        profit_margin=float(costs["contractor_margin"]),
        contingency=float(costs["contingency"]),
        grand_total=float(costs["grand_total"]),
        project_id=project_id
    )

    db.add(db_materials)
    db.add(db_costs)
    await db.commit()

    return {
        "id": estimation_id,
        "project_id": project_id,
        "materials": materials,
        "costs": costs,
        "total_cost": costs["grand_total"]
    }

@router.get("/{estimation_id}")
async def get_estimation(
    estimation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch material takeoff record
    mats_result = await db.execute(
        select(MaterialEstimation).where(MaterialEstimation.id == estimation_id)
    )
    mats = mats_result.scalars().first()
    if not mats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estimation materials record not found."
        )

    # Fetch cost takeoff record
    cost_result = await db.execute(
        select(CostEstimation).where(CostEstimation.id == estimation_id)
    )
    costs = cost_result.scalars().first()
    if not costs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estimation costs record not found."
        )

    # Convert to schema-friendly dictionaries
    materials_dict = {
        "concrete_volume": mats.concrete_volume_m3,
        "steel_weight": mats.steel_weight_kg,
        "bricks_count": mats.bricks_count,
        "blocks_count": 0,  # Legacy schemas compatibility
        "cement_bags": mats.cement_bags,
        "sand_volume": mats.sand_volume_m3,
        "aggregate_volume": mats.aggregate_volume_m3,
        "plaster_area": mats.plaster_area_sq_m,
        "paint_area": mats.paint_area_sq_m,
        "tiles_area": mats.tile_area_sq_m,
        "waterproofing_area": mats.waterproofing_area_sq_m,
        "excavation_volume": mats.excavation_volume_m3,
    }

    cost_breakdown_dict = {
        "concrete_cost": costs.material_cost * 0.40,  # Apportioned for UI display
        "steel_cost": costs.material_cost * 0.35,
        "cement_cost": costs.material_cost * 0.10,
        "sand_cost": costs.material_cost * 0.05,
        "aggregate_cost": costs.material_cost * 0.05,
        "brick_cost": costs.material_cost * 0.05,
        "block_cost": 0.0,
        "mortar_cost": 0.0,
        "plaster_cost": 0.0,
        "paint_cost": 0.0,
        "tiles_cost": 0.0,
        "waterproofing_cost": 0.0,
        "excavation_cost": 0.0,
        "labour_cost": costs.labour_cost,
        "equipment_cost": costs.equipment_cost,
        "total_material_cost": costs.material_cost,
        "gst_amount": costs.taxes,
        "contractor_margin": costs.profit_margin,
        "contingency": costs.contingency,
        "grand_total": costs.grand_total,
    }

    return {
        "id": estimation_id,
        "project_id": mats.project_id,
        "created_at": mats.created_at.isoformat() if mats.created_at else None,
        "materials": materials_dict,
        "cost_breakdown": cost_breakdown_dict,
        "total_cost": costs.grand_total,
        "currency": "INR"
    }

@router.get("/")
async def list_estimations(
    project_id: str = Query(..., description="Project ID to filter estimations"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch all material takeoff records for project
    mats_result = await db.execute(
        select(MaterialEstimation)
        .where(MaterialEstimation.project_id == project_id)
        .order_by(MaterialEstimation.created_at.desc())
    )
    mats_list = mats_result.scalars().all()

    estimations = []
    for mats in mats_list:
        cost_result = await db.execute(
            select(CostEstimation).where(CostEstimation.id == mats.id)
        )
        costs = cost_result.scalars().first()
        if costs:
            estimations.append({
                "id": mats.id,
                "project_id": mats.project_id,
                "created_at": mats.created_at.isoformat() if mats.created_at else None,
                "total_cost": costs.grand_total,
            })
            
    return estimations
