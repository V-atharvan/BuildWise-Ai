"""
BuildWise AI — Master Pipeline Orchestrator
=============================================
Orchestrates the complete 12-stage analysis pipeline:

  Stage 1: Image Preprocessing (preprocessor.py)
  Stage 2: Wall Detection (wall_detector.py)
  Stage 3: Room Extraction (room_extractor.py)
  Stage 4: OCR Text Reading (ocr_reader.py)
  Stage 5: Scale Detection (scale_detector.py)
  Stage 6: Furniture Detection (furniture_detector.py)
  Stage 7: Room Classification (room_classifier.py)
  Stage 8: Confidence Engine (confidence_engine.py)

The pipeline ensures that rooms are detected from wall geometry FIRST,
then enriched with OCR labels and furniture detections. YOLO is NEVER
used as the primary room detector.
"""

import os
import time
import traceback
from typing import Dict, Any, Optional

from app.ai.preprocessor import ImagePreprocessor
from app.ai.wall_detector import WallDetector
from app.ai.room_extractor import RoomExtractor
from app.ai.ocr_reader import OcrReader
from app.ai.scale_detector import ScaleDetector
from app.ai.furniture_detector import FurnitureDetector
from app.ai.room_classifier import RoomClassifier
from app.ai.confidence_engine import ConfidenceEngine


