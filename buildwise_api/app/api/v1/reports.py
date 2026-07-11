import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.estimation import MaterialEstimation
from app.models.cost import CostEstimation
from app.models.report import Report
from app.pdf.report_generator import ReportGenerator

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def generate_project_report(
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

    # 1. Fetch project details
    from sqlalchemy import select
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalars().first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    # 2. Fetch estimations
    mats_result = await db.execute(
        select(MaterialEstimation).where(MaterialEstimation.project_id == project_id).order_by(MaterialEstimation.created_at.desc())
    )
    mats = mats_result.scalars().first()

    cost_result = await db.execute(
        select(CostEstimation).where(CostEstimation.project_id == project_id).order_by(CostEstimation.created_at.desc())
    )
    costs = cost_result.scalars().first()

    if not mats or not costs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project lacks complete material or cost estimations to build a report."
        )

    # 3. Resolve PDF paths
    report_id = str(uuid.uuid4())
    pdf_filename = f"report_{report_id}.pdf"
    pdf_filepath = os.path.join(UPLOAD_DIR, pdf_filename)

    # Convert SQLAlchemy row attributes to standard dictionaries
    materials_dict = {c.name: getattr(mats, c.name) for c in mats.__table__.columns}
    costs_dict = {c.name: getattr(costs, c.name) for c in costs.__table__.columns}

    # 4. Invoke ReportLab builder
    try:
        ReportGenerator.generate_pdf_report(
            pdf_filepath,
            project.name,
            project.building_type,
            materials_dict,
            costs_dict
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ReportLab PDF compilation failed: {str(e)}"
        )

    pdf_url = f"/uploads/{pdf_filename}"

    # 5. Save report record to DB
    db_report = Report(
        id=report_id,
        pdf_url=pdf_url,
        project_id=project_id
    )
    db.add(db_report)
    await db.commit()

    return {
        "report_id": report_id,
        "pdf_url": pdf_url,
        "created_at": db_report.created_at
    }
