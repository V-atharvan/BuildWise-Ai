"""
BuildWise AI — Stage 5: Furniture Detector
=============================================
Uses YOLO ONLY for detecting furniture and fixtures inside rooms.
Furniture NEVER defines room boundaries — it only improves room classification.

Detects: beds, sofas, dining tables, sinks, stoves, WC/toilet, wash basins,
wardrobes, TVs, chairs, showers, bathtubs.

Also uses template matching for architectural symbols: door arcs, window hash marks.
"""

import cv2
import numpy as np
import math
from typing import List, Dict, Any, Tuple, Optional


# ── COCO class mappings relevant to floor plan furniture ──────────────────────
# YOLOv8 COCO class IDs that map to floor plan fixtures
COCO_TO_FURNITURE = {
    56: "chair",           # COCO: chair
    57: "sofa",            # COCO: couch
    58: "potted_plant",    # COCO: potted plant
    59: "bed",             # COCO: bed
    60: "dining_table",    # COCO: dining table
    61: "toilet",          # COCO: toilet
    62: "tv",              # COCO: tv
    63: "laptop",          # laptop (on desk → study indicator)
    68: "microwave",       # kitchen indicator
    69: "oven",            # kitchen indicator
    71: "sink",            # COCO: sink
    72: "refrigerator",    # kitchen indicator
}

# Normalized furniture categories for room classification
FURNITURE_CATEGORIES = {
    "bed": ["bed"],
    "wardrobe": ["wardrobe", "closet", "almirah"],
    "sofa": ["sofa", "couch"],
    "tv": ["tv", "television"],
    "dining_table": ["dining_table", "dining table"],
    "chair": ["chair"],
    "sink": ["sink"],
    "toilet": ["toilet", "wc", "commode"],
    "wash_basin": ["wash_basin", "basin", "lavatory"],
    "shower": ["shower"],
    "bathtub": ["bathtub", "bath tub"],
    "stove": ["stove", "gas_stove", "oven", "cooktop", "hob"],
    "refrigerator": ["refrigerator", "fridge"],
    "washing_machine": ["washing_machine"],
    "study_desk": ["desk", "laptop", "computer"],
}