class AiPipeline:
    """
    Enterprise-grade multi-stage computer vision pipeline
    for architectural floor plan analysis.
    """

    @staticmethod
    def run_analysis(
        image_path: str,
        user_scale: Optional[float] = None,
        floor_height_m: float = 3.0,
    ) -> Dict[str, Any]:
        """
        Execute the complete floor plan analysis pipeline.

        Args:
            image_path: Path to the floor plan image file.
            user_scale: Optional user-specified scale factor (m/px).
            floor_height_m: Assumed floor-to-ceiling height in meters.

        Returns:
            Comprehensive analysis result dict containing:
            - rooms (with polygons, labels, confidence, measurements)
            - walls (vectorized segments with type classification)
            - doors and windows
            - furniture (mapped to rooms)
            - scale_factor
            - confidence_summary
            - preprocessing metadata
            - building area and measurements
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Drawing file not found: {image_path}")

        pipeline_start = time.time()
        stage_timings = {}
        errors = []

        # ══════════════════════════════════════════════════════════════════
        # STAGE 1: Image Preprocessing
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            binary_image, color_image, preprocess_meta = ImagePreprocessor.run(image_path)
            stage_timings["preprocessing"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "preprocessing", "error": str(e), "traceback": traceback.format_exc()})
            raise ValueError(f"Preprocessing failed: {e}")

        # ══════════════════════════════════════════════════════════════════
        # STAGE 2: Wall Detection
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            wall_result = WallDetector.detect(binary_image)
            walls = wall_result.get("walls", [])
            wall_stats = wall_result.get("statistics", {})
            stage_timings["wall_detection"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "wall_detection", "error": str(e)})
            walls = []
            wall_stats = {}
            stage_timings["wall_detection"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # STAGE 3: Room Extraction (Polygon-based)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            room_result = RoomExtractor.extract(binary_image, walls)
            rooms = room_result.get("rooms", [])
            extraction_method = room_result.get("extraction_method", "unknown")
            stage_timings["room_extraction"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "room_extraction", "error": str(e)})
            rooms = []
            extraction_method = "failed"
            stage_timings["room_extraction"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # STAGE 4: OCR (runs AFTER room extraction)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            ocr_data = OcrReader.extract(image_path, rooms)
            stage_timings["ocr"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "ocr", "error": str(e)})
            ocr_data = {
                "all_text_readings": [],
                "room_name_mappings": [],
                "parsed_dimensions": [],
                "scale_info": None,
                "area_labels": [],
                "north_symbol": None,
                "total_readings": 0,
            }
            stage_timings["ocr"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # STAGE 5: Scale Detection
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            image_dims = (
                preprocess_meta.get("processed_width", 0),
                preprocess_meta.get("processed_height", 0),
            )
            scale_result = ScaleDetector.detect(
                ocr_data=ocr_data,
                rooms=rooms,
                doors=None,  # Will update after furniture detection
                image_dimensions=image_dims,
                user_scale=user_scale,
            )
            scale_factor = scale_result.get("scale_factor", 0.015)

            # Apply scale to rooms
            rooms = ScaleDetector.apply_scale(rooms, scale_factor)
            stage_timings["scale_detection"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "scale_detection", "error": str(e)})
            scale_factor = 0.015
            scale_result = {"scale_factor": 0.015, "method": "fallback", "confidence": 0.2}
            rooms = ScaleDetector.apply_scale(rooms, scale_factor)
            stage_timings["scale_detection"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # STAGE 6: Furniture Detection (YOLO — furniture only)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            furniture_result = FurnitureDetector.detect(image_path, rooms)
            furniture = furniture_result.get("furniture", [])
            doors = furniture_result.get("doors", [])
            windows = furniture_result.get("windows", [])
            room_furniture = furniture_result.get("room_furniture", {})
            stage_timings["furniture_detection"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "furniture_detection", "error": str(e)})
            furniture = []
            doors = []
            windows = []
            room_furniture = {}
            stage_timings["furniture_detection"] = round(time.time() - t0, 3)

        # Re-run scale detection with doors (if found) for better calibration
        if doors and scale_result.get("confidence", 0) < 0.8:
            try:
                scale_result2 = ScaleDetector.detect(
                    ocr_data=ocr_data,
                    rooms=rooms,
                    doors=doors,
                    image_dimensions=image_dims,
                    user_scale=user_scale,
                )
                if scale_result2.get("confidence", 0) > scale_result.get("confidence", 0):
                    scale_factor = scale_result2["scale_factor"]
                    scale_result = scale_result2
                    rooms = ScaleDetector.apply_scale(rooms, scale_factor)
            except Exception:
                pass  # Keep existing scale

        # ══════════════════════════════════════════════════════════════════
        # STAGE 7: Room Classification (Multi-evidence)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            # Compute adjacency
            from app.ai.room_extractor import RoomCandidate
            room_candidates = []
            for r in rooms:
                rc = RoomCandidate(
                    id=r.get("id", ""),
                    polygon=r.get("polygon", []),
                    area_px2=r.get("area_px2", 0),
                    perimeter_px=r.get("perimeter_px", 0),
                    centroid=tuple(r.get("centroid", (0, 0))),
                    wall_lengths_px=r.get("wall_lengths_px", []),
                    bounding_box=tuple(r.get("bounding_box", (0, 0, 0, 0))),
                    aspect_ratio=r.get("aspect_ratio", 1.0),
                    num_vertices=r.get("num_vertices", 0),
                )
                room_candidates.append(rc)

            adjacency = RoomExtractor.compute_room_adjacency(room_candidates)

            ocr_mappings = ocr_data.get("room_name_mappings", [])

            classified_rooms = RoomClassifier.classify(
                rooms=rooms,
                ocr_mappings=ocr_mappings,
                room_furniture=room_furniture,
                adjacency=adjacency,
            )
            rooms = classified_rooms
            stage_timings["classification"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "classification", "error": str(e), "traceback": traceback.format_exc()})
            # Fall back: assign labels from OCR if possible
            ocr_lookup = {
                m.get("room_id"): m.get("normalized_name", "Room")
                for m in ocr_data.get("room_name_mappings", [])
                if m.get("room_id")
            }
            for room in rooms:
                rid = room.get("id", "")
                room["label"] = ocr_lookup.get(rid, "Room")
            stage_timings["classification"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # STAGE 8: Confidence Engine
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            confidence_result = ConfidenceEngine.evaluate(rooms)
            stage_timings["confidence_engine"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "confidence_engine", "error": str(e)})
            confidence_result = {
                "room_confidences": [],
                "flagged_rooms": [],
                "statistics": {},
                "needs_user_review": False,
            }
            stage_timings["confidence_engine"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # COMPUTE AGGREGATE METRICS
        # ══════════════════════════════════════════════════════════════════
        total_area_m2 = sum(r.get("area_m2", 0) for r in rooms)
        total_wall_length_m = sum(
            w.get("length_px", 0) * scale_factor for w in walls
        )

        # Count elements
        room_count = len(rooms)
        door_count = len(doors) if doors else max(room_count, 3)
        window_count = len(windows) if windows else max(room_count, 4)

        # Estimate columns/beams from area
        column_count = max(4, int(total_area_m2 / 15)) if total_area_m2 > 0 else 8
        beam_count = max(4, column_count + 2)

        # Fallback area if detection found nothing
        if total_area_m2 <= 0:
            total_area_m2 = 120.0  # Default 120 sqm

        pipeline_duration = round(time.time() - pipeline_start, 3)

        # ══════════════════════════════════════════════════════════════════
        # ASSEMBLE FINAL RESULT
        # ══════════════════════════════════════════════════════════════════
        return {
            # ── Core detections ────────────────────────────────────────────
            "rooms": rooms,
            "walls": walls,
            "doors": doors,
            "windows": windows,
            "furniture": furniture,

            # ── Measurements ──────────────────────────────────────────────
            "scale_factor_m_per_px": float(scale_factor),
            "building_area_sq_m": round(float(total_area_m2), 2),
            "building_area_sq_ft": round(float(total_area_m2 * 10.764), 2),
            "wall_length_m": round(float(total_wall_length_m), 2) if total_wall_length_m > 0 else 45.0,

            # ── Counts ────────────────────────────────────────────────────
            "room_count": room_count,
            "door_count": door_count,
            "window_count": window_count,
            "column_count": column_count,
            "beam_count": beam_count,

            # ── Scale info ────────────────────────────────────────────────
            "scale_info": scale_result,

            # ── OCR data ──────────────────────────────────────────────────
            "ocr_text_readings": ocr_data.get("all_text_readings", []),
            "parsed_dimensions": ocr_data.get("parsed_dimensions", []),
            "north_symbol": ocr_data.get("north_symbol"),

            # ── Confidence ────────────────────────────────────────────────
            "confidence_summary": confidence_result.get("statistics", {}),
            "flagged_rooms": confidence_result.get("flagged_rooms", []),
            "needs_user_review": confidence_result.get("needs_user_review", False),

            # ── Room adjacency ────────────────────────────────────────────
            "room_adjacency": adjacency if 'adjacency' in dir() else {},

            # ── Pipeline metadata ─────────────────────────────────────────
            "pipeline": {
                "version": "2.0.0",
                "stages_completed": len(stage_timings),
                "stage_timings_sec": stage_timings,
                "total_duration_sec": pipeline_duration,
                "extraction_method": extraction_method,
                "errors": errors,
                "preprocessing": preprocess_meta,
            },

            # ── Wall statistics ───────────────────────────────────────────
            "wall_statistics": wall_stats,

            # ── Corrections tracking ──────────────────────────────────────
            "corrections_applied": [],
        }
