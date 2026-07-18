import pytest
from app.ai.scale_detector import ScaleDetector

def test_scale_detector_user_override():
    ocr_data = {}
    result = ScaleDetector.detect(ocr_data, user_scale=0.025)
    assert result["scale_factor"] == 0.025
    assert result["method"] == "user_override"
    assert result["confidence"] == 1.0

def test_scale_detector_consensus_ocr_text():
    ocr_data = {
        "scale_info": {
            "ratio": 100,
            "m_per_px_at_300dpi": 0.00847,
            "raw_text": "SCALE 1:100"
        }
    }
    # No rooms or doors, just ocr_scale_text
    result = ScaleDetector.detect(ocr_data, image_dimensions=(3000, 2000))
    assert result["scale_factor"] == 0.00847
    assert result["method"] == "ocr_scale_text"
    assert result["confidence"] == 0.90

def test_scale_detector_dimension_consensus():
    ocr_data = {
        "parsed_dimensions": [
            {
                "room_id": "room_001",
                "width_m": 3.0,
                "height_m": 4.0
            }
        ]
    }
    rooms = [
        {
            "id": "room_001",
            "bounding_box": (100, 100, 300, 400), # 300px wide, 400px high -> scale = 3.0/300 = 0.01
            "area_px2": 120000
        }
    ]
    # One room dimension matching
    result = ScaleDetector.detect(ocr_data, rooms=rooms)
    assert abs(result["scale_factor"] - 0.01) < 0.001
    assert result["status"] == "success"

def test_scale_detector_inconsistent_scales():
    # OCR Scale text says 1:100 (0.00847), but room dimensions say 0.02
    ocr_data = {
        "scale_info": {
            "ratio": 100,
            "m_per_px_at_300dpi": 0.00847,
            "raw_text": "SCALE 1:100"
        },
        "parsed_dimensions": [
            {
                "room_id": "room_001",
                "width_m": 6.0,
                "height_m": 8.0
            }
        ]
    }
    rooms = [
        {
            "id": "room_001",
            "bounding_box": (100, 100, 300, 400), # 300px x 400px -> scale = 6.0/300 = 0.02
            "area_px2": 120000
        }
    ]
    # Consensus should detect conflict (>10% discrepancy)
    result = ScaleDetector.detect(ocr_data, rooms=rooms)
    assert result["status"] == "error"
    assert result["error_code"] == "SCALE_INCONSISTENT"
