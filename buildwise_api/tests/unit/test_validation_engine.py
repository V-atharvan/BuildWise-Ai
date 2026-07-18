import pytest
from app.ai.validation_engine import ValidationEngine

def test_validation_passed():
    # Rooms that don't overlap, walls that align
    rooms = [
        {"id": "room_001", "polygon": [[0, 0], [100, 0], [100, 100], [0, 100]], "area_px2": 10000},
        {"id": "room_002", "polygon": [[110, 0], [210, 0], [210, 100], [110, 100]], "area_px2": 10000}
    ]
    walls = [
        {"id": "wall_001", "start": (0, 0), "end": (100, 0), "thickness_px": 10.0},
        {"id": "wall_002", "start": (100, 0), "end": (100, 100), "thickness_px": 10.0},
        {"id": "wall_003", "start": (110, 0), "end": (210, 0), "thickness_px": 10.0}
    ]
    result = ValidationEngine.validate(
        rooms=rooms,
        walls=walls,
        doors=[],
        windows=[],
        scale_factor=0.01,
        image_dimensions=(1000, 1000)
    )
    assert result["passed"] is True
    assert len(result["errors"]) == 0

def test_validation_room_overlap_failure():
    # Overlapping rooms (>5% overlap)
    rooms = [
        {"id": "room_001", "polygon": [[0, 0], [100, 0], [100, 100], [0, 100]], "area_px2": 10000},
        {"id": "room_002", "polygon": [[50, 0], [150, 0], [150, 100], [50, 100]], "area_px2": 10000} # Overlaps by 50%
    ]
    walls = []
    result = ValidationEngine.validate(
        rooms=rooms,
        walls=walls,
        doors=[],
        windows=[],
        scale_factor=0.01,
        image_dimensions=(1000, 1000)
    )
    assert result["passed"] is False
    assert any(e["code"] == "ROOM_OVERLAP" for e in result["errors"])

def test_validation_floating_wall_warning():
    # Wall that doesn't touch any other wall
    rooms = []
    walls = [
        {"id": "wall_001", "start": (10, 10), "end": (100, 10), "thickness_px": 10.0},
        {"id": "wall_002", "start": (200, 200), "end": (300, 200), "thickness_px": 10.0}, # floating
        {"id": "wall_003", "start": (10, 10), "end": (10, 100), "thickness_px": 10.0},
        {"id": "wall_004", "start": (10, 100), "end": (100, 100), "thickness_px": 10.0}
    ]
    result = ValidationEngine.validate(
        rooms=rooms,
        walls=walls,
        doors=[],
        windows=[],
        scale_factor=0.01,
        image_dimensions=(1000, 1000)
    )
    assert any(w["code"] == "FLOATING_WALL" for w in result["warnings"])
