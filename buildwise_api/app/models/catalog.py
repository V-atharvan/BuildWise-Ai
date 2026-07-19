import uuid
from sqlalchemy import Column, String, ForeignKey, Float
from app.db.database import Base

class BricksCatalog(Base):
    __tablename__ = "bricks_catalog"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    dimensions = Column(String, nullable=False)
    rate = Column(Float, nullable=False)
    supplier = Column(String, nullable=True)
    density = Column(Float, nullable=True)


class CementCatalog(Base):
    __tablename__ = "cement_catalog"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    brand = Column(String, nullable=False)
    grade = Column(String, nullable=False) # e.g., OPC 53, PPC
    bag_weight = Column(Float, default=50.00)
    rate = Column(Float, nullable=False)


class SteelCatalog(Base):
    __tablename__ = "steel_catalog"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    brand = Column(String, nullable=False)
    grade = Column(String, nullable=False) # e.g., Fe500, Fe550D
    diameter = Column(String, nullable=True)
    rate = Column(Float, nullable=False)


class SandCatalog(Base):
    __tablename__ = "sand_catalog"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    type = Column(String, nullable=False) # e.g., River Sand, M-Sand
    unit = Column(String, default="m3")
    rate = Column(Float, nullable=False)


class AggregateCatalog(Base):
    __tablename__ = "aggregate_catalog"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    type = Column(String, nullable=False)
    size = Column(String, nullable=False) # e.g., 10mm, 20mm
    rate = Column(Float, nullable=False)


class ProjectMaterialSelection(Base):
    __tablename__ = "project_material_selections"

    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    brick_id = Column(String, ForeignKey("bricks_catalog.id", ondelete="SET NULL"), nullable=True)
    cement_id = Column(String, ForeignKey("cement_catalog.id", ondelete="SET NULL"), nullable=True)
    steel_id = Column(String, ForeignKey("steel_catalog.id", ondelete="SET NULL"), nullable=True)
    sand_id = Column(String, ForeignKey("sand_catalog.id", ondelete="SET NULL"), nullable=True)
    aggregate_id = Column(String, ForeignKey("aggregate_catalog.id", ondelete="SET NULL"), nullable=True)
