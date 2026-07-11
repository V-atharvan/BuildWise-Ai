import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate

class ProjectService:
    @staticmethod
    async def create_project(db: AsyncSession, owner_id: str, project_in: ProjectCreate) -> Project:
        db_project = Project(
            id=str(uuid.uuid4()),
            name=project_in.name,
            building_type=project_in.building_type,
            status=project_in.status,
            is_favorite=project_in.is_favorite,
            owner_id=owner_id
        )
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        return db_project

    @staticmethod
    async def get_project(db: AsyncSession, project_id: str, owner_id: str) -> Project | None:
        result = await db.execute(
            select(Project).where(
                and_(Project.id == project_id, Project.owner_id == owner_id)
            )
        )
        return result.scalars().first()

    @staticmethod
    async def list_projects(
        db: AsyncSession,
        owner_id: str,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        building_type: str | None = None,
        status: str | None = None,
        is_favorite: bool | None = None
    ) -> tuple[list[Project], int]:
        query = select(Project).where(Project.owner_id == owner_id)
        
        if search:
            query = query.where(Project.name.ilike(f"%{search}%"))
        if building_type:
            query = query.where(Project.building_type == building_type)
        if status:
            query = query.where(Project.status == status)
        if is_favorite is not None:
            query = query.where(Project.is_favorite == is_favorite)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Fetch offset and limits ordered by created_at desc
        query = query.order_by(Project.created_at.desc()).offset(skip).limit(limit)
        results = await db.execute(query)
        items = list(results.scalars().all())

        return items, total

    @staticmethod
    async def update_project(
        db: AsyncSession,
        project_id: str,
        owner_id: str,
        project_in: ProjectUpdate
    ) -> Project | None:
        project = await ProjectService.get_project(db, project_id, owner_id)
        if not project:
            return None
        
        update_data = project_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(project, key, value)
            
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: str, owner_id: str) -> bool:
        project = await ProjectService.get_project(db, project_id, owner_id)
        if not project:
            return False
        await db.delete(project)
        await db.commit()
        return True

    @staticmethod
    async def duplicate_project(db: AsyncSession, project_id: str, owner_id: str) -> Project | None:
        project = await ProjectService.get_project(db, project_id, owner_id)
        if not project:
            return None
            
        duplicated = Project(
            id=str(uuid.uuid4()),
            name=f"Copy of {project.name}",
            building_type=project.building_type,
            status=project.status,
            is_favorite=False,
            owner_id=owner_id
        )
        db.add(duplicated)
        await db.commit()
        await db.refresh(duplicated)
        return duplicated
