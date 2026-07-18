"""
BuildWise AI — Enhanced Scale Detector
========================================
Multi-method scale detection for floor plan calibration.
Converts pixel measurements to real-world meters.

Methods (in priority order):
1. OCR-based: Reads "Scale 1:100" text from the drawing
2. Dimension calibration: Matches OCR dimensions to room polygon sizes
3. Door heuristic: Standard door width (≈0.9m) calibrated from detected doors
4. User override: Manual scale specification
"""

import math
from typing import Dict, Any, Optional, List, Tuple


class ScaleDetector:
    """Multi-method drawing scale detection and calibration."""

    # Default scale if all detection methods fail
    DEFAULT_SCALE = 0.015  # meters per pixel (roughly works for 300 DPI at 1:100)

    # Standard architectural dimensions for heuristic calibration
    STANDARD_DOOR_WIDTH_M = 0.9     # Standard interior door width
    STANDARD_DOOR_HEIGHT_M = 2.1    # Standard door height
    STANDARD_WINDOW_WIDTH_M = 1.2   # Common window width

    @staticmethod
    def detect(
        ocr_data: Dict[str, Any],
        rooms: Optional[List[Dict[str, Any]]] = None,
        doors: Optional[List[Dict[str, Any]]] = None,
        image_dimensions: Optional[Tuple[int, int]] = None,
        user_scale: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Detect or calculate the drawing scale factor (meters per pixel).

        Args:
            ocr_data: Output from OcrReader.extract()
            rooms: List of room candidates from RoomExtractor
            doors: List of detected doors (from furniture detector)
            image_dimensions: (width, height) of the processed image
            user_scale: Optional user-specified scale override

        Returns:
            Dict with scale_factor, method used, confidence, and calibration details.
        """
        results = []

        # ── Method 0: User override (highest priority) ───────────────────
        if user_scale and user_scale > 0:
            return {
                "scale_factor": user_scale,
                "method": "user_override",
                "confidence": 1.0,
                "details": {"user_specified": user_scale},
            }

        # ── Method 1: OCR-based scale text ───────────────────────────────
        scale_info = ocr_data.get("scale_info")
        if scale_info:
            ratio = scale_info.get("ratio", 100)
            m_per_px = scale_info.get("m_per_px_at_300dpi", ScaleDetector.DEFAULT_SCALE)

            # Adjust for actual image DPI if available
            if image_dimensions:
                # Heuristic: if image is very large (>4000px), likely higher DPI
                max_dim = max(image_dimensions)
                if max_dim > 5000:
                    dpi_factor = 300 / 150  # Assume 150 DPI scan
                elif max_dim > 3000:
                    dpi_factor = 1.0  # Assume 300 DPI
                else:
                    dpi_factor = 300 / 72  # Assume screen resolution
                m_per_px *= (1 / dpi_factor) if dpi_factor != 0 else 1.0

            results.append({
                "scale_factor": m_per_px,
                "method": "ocr_scale_text",
                "confidence": 0.90,
                "details": {
                    "scale_ratio": f"1:{ratio}",
                    "raw_text": scale_info.get("raw_text"),
                },
            })

        # ── Method 2: Dimension calibration ──────────────────────────────
        dimensions = ocr_data.get("parsed_dimensions", [])
        if dimensions and rooms:
            calibration = ScaleDetector._calibrate_from_dimensions(dimensions, rooms)
            if calibration:
                results.append(calibration)

        # ── Method 3: Area label calibration ─────────────────────────────
        area_labels = ocr_data.get("area_labels", [])
        if area_labels and rooms:
            area_cal = ScaleDetector._calibrate_from_area_labels(area_labels, rooms)
            if area_cal:
                results.append(area_cal)

        # ── Method 4: Door width heuristic ───────────────────────────────
        if doors:
            door_cal = ScaleDetector._calibrate_from_doors(doors)
            if door_cal:
                results.append(door_cal)

        # ── Select best result ───────────────────────────────────────────
        if results:
            # Sort by confidence descending
            results.sort(key=lambda r: r["confidence"], reverse=True)
            best = results[0]

            # Cross-validate: if multiple methods agree, boost confidence
            if len(results) >= 2:
                scales = [r["scale_factor"] for r in results]
                mean_scale = sum(scales) / len(scales)
                deviation = max(abs(s - mean_scale) / mean_scale for s in scales) if mean_scale > 0 else 1.0

                if deviation < 0.2:  # Within 20% agreement
                    best["confidence"] = min(0.98, best["confidence"] + 0.05)
                    best["details"]["cross_validated"] = True
                    best["details"]["methods_agree"] = len(results)

            best["all_methods"] = results
            return best

        # ── Fallback ─────────────────────────────────────────────────────
        return {
            "scale_factor": ScaleDetector.DEFAULT_SCALE,
            "method": "default_fallback",
            "confidence": 0.30,
            "details": {
                "note": "No scale detection succeeded; using default 0.015 m/px"
            },
        }

    @staticmethod
    def _calibrate_from_dimensions(
        dimensions: List[Dict[str, Any]],
        rooms: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Calibrate scale by matching OCR dimension text to room polygon size.
        If OCR says "4.5m x 3.6m" and the room polygon is 300px x 240px,
        then scale = 4.5/300 = 0.015 m/px.
        """
        for dim in dimensions:
            room_id = dim.get("room_id")
            if not room_id:
                continue

            # Find matching room
            target_room = None
            for room in rooms:
                if room.get("id") == room_id:
                    target_room = room
                    break

            if not target_room:
                continue

            # Get room bounding box dimensions in pixels
            bbox = target_room.get("bounding_box")
            if not bbox or len(bbox) < 4:
                continue

            room_width_px = bbox[2]  # width
            room_height_px = bbox[3]  # height

            if room_width_px <= 0 or room_height_px <= 0:
                continue

            dim_w = dim.get("width_m", 0)
            dim_h = dim.get("height_m", 0)

            if dim_w <= 0 or dim_h <= 0:
                continue

            # Calculate scale factors from both dimensions
            # Try both orientations (dimension might not align with bbox)
            scale_options = [
                dim_w / room_width_px,
                dim_h / room_height_px,
                dim_w / room_height_px,
                dim_h / room_width_px,
            ]

            # Filter reasonable scales (0.001 to 0.1 m/px)
            valid_scales = [s for s in scale_options if 0.001 < s < 0.1]

            if not valid_scales:
                continue

            # Pick the pair that gives most consistent results
            best_scale = sum(valid_scales[:2]) / min(2, len(valid_scales))

            return {
                "scale_factor": best_scale,
                "method": "dimension_calibration",
                "confidence": 0.85,
                "details": {
                    "reference_room": room_id,
                    "ocr_dimension": f"{dim_w}m x {dim_h}m",
                    "room_size_px": f"{room_width_px} x {room_height_px}",
                },
            }

        return None

    @staticmethod
    def _calibrate_from_area_labels(
        area_labels: List[Dict[str, Any]],
        rooms: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Calibrate from area labels (e.g., '16.2 sq.m')."""
        for label in area_labels:
            room_id = label.get("room_id")
            if not room_id:
                continue

            target_room = None
            for room in rooms:
                if room.get("id") == room_id:
                    target_room = room
                    break

            if not target_room:
                continue

            area_m2 = label.get("area_m2", 0)
            area_px2 = target_room.get("area_px2", 0)

            if area_m2 <= 0 or area_px2 <= 0:
                continue

            # scale² = area_m2 / area_px2
            scale = math.sqrt(area_m2 / area_px2)

            if 0.001 < scale < 0.1:
                return {
                    "scale_factor": scale,
                    "method": "area_label_calibration",
                    "confidence": 0.80,
                    "details": {
                        "reference_room": room_id,
                        "area_label": f"{area_m2} m²",
                        "area_px2": area_px2,
                    },
                }

        return None

    @staticmethod
    def _calibrate_from_doors(
        doors: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Calibrate from detected door dimensions (standard door ≈ 0.9m wide)."""
        door_widths_px = []

        for door in doors:
            box = door.get("box", door.get("bbox", []))
            if len(box) >= 4:
                if isinstance(box[0], (list, tuple)):
                    # [[x1,y1], [x2,y2], ...]
                    xs = [p[0] for p in box]
                    ys = [p[1] for p in box]
                    w = max(xs) - min(xs)
                    h = max(ys) - min(ys)
                else:
                    # [x1, y1, x2, y2]
                    w = abs(box[2] - box[0])
                    h = abs(box[3] - box[1])

                # Door width is the smaller dimension
                door_width = min(w, h)
                if door_width > 10:  # Filter noise
                    door_widths_px.append(door_width)

        if not door_widths_px:
            return None

        # Use median door width for robustness
        median_width = sorted(door_widths_px)[len(door_widths_px) // 2]
        scale = ScaleDetector.STANDARD_DOOR_WIDTH_M / median_width

        if 0.001 < scale < 0.1:
            return {
                "scale_factor": scale,
                "method": "door_width_heuristic",
                "confidence": 0.60,
                "details": {
                    "median_door_width_px": median_width,
                    "assumed_door_width_m": ScaleDetector.STANDARD_DOOR_WIDTH_M,
                    "doors_sampled": len(door_widths_px),
                },
            }

        return None

    @staticmethod
    def apply_scale(
        rooms: List[Dict[str, Any]],
        scale_factor: float,
    ) -> List[Dict[str, Any]]:
        """
        Apply scale factor to convert room measurements from pixels to meters.
        Updates area_m2, perimeter_m, and wall_lengths_m for each room.
        """
        for room in rooms:
            room["area_m2"] = round(room.get("area_px2", 0) * (scale_factor ** 2), 2)
            room["perimeter_m"] = round(room.get("perimeter_px", 0) * scale_factor, 2)
            room["wall_lengths_m"] = [
                round(wl * scale_factor, 2)
                for wl in room.get("wall_lengths_px", [])
            ]
            # Also compute length/width from bounding box
            bbox = room.get("bounding_box", (0, 0, 0, 0))
            room["length_m"] = round(bbox[2] * scale_factor, 2)
            room["width_m"] = round(bbox[3] * scale_factor, 2)

        return rooms
