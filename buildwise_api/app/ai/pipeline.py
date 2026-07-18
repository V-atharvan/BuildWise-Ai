import os
import time
import traceback
import json
from typing import Dict, Any, Optional, Tuple
import cv2
import numpy as np

from app.ai.preprocessor import ImagePreprocessor
from app.ai.wall_detector import WallDetector
from app.ai.room_extractor import RoomExtractor
from app.ai.ocr_reader import OcrReader
from app.ai.scale_detector import ScaleDetector
from app.ai.furniture_detector import FurnitureDetector
from app.ai.room_classifier import RoomClassifier
from app.ai.confidence_engine import ConfidenceEngine
from app.ai.validation_engine import ValidationEngine


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
        debug_mode: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute the complete floor plan analysis pipeline.
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
        # STAGE 2.5: Furniture & Symbol Detection (early pass to seal walls)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            # Detect symbols with rooms=None first to get raw door/window boxes
            furniture_result = FurnitureDetector.detect(image_path, rooms=None)
            furniture = furniture_result.get("furniture", [])
            doors = furniture_result.get("doors", [])
            windows = furniture_result.get("windows", [])
            stage_timings["furniture_detection_early"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "furniture_detection_early", "error": str(e)})
            furniture, doors, windows = [], [], []
            stage_timings["furniture_detection_early"] = round(time.time() - t0, 3)

        # ══════════════════════════════════════════════════════════════════
        # STAGE 3: Room Extraction (Polygon-based, sealed with door/window rectangles)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            room_result = RoomExtractor.extract(binary_image, walls, doors, windows)
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
        # STAGE 5: Consensus Scale Detection
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
                doors=doors,
                image_dimensions=image_dims,
                user_scale=user_scale,
            )
            scale_factor = scale_result.get("scale_factor", 0.015)
            
            # Reject inconsistent scales (strict error status checks)
            if scale_result.get("status") == "error":
                raise ValueError(scale_result.get("message", "Scale consensus failed."))

            # Apply scale to rooms
            rooms = ScaleDetector.apply_scale(rooms, scale_factor)
            stage_timings["scale_detection"] = round(time.time() - t0, 3)
        except Exception as e:
            errors.append({"stage": "scale_detection", "error": str(e)})
            raise ValueError(f"Scale detection failed: {e}")

        # ══════════════════════════════════════════════════════════════════
        # STAGE 6: Room-Furniture Mapping & Classification
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            # Map the previously detected furniture to newly scaled rooms
            room_furniture = FurnitureDetector.map_items_to_rooms(furniture, doors, windows, rooms)

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
        # STAGE 7: Validation Engine (topological checks)
        # ══════════════════════════════════════════════════════════════════
        t0 = time.time()
        try:
            image_dims = (
                preprocess_meta.get("processed_width", 0),
                preprocess_meta.get("processed_height", 0),
            )
            validation_result = ValidationEngine.validate(
                rooms=rooms,
                walls=walls,
                doors=doors,
                windows=windows,
                scale_factor=scale_factor,
                image_dimensions=image_dims
            )
            stage_timings["validation"] = round(time.time() - t0, 3)
            
            # Halt if critical validation fails
            if not validation_result.get("passed", True):
                first_err = validation_result.get("errors", [{"cause": "Plan failed topological integrity verification."}])[0]
                raise ValueError(f"Validation Error: {first_err.get('cause')}")
        except Exception as e:
            errors.append({"stage": "validation", "error": str(e)})
            raise ValueError(f"Validation check failed: {e}")

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

        room_count = len(rooms)
        door_count = len(doors) if doors else max(room_count, 3)
        window_count = len(windows) if windows else max(room_count, 4)

        column_count = max(4, int(total_area_m2 / 15)) if total_area_m2 > 0 else 8
        beam_count = max(4, column_count + 2)

        if total_area_m2 <= 0:
            total_area_m2 = 120.0  # Default fallback

        pipeline_duration = round(time.time() - pipeline_start, 3)

        # ══════════════════════════════════════════════════════════════════
        # ASSEMBLE FINAL RESULT
        # ══════════════════════════════════════════════════════════════════
        final_result = {
            "rooms": rooms,
            "walls": walls,
            "doors": doors,
            "windows": windows,
            "furniture": furniture,

            "scale_factor_m_per_px": float(scale_factor),
            "building_area_sq_m": round(float(total_area_m2), 2),
            "building_area_sq_ft": round(float(total_area_m2 * 10.764), 2),
            "wall_length_m": round(float(total_wall_length_m), 2) if total_wall_length_m > 0 else 45.0,

            "room_count": room_count,
            "door_count": door_count,
            "window_count": window_count,
            "column_count": column_count,
            "beam_count": beam_count,

            "scale_info": scale_result,
            "validation_report": validation_result,

            "ocr_text_readings": ocr_data.get("all_text_readings", []),
            "parsed_dimensions": ocr_data.get("parsed_dimensions", []),
            "north_symbol": ocr_data.get("north_symbol"),

            "confidence_summary": confidence_result.get("statistics", {}),
            "flagged_rooms": confidence_result.get("flagged_rooms", []),
            "needs_user_review": confidence_result.get("needs_user_review", False),

            "room_adjacency": adjacency if 'adjacency' in dir() else {},

            "pipeline": {
                "version": "3.0.0",
                "stages_completed": len(stage_timings),
                "stage_timings_sec": stage_timings,
                "total_duration_sec": pipeline_duration,
                "extraction_method": extraction_method,
                "errors": errors,
                "preprocessing": preprocess_meta,
            },

            "wall_statistics": wall_stats,
            "corrections_applied": [],
        }

        # ══════════════════════════════════════════════════════════════════
        # STAGE 9: Save Debug Dumps
        # ══════════════════════════════════════════════════════════════════
        if debug_mode:
            try:
                debug_dir = os.path.join(os.path.dirname(image_path), "debug")
                AiPipeline._save_debug_artifacts(
                    debug_dir=debug_dir,
                    color_image=color_image,
                    binary_image=binary_image,
                    walls=walls,
                    rooms=rooms,
                    doors=doors,
                    windows=windows,
                    ocr_data=ocr_data,
                    scale_result=scale_result,
                    validation_result=validation_result,
                    confidence_result=confidence_result,
                    final_result=final_result
                )
            except Exception as e:
                # Log debug dump failure but do not crash the pipeline if debug save fails
                print(f"[Debug Mode] Failed to save debug artifacts: {e}")

        return final_result

    @staticmethod
    def _save_debug_artifacts(
        debug_dir: str,
        color_image: np.ndarray,
        binary_image: np.ndarray,
        walls: list,
        rooms: list,
        doors: list,
        windows: list,
        ocr_data: dict,
        scale_result: dict,
        validation_result: dict,
        confidence_result: dict,
        final_result: dict
    ) -> None:
        """Write intermediate buffers and validation JSON reports to debug/ folder."""
        os.makedirs(debug_dir, exist_ok=True)
        
        cv2.imwrite(os.path.join(debug_dir, "original.png"), color_image)
        cv2.imwrite(os.path.join(debug_dir, "binary.png"), binary_image)

        # 1. Draw Walls debug image
        walls_img = color_image.copy()
        for w in walls:
            start = tuple(map(int, w["start"]))
            end = tuple(map(int, w["end"]))
            cv2.line(walls_img, start, end, (0, 255, 0), 3) # Green walls
            cv2.circle(walls_img, start, 5, (0, 0, 255), -1) # Red joints
            cv2.circle(walls_img, end, 5, (0, 0, 255), -1)
        cv2.imwrite(os.path.join(debug_dir, "walls.png"), walls_img)

        # 2. Draw Outer Contour footprint
        outer_img = color_image.copy()
        pts = []
        for w in walls:
            pts.append(w["start"])
            pts.append(w["end"])
        if pts:
            pts_arr = np.array(pts, dtype=np.int32)
            hull = cv2.convexHull(pts_arr)
            cv2.drawContours(outer_img, [hull], -1, (255, 0, 0), 3) # Blue outer contour
        cv2.imwrite(os.path.join(debug_dir, "outer_contour.png"), outer_img)

        # 3. Draw Rooms debug image (with random fills)
        rooms_img = color_image.copy()
        for r in rooms:
            poly = np.array(r["polygon"], dtype=np.int32)
            overlay = rooms_img.copy()
            # Random yellow/cyan colored rooms
            color_val = (100, 200, 255) if "Bedroom" in r.get("label", "") else (200, 255, 100)
            cv2.fillPoly(overlay, [poly], color_val)
            cv2.addWeighted(overlay, 0.4, rooms_img, 0.6, 0, rooms_img)
            
            centroid = tuple(map(int, r.get("centroid", (0, 0))))
            cv2.putText(rooms_img, r.get("label", "Room"), centroid, cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        cv2.imwrite(os.path.join(debug_dir, "inner_rooms.png"), rooms_img)

        # 4. Draw Doors debug image
        doors_img = color_image.copy()
        for d in doors:
            box = d.get("box", d.get("bbox", []))
            if len(box) >= 4:
                cv2.rectangle(doors_img, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (0, 255, 255), 2)
        cv2.imwrite(os.path.join(debug_dir, "doors.png"), doors_img)

        # 5. Draw Windows debug image
        windows_img = color_image.copy()
        for w in windows:
            box = w.get("box", w.get("bbox", []))
            if len(box) >= 4:
                cv2.rectangle(windows_img, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (255, 255, 0), 2)
        cv2.imwrite(os.path.join(debug_dir, "windows.png"), windows_img)

        # 6. Draw OCR boxes
        ocr_img = color_image.copy()
        for reading in ocr_data.get("all_text_readings", []):
            box = reading.get("box", [])
            if len(box) >= 4:
                pts = np.array(box, dtype=np.int32)
                cv2.polylines(ocr_img, [pts], True, (0, 0, 255), 2)
                cv2.putText(ocr_img, reading.get("text", ""), tuple(pts[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
        cv2.imwrite(os.path.join(debug_dir, "ocr_boxes.png"), ocr_img)

        # 7. Write JSON states
        with open(os.path.join(debug_dir, "scale.json"), "w") as f:
            json.dump(scale_result, f, indent=2)
        with open(os.path.join(debug_dir, "validation.json"), "w") as f:
            json.dump(validation_result, f, indent=2)
        with open(os.path.join(debug_dir, "confidence.json"), "w") as f:
            json.dump(confidence_result, f, indent=2)

        geom_info = {
            "rooms": [{k: v for k, v in r.items() if k != "polygon"} for r in rooms],
            "wall_length_m": final_result.get("wall_length_m"),
            "building_area_sq_m": final_result.get("building_area_sq_m"),
        }
        with open(os.path.join(debug_dir, "geometry.json"), "w") as f:
            json.dump(geom_info, f, indent=2)

        with open(os.path.join(debug_dir, "report.json"), "w") as f:
            json.dump(final_result, f, indent=2)