class FurnitureDetector:
    """Detects furniture and fixtures for room classification support."""

    # Minimum confidence for YOLO detections
    MIN_CONFIDENCE = 0.35

    @staticmethod
    def detect(
        image_path: str,
        rooms: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Detect furniture items and map them to rooms.

        Args:
            image_path: Path to the original color floor plan image.
            rooms: List of room candidates for mapping.

        Returns:
            Dict with furniture items, room-mapped furniture, and door/window detections.
        """
        all_items = []
        doors = []
        windows = []

        # ── Strategy 1: YOLO detection for furniture ─────────────────────
        yolo_items = FurnitureDetector._run_yolo(image_path)
        all_items.extend(yolo_items)

        # ── Strategy 2: Architectural symbol detection (doors/windows) ───
        arch_detections = FurnitureDetector._detect_architectural_symbols(image_path)
        doors = arch_detections.get("doors", [])
        windows = arch_detections.get("windows", [])

        # ── Map furniture items to rooms ─────────────────────────────────
        room_furniture: Dict[str, List[Dict[str, Any]]] = {}

        if rooms:
            for item in all_items:
                center = item.get("center", (0, 0))
                for room in rooms:
                    polygon = room.get("polygon", [])
                    if polygon and FurnitureDetector._point_in_polygon(center, polygon):
                        room_id = room.get("id", "unknown")
                        if room_id not in room_furniture:
                            room_furniture[room_id] = []
                        room_furniture[room_id].append(item)
                        item["room_id"] = room_id
                        break

            # Map doors to rooms (assign to nearest room)
            for door in doors:
                center = door.get("center", (0, 0))
                for room in rooms:
                    polygon = room.get("polygon", [])
                    if polygon and FurnitureDetector._point_in_polygon(center, polygon):
                        door["room_id"] = room.get("id")
                        break

            for window in windows:
                center = window.get("center", (0, 0))
                for room in rooms:
                    polygon = room.get("polygon", [])
                    if polygon and FurnitureDetector._point_in_polygon(center, polygon):
                        window["room_id"] = room.get("id")
                        break

        return {
            "furniture": all_items,
            "doors": doors,
            "windows": windows,
            "room_furniture": room_furniture,
            "total_furniture": len(all_items),
            "total_doors": len(doors),
            "total_windows": len(windows),
        }

    @staticmethod
    def _run_yolo(image_path: str) -> List[Dict[str, Any]]:
        """Run YOLOv8 for furniture detection."""
        try:
            from ultralytics import YOLO

            model = YOLO("yolov8n.pt")
            results = model(image_path, verbose=False)

            items = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])

                    # Only keep furniture-relevant classes
                    if cls_id not in COCO_TO_FURNITURE:
                        continue

                    label = COCO_TO_FURNITURE[cls_id]
                    conf = float(box.conf[0])

                    if conf < FurnitureDetector.MIN_CONFIDENCE:
                        continue

                    xyxy = [int(val) for val in box.xyxy[0].tolist()]
                    cx = (xyxy[0] + xyxy[2]) / 2
                    cy = (xyxy[1] + xyxy[3]) / 2
                    w = xyxy[2] - xyxy[0]
                    h = xyxy[3] - xyxy[1]

                    items.append({
                        "label": label,
                        "category": FurnitureDetector._categorize(label),
                        "confidence": conf,
                        "box": xyxy,
                        "center": (cx, cy),
                        "width_px": w,
                        "height_px": h,
                        "area_px": w * h,
                        "source": "yolo",
                    })

            return items

        except Exception as e:
            print(f"[Furniture] YOLO detection failed: {e}")
            return []

    @staticmethod
    def _categorize(label: str) -> str:
        """Map a detected label to a normalized furniture category."""
        label_lower = label.lower()
        for category, aliases in FURNITURE_CATEGORIES.items():
            if label_lower in aliases or any(a in label_lower for a in aliases):
                return category
        return label_lower

    @staticmethod
    def _detect_architectural_symbols(image_path: str) -> Dict[str, Any]:
        """
        Detect door arcs and window hash marks using OpenCV contour analysis.
        These are common architectural symbols not detected by YOLO.
        """
        doors = []
        windows = []

        try:
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return {"doors": [], "windows": []}

            # Threshold
            _, binary = cv2.threshold(img, 200, 255, cv2.THRESH_BINARY_INV)

            # ── Door detection: Look for quarter-circle arcs ─────────────
            # Door symbols in floor plans are typically arc-shaped
            contours, _ = cv2.findContours(
                binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
            )

            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Door arcs are typically small-medium sized
                if area < 200 or area > 15000:
                    continue

                # Check if contour approximates a quarter circle
                perimeter = cv2.arcLength(cnt, True)
                if perimeter < 20:
                    continue

                circularity = 4 * math.pi * area / (perimeter * perimeter)

                # Quarter circles have circularity between 0.3 and 0.8
                if 0.25 < circularity < 0.85:
                    # Check aspect ratio — door arcs are roughly square
                    x, y, w, h = cv2.boundingRect(cnt)
                    ar = w / h if h > 0 else 0

                    if 0.5 < ar < 2.0 and w < 100 and h < 100:
                        doors.append({
                            "label": "door",
                            "confidence": min(circularity + 0.2, 0.9),
                            "box": [x, y, x + w, y + h],
                            "center": (x + w / 2, y + h / 2),
                            "width_px": w,
                            "height_px": h,
                            "source": "contour_arc",
                        })

            # ── Window detection: Look for parallel line patterns ────────
            # Windows in floor plans are typically short parallel lines on walls
            # Using Hough lines on small segments
            edges = cv2.Canny(binary, 50, 150)

            lines = cv2.HoughLinesP(
                edges, 1, np.pi / 180,
                threshold=20, minLineLength=15, maxLineGap=5
            )

            if lines is not None:
                # Group nearby parallel short lines
                short_lines = []
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    length = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                    if 15 < length < 80:
                        angle = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 180
                        short_lines.append({
                            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                            "length": length, "angle": angle,
                            "cx": (x1 + x2) / 2, "cy": (y1 + y2) / 2,
                        })

                # Find clusters of parallel short lines (window indicators)
                used = [False] * len(short_lines)
                for i, line_a in enumerate(short_lines):
                    if used[i]:
                        continue
                    cluster = [line_a]
                    used[i] = True

                    for j, line_b in enumerate(short_lines):
                        if used[j] or i == j:
                            continue

                        angle_diff = abs(line_a["angle"] - line_b["angle"])
                        if angle_diff > 90:
                            angle_diff = 180 - angle_diff

                        dist = math.sqrt(
                            (line_a["cx"] - line_b["cx"]) ** 2 +
                            (line_a["cy"] - line_b["cy"]) ** 2
                        )

                        if angle_diff < 10 and dist < 30:
                            cluster.append(line_b)
                            used[j] = True

                    # 2-4 parallel lines close together = likely a window
                    if 2 <= len(cluster) <= 5:
                        xs = [l["cx"] for l in cluster]
                        ys = [l["cy"] for l in cluster]
                        cx = sum(xs) / len(xs)
                        cy = sum(ys) / len(ys)

                        all_x = [l["x1"] for l in cluster] + [l["x2"] for l in cluster]
                        all_y = [l["y1"] for l in cluster] + [l["y2"] for l in cluster]
                        x_min, x_max = min(all_x), max(all_x)
                        y_min, y_max = min(all_y), max(all_y)

                        windows.append({
                            "label": "window",
                            "confidence": min(0.5 + len(cluster) * 0.1, 0.85),
                            "box": [int(x_min), int(y_min), int(x_max), int(y_max)],
                            "center": (cx, cy),
                            "width_px": x_max - x_min,
                            "height_px": y_max - y_min,
                            "parallel_lines": len(cluster),
                            "source": "parallel_lines",
                        })

        except Exception as e:
            print(f"[Furniture] Architectural symbol detection failed: {e}")

        return {"doors": doors, "windows": windows}

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
