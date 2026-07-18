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
    """Multi-source scale consensus solver for floor plan calibration."""

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
        Consensus-driven drawing scale factor calculation (meters per pixel).
        Collects candidates, groups them by similarity (5% tolerance),
        and returns the consensus or raises a validation warning/error on conflict.
        """
        # ── Method 1: User override (highest priority, return immediately) ──
        if user_scale and user_scale > 0:
            return {
                "scale_factor": float(user_scale),
                "method": "user_override",
                "confidence": 1.0,
                "status": "success",
                "details": {"user_specified": user_scale},
            }

        candidates = []

        # ── Method 2: OCR-based scale text ───────────────────────────────
        scale_info = ocr_data.get("scale_info")
        if scale_info:
            ratio = scale_info.get("ratio", 100)
            m_per_px = scale_info.get("m_per_px_at_300dpi", ScaleDetector.DEFAULT_SCALE)

            # Adjust for actual image DPI if dimensions are known
            if image_dimensions:
                max_dim = max(image_dimensions)
                if max_dim > 5000:
                    dpi_factor = 300 / 150  # Assume 150 DPI scan
                elif max_dim >= 2000:
                    dpi_factor = 1.0  # Assume 300 DPI
                else:
                    dpi_factor = 300 / 72  # Assume screen resolution
                m_per_px *= (1 / dpi_factor) if dpi_factor != 0 else 1.0

            candidates.append({
                "scale_factor": float(m_per_px),
                "method": "ocr_scale_text",
                "confidence": 0.90,
                "details": {
                    "scale_ratio": f"1:{ratio}",
                    "raw_text": scale_info.get("raw_text"),
                },
            })

        # ── Method 3: Room Dimension calibration (robust multi-room check) ──
        dimensions = ocr_data.get("parsed_dimensions", [])
        if dimensions and rooms:
            for dim in dimensions:
                room_id = dim.get("room_id")
                if not room_id:
                    continue

                target_room = next((r for r in rooms if r.get("id") == room_id), None)
                if not target_room:
                    continue

                bbox = target_room.get("bounding_box")
                if not bbox or len(bbox) < 4:
                    continue

                room_width_px = bbox[2]
                room_height_px = bbox[3]
                if room_width_px <= 0 or room_height_px <= 0:
                    continue

                dim_w = dim.get("width_m", 0)
                dim_h = dim.get("height_m", 0)
                if dim_w <= 0 or dim_h <= 0:
                    continue

                # Check width-width/height-height vs width-height/height-width (aspect rotation)
                s1_w = dim_w / room_width_px
                s1_h = dim_h / room_height_px
                dev1 = abs(s1_w - s1_h) / max(s1_w, s1_h)

                s2_w = dim_w / room_height_px
                s2_h = dim_h / room_width_px
                dev2 = abs(s2_w - s2_h) / max(s2_w, s2_h)

                if dev1 < dev2 and dev1 < 0.15:
                    s_avg = (s1_w + s1_h) / 2
                    candidates.append({
                        "scale_factor": float(s_avg),
                        "method": f"dimension_calibration_{room_id}",
                        "confidence": 0.85,
                        "details": {
                            "room_id": room_id,
                            "ocr_dimension": f"{dim_w}m x {dim_h}m",
                            "room_size_px": f"{room_width_px} x {room_height_px}",
                        },
                    })
                elif dev2 < 0.15:
                    s_avg = (s2_w + s2_h) / 2
                    candidates.append({
                        "scale_factor": float(s_avg),
                        "method": f"dimension_calibration_{room_id}",
                        "confidence": 0.85,
                        "details": {
                            "room_id": room_id,
                            "ocr_dimension": f"{dim_w}m x {dim_h}m",
                            "room_size_px": f"{room_width_px} x {room_height_px}",
                            "rotated": True,
                        },
                    })

        # ── Method 4: Area label calibration ─────────────────────────────
        area_labels = ocr_data.get("area_labels", [])
        if area_labels and rooms:
            for label in area_labels:
                room_id = label.get("room_id")
                if not room_id:
                    continue

                target_room = next((r for r in rooms if r.get("id") == room_id), None)
                if not target_room:
                    continue

                area_m2 = label.get("area_m2", 0)
                area_px2 = target_room.get("area_px2", 0)
                if area_m2 > 0 and area_px2 > 0:
                    scale = math.sqrt(area_m2 / area_px2)
                    if 0.001 < scale < 0.1:
                        candidates.append({
                            "scale_factor": float(scale),
                            "method": f"area_label_calibration_{room_id}",
                            "confidence": 0.80,
                            "details": {
                                "room_id": room_id,
                                "area_label": f"{area_m2} m²",
                                "area_px2": area_px2,
                            },
                        })

        # ── Method 5: Door width heuristic ───────────────────────────────
        if doors:
            door_cal = ScaleDetector._calibrate_from_doors(doors)
            if door_cal:
                candidates.append(door_cal)

        # ── Scale Consensus Core Solver (5% tolerance grouping) ───────────
        if not candidates:
            # If no candidates at all, we return a fallback warning state
            return {
                "scale_factor": ScaleDetector.DEFAULT_SCALE,
                "method": "default_fallback",
                "confidence": 0.10,
                "status": "warning",
                "error_code": "SCALE_NOT_FOUND",
                "message": "No scale reference points (OCR texts, dimensions, doors) found in plan. Defaulting to 0.015 m/px.",
                "all_methods": []
            }

        tolerance = 0.05
        best_group = []
        best_group_score = -1.0

        for c1 in candidates:
            group = [c1]
            s1 = c1["scale_factor"]
            for c2 in candidates:
                if c1 is c2:
                    continue
                s2 = c2["scale_factor"]
                diff = abs(s1 - s2) / min(s1, s2)
                if diff <= tolerance:
                    group.append(c2)

            group_score = sum(c["confidence"] for c in group)
            if group_score > best_group_score:
                best_group_score = group_score
                best_group = group

        # Cross-validation and Conflict Detection
        # Check if there are other candidate groups that significantly conflict (diff > 10% and high score)
        conflicting_groups = []
        for c1 in candidates:
            if c1 in best_group:
                continue
            s1 = c1["scale_factor"]
            # Find mean of best_group
            best_group_mean = sum(c["scale_factor"] for c in best_group) / len(best_group)
            diff_from_best = abs(s1 - best_group_mean) / min(s1, best_group_mean)
            
            if diff_from_best > 0.10: # >10% discrepancy
                conflicting_groups.append(c1)

        # Calculate final consensus scale
        total_weight = sum(c["confidence"] for c in best_group)
        weighted_sum = sum(c["scale_factor"] * c["confidence"] for c in best_group)
        consensus_scale = weighted_sum / total_weight

        max_conf = max(c["confidence"] for c in best_group)
        bonus = 0.05 * (len(best_group) - 1)
        final_confidence = min(0.99, max_conf + bonus)

        # If a conflict exists with a high confidence source, mark scale as inconsistent/unreliable
        if conflicting_groups:
            high_conf_conflict = any(c["confidence"] >= 0.80 for c in conflicting_groups)
            if high_conf_conflict:
                return {
                    "scale_factor": float(consensus_scale),
                    "method": best_group[0]["method"],
                    "confidence": float(final_confidence * 0.5), # Penalize confidence
                    "status": "error",
                    "error_code": "SCALE_INCONSISTENT",
                    "message": f"Conflict detected. Primary consensus scale is {consensus_scale:.6f} m/px, but other source indicates a significantly different scale.",
                    "all_methods": candidates,
                    "best_group": best_group,
                }

        return {
            "scale_factor": float(consensus_scale),
            "method": best_group[0]["method"],
            "confidence": float(final_confidence),
            "status": "success",
            "all_methods": candidates,
            "best_group": best_group,
        }

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
                    xs = [p[0] for p in box]
                    ys = [p[1] for p in box]
                    w = max(xs) - min(xs)
                    h = max(ys) - min(ys)
                else:
                    w = abs(box[2] - box[0])
                    h = abs(box[3] - box[1])

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
                "scale_factor": float(scale),
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
            bbox = room.get("bounding_box", (0, 0, 0, 0))
            room["length_m"] = round(bbox[2] * scale_factor, 2)
            room["width_m"] = round(bbox[3] * scale_factor, 2)

        return rooms
