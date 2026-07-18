"""
BuildWise AI — Stage 2: Wall Detector
=======================================
Geometry-based wall detection using OpenCV.
Detects all wall segments, merges broken lines, classifies external/internal
walls, and generates wall polygons. Does NOT depend on OCR or YOLO.

Uses:
- Hough Line Transform (probabilistic) for line segment detection
- Slope-intercept clustering for collinear segment merging
- Parallel line pair analysis for wall thickness estimation
- Convex hull classification for external vs internal walls
"""

import cv2
import numpy as np
import math
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class WallSegment:
    """Represents a single detected wall segment."""
    id: str
    start: Tuple[float, float]       # (x, y) in pixels
    end: Tuple[float, float]         # (x, y) in pixels
    length_px: float                 # Length in pixels
    thickness_px: float              # Estimated wall thickness in pixels
    angle_deg: float                 # Angle in degrees (0=horizontal, 90=vertical)
    wall_type: str                   # 'external' or 'internal'
    polygon_coords: List[Tuple[float, float]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WallDetector:
    """Detects and processes wall segments from preprocessed binary floor plan images."""

    # ── Configuration ─────────────────────────────────────────────────────
    # Hough transform parameters
    HOUGH_THRESHOLD = 60
    HOUGH_MIN_LINE_LENGTH = 50
    HOUGH_MAX_LINE_GAP = 15

    # Line merging parameters
    MERGE_ANGLE_TOLERANCE = 5.0         # degrees
    MERGE_DISTANCE_TOLERANCE = 20.0     # pixels (perpendicular distance)
    MERGE_GAP_TOLERANCE = 30.0          # pixels (along-line gap)

    # Wall classification
    MIN_WALL_LENGTH_PX = 30             # Minimum length to be considered a wall
    THICKNESS_SEARCH_RANGE = 50         # Max px to search for parallel wall partner

    @staticmethod
    def detect(binary_image: np.ndarray) -> Dict[str, Any]:
        """
        Run the complete wall detection pipeline.

        Args:
            binary_image: Preprocessed binary image (white walls on black, or inverted)

        Returns:
            Dict containing:
            - walls: List of WallSegment dicts
            - external_walls: List of external wall segment dicts
            - internal_walls: List of internal wall segment dicts
            - wall_image: Debug image with walls drawn (optional)
            - statistics: Detection statistics
        """
        # Ensure binary image is properly formatted
        if len(binary_image.shape) == 3:
            binary_image = cv2.cvtColor(binary_image, cv2.COLOR_BGR2GRAY)

        # ── Step 1: Detect raw line segments ──────────────────────────────
        raw_lines = WallDetector._detect_lines(binary_image)

        # ── Step 2: Filter short/noise segments ──────────────────────────
        filtered_lines = WallDetector._filter_short_lines(raw_lines)

        # ── Step 3: Merge collinear segments ─────────────────────────────
        merged_lines = WallDetector._merge_collinear_segments(filtered_lines)

        # ── Step 4: Estimate wall thickness ──────────────────────────────
        walls_with_thickness = WallDetector._estimate_thickness(
            merged_lines, binary_image
        )

        # ── Step 5: Generate wall polygons ───────────────────────────────
        walls_with_polygons = WallDetector._generate_wall_polygons(
            walls_with_thickness
        )

        # ── Step 6: Classify external vs internal ────────────────────────
        classified_walls = WallDetector._classify_walls(walls_with_polygons)

        # ── Step 7: Assign IDs ───────────────────────────────────────────
        for i, wall in enumerate(classified_walls):
            wall.id = f"wall_{i+1:03d}"

        # Separate by type
        external = [w for w in classified_walls if w.wall_type == "external"]
        internal = [w for w in classified_walls if w.wall_type == "internal"]

        return {
            "walls": [w.to_dict() for w in classified_walls],
            "external_walls": [w.to_dict() for w in external],
            "internal_walls": [w.to_dict() for w in internal],
            "statistics": {
                "raw_lines_detected": len(raw_lines),
                "after_filtering": len(filtered_lines),
                "after_merging": len(merged_lines),
                "total_walls": len(classified_walls),
                "external_count": len(external),
                "internal_count": len(internal),
            },
        }

    # ══════════════════════════════════════════════════════════════════════
    # PIPELINE STEPS
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _detect_lines(
        binary: np.ndarray,
    ) -> List[Tuple[int, int, int, int]]:
        """Detect line segments using probabilistic Hough Transform."""
        # Apply slight dilation to connect near-touching wall segments
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated = cv2.dilate(binary, kernel, iterations=1)

        lines = cv2.HoughLinesP(
            dilated,
            rho=1,
            theta=np.pi / 180,
            threshold=WallDetector.HOUGH_THRESHOLD,
            minLineLength=WallDetector.HOUGH_MIN_LINE_LENGTH,
            maxLineGap=WallDetector.HOUGH_MAX_LINE_GAP,
        )

        if lines is None:
            return []

        return [(int(l[0][0]), int(l[0][1]), int(l[0][2]), int(l[0][3])) for l in lines]

    @staticmethod
    def _filter_short_lines(
        lines: List[Tuple[int, int, int, int]],
    ) -> List[Tuple[int, int, int, int]]:
        """Remove lines shorter than minimum wall length."""
        result = []
        for x1, y1, x2, y2 in lines:
            length = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            if length >= WallDetector.MIN_WALL_LENGTH_PX:
                result.append((x1, y1, x2, y2))
        return result

    @staticmethod
    def _merge_collinear_segments(
        lines: List[Tuple[int, int, int, int]],
    ) -> List[Tuple[int, int, int, int]]:
        """
        Merge collinear line segments that are close together.
        Uses slope-intercept clustering: group lines by (angle, perpendicular distance)
        then merge overlapping or near-touching segments within each group.
        """
        if not lines:
            return []

        # Calculate angle and perpendicular distance for each line
        line_params = []
        for x1, y1, x2, y2 in lines:
            angle = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 180
            # Perpendicular distance from origin
            if x2 - x1 == 0:  # Vertical line
                perp_dist = abs(x1)
            else:
                # Line equation: ax + by + c = 0
                dx, dy = x2 - x1, y2 - y1
                length = math.sqrt(dx * dx + dy * dy)
                a, b = -dy / length, dx / length
                c = -(a * x1 + b * y1)
                perp_dist = abs(c)

            line_params.append((angle, perp_dist, x1, y1, x2, y2))

        # Sort by angle then perpendicular distance
        line_params.sort(key=lambda p: (p[0], p[1]))

        # Group collinear segments
        groups: List[List[Tuple]] = []
        used = [False] * len(line_params)

        for i in range(len(line_params)):
            if used[i]:
                continue

            group = [line_params[i]]
            used[i] = True

            for j in range(i + 1, len(line_params)):
                if used[j]:
                    continue

                angle_diff = abs(line_params[i][0] - line_params[j][0])
                if angle_diff > 180 - WallDetector.MERGE_ANGLE_TOLERANCE:
                    angle_diff = 180 - angle_diff

                perp_diff = abs(line_params[i][1] - line_params[j][1])

                if (
                    angle_diff <= WallDetector.MERGE_ANGLE_TOLERANCE
                    and perp_diff <= WallDetector.MERGE_DISTANCE_TOLERANCE
                ):
                    group.append(line_params[j])
                    used[j] = True

            groups.append(group)

        # Merge each group into single line segments
        merged = []
        for group in groups:
            merged_line = WallDetector._merge_group(group)
            if merged_line:
                merged.append(merged_line)

        return merged

    @staticmethod
    def _merge_group(
        group: List[Tuple],
    ) -> Optional[Tuple[int, int, int, int]]:
        """Merge a group of collinear segments into one or more wall segments."""
        if not group:
            return None

        # Get the average angle of the group
        avg_angle = np.mean([g[0] for g in group])
        angle_rad = math.radians(avg_angle)

        # Project all endpoints onto the line direction
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)

        projections = []
        for _, _, x1, y1, x2, y2 in group:
            proj1 = x1 * cos_a + y1 * sin_a
            proj2 = x2 * cos_a + y2 * sin_a
            projections.append((min(proj1, proj2), max(proj1, proj2), x1, y1, x2, y2))

        # Sort by projection start
        projections.sort(key=lambda p: p[0])

        # Merge overlapping projections
        merged_start = projections[0][0]
        merged_end = projections[0][1]
        best_start = (projections[0][2], projections[0][3])
        best_end = (projections[0][4], projections[0][5])

        for proj_start, proj_end, x1, y1, x2, y2 in projections[1:]:
            if proj_start <= merged_end + WallDetector.MERGE_GAP_TOLERANCE:
                if proj_end > merged_end:
                    merged_end = proj_end
                    # Update endpoint to the one with maximum projection
                    p1 = x1 * cos_a + y1 * sin_a
                    p2 = x2 * cos_a + y2 * sin_a
                    if p2 > p1:
                        best_end = (x2, y2)
                    else:
                        best_end = (x1, y1)
            # For simplicity, we keep extending the current segment

        # Use the actual points that correspond to min and max projections
        # Find the points closest to merged_start and merged_end
        all_points = []
        for _, _, x1, y1, x2, y2 in group:
            all_points.extend([(x1, y1), (x2, y2)])

        # Find extreme points along the line direction
        min_proj = float("inf")
        max_proj = float("-inf")
        start_pt = all_points[0]
        end_pt = all_points[0]

        for px, py in all_points:
            proj = px * cos_a + py * sin_a
            if proj < min_proj:
                min_proj = proj
                start_pt = (px, py)
            if proj > max_proj:
                max_proj = proj
                end_pt = (px, py)

        return (int(start_pt[0]), int(start_pt[1]), int(end_pt[0]), int(end_pt[1]))

    @staticmethod
    def _estimate_thickness(
        lines: List[Tuple[int, int, int, int]],
        binary: np.ndarray,
    ) -> List[Dict[str, Any]]:
        """
        Estimate wall thickness for each line segment by analyzing the
        perpendicular cross-section of white pixels at the midpoint.
        """
        results = []
        for x1, y1, x2, y2 in lines:
            length = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            angle = math.degrees(math.atan2(y2 - y1, x2 - x1))

            # Sample perpendicular cross-section at midpoint
            mid_x = (x1 + x2) / 2
            mid_y = (y1 + y2) / 2

            # Perpendicular direction
            perp_angle = angle + 90
            perp_rad = math.radians(perp_angle)

            thickness = WallDetector._measure_thickness_at_point(
                binary, mid_x, mid_y, perp_rad
            )

            results.append({
                "start": (x1, y1),
                "end": (x2, y2),
                "length_px": length,
                "thickness_px": thickness,
                "angle_deg": angle % 180,
            })

        return results

    @staticmethod
    def _measure_thickness_at_point(
        binary: np.ndarray,
        cx: float, cy: float,
        perp_rad: float,
    ) -> float:
        """Measure wall thickness by scanning perpendicular to wall at a point."""
        h, w = binary.shape[:2]
        cos_p = math.cos(perp_rad)
        sin_p = math.sin(perp_rad)

        # Scan in both directions perpendicular to the wall
        max_dist = WallDetector.THICKNESS_SEARCH_RANGE
        count = 0

        for direction in [1, -1]:
            for d in range(1, max_dist):
                px = int(cx + direction * d * cos_p)
                py = int(cy + direction * d * sin_p)

                if 0 <= px < w and 0 <= py < h:
                    if binary[py, px] > 0:
                        count += 1
                    else:
                        break
                else:
                    break

        # Include the center pixel
        thickness = max(count + 1, 3)  # Minimum 3px thickness
        return float(thickness)

    @staticmethod
    def _generate_wall_polygons(
        walls: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generate rectangular polygon coordinates for each wall segment."""
        for wall in walls:
            x1, y1 = wall["start"]
            x2, y2 = wall["end"]
            half_t = wall["thickness_px"] / 2

            angle_rad = math.radians(wall["angle_deg"])
            # Perpendicular offset
            perp_x = -math.sin(angle_rad) * half_t
            perp_y = math.cos(angle_rad) * half_t

            wall["polygon_coords"] = [
                (x1 + perp_x, y1 + perp_y),
                (x2 + perp_x, y2 + perp_y),
                (x2 - perp_x, y2 - perp_y),
                (x1 - perp_x, y1 - perp_y),
            ]

        return walls

    @staticmethod
    def _classify_walls(
        walls: List[Dict[str, Any]],
    ) -> List[WallSegment]:
        """
        Classify walls as external or internal using convex hull analysis.
        Walls whose midpoints lie on or near the convex hull of all wall
        midpoints are classified as external.
        """
        if not walls:
            return []

        # Collect all wall midpoints
        midpoints = []
        for wall in walls:
            x1, y1 = wall["start"]
            x2, y2 = wall["end"]
            midpoints.append(((x1 + x2) / 2, (y1 + y2) / 2))

        midpoints_array = np.array(midpoints, dtype=np.float32)

        # Compute convex hull of all midpoints
        if len(midpoints_array) < 3:
            # Not enough points for hull — all external
            result = []
            for wall in walls:
                result.append(WallSegment(
                    id="",
                    start=tuple(wall["start"]),
                    end=tuple(wall["end"]),
                    length_px=wall["length_px"],
                    thickness_px=wall["thickness_px"],
                    angle_deg=wall["angle_deg"],
                    wall_type="external",
                    polygon_coords=wall.get("polygon_coords", []),
                ))
            return result

        hull = cv2.convexHull(midpoints_array)
        hull_points = hull.reshape(-1, 2)

        # Distance threshold: a wall midpoint within this distance of the hull
        # is considered external
        # Use 5% of the diagonal as threshold
        all_pts = np.array(
            [(w["start"][0], w["start"][1]) for w in walls]
            + [(w["end"][0], w["end"][1]) for w in walls],
            dtype=np.float32,
        )
        min_x, min_y = all_pts.min(axis=0)
        max_x, max_y = all_pts.max(axis=0)
        diagonal = math.sqrt((max_x - min_x) ** 2 + (max_y - min_y) ** 2)
        hull_distance_threshold = diagonal * 0.05

        result = []
        for i, wall in enumerate(walls):
            mid = midpoints_array[i]

            # Check distance from midpoint to convex hull boundary
            dist = cv2.pointPolygonTest(hull, (float(mid[0]), float(mid[1])), True)

            # Points near the boundary (small positive dist or negative) are external
            # dist > 0 means inside hull, dist < 0 means outside (shouldn't happen)
            # dist ~= 0 means on the boundary
            if abs(dist) < hull_distance_threshold or dist <= 0:
                wall_type = "external"
            else:
                wall_type = "internal"

            # Additional heuristic: longer walls are more likely external
            if wall["length_px"] > diagonal * 0.3:
                wall_type = "external"

            result.append(WallSegment(
                id="",
                start=tuple(wall["start"]),
                end=tuple(wall["end"]),
                length_px=wall["length_px"],
                thickness_px=wall["thickness_px"],
                angle_deg=wall["angle_deg"],
                wall_type=wall_type,
                polygon_coords=wall.get("polygon_coords", []),
            ))

        return result

    @staticmethod
    def get_wall_endpoints(walls: List[Dict[str, Any]]) -> List[Tuple[float, float]]:
        """Extract all unique wall endpoints for graph construction."""
        endpoints = set()
        for wall in walls:
            endpoints.add(tuple(wall["start"]))
            endpoints.add(tuple(wall["end"]))
        return list(endpoints)
