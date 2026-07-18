import pytest
from app.engine.material_engine import MaterialEngine

def test_material_engine_calculations():
    # Test takeoff calculations with input parameters and detected rooms/walls
    params = {
        "num_floors": 1,
        "floor_height_m": 3.0,
        "wall_thickness_m": 0.23,
        "slab_thickness_m": 0.125,
        "concrete_grade": "M20",
        "steel_grade": "Fe500",
        "foundation_type": "isolated",
        "brick_type": "red_brick",
        "waste_percentage": 5.0,
        "wall_length_m": 45.0, # 45 meters of wall length
        "rooms": [
            {"id": "room_001", "label": "Bedroom", "area_m2": 16.0, "perimeter_m": 16.0},
            {"id": "room_002", "label": "Kitchen", "area_m2": 12.0, "perimeter_m": 14.0}
        ],
        "doors_count": 4,
        "windows_count": 4
    }
    
    result = MaterialEngine.run_estimation(params)
    
    # Assert keys are in result
    assert "concrete_volume_m3" in result
    assert "steel_weight_kg" in result
    assert "bricks_count" in result
    assert "cement_bags" in result
    assert "sand_volume_m3" in result
    assert "aggregate_volume_m3" in result
    
    # Check that bricks_count is greater than 0 and reflects wall length
    assert result["bricks_count"] > 0
    assert result["concrete_volume_m3"] > 0
