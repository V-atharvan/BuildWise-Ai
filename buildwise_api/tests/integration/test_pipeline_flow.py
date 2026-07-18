import os
import tempfile
import cv2
import numpy as np
import pytest
from app.ai.pipeline import AiPipeline

def test_pipeline_integration_flow():
    # 1. Create a temporary image representing a simple floor plan
    # A 600x600 black image with a white hollow square (outer walls)
    img = np.zeros((600, 600, 3), dtype=np.uint8)
    # Draw a white wall box (walls are white 255, background is black 0)
    # Wall from (100, 100) to (500, 500), thickness 15px
    cv2.rectangle(img, (100, 100), (500, 500), (255, 255, 255), 15)
    
    # Save to a temporary file
    temp_dir = tempfile.gettempdir()
    temp_image_path = os.path.join(temp_dir, "mock_floorplan.png")
    cv2.imwrite(temp_image_path, img)
    
    try:
        # 2. Run the pipeline on the mock image
        # Provide user_scale=0.02 (2cm per pixel) to bypass scale consensus failure (since there's no OCR text)
        result = AiPipeline.run_analysis(temp_image_path, user_scale=0.02, debug_mode=True)
        
        # 3. Assertions to verify the pipeline outputs
        assert "rooms" in result
        assert "walls" in result
        assert "doors" in result
        assert "windows" in result
        assert "scale_factor_m_per_px" in result
        assert "building_area_sq_m" in result
        assert "validation_report" in result
        assert "pipeline" in result
        
        # Verify the scale factor was applied correctly
        assert result["scale_factor_m_per_px"] == 0.02
        
        # Check that debug artifacts were generated
        debug_folder = os.path.join(temp_dir, "debug")
        assert os.path.exists(debug_folder)
        assert os.path.exists(os.path.join(debug_folder, "original.png"))
        assert os.path.exists(os.path.join(debug_folder, "binary.png"))
        assert os.path.exists(os.path.join(debug_folder, "report.json"))
        assert os.path.exists(os.path.join(debug_folder, "validation.json"))

    finally:
        # Clean up files
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
        
        # Clean up debug folder contents
        debug_folder = os.path.join(temp_dir, "debug")
        if os.path.exists(debug_folder):
            for file in os.listdir(debug_folder):
                os.remove(os.path.join(debug_folder, file))
            os.rmdir(debug_folder)
