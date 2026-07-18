"""
BuildWise AI — Stage 3: Room Extractor
========================================
Extracts rooms as closed polygons from wall geometry.
Uses a dual-strategy approach:
  1. Planar graph cycle detection (wall intersection → minimal faces)
  2. Flood-fill contour extraction (fallback for complex plans)

Each room candidate gets polygon coordinates, area, perimeter, centroid,
wall lengths, and bounding box computed automatically.
"""

import cv2
import numpy as np
import math
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class RoomCandidate:
    """Represents a detected room as a polygon with computed geometry."""
    id: str
    polygon: List[Tuple[float, float]]          # Ordered vertex coordinates (px)
    area_px2: float                              # Area in pixels²
    perimeter_px: float                          # Perimeter in pixels
    centroid: Tuple[float, float]                # Centroid (px)
    wall_lengths_px: List[float]                 # Length of each polygon edge
    bounding_box: Tuple[int, int, int, int]      # (x, y, w, h) bounding rect
    aspect_ratio: float                          # width / height of bounding box
    num_vertices: int                            # Number of polygon vertices
    # These will be populated by later stages
    label: str = "Unclassified"
    area_m2: float = 0.0
    perimeter_m: float = 0.0
    wall_lengths_m: List[float] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class RoomExtractor:
    """Extracts room polygons from wall geometry and binary floor plan images."""

    # ── Configuration ─────────────────────────────────────────────────────
    # Minimum room area as fraction of total image area
    MIN_ROOM_AREA_FRACTION = 0.002    # 0.2% of image
    # Maximum room area as fraction of total image area
    MAX_ROOM_AREA_FRACTION = 0.60     # 60% of image
    # Minimum number of vertices for a valid room polygon
    MIN_VERTICES = 3
    # Maximum polygon simplification epsilon factor (fraction of perimeter)
    SIMPLIFICATION_FACTOR = 0.015
    # Minimum aspect ratio for valid rooms (filter out very thin slivers)
    MIN_ASPECT_RATIO = 0.15

    @staticmethod
    def extract(
        binary_image: np.ndarray,
        walls: Optional[List[Dict[str, Any]]] = None,
        doors: Optional[List[Dict[str, Any]]] = None,
        windows: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run room extraction pipeline.

        Strategy:
        1. Try contour-based extraction on inverted binary (rooms = white regions
           enclosed by dark walls). This is the primary method.
        2. If wall data is available, use it to create a wall mask and extract
           rooms from the spaces between walls.

        Args:
            binary_image: Preprocessed binary image (walls = white/255)
            walls: Optional wall segments from WallDetector (for enhanced extraction)
            doors: Optional door segment detections to seal wall boundaries
            windows: Optional window segment detections to seal wall boundaries

        Returns:
            Dict with rooms list and extraction metadata.
        """
        h, w = binary_image.shape[:2]
        img_area = h * w
        min_area = img_area * RoomExtractor.MIN_ROOM_AREA_FRACTION
        max_area = img_area * RoomExtractor.MAX_ROOM_AREA_FRACTION

        # Create a sealed binary mask where doors and windows are closed
        sealed_binary = binary_image.copy()
        for door in (doors or []):
            box = door.get("box", door.get("bbox", []))
            if box and len(box) >= 4:
                cv2.rectangle(sealed_binary, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), 255, -1)
        for win in (windows or []):
            box = win.get("box", win.get("bbox", []))
            if box and len(box) >= 4:
                cv2.rectangle(sealed_binary, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), 255, -1)

        # ── Strategy 1: Wall-mask based extraction ────────────────────────
        if walls:
            rooms_from_walls = RoomExtractor._extract_from_wall_mask(
                sealed_binary, walls, min_area, max_area
            )
            if len(rooms_from_walls) >= 2:
                # Assign IDs
                for i, room in enumerate(rooms_from_walls):
                    room.id = f"room_{i+1:03d}"

                return {
                    "rooms": [r.to_dict() for r in rooms_from_walls],
                    "room_count": len(rooms_from_walls),
                    "extraction_method": "wall_mask",
                    "image_dimensions": {"width": w, "height": h},
                }

        # ── Strategy 2: Contour-based extraction (primary) ───────────────
        rooms = RoomExtractor._extract_from_contours(
            sealed_binary, min_area, max_area
        )

        # Assign IDs
        for i, room in enumerate(rooms):
            room.id = f"room_{i+1:03d}"

        return {
            "rooms": [r.to_dict() for r in rooms],
            "room_count": len(rooms),
            "extraction_method": "contour",
            "image_dimensions": {"width": w, "height": h},
        }

    # ══════════════════════════════════════════════════════════════════════
    # EXTRACTION STRATEGIES
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _extract_from_contours(
        binary: np.ndarray,
        min_area: float,
        max_area: float,
    ) -> List[RoomCandidate]:
        """
        Extract rooms by finding contours in the inverted binary image.
        Rooms are the white spaces enclosed by dark wall lines.
        """
        # Invert: walls become black boundaries, rooms become white fills
        inverted = cv2.bitwise_not(binary)

        # Apply morphological closing to ensure wall boundaries are complete
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(inverted, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Find contours — use TREE hierarchy to handle nested spaces
        contours, hierarchy = cv2.findContours(
            closed, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
        )

        if hierarchy is None:
            return []

        rooms = []
        hierarchy = hierarchy[0]  # Flatten

        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)

            # Filter by area
            if area < min_area or area > max_area:
                continue

            # Only consider contours that are either top-level or children of top-level
            # (skip deeply nested contours which are likely noise)
            parent = hierarchy[i][3]
            depth = 0
            p = parent
            while p != -1 and depth < 5:
                p = hierarchy[p][3]
                depth += 1

            if depth > 2:
                continue

            # Simplify polygon
            epsilon = RoomExtractor.SIMPLIFICATION_FACTOR * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)

            if len(approx) < RoomExtractor.MIN_VERTICES:
                continue

            # Extract polygon vertices
            polygon = [(float(pt[0][0]), float(pt[0][1])) for pt in approx]

            # Check aspect ratio
            x, y, w, h = cv2.boundingRect(approx)
            if h == 0:
                continue
            aspect_ratio = w / h
            if aspect_ratio < RoomExtractor.MIN_ASPECT_RATIO or aspect_ratio > (1.0 / RoomExtractor.MIN_ASPECT_RATIO):
                continue

            # Check convexity deficiency — overly concave shapes are usually noise
            hull_area = cv2.contourArea(cv2.convexHull(approx))
            if hull_area > 0 and area / hull_area < 0.3:
                continue  # Too concave

            room = RoomExtractor._build_room_candidate(polygon, area)
            if room:
                rooms.append(room)

        # Remove overlapping rooms (keep larger ones)
        rooms = RoomExtractor._remove_overlapping_rooms(rooms)

        return rooms

    @staticmethod
    def _extract_from_wall_mask(
        binary: np.ndarray,
        walls: List[Dict[str, Any]],
        min_area: float,
        max_area: float,
    ) -> List[RoomCandidate]:
        """
        Extract rooms by creating a wall mask from detected wall segments
        and finding enclosed spaces.
        """
        h, w = binary.shape[:2]

        # Create wall mask by drawing wall polygons
        wall_mask = np.zeros((h, w), dtype=np.uint8)

        for wall in walls:
            start = wall.get("start", (0, 0))
            end = wall.get("end", (0, 0))
            thickness = max(int(wall.get("thickness_px", 8)), 4)

            cv2.line(
                wall_mask,
                (int(start[0]), int(start[1])),
                (int(end[0]), int(end[1])),
                255,
                thickness,
            )

        # Combine with original binary to reinforce wall positions
        combined_walls = cv2.bitwise_or(binary, wall_mask)

        # Apply morphological closing to seal small gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        sealed = cv2.morphologyEx(combined_walls, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Invert to get room spaces
        inverted = cv2.bitwise_not(sealed)

        # Find contours in room spaces
        contours, hierarchy = cv2.findContours(
            inverted, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
        )

        if hierarchy is None:
            return []

        rooms = []
        hierarchy = hierarchy[0]

        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)

            if area < min_area or area > max_area:
                continue

            # Only process contours at reasonable depth
            parent = hierarchy[i][3]
            depth = 0
            p = parent
            while p != -1 and depth < 5:
                p = hierarchy[p][3]
                depth += 1

            if depth > 2:
                continue

            # Simplify
            epsilon = RoomExtractor.SIMPLIFICATION_FACTOR * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)

            if len(approx) < RoomExtractor.MIN_VERTICES:
                continue

            polygon = [(float(pt[0][0]), float(pt[0][1])) for pt in approx]

            # Aspect ratio check
            x, y, bw, bh = cv2.boundingRect(approx)
            if bh == 0:
                continue
            ar = bw / bh
            if ar < RoomExtractor.MIN_ASPECT_RATIO or ar > (1.0 / RoomExtractor.MIN_ASPECT_RATIO):
                continue

            room = RoomExtractor._build_room_candidate(polygon, area)
            if room:
                rooms.append(room)

        rooms = RoomExtractor._remove_overlapping_rooms(rooms)
        return rooms

    # ══════════════════════════════════════════════════════════════════════
    # GEOMETRY COMPUTATIONS
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _build_room_candidate(
        polygon: List[Tuple[float, float]], area_cv: float
    ) -> Optional[RoomCandidate]:
        """Build a RoomCandidate with all computed geometric properties."""
        if len(polygon) < 3:
            return None

        # Area via Shoelace formula (more accurate than cv2.contourArea for simplified polygons)
        area = RoomExtractor._shoelace_area(polygon)
        if area <= 0:
            area = abs(area_cv)  # Fallback to OpenCV area

        # Perimeter and edge lengths
        perimeter = 0.0
        wall_lengths = []
        n = len(polygon)
        for i in range(n):
            x1, y1 = polygon[i]
            x2, y2 = polygon[(i + 1) % n]
            edge_len = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            wall_lengths.append(edge_len)
            perimeter += edge_len

        # Centroid
        centroid = RoomExtractor._compute_centroid(polygon)

        # Bounding box
        xs = [p[0] for p in polygon]
        ys = [p[1] for p in polygon]
        x_min, y_min = min(xs), min(ys)
        x_max, y_max = max(xs), max(ys)
        bbox = (int(x_min), int(y_min), int(x_max - x_min), int(y_max - y_min))

        # Aspect ratio
        bw = x_max - x_min
        bh = y_max - y_min
        aspect_ratio = bw / bh if bh > 0 else 1.0

        return RoomCandidate(
            id="",
            polygon=polygon,
            area_px2=area,
            perimeter_px=perimeter,
            centroid=centroid,
            wall_lengths_px=wall_lengths,
            bounding_box=bbox,
            aspect_ratio=aspect_ratio,
            num_vertices=len(polygon),
        )

    @staticmethod
    def _shoelace_area(polygon: List[Tuple[float, float]]) -> float:
        """Calculate polygon area using the Shoelace formula."""
        n = len(polygon)
        area = 0.0
        for i in range(n):
            x1, y1 = polygon[i]
            x2, y2 = polygon[(i + 1) % n]
            area += x1 * y2 - x2 * y1
        return abs(area) / 2.0

    @staticmethod
    def _compute_centroid(polygon: List[Tuple[float, float]]) -> Tuple[float, float]:
        """Compute the centroid of a polygon."""
        n = len(polygon)
        if n == 0:
            return (0.0, 0.0)

        cx = sum(p[0] for p in polygon) / n
        cy = sum(p[1] for p in polygon) / n
        return (cx, cy)

    @staticmethod
    def _remove_overlapping_rooms(
        rooms: List[RoomCandidate],
    ) -> List[RoomCandidate]:
        """
        Remove rooms that significantly overlap with larger rooms.
        If two rooms overlap by >60%, keep the larger one.
        """
        if len(rooms) <= 1:
            return rooms

        # Sort by area descending (keep larger rooms)
        rooms.sort(key=lambda r: r.area_px2, reverse=True)

        kept = []
        for room in rooms:
            is_duplicate = False
            for existing in kept:
                overlap = RoomExtractor._compute_overlap_ratio(room, existing)
                if overlap > 0.6:
                    is_duplicate = True
                    break
            if not is_duplicate:
                kept.append(room)

        return kept

    @staticmethod
    def _compute_overlap_ratio(
        room_a: RoomCandidate, room_b: RoomCandidate
    ) -> float:
        """Compute overlap ratio between two rooms using bounding boxes."""
        ax, ay, aw, ah = room_a.bounding_box
        bx, by, bw, bh = room_b.bounding_box

        # Intersection
        ix = max(ax, bx)
        iy = max(ay, by)
        ix2 = min(ax + aw, bx + bw)
        iy2 = min(ay + ah, by + bh)

        if ix2 <= ix or iy2 <= iy:
            return 0.0

        intersection = (ix2 - ix) * (iy2 - iy)
        smaller_area = min(aw * ah, bw * bh)

        if smaller_area <= 0:
            return 0.0

        return intersection / smaller_area

    @staticmethod
    def point_in_polygon(
        point: Tuple[float, float],
        polygon: List[Tuple[float, float]],
    ) -> bool:
        """
        Ray-casting algorithm to check if a point is inside a polygon.
        Used for mapping OCR text and furniture to specific rooms.
        """
        x, y = point
        n = len(polygon)
        inside = False

        j = n - 1
        for i in range(n):
            xi, yi = polygon[i]
            xj, yj = polygon[j]

            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
                inside = not inside
            j = i

        return inside

    @staticmethod
    def find_room_containing_point(
        point: Tuple[float, float],
        rooms: List[RoomCandidate],
    ) -> Optional[RoomCandidate]:
        """Find which room polygon contains a given point."""
        for room in rooms:
            if RoomExtractor.point_in_polygon(point, room.polygon):
                return room
        return None

    @staticmethod
    def compute_room_adjacency(
        rooms: List[RoomCandidate],
        proximity_threshold: float = 30.0,
    ) -> Dict[str, List[str]]:
        """
        Compute adjacency graph between rooms.
        Two rooms are adjacent if their polygon edges are within
        proximity_threshold pixels of each other.
        """
        adjacency: Dict[str, List[str]] = {r.id: [] for r in rooms}

        for i in range(len(rooms)):
            for j in range(i + 1, len(rooms)):
                if RoomExtractor._rooms_are_adjacent(
                    rooms[i], rooms[j], proximity_threshold
                ):
                    adjacency[rooms[i].id].append(rooms[j].id)
                    adjacency[rooms[j].id].append(rooms[i].id)

        return adjacency

    @staticmethod
    def _rooms_are_adjacent(
        room_a: RoomCandidate,
        room_b: RoomCandidate,
        threshold: float,
    ) -> bool:
        """Check if two rooms share a wall (polygon edges are close)."""
        # Quick bounding box check first
        ax, ay, aw, ah = room_a.bounding_box
        bx, by, bw, bh = room_b.bounding_box

        # Expanded bounding box intersection check
        if (ax - threshold > bx + bw or bx - threshold > ax + aw or
                ay - threshold > by + bh or by - threshold > ay + ah):
            return False

        # Check minimum distance between polygon edges
        for i in range(len(room_a.polygon)):
            pa1 = room_a.polygon[i]
            pa2 = room_a.polygon[(i + 1) % len(room_a.polygon)]

            for j in range(len(room_b.polygon)):
                pb1 = room_b.polygon[j]
                pb2 = room_b.polygon[(j + 1) % len(room_b.polygon)]

                dist = RoomExtractor._segment_distance(pa1, pa2, pb1, pb2)
                if dist < threshold:
                    return True

        return False

    @staticmethod
    def _segment_distance(
        p1: Tuple[float, float], p2: Tuple[float, float],
        p3: Tuple[float, float], p4: Tuple[float, float],
    ) -> float:
        """Minimum distance between two line segments."""
        # Sample several points on each segment and find minimum distance
        distances = []
        for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
            px = p1[0] + t * (p2[0] - p1[0])
            py = p1[1] + t * (p2[1] - p1[1])

            # Distance from this point to segment p3-p4
            d = RoomExtractor._point_to_segment_distance((px, py), p3, p4)
            distances.append(d)

        for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
            px = p3[0] + t * (p4[0] - p3[0])
            py = p3[1] + t * (p4[1] - p3[1])

            d = RoomExtractor._point_to_segment_distance((px, py), p1, p2)
            distances.append(d)

        return min(distances) if distances else float("inf")

    @staticmethod
    def _point_to_segment_distance(
        point: Tuple[float, float],
        seg_start: Tuple[float, float],
        seg_end: Tuple[float, float],
    ) -> float:
        """Distance from a point to a line segment."""
        px, py = point
        x1, y1 = seg_start
        x2, y2 = seg_end

        dx, dy = x2 - x1, y2 - y1
        length_sq = dx * dx + dy * dy

        if length_sq == 0:
            return math.sqrt((px - x1) ** 2 + (py - y1) ** 2)

        t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / length_sq))

        proj_x = x1 + t * dx
        proj_y = y1 + t * dy

        return math.sqrt((px - proj_x) ** 2 + (py - proj_y) ** 2)
