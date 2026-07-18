"""
BuildWise AI — Analysis Schemas
=================================
Pydantic models for the multi-stage pipeline output,
correction requests, and BOQ data structures.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime


# ══════════════════════════════════════════════════════════════════════════════
# Core Geometry Models
# ══════════════════════════════════════════════════════════════════════════════

class PointSchema(BaseModel):
    x: float
    y: float


class ConfidenceDetail(BaseModel):
    value: float = 0.0
    source: str = ""


class ConfidenceScore(BaseModel):
    overall: float = 0.0
    ocr: Optional[ConfidenceDetail] = None
    furniture: Optional[ConfidenceDetail] = None
    geometry: Optional[ConfidenceDetail] = None
    adjacency: Optional[ConfidenceDetail] = None


class RoomClassification(BaseModel):
    classified_label: str
    confidence: ConfidenceScore
    low_confidence_flag: bool = False
    reason: str = ""
    all_candidates: Optional[Dict[str, float]] = None


class RoomPolygon(BaseModel):
    id: str
    polygon: List[List[float]]  # List of [x, y] coordinate pairs
    area_px2: float = 0.0
    area_m2: float = 0.0
    perimeter_px: float = 0.0
    perimeter_m: float = 0.0
    centroid: List[float] = Field(default_factory=list)  # [x, y]
    wall_lengths_px: List[float] = Field(default_factory=list)
    wall_lengths_m: List[float] = Field(default_factory=list)
    bounding_box: List[int] = Field(default_factory=list)  # [x, y, w, h]
    aspect_ratio: float = 1.0
    num_vertices: int = 0
    label: str = "Room"
    length_m: float = 0.0
    width_m: float = 0.0
    classification: Optional[RoomClassification] = None


class WallSegment(BaseModel):
    id: str
    start: List[float]  # [x, y]
    end: List[float]    # [x, y]
    length_px: float = 0.0
    thickness_px: float = 0.0
    angle_deg: float = 0.0
    wall_type: str = "internal"  # 'external' or 'internal'
    polygon_coords: List[List[float]] = Field(default_factory=list)


class FurnitureItem(BaseModel):
    label: str
    category: str = ""
    confidence: float = 0.0
    box: List[int] = Field(default_factory=list)  # [x1, y1, x2, y2]
    center: List[float] = Field(default_factory=list)  # [x, y]
    room_id: Optional[str] = None
    source: str = "yolo"


class DoorDetection(BaseModel):
    label: str = "door"
    confidence: float = 0.0
    box: List[int] = Field(default_factory=list)
    center: List[float] = Field(default_factory=list)
    room_id: Optional[str] = None
    source: str = "contour_arc"


class WindowDetection(BaseModel):
    label: str = "window"
    confidence: float = 0.0
    box: List[int] = Field(default_factory=list)
    center: List[float] = Field(default_factory=list)
    room_id: Optional[str] = None
    source: str = "parallel_lines"


# ══════════════════════════════════════════════════════════════════════════════
# Pipeline Result
# ══════════════════════════════════════════════════════════════════════════════

class PipelineMetadata(BaseModel):
    version: str = "2.0.0"
    stages_completed: int = 0
    stage_timings_sec: Dict[str, float] = Field(default_factory=dict)
    total_duration_sec: float = 0.0
    extraction_method: str = ""
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class ConfidenceSummary(BaseModel):
    total_rooms: int = 0
    average_confidence: float = 0.0
    min_confidence: float = 0.0
    max_confidence: float = 0.0
    high_confidence_count: int = 0
    medium_confidence_count: int = 0
    low_confidence_count: int = 0
    flagged_for_review: int = 0


class FlaggedRoom(BaseModel):
    room_id: str
    current_label: str
    confidence: float
    flag_level: str  # 'review' or 'critical'
    reason: str = ""
    suggestion: str = ""
    alternative_labels: List[Dict[str, Any]] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    """Complete analysis result from the multi-stage pipeline."""
    # Core detections
    rooms: List[Dict[str, Any]] = Field(default_factory=list)
    walls: List[Dict[str, Any]] = Field(default_factory=list)
    doors: List[Dict[str, Any]] = Field(default_factory=list)
    windows: List[Dict[str, Any]] = Field(default_factory=list)
    furniture: List[Dict[str, Any]] = Field(default_factory=list)

    # Measurements
    scale_factor_m_per_px: float = 0.015
    building_area_sq_m: float = 0.0
    building_area_sq_ft: float = 0.0
    wall_length_m: float = 0.0

    # Counts
    room_count: int = 0
    door_count: int = 0
    window_count: int = 0
    column_count: int = 0
    beam_count: int = 0

    # Confidence
    confidence_summary: Dict[str, Any] = Field(default_factory=dict)
    flagged_rooms: List[Dict[str, Any]] = Field(default_factory=list)
    needs_user_review: bool = False

    # Pipeline metadata
    pipeline: Dict[str, Any] = Field(default_factory=dict)

    # Corrections
    corrections_applied: List[Dict[str, Any]] = Field(default_factory=list)


# ══════════════════════════════════════════════════════════════════════════════
# Correction Requests
# ══════════════════════════════════════════════════════════════════════════════

class RenameRoomRequest(BaseModel):
    room_id: str
    new_label: str


class MergeRoomsRequest(BaseModel):
    room_id_a: str
    room_id_b: str
    merged_label: Optional[str] = None


class SplitRoomRequest(BaseModel):
    room_id: str
    split_line_start: List[float]  # [x, y]
    split_line_end: List[float]    # [x, y]
    label_a: Optional[str] = None
    label_b: Optional[str] = None


class AddRoomRequest(BaseModel):
    polygon: List[List[float]]  # [[x1,y1], [x2,y2], ...]
    label: str


class AddWallRequest(BaseModel):
    start: List[float]  # [x, y]
    end: List[float]    # [x, y]
    thickness_px: float = 10.0


# ══════════════════════════════════════════════════════════════════════════════
# BOQ Models
# ══════════════════════════════════════════════════════════════════════════════

class BOQLineItem(BaseModel):
    sl_no: int
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    category: str = ""  # structural, masonry, finishing, mep, etc.
    room_name: Optional[str] = None


class BOQSection(BaseModel):
    section_name: str
    items: List[BOQLineItem] = Field(default_factory=list)
    subtotal: float = 0.0


class BOQReport(BaseModel):
    project_id: str
    title: str = "Bill of Quantities"
    generated_at: Optional[str] = None
    sections: List[BOQSection] = Field(default_factory=list)
    grand_total: float = 0.0
    currency: str = "INR"
    room_wise_boq: Optional[List[Dict[str, Any]]] = None
    floor_wise_boq: Optional[List[Dict[str, Any]]] = None
