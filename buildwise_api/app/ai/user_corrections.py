"""
BuildWise AI — Stage 8: User Corrections
==========================================
Handles user corrections to the AI analysis results.
Supports: rename, merge, split, delete, add room, and add wall.
Each correction triggers cascading updates to the analysis data.
"""

import math
import uuid
from typing import List, Dict, Any, Optional, Tuple
from copy import deepcopy


class UserCorrections:
    """Handles user corrections to detected rooms, walls, and classification."""

    @staticmethod
    def rename_room(
        analysis: Dict[str, Any],
        room_id: str,
        new_label: str,
    ) -> Dict[str, Any]:
        """
        Rename a room and update all dependent data.

        Args:
            analysis: Full analysis result dict.
            room_id: ID of the room to rename.
            new_label: New label for the room.

        Returns:
            Updated analysis dict.
        """
        result = deepcopy(analysis)
        rooms = result.get("rooms", [])

        for room in rooms:
            if room.get("id") == room_id:
                room["label"] = new_label
                # Update classification data
                if "classification" in room:
                    room["classification"]["classified_label"] = new_label
                    room["classification"]["confidence"]["overall"] = 1.0
                    room["classification"]["low_confidence_flag"] = False
                    room["classification"]["reason"] = "User-corrected label"
                break

        result["rooms"] = rooms
        result["corrections_applied"] = result.get("corrections_applied", [])
        result["corrections_applied"].append({
            "type": "rename",
            "room_id": room_id,
            "new_label": new_label,
        })

        return result

    @staticmethod
    def delete_room(
        analysis: Dict[str, Any],
        room_id: str,
    ) -> Dict[str, Any]:
        """Remove a false-positive room from the results."""
        result = deepcopy(analysis)
        rooms = result.get("rooms", [])

        result["rooms"] = [r for r in rooms if r.get("id") != room_id]
        result["room_count"] = len(result["rooms"])

        result["corrections_applied"] = result.get("corrections_applied", [])
        result["corrections_applied"].append({
            "type": "delete",
            "room_id": room_id,
        })

        return result

    @staticmethod
    def merge_rooms(
        analysis: Dict[str, Any],
        room_id_a: str,
        room_id_b: str,
        merged_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Merge two adjacent rooms into one.
        Combines polygons into a single convex hull or union polygon.
        """
        result = deepcopy(analysis)
        rooms = result.get("rooms", [])

        room_a = None
        room_b = None
        for room in rooms:
            if room.get("id") == room_id_a:
                room_a = room
            elif room.get("id") == room_id_b:
                room_b = room

        if not room_a or not room_b:
            return result  # Nothing to merge

        # Merge polygons — use combined bounding polygon
        all_points = room_a.get("polygon", []) + room_b.get("polygon", [])

        if not all_points:
            return result

        # Create merged polygon (convex hull of all points)
        merged_polygon = UserCorrections._convex_hull(all_points)

        # Compute merged geometry
        area_px2 = UserCorrections._shoelace_area(merged_polygon)
        perimeter_px = sum(
            math.sqrt(
                (merged_polygon[(i + 1) % len(merged_polygon)][0] - merged_polygon[i][0]) ** 2 +
                (merged_polygon[(i + 1) % len(merged_polygon)][1] - merged_polygon[i][1]) ** 2
            )
            for i in range(len(merged_polygon))
        )

        wall_lengths_px = [
            math.sqrt(
                (merged_polygon[(i + 1) % len(merged_polygon)][0] - merged_polygon[i][0]) ** 2 +
                (merged_polygon[(i + 1) % len(merged_polygon)][1] - merged_polygon[i][1]) ** 2
            )
            for i in range(len(merged_polygon))
        ]

        cx = sum(p[0] for p in merged_polygon) / len(merged_polygon)
        cy = sum(p[1] for p in merged_polygon) / len(merged_polygon)

        xs = [p[0] for p in merged_polygon]
        ys = [p[1] for p in merged_polygon]
        bbox = (int(min(xs)), int(min(ys)), int(max(xs) - min(xs)), int(max(ys) - min(ys)))

        label = merged_label or room_a.get("label", "Merged Room")

        # Create merged room
        merged_room = {
            "id": f"room_merged_{uuid.uuid4().hex[:8]}",
            "polygon": merged_polygon,
            "area_px2": area_px2,
            "perimeter_px": perimeter_px,
            "centroid": (cx, cy),
            "wall_lengths_px": wall_lengths_px,
            "bounding_box": bbox,
            "aspect_ratio": bbox[2] / bbox[3] if bbox[3] > 0 else 1.0,
            "num_vertices": len(merged_polygon),
            "label": label,
            "area_m2": room_a.get("area_m2", 0) + room_b.get("area_m2", 0),
            "perimeter_m": room_a.get("perimeter_m", 0) + room_b.get("perimeter_m", 0),
            "classification": {
                "classified_label": label,
                "confidence": {"overall": 1.0},
                "low_confidence_flag": False,
                "reason": "User-merged rooms",
            },
        }

        # Remove originals, add merged
        result["rooms"] = [
            r for r in rooms
            if r.get("id") not in (room_id_a, room_id_b)
        ]
        result["rooms"].append(merged_room)
        result["room_count"] = len(result["rooms"])

        result["corrections_applied"] = result.get("corrections_applied", [])
        result["corrections_applied"].append({
            "type": "merge",
            "room_ids": [room_id_a, room_id_b],
            "merged_room_id": merged_room["id"],
            "merged_label": label,
        })

        return result

    @staticmethod
    def split_room(
        analysis: Dict[str, Any],
        room_id: str,
        split_line: Tuple[Tuple[float, float], Tuple[float, float]],
        label_a: Optional[str] = None,
        label_b: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Split a room into two by drawing a line through it.

        Args:
            analysis: Full analysis dict.
            room_id: Room to split.
            split_line: ((x1, y1), (x2, y2)) line that divides the room.
            label_a: Optional label for the first new room.
            label_b: Optional label for the second new room.
        """
        result = deepcopy(analysis)
        rooms = result.get("rooms", [])

        target_room = None
        for room in rooms:
            if room.get("id") == room_id:
                target_room = room
                break

        if not target_room:
            return result

        polygon = target_room.get("polygon", [])
        if len(polygon) < 3:
            return result

        # Split polygon by the line
        side_a, side_b = UserCorrections._split_polygon_by_line(polygon, split_line)

        if len(side_a) < 3 or len(side_b) < 3:
            return result  # Invalid split

        original_label = target_room.get("label", "Room")

        # Create two new rooms
        new_rooms = []
        for i, (side, label) in enumerate([(side_a, label_a), (side_b, label_b)]):
            area_px2 = UserCorrections._shoelace_area(side)
            cx = sum(p[0] for p in side) / len(side)
            cy = sum(p[1] for p in side) / len(side)
            xs = [p[0] for p in side]
            ys = [p[1] for p in side]
            bbox = (int(min(xs)), int(min(ys)), int(max(xs) - min(xs)), int(max(ys) - min(ys)))

            new_room = {
                "id": f"room_split_{uuid.uuid4().hex[:8]}",
                "polygon": side,
                "area_px2": area_px2,
                "perimeter_px": sum(
                    math.sqrt(
                        (side[(j + 1) % len(side)][0] - side[j][0]) ** 2 +
                        (side[(j + 1) % len(side)][1] - side[j][1]) ** 2
                    )
                    for j in range(len(side))
                ),
                "centroid": (cx, cy),
                "wall_lengths_px": [
                    math.sqrt(
                        (side[(j + 1) % len(side)][0] - side[j][0]) ** 2 +
                        (side[(j + 1) % len(side)][1] - side[j][1]) ** 2
                    )
                    for j in range(len(side))
                ],
                "bounding_box": bbox,
                "aspect_ratio": bbox[2] / bbox[3] if bbox[3] > 0 else 1.0,
                "num_vertices": len(side),
                "label": label or f"{original_label} {i + 1}",
                "classification": {
                    "classified_label": label or f"{original_label} {i + 1}",
                    "confidence": {"overall": 1.0},
                    "low_confidence_flag": False,
                    "reason": "User-split room",
                },
            }
            new_rooms.append(new_room)

        # Remove original, add splits
        result["rooms"] = [r for r in rooms if r.get("id") != room_id]
        result["rooms"].extend(new_rooms)
        result["room_count"] = len(result["rooms"])

        result["corrections_applied"] = result.get("corrections_applied", [])
        result["corrections_applied"].append({
            "type": "split",
            "original_room_id": room_id,
            "new_room_ids": [r["id"] for r in new_rooms],
        })

        return result

    @staticmethod
    def add_room(
        analysis: Dict[str, Any],
        polygon: List[Tuple[float, float]],
        label: str,
        scale_factor: float = 0.015,
    ) -> Dict[str, Any]:
        """Add a new manually-drawn room polygon."""
        result = deepcopy(analysis)

        area_px2 = UserCorrections._shoelace_area(polygon)
        cx = sum(p[0] for p in polygon) / len(polygon)
        cy = sum(p[1] for p in polygon) / len(polygon)
        xs = [p[0] for p in polygon]
        ys = [p[1] for p in polygon]
        bbox = (int(min(xs)), int(min(ys)), int(max(xs) - min(xs)), int(max(ys) - min(ys)))

        new_room = {
            "id": f"room_manual_{uuid.uuid4().hex[:8]}",
            "polygon": polygon,
            "area_px2": area_px2,
            "area_m2": round(area_px2 * scale_factor ** 2, 2),
            "perimeter_px": sum(
                math.sqrt(
                    (polygon[(i + 1) % len(polygon)][0] - polygon[i][0]) ** 2 +
                    (polygon[(i + 1) % len(polygon)][1] - polygon[i][1]) ** 2
                )
                for i in range(len(polygon))
            ),
            "centroid": (cx, cy),
            "wall_lengths_px": [],
            "bounding_box": bbox,
            "aspect_ratio": bbox[2] / bbox[3] if bbox[3] > 0 else 1.0,
            "num_vertices": len(polygon),
            "label": label,
            "classification": {
                "classified_label": label,
                "confidence": {"overall": 1.0},
                "low_confidence_flag": False,
                "reason": "Manually added by user",
            },
        }

        result["rooms"] = result.get("rooms", [])
        result["rooms"].append(new_room)
        result["room_count"] = len(result["rooms"])

        result["corrections_applied"] = result.get("corrections_applied", [])
        result["corrections_applied"].append({
            "type": "add_room",
            "room_id": new_room["id"],
            "label": label,
        })

        return result

    @staticmethod
    def add_wall(
        analysis: Dict[str, Any],
        start: Tuple[float, float],
        end: Tuple[float, float],
        thickness_px: float = 10.0,
    ) -> Dict[str, Any]:
        """Add a manually-drawn wall segment."""
        result = deepcopy(analysis)

        length = math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2)
        angle = math.degrees(math.atan2(end[1] - start[1], end[0] - start[0]))

        new_wall = {
            "id": f"wall_manual_{uuid.uuid4().hex[:8]}",
            "start": start,
            "end": end,
            "length_px": length,
            "thickness_px": thickness_px,
            "angle_deg": angle % 180,
            "wall_type": "internal",
            "polygon_coords": [],
            "source": "user_drawn",
        }

        walls = result.get("walls", [])
        walls.append(new_wall)
        result["walls"] = walls

        result["corrections_applied"] = result.get("corrections_applied", [])
        result["corrections_applied"].append({
            "type": "add_wall",
            "wall_id": new_wall["id"],
        })

        return result

    # ══════════════════════════════════════════════════════════════════════
    # GEOMETRY HELPERS
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _shoelace_area(polygon: List[Tuple[float, float]]) -> float:
        """Shoelace formula for polygon area."""
        n = len(polygon)
        area = 0.0
        for i in range(n):
            x1, y1 = polygon[i]
            x2, y2 = polygon[(i + 1) % n]
            area += x1 * y2 - x2 * y1
        return abs(area) / 2.0

    @staticmethod
    def _convex_hull(points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Simple convex hull (Graham scan)."""
        import cv2
        import numpy as np

        pts = np.array(points, dtype=np.float32)
        hull = cv2.convexHull(pts)
        return [(float(p[0][0]), float(p[0][1])) for p in hull]

    @staticmethod
    def _split_polygon_by_line(
        polygon: List[Tuple[float, float]],
        line: Tuple[Tuple[float, float], Tuple[float, float]],
    ) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
        """
        Split a polygon into two parts using a line.
        Simplified approach: classify vertices by which side of the line they fall on.
        """
        (lx1, ly1), (lx2, ly2) = line

        side_a = []
        side_b = []

        for px, py in polygon:
            # Cross product to determine side
            cross = (lx2 - lx1) * (py - ly1) - (ly2 - ly1) * (px - lx1)

            if cross >= 0:
                side_a.append((px, py))
            else:
                side_b.append((px, py))

        # Add the line endpoints to both sides for completeness
        side_a.append((lx1, ly1))
        side_a.append((lx2, ly2))
        side_b.append((lx1, ly1))
        side_b.append((lx2, ly2))

        # Sort points by angle from centroid to form valid polygons
        side_a = UserCorrections._sort_polygon_points(side_a)
        side_b = UserCorrections._sort_polygon_points(side_b)

        return side_a, side_b

    @staticmethod
    def _sort_polygon_points(
        points: List[Tuple[float, float]]
    ) -> List[Tuple[float, float]]:
        """Sort points in counter-clockwise order around their centroid."""
        if len(points) < 3:
            return points

        cx = sum(p[0] for p in points) / len(points)
        cy = sum(p[1] for p in points) / len(points)

        def angle_key(p):
            return math.atan2(p[1] - cy, p[0] - cx)

        return sorted(points, key=angle_key)
