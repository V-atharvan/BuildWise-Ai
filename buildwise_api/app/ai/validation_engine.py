import math
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon, LineString, MultiPolygon
from shapely.ops import unary_union

class ValidationEngine:
    """
    Validation Engine for architectural plans.
    Enforces strict topological and geometric integrity.
    """

    @staticmethod
    def validate(
        rooms: List[Dict[str, Any]],
        walls: List[Dict[str, Any]],
        doors: List[Dict[str, Any]],
        windows: List[Dict[str, Any]],
        scale_factor: float,
        image_dimensions: Tuple[int, int],
    ) -> Dict[str, Any]:
        """
        Perform all geometric and topological validation checks.
        
        Returns:
            Dict containing:
            - passed: bool (true if no critical errors)
            - errors: list of error dicts {code, cause, effect, solution}
            - warnings: list of warning dicts {code, cause, effect, solution}
            - validation_metrics: dict of computed areas and ratios
        """
        errors = []
        warnings = []
        
        h, w = image_dimensions
        total_image_area_px = h * w
        
        # ── Pre-process geometries to Shapely shapes ──────────────────────────
        room_polys: List[Tuple[str, Polygon]] = []
        for r in rooms:
            poly_coords = r.get("polygon", [])
            rid = r.get("id", "unknown")
            if len(poly_coords) >= 3:
                try:
                    # Clean coordinates and create polygon
                    coords = [(float(pt[0]), float(pt[1])) for pt in poly_coords]
                    # Ensure it is closed
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    p = Polygon(coords)
                    if p.is_valid and not p.is_empty:
                        room_polys.append((rid, p))
                    else:
                        errors.append({
                            "code": "INVALID_ROOM_POLYGON",
                            "cause": f"Room {rid} polygon is self-intersecting or empty.",
                            "effect": "Geometric area calculations will fail.",
                            "solution": "Simplify or correct the room boundary polygon."
                        })
                except Exception as e:
                    errors.append({
                        "code": "POLYGON_CONSTRUCTION_FAILED",
                        "cause": f"Could not construct polygon for room {rid}: {e}",
                        "effect": "Room area cannot be verified.",
                        "solution": "Verify coordinate data format."
                    })

        wall_shapes: List[Tuple[str, LineString, float]] = [] # (id, centerline, thickness)
        wall_polys: List[Polygon] = []
        for wl in walls:
            wid = wl.get("id", "unknown")
            start = wl.get("start")
            end = wl.get("end")
            thickness = float(wl.get("thickness_px", 8))
            if start and end:
                try:
                    line = LineString([(float(start[0]), float(start[1])), (float(end[0]), float(end[1]))])
                    wall_shapes.append((wid, line, thickness))
                    # Buffer the line to create a 2D wall polygon
                    wall_polys.append(line.buffer(thickness / 2))
                except Exception as e:
                    warnings.append({
                        "code": "WALL_GEOMETRY_INVALID",
                        "cause": f"Invalid coordinates for wall {wid}: {e}",
                        "effect": "Wall volume takeoffs will ignore this segment.",
                        "solution": "Verify wall detection inputs."
                    })

        # ── 1. Room Overlaps Check ───────────────────────────────────────────
        for i in range(len(room_polys)):
            rid_a, poly_a = room_polys[i]
            for j in range(i + 1, len(room_polys)):
                rid_b, poly_b = room_polys[j]
                
                if poly_a.intersects(poly_b):
                    inter = poly_a.intersection(poly_b).area
                    smaller_area = min(poly_a.area, poly_b.area)
                    if smaller_area > 0 and (inter / smaller_area) > 0.05: # >5% overlap
                        errors.append({
                            "code": "ROOM_OVERLAP",
                            "cause": f"Room {rid_a} overlaps with room {rid_b} by {inter * (scale_factor**2):.2f} sqm.",
                            "effect": "Double-counting materials and areas.",
                            "solution": "Re-run boundary detection or split overlapping coordinates."
                        })

        # ── 2. Wall Continuity / Floating Walls Check ────────────────────────
        for wid_a, line_a, thick_a in wall_shapes:
            connected = False
            # Check proximity of endpoints to other walls
            p1_a, p2_a = line_a.coords[0], line_a.coords[-1]
            
            for wid_b, line_b, thick_b in wall_shapes:
                if wid_a == wid_b:
                    continue
                
                # Check distance from endpoint of wall A to segment of wall B
                d1 = line_b.distance(LineString([p1_a, p1_a]))
                d2 = line_b.distance(LineString([p2_a, p2_a]))
                
                # If either endpoint is within 2x wall thickness of another wall segment, consider it connected
                if d1 < max(thick_a, thick_b) * 2 or d2 < max(thick_a, thick_b) * 2:
                    connected = True
                    break
                    
            if not connected and len(wall_shapes) > 3:
                warnings.append({
                    "code": "FLOATING_WALL",
                    "cause": f"Wall {wid_a} is disconnected from the main structural frame.",
                    "effect": "Unconnected wall segment detected; could represent noise in CAD extraction.",
                    "solution": "Extend wall endpoints to snap to adjacent wall joints."
                })

        # ── 3. Built-up Area vs sum of parts check ────────────────────────────
        carpet_area_px = sum(p.area for _, p in room_polys)
        
        # Compute total wall footprint (using union to avoid double-counting joints)
        wall_footprint_px = 0.0
        if wall_polys:
            try:
                wall_union = unary_union(wall_polys)
                wall_footprint_px = wall_union.area
            except Exception:
                # Fallback to simple sum if union fails
                wall_footprint_px = sum(wp.area for wp in wall_polys)

        # Built-up footprint is the union of rooms and walls
        built_up_area_px = 0.0
        all_polys = [p for _, p in room_polys] + wall_polys
        if all_polys:
            try:
                footprint_union = unary_union(all_polys)
                built_up_area_px = footprint_union.area
            except Exception:
                built_up_area_px = carpet_area_px + wall_footprint_px

        carpet_area_m2 = carpet_area_px * (scale_factor ** 2)
        wall_area_m2 = wall_footprint_px * (scale_factor ** 2)
        built_up_area_m2 = built_up_area_px * (scale_factor ** 2)
        
        # Calculate voids (areas inside the footprint union that are not rooms or walls)
        # In a closed plan, voids = built_up - (carpet + walls)
        sum_parts = carpet_area_m2 + wall_area_m2
        area_discrepancy = abs(built_up_area_m2 - sum_parts)
        
        if built_up_area_m2 > 0 and (area_discrepancy / built_up_area_m2) > 0.15:
            warnings.append({
                "code": "AREA_DISCREPANCY_WARNING",
                "cause": f"Sum of rooms and wall footprints ({sum_parts:.2f} sqm) differs from outer footprint built-up area ({built_up_area_m2:.2f} sqm) by {area_discrepancy:.2f} sqm.",
                "effect": "Unclassified voids or open spaces represent more than 15% of the drawing footprint.",
                "solution": "Verify if there are large balconies, open courtyards, or undetected rooms."
            })

        # ── 4. Door/Window inside Wall Check ──────────────────────────────────
        for door in (doors or []):
            center = door.get("center")
            if center:
                pt = LineString([center, center])
                min_dist = float("inf")
                for _, wall_line, thick in wall_shapes:
                    dist = wall_line.distance(pt)
                    if dist < min_dist:
                        min_dist = dist
                
                if min_dist > 50:
                    warnings.append({
                        "code": "FLOATING_DOOR",
                        "cause": f"Door detected at coordinates {center} is too far from any wall (distance: {min_dist:.1f}px).",
                        "effect": "Door is not anchored inside wall segment.",
                        "solution": "Adjust symbol coordinates or check for missing walls."
                    })

        for win in (windows or []):
            center = win.get("center")
            if center:
                pt = LineString([center, center])
                min_dist = float("inf")
                for _, wall_line, thick in wall_shapes:
                    dist = wall_line.distance(pt)
                    if dist < min_dist:
                        min_dist = dist
                
                if min_dist > 50:
                    warnings.append({
                        "code": "FLOATING_WINDOW",
                        "cause": f"Window detected at coordinates {center} is too far from any wall (distance: {min_dist:.1f}px).",
                        "effect": "Window is not anchored inside wall segment.",
                        "solution": "Adjust symbol coordinates or check for missing walls."
                    })

        has_critical = any(e["code"] in ("ROOM_OVERLAP", "INVALID_ROOM_POLYGON") for e in errors)
        
        return {
            "passed": not has_critical,
            "errors": errors,
            "warnings": warnings,
            "validation_metrics": {
                "carpet_area_m2": round(carpet_area_m2, 2),
                "wall_area_m2": round(wall_area_m2, 2),
                "built_up_area_m2": round(built_up_area_m2, 2),
                "unclassified_void_area_m2": round(max(0.0, built_up_area_m2 - sum_parts), 2),
                "total_rooms_validated": len(room_polys),
                "total_walls_validated": len(wall_shapes),
            }
        }
