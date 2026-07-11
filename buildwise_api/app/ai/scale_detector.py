import re

class ScaleDetector:
    @staticmethod
    def detect_drawing_scale(ocr_data: dict, room_elements: list) -> float:
        """
        Calculates scale factors representing real-world meters per drawing pixel.
        Default standard: 0.02 meters per pixel (roughly 50 pixels = 1 meter).
        """
        scale_factor = 0.02
        text_readings = ocr_data.get("all_text_readings", [])
        
        # 1. Search text annotations directly for scale format e.g. "Scale 1:100"
        for item in text_readings:
            text = item.get("text", "")
            match = re.search(r'scale\s*1\s*:\s*(\d+)', text, re.IGNORECASE)
            if match:
                ratio = int(match.group(1))
                # 1:100 scale usually translates to a default px density, say 1px = 0.01m
                return ratio / 10000.0

        # 2. Heuristics: compare OCR text dimensions (e.g. "4.5m") with bounding box width
        parsed_dims = ocr_data.get("parsed_dimensions", [])
        for dim in parsed_dims:
            raw = dim.get("raw_text", "")
            # Locate corresponding room bounding box that matches raw text coordinate range
            for element in room_elements:
                box = element.get("box", [])
                label = element.get("label", "")
                if len(box) == 4 and label.lower() in raw.lower() or "bedroom" in label.lower():
                    box_width_px = box[2] - box[0]
                    target_width_m = dim.get("width")
                    if box_width_px > 0 and target_width_m:
                        # factor = meters / pixels
                        return target_width_m / box_width_px

        return scale_factor
