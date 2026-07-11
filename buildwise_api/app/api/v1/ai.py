from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.schemas.plan import PlanResponse
from app.tasks.analysis_tasks import analyze_plan_task

router = APIRouter()

@router.post("/analyze/{plan_id}", response_model=PlanResponse)
async def analyze_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import select
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found."
        )
        
    # Trigger background Celery worker task
    analyze_plan_task.delay(plan_id)
    
    plan.status = "processing"
    await db.commit()
    await db.refresh(plan)
    return plan

@router.get("/status/{plan_id}", response_model=PlanResponse)
async def get_analysis_status(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import select
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found."
        )
    return plan

from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    project_id: Optional[str] = None

@router.post("/chat")
async def chat_assistant(
    data: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    msg = data.message.lower()
    
    # Simple rule-based/engineering knowledge reply
    if "ratio" in msg or "mix" in msg:
        reply = (
            "Here are the standard concrete mix design ratios according to IS 456:2000:\n\n"
            "• **M15**: 1 : 2 : 4 (Cement : Sand : Coarse Aggregate)\n"
            "• **M20**: 1 : 1.5 : 3 (Recommended minimum grade for RCC structural works)\n"
            "• **M25**: 1 : 1 : 2\n\n"
            "For grades higher than M25 (like M30, M35, M40), custom design mixes are strictly recommended."
        )
    elif "steel" in msg or "reinforcement" in msg:
        reply = (
            "Typical steel reinforcement ratio guidelines for structural components:\n\n"
            "1. **Slabs**: 0.7% to 1.0% of total concrete volume (minimum 0.12% for Fe500/Fe500D bars)\n"
            "2. **Beams**: 1.0% to 2.0% of total volume\n"
            "3. **Columns**: 1.0% to 5.0% of column concrete area\n"
            "4. **Foundations**: 0.5% to 0.8% of foundation concrete volume"
        )
    elif "brick" in msg or "masonry" in msg:
        reply = (
            "Standard brickwork quantities calculation constants:\n\n"
            "• **Standard brick size (modular)**: 190mm x 90mm x 90mm\n"
            "• **Standard brick count**: ~500 bricks per cubic meter of wall volume\n"
            "• **Mortar wet volume**: ~30% of total wall brickwork volume\n"
            "• **Cement-sand ratio**: 1:4 (heavy loads) or 1:6 (partition walls)"
        )
    elif "scale" in msg or "blueprint" in msg:
        reply = (
            "To calibrate your drawing scale to physical meters:\n\n"
            "1. Locate a known dimension line (e.g. standard wall width or room width) on the blueprint.\n"
            "2. Measure the line segment in pixels on your canvas viewport.\n"
            "3. Divide the marked blueprint dimension (in meters) by the pixel length to get the conversion factor: `Scale = meters / pixels`."
        )
    else:
        reply = (
            f"Regarding your query: '{data.message}'\n\n"
            "Under IS 456 / IS 1200 norms, quantity takeoff requires calculating dry materials multiplier factors (1.54 for concrete volume, 1.33 for masonry mortar) to get exact cement, sand, and aggregate bags count. "
            "Let me know if you would like me to detail these formulas or compute them for a specific room!"
        )
        
    return {"response": reply}
