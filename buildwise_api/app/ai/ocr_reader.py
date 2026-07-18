"""
BuildWise AI — Stage 4: Enhanced OCR Reader
=============================================
OCR runs AFTER room extraction. Reads room names, dimensions, area labels,
scale information, and north symbols from the floor plan image.

Maps detected text to specific room polygons using point-in-polygon tests.
Uses EasyOCR as primary engine with Tesseract fallback.
"""

import re
import math
from typing import List, Dict, Any, Tuple, Optional


# ── Known Room Names / Keywords ──────────────────────────────────────────────
ROOM_KEYWORDS = {
    "bedroom", "bed room", "bed", "br", "master bedroom", "master bed",
    "kitchen", "kit", "modular kitchen",
    "living room", "living", "hall", "drawing room", "drawing",
    "dining room", "dining", "dinning",
    "bathroom", "bath room", "bath", "toilet", "wc", "w.c", "w/c",
    "washroom", "wash room", "lavatory", "latrine",
    "balcony", "deck", "terrace", "verandah", "veranda", "sit out", "sitout",
    "store", "store room", "storeroom", "storage",
    "utility", "utility room", "service",
    "passage", "corridor", "lobby", "foyer", "entrance",
    "staircase", "stairs", "stair", "lift", "elevator",
    "pooja", "pooja room", "puja", "mandir",
    "study", "study room", "office", "home office",
    "guest room", "guest",
    "parking", "garage", "car park",
    "garden", "lawn", "courtyard",
    "common area", "common",
}

# Normalized mapping from keyword variations to canonical names
ROOM_NAME_NORMALIZATION = {
    "bed room": "Bedroom", "bed": "Bedroom", "br": "Bedroom",
    "bedroom": "Bedroom", "master bedroom": "Master Bedroom",
    "master bed": "Master Bedroom",
    "kitchen": "Kitchen", "kit": "Kitchen", "modular kitchen": "Kitchen",
    "living room": "Living Room", "living": "Living Room",
    "hall": "Living Room", "drawing room": "Living Room", "drawing": "Living Room",
    "dining room": "Dining Room", "dining": "Dining Room", "dinning": "Dining Room",
    "bathroom": "Bathroom", "bath room": "Bathroom", "bath": "Bathroom",
    "toilet": "Toilet", "wc": "Toilet", "w.c": "Toilet", "w/c": "Toilet",
    "washroom": "Bathroom", "wash room": "Bathroom", "lavatory": "Toilet",
    "latrine": "Toilet",
    "balcony": "Balcony", "deck": "Balcony", "terrace": "Balcony",
    "verandah": "Balcony", "veranda": "Balcony", "sit out": "Balcony",
    "sitout": "Balcony",
    "store": "Store Room", "store room": "Store Room", "storeroom": "Store Room",
    "storage": "Store Room",
    "utility": "Utility", "utility room": "Utility", "service": "Utility",
    "passage": "Passage", "corridor": "Passage", "lobby": "Lobby",
    "foyer": "Lobby", "entrance": "Lobby",
    "staircase": "Staircase", "stairs": "Staircase", "stair": "Staircase",
    "lift": "Lift", "elevator": "Lift",
    "pooja": "Pooja Room", "pooja room": "Pooja Room", "puja": "Pooja Room",
    "mandir": "Pooja Room",
    "study": "Study", "study room": "Study", "office": "Study",
    "home office": "Study",
    "guest room": "Guest Room", "guest": "Guest Room",
    "parking": "Parking", "garage": "Parking", "car park": "Parking",
    "garden": "Garden", "lawn": "Garden", "courtyard": "Courtyard",
    "common area": "Common Area", "common": "Common Area",
}

# ── Dimension Patterns ──────────────────────────────────────────────────────
DIMENSION_PATTERNS = [
    # Metric: "4.5m x 3.6m", "4.5 x 3.6 m", "4500 x 3600"
    re.compile(
        r'(\d+(?:\.\d+)?)\s*(?:m|M|mtr|meter|metre)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:m|M|mtr|meter|metre)?',
        re.IGNORECASE,
    ),
    # Feet-inches: "15'0\" x 12'0\"", "15'-0\" x 12'-0\""
    re.compile(
        r"(\d+)['′]\s*-?\s*(\d+)?[\"″]?\s*[xX×]\s*(\d+)['′]\s*-?\s*(\d+)?[\"″]?",
    ),
    # Millimeters: "4500x3600", "4500 x 3600 mm"
    re.compile(
        r'(\d{3,5})\s*[xX×]\s*(\d{3,5})\s*(?:mm|MM)?',
    ),
    # Single dimension with unit: "4.5m", "15'0\""
    re.compile(
        r'(\d+(?:\.\d+)?)\s*(?:m|M|mtr|meter|metre)\b',
        re.IGNORECASE,
    ),
]

# Scale patterns
SCALE_PATTERNS = [
    re.compile(r'scale\s*[:=]?\s*1\s*[:]\s*(\d+)', re.IGNORECASE),
    re.compile(r'1\s*[:]\s*(\d+)\s*(?:scale)?', re.IGNORECASE),
]

# Area label patterns
AREA_PATTERNS = [
    re.compile(r'(\d+(?:\.\d+)?)\s*(?:sq\.?\s*m|m²|sqm)', re.IGNORECASE),
    re.compile(r'(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft|ft²|sft|sqft)', re.IGNORECASE),
]


class OcrReader:
    """Enhanced OCR engine with text-to-room mapping."""

    @staticmethod
    def extract(
        image_path: str,
        rooms: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run OCR on the floor plan image and map results to room polygons.

        Args:
            image_path: Path to the original (non-binary) color image.
            rooms: List of room candidates from RoomExtractor (for text mapping).

        Returns:
            Dict with all_text_readings, room_name_mappings, parsed_dimensions,
            scale_info, and area_labels.
        """
        # ── Run OCR ──────────────────────────────────────────────────────
        raw_readings = OcrReader._run_easyocr(image_path)

        # If EasyOCR returns too few results, try Tesseract backup
        if len(raw_readings) < 3:
            tesseract_readings = OcrReader._run_tesseract(image_path)
            # Merge results (avoid duplicates)
            raw_readings = OcrReader._merge_readings(raw_readings, tesseract_readings)

        # ── Parse and classify each text reading ─────────────────────────
        room_name_mappings = []
        parsed_dimensions = []
        scale_info = None
        area_labels = []
        north_symbol = None

        for reading in raw_readings:
            text = reading["text"].strip()
            center = reading.get("center", (0, 0))
            confidence = reading.get("confidence", 0.0)

            if not text or confidence < 0.3:
                continue

            # Check for room names
            room_name = OcrReader._match_room_name(text)
            if room_name:
                mapping = {
                    "detected_text": text,
                    "normalized_name": room_name,
                    "center": center,
                    "confidence": confidence,
                    "room_id": None,
                }

                # Map to room polygon if rooms are provided
                if rooms:
                    for room in rooms:
                        polygon = room.get("polygon", [])
                        if polygon and OcrReader._point_in_polygon(center, polygon):
                            mapping["room_id"] = room.get("id")
                            break

                room_name_mappings.append(mapping)

            # Check for dimensions
            dim = OcrReader._parse_dimension(text)
            if dim:
                dim["center"] = center
                dim["confidence"] = confidence
                dim["room_id"] = None

                if rooms:
                    for room in rooms:
                        polygon = room.get("polygon", [])
                        if polygon and OcrReader._point_in_polygon(center, polygon):
                            dim["room_id"] = room.get("id")
                            break

                parsed_dimensions.append(dim)

            # Check for scale
            if not scale_info:
                scale = OcrReader._parse_scale(text)
                if scale:
                    scale_info = scale

            # Check for area labels
            area = OcrReader._parse_area_label(text)
            if area:
                area["center"] = center
                area["room_id"] = None
                if rooms:
                    for room in rooms:
                        polygon = room.get("polygon", [])
                        if polygon and OcrReader._point_in_polygon(center, polygon):
                            area["room_id"] = room.get("id")
                            break
                area_labels.append(area)

            # Check for north symbol
            if text.upper() in ("N", "NORTH", "↑N"):
                north_symbol = {"text": text, "center": center}

        return {
            "all_text_readings": raw_readings,
            "room_name_mappings": room_name_mappings,
            "parsed_dimensions": parsed_dimensions,
            "scale_info": scale_info,
            "area_labels": area_labels,
            "north_symbol": north_symbol,
            "total_readings": len(raw_readings),
        }

    # ══════════════════════════════════════════════════════════════════════
    # OCR ENGINES
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _run_easyocr(image_path: str) -> List[Dict[str, Any]]:
        """Run EasyOCR on the image."""
        try:
            import easyocr

            reader = easyocr.Reader(["en"], gpu=False)
            results = reader.readtext(image_path)

            readings = []
            for bbox, text, prob in results:
                if prob > 0.3 and text.strip():
                    # Convert bbox to center point
                    box = [[int(pt[0]), int(pt[1])] for pt in bbox]
                    cx = sum(pt[0] for pt in box) / len(box)
                    cy = sum(pt[1] for pt in box) / len(box)

                    readings.append({
                        "text": text.strip(),
                        "confidence": float(prob),
                        "box": box,
                        "center": (cx, cy),
                        "source": "easyocr",
                    })

            return readings
        except Exception as e:
            print(f"[OCR] EasyOCR failed: {e}")
            return []

    @staticmethod
    def _run_tesseract(image_path: str) -> List[Dict[str, Any]]:
        """Run Tesseract OCR as fallback."""
        try:
            import pytesseract
            from PIL import Image

            img = Image.open(image_path)
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

            readings = []
            n_items = len(data["text"])
            for i in range(n_items):
                text = data["text"][i].strip()
                conf = int(data["conf"][i])

                if text and conf > 30:
                    x = data["left"][i]
                    y = data["top"][i]
                    w = data["width"][i]
                    h = data["height"][i]

                    readings.append({
                        "text": text,
                        "confidence": conf / 100.0,
                        "box": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                        "center": (x + w / 2, y + h / 2),
                        "source": "tesseract",
                    })

            return readings
        except Exception as e:
            print(f"[OCR] Tesseract failed: {e}")
            return []

    @staticmethod
    def _merge_readings(
        primary: List[Dict[str, Any]],
        secondary: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Merge OCR results from two engines, avoiding duplicates."""
        merged = list(primary)

        for sec_reading in secondary:
            is_duplicate = False
            for pri_reading in primary:
                # Check if centers are close (within 50px)
                dx = sec_reading["center"][0] - pri_reading["center"][0]
                dy = sec_reading["center"][1] - pri_reading["center"][1]
                if math.sqrt(dx * dx + dy * dy) < 50:
                    is_duplicate = True
                    break

            if not is_duplicate:
                merged.append(sec_reading)

        return merged

    # ══════════════════════════════════════════════════════════════════════
    # TEXT PARSING
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _match_room_name(text: str) -> Optional[str]:
        """Match text against known room name keywords."""
        text_lower = text.lower().strip()

        # Direct match
        if text_lower in ROOM_NAME_NORMALIZATION:
            return ROOM_NAME_NORMALIZATION[text_lower]

        # Partial match (text contains a keyword)
        for keyword, canonical in sorted(
            ROOM_NAME_NORMALIZATION.items(), key=lambda x: -len(x[0])
        ):
            if keyword in text_lower:
                return canonical

        return None

    @staticmethod
    def _parse_dimension(text: str) -> Optional[Dict[str, Any]]:
        """Parse dimension text into width/height values in meters."""
        text = text.strip()

        # Pattern 1: Metric (e.g., "4.5m x 3.6m", "4.5 x 3.6")
        match = DIMENSION_PATTERNS[0].search(text)
        if match:
            w, h = float(match.group(1)), float(match.group(2))
            # If values > 100, likely millimeters
            if w > 100 or h > 100:
                w /= 1000
                h /= 1000
            return {
                "raw_text": text,
                "width_m": w,
                "height_m": h,
                "area_m2": w * h,
                "format": "metric",
            }

        # Pattern 2: Feet-inches (e.g., "15'0\" x 12'0\"")
        match = DIMENSION_PATTERNS[1].search(text)
        if match:
            ft1 = int(match.group(1))
            in1 = int(match.group(2) or 0)
            ft2 = int(match.group(3))
            in2 = int(match.group(4) or 0)
            w = (ft1 + in1 / 12.0) * 0.3048  # Convert to meters
            h = (ft2 + in2 / 12.0) * 0.3048
            return {
                "raw_text": text,
                "width_m": round(w, 3),
                "height_m": round(h, 3),
                "area_m2": round(w * h, 3),
                "format": "imperial",
            }

        # Pattern 3: Millimeters (e.g., "4500x3600")
        match = DIMENSION_PATTERNS[2].search(text)
        if match:
            w = float(match.group(1)) / 1000
            h = float(match.group(2)) / 1000
            return {
                "raw_text": text,
                "width_m": w,
                "height_m": h,
                "area_m2": w * h,
                "format": "millimeter",
            }

        return None

    @staticmethod
    def _parse_scale(text: str) -> Optional[Dict[str, Any]]:
        """Parse scale information from text."""
        for pattern in SCALE_PATTERNS:
            match = pattern.search(text)
            if match:
                ratio = int(match.group(1))
                return {
                    "raw_text": text,
                    "ratio": ratio,
                    "description": f"1:{ratio}",
                    # Convert scale ratio to m/px factor
                    # At 1:100, 1mm on drawing = 100mm real = 0.1m
                    # At 300 DPI, 1px ≈ 0.085mm, so 1px = 0.085mm × 100 = 8.5mm = 0.0085m
                    "m_per_px_at_300dpi": (ratio * 0.0000847),
                }
        return None

    @staticmethod
    def _parse_area_label(text: str) -> Optional[Dict[str, Any]]:
        """Parse area labels like '16.2 sq.m' or '174 sq.ft'."""
        for i, pattern in enumerate(AREA_PATTERNS):
            match = pattern.search(text)
            if match:
                value = float(match.group(1))
                unit = "m2" if i == 0 else "sqft"
                area_m2 = value if unit == "m2" else value * 0.092903
                return {
                    "raw_text": text,
                    "value": value,
                    "unit": unit,
                    "area_m2": round(area_m2, 2),
                }
        return None

    @staticmethod
    def _point_in_polygon(
        point: Tuple[float, float],
        polygon: List,
    ) -> bool:
        """Ray-casting point-in-polygon test."""
        x, y = point[0], point[1]
        n = len(polygon)
        inside = False

        j = n - 1
        for i in range(n):
            # Handle both tuple and list coordinate formats
            if isinstance(polygon[i], (list, tuple)):
                xi, yi = float(polygon[i][0]), float(polygon[i][1])
            else:
                continue

            if isinstance(polygon[j], (list, tuple)):
                xj, yj = float(polygon[j][0]), float(polygon[j][1])
            else:
                j = i
                continue

            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
                inside = not inside
            j = i

        return inside
