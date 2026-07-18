import math
from typing import Dict, List, Any, Optional
from app.engine.is_codes import (
    CONCRETE_MIX_RATIOS, CONCRETE_DRY_VOLUME_FACTOR, CEMENT_BAG_VOLUME_M3,
    MORTAR_MIX, MORTAR_FRACTION_OF_MASONRY, MORTAR_DRY_VOLUME_FACTOR,
    BRICKS_PER_M3, AAC_BLOCKS_PER_M3, BEAM_FRACTION, COLUMN_FRACTION,
    FOUNDATION_FRACTION, STEEL_INDEX_KG_PER_M3, PLASTER_THICKNESS_MM,
    PLASTER_INTERNAL_MULTIPLIER, PAINT_TO_PLASTER_RATIO, DEFAULT_EXCAVATION_DEPTH_M,
    FOUNDATION_AREA_FRACTION, WATERPROOFING_WET_AREA_FRACTION, VALIDATION_BOUNDS
)
from app.engine.geometry import GeometryCalculator
from app.engine.material_brands import (
    get_brick_by_id, get_cement_by_id, get_steel_brand_by_id, get_steel_grade_by_id,
    get_sand_by_id, get_aggregate_by_id, get_paint_brand_by_id,
    get_tile_brand_by_id, get_tile_type_by_id, get_tile_size_by_id,
    get_plumbing_brand_by_id, get_electrical_brand_by_id,
    get_electrical_estimate_for_room, get_plumbing_estimate_for_room,
    PAINT_TYPES, TILE_ACCESSORIES, ELECTRICAL_INFRASTRUCTURE, PLUMBING_INFRASTRUCTURE,
    DOOR_TYPES, WINDOW_TYPES,
)

class MaterialEngine:
    @staticmethod
    def run_estimation(params: dict) -> dict:
        """
        Executes structural, masonry, finishing, and earthwork takeoffs
        using IS 456, IS 1200, and CPWD parameters based on literal formulas.
        """
        # 1. Inputs Extraction
        total_area_sqft = float(params.get("total_area") or params.get("total_area_sqft") or 0.0)
        floors = int(params.get("num_floors") or params.get("floors") or 1)
        floor_height_m = float(params.get("floor_height") or params.get("floor_height_m") or 3.0)
        wall_thickness_m = float(params.get("wall_thickness") or params.get("wall_thickness_m") or params.get("wall_thickness_mm", 230.0) / 1000.0)
        slab_thickness_m = float(params.get("slab_thickness") or params.get("slab_thickness_m") or params.get("slab_thickness_mm", 125.0) / 1000.0)
        concrete_grade = params.get("concrete_grade", "M20").upper()
        steel_grade = params.get("steel_grade", "Fe500").upper()
        foundation_type = params.get("foundation_type", "isolated").lower()
        brick_type = params.get("brick_type", "red_brick").lower()
        waste_percentage = float(params.get("waste_percentage") or params.get("waste_pct") or 5.0)
        excavation_depth = float(params.get("excavation_depth") or DEFAULT_EXCAVATION_DEPTH_M)

        waste_factor = 1.0 + (waste_percentage / 100.0)
        validation_warnings = []

        # ── Brand selections ──────────────────────────────────────────────────
        brick_brand_id = params.get("brick_brand_id", "red_clay_standard")
        cement_brand_id = params.get("cement_brand_id", "ultratech")
        steel_brand_id = params.get("steel_brand_id", "tata_tmt")
        steel_grade_id = params.get("steel_grade_id", "fe500")
        sand_type_id = params.get("sand_type_id", "river_sand")
        aggregate_type_id = params.get("aggregate_type_id", "agg_20mm")
        paint_brand_id = params.get("paint_brand_id", "asian_paints")
        tile_brand_id = params.get("tile_brand_id", "kajaria")
        tile_type_id = params.get("tile_type_id", "vitrified")
        tile_size_id = params.get("tile_size_id", "2x2")
        plumbing_brand_id = params.get("plumbing_brand_id", "ashirvad")
        electrical_brand_id = params.get("electrical_brand_id", "havells")

        # Resolve brand data
        brick_data = get_brick_by_id(brick_brand_id)
        cement_data = get_cement_by_id(cement_brand_id)
        steel_brand_data = get_steel_brand_by_id(steel_brand_id)
        steel_grade_data = get_steel_grade_by_id(steel_grade_id)
        sand_data = get_sand_by_id(sand_type_id)
        aggregate_data = get_aggregate_by_id(aggregate_type_id)
        paint_brand_data = get_paint_brand_by_id(paint_brand_id)
        tile_brand_data = get_tile_brand_by_id(tile_brand_id)
        tile_type_data = get_tile_type_by_id(tile_type_id)
        tile_size_data = get_tile_size_by_id(tile_size_id)
        plumbing_brand_data = get_plumbing_brand_by_id(plumbing_brand_id)
        electrical_brand_data = get_electrical_brand_by_id(electrical_brand_id)

        # ── Room data (if provided by AI detection) ───────────────────────────
        rooms = params.get("rooms", [])

        # ── 1. GEOMETRY ────────────────────────────────────────────────────────
        area_m2 = GeometryCalculator.sqft_to_m2(total_area_sqft)

        length = math.sqrt(area_m2) * 1.25 if area_m2 > 0 else 0.0
        width = area_m2 / length if length > 0 else 0.0
        perimeter_m = GeometryCalculator.estimate_perimeter(area_m2)

        wall_volume_m3 = GeometryCalculator.calculate_wall_volume(
            perimeter_m=perimeter_m,
            floor_height_m=floor_height_m,
            wall_thickness_m=wall_thickness_m,
            floors=floors,
            deduction_pct=10.0
        )

        # ── 2. RCC (CONCRETE) ──────────────────────────────────────────────────
        slab_concrete = area_m2 * slab_thickness_m * floors
        beam_concrete = slab_concrete * BEAM_FRACTION
        column_concrete = slab_concrete * COLUMN_FRACTION
        super_concrete = slab_concrete + beam_concrete + column_concrete
        found_coeff = FOUNDATION_FRACTION.get(foundation_type, 0.18)
        foundation_concrete = super_concrete * found_coeff
        total_concrete_volume = foundation_concrete + super_concrete

        # ── 3. STEEL ───────────────────────────────────────────────────────────
        steel_index = STEEL_INDEX_KG_PER_M3.get("default", 85.0)
        total_steel_weight = total_concrete_volume * steel_index

        # ── 4. MASONRY ─────────────────────────────────────────────────────────
        bricks_count = 0
        blocks_count = 0
        masonry_unit_rate = brick_data["units_per_m3"]
        masonry_label = brick_data["name"]

        if "aac" in brick_type or "block" in brick_type:
            blocks_count = math.ceil(wall_volume_m3 * masonry_unit_rate)
        else:
            bricks_count = math.ceil(wall_volume_m3 * masonry_unit_rate)

        # Mortar volume (30% of total masonry volume)
        wet_mortar_volume = wall_volume_m3 * MORTAR_FRACTION_OF_MASONRY
        dry_mortar_volume = wet_mortar_volume * MORTAR_DRY_VOLUME_FACTOR

        m_c, m_s = MORTAR_MIX.get("brick_standard", (1, 6))
        mortar_total_parts = m_c + m_s
        masonry_mortar_cement_m3 = (m_c / mortar_total_parts) * dry_mortar_volume
        masonry_mortar_sand_m3 = (m_s / mortar_total_parts) * dry_mortar_volume

        # ── 5. FINISHING ───────────────────────────────────────────────────────
        plaster_internal = PLASTER_INTERNAL_MULTIPLIER * area_m2
        plaster_external = perimeter_m * floor_height_m * floors
        total_plaster_area = plaster_internal + plaster_external

        wet_plaster_vol = (plaster_internal * (PLASTER_THICKNESS_MM["internal"] / 1000.0) +
                           plaster_external * (PLASTER_THICKNESS_MM["external"] / 1000.0))
        dry_plaster_vol = wet_plaster_vol * MORTAR_DRY_VOLUME_FACTOR

        p_c, p_s = MORTAR_MIX.get("plaster_internal", (1, 4))
        plaster_total_parts = p_c + p_s
        plaster_cement_m3 = (p_c / plaster_total_parts) * dry_plaster_vol
        plaster_sand_m3 = (p_s / plaster_total_parts) * dry_plaster_vol

        paint_area = total_plaster_area * 1.5
        tiles_area = area_m2

        # Waterproofing
        roof_area = area_m2 / floors if floors > 0 else area_m2
        bathrooms_area = area_m2 * WATERPROOFING_WET_AREA_FRACTION
        waterproofing_area = roof_area + bathrooms_area + (roof_area * 0.8)

        # ── 6. EARTHWORK (EXCAVATION) ──────────────────────────────────────────
        foundation_area = area_m2 * FOUNDATION_AREA_FRACTION
        excavation_volume = foundation_area * excavation_depth

        # ── 7. DRY CONCRETE DECOMPOSITION (IS 456) ─────────────────────────────
        dry_concrete_volume = total_concrete_volume * CONCRETE_DRY_VOLUME_FACTOR
        c_parts, s_parts, a_parts = CONCRETE_MIX_RATIOS.get(concrete_grade, (1, 1.5, 3.0))
        concrete_total_parts = c_parts + s_parts + a_parts

        concrete_cement_m3 = (c_parts / concrete_total_parts) * dry_concrete_volume
        concrete_sand_m3 = (s_parts / concrete_total_parts) * dry_concrete_volume
        concrete_aggregate_m3 = (a_parts / concrete_total_parts) * dry_concrete_volume

        # ── 8. COMPILING INGREDIENTS ───────────────────────────────────────────
        total_cement_m3 = concrete_cement_m3 + masonry_mortar_cement_m3 + plaster_cement_m3
        total_cement_bags = math.ceil((total_cement_m3 / CEMENT_BAG_VOLUME_M3) * waste_factor)
        total_sand_m3 = (concrete_sand_m3 + masonry_mortar_sand_m3 + plaster_sand_m3) * waste_factor
        total_aggregate_m3 = concrete_aggregate_m3 * waste_factor

        # Apply waste factors to other materials
        final_concrete_volume = total_concrete_volume * waste_factor
        final_steel_weight = total_steel_weight * waste_factor
        final_bricks_count = math.ceil(bricks_count * waste_factor)
        final_blocks_count = math.ceil(blocks_count * waste_factor)
        final_plaster_area = total_plaster_area * waste_factor
        final_paint_area = paint_area * waste_factor
        final_tiles_area = tiles_area * waste_factor
        final_waterproofing_area = waterproofing_area * waste_factor
        final_excavation_volume = excavation_volume

        # ── 9. SHUTTERING / CENTERING ESTIMATION ──────────────────────────────
        shuttering = MaterialEngine._calculate_shuttering(
            slab_concrete=slab_concrete,
            beam_concrete=beam_concrete,
            column_concrete=column_concrete,
            slab_thickness_m=slab_thickness_m,
            floor_height_m=floor_height_m,
            floors=floors,
            area_m2=area_m2,
        )

        # ── 10. PAINT DETAILED ESTIMATION ─────────────────────────────────────
        paint_estimation = MaterialEngine._calculate_paint(
            internal_wall_area=plaster_internal * waste_factor,
            external_wall_area=plaster_external * waste_factor,
            ceiling_area=area_m2 * waste_factor,
            paint_brand_data=paint_brand_data,
        )

        # ── 11. TILE DETAILED ESTIMATION ──────────────────────────────────────
        tile_estimation = MaterialEngine._calculate_tiles(
            floor_area_m2=tiles_area * waste_factor,
            wall_tile_area_m2=bathrooms_area * 2.5 * waste_factor,  # bathroom wall tiles
            tile_brand_data=tile_brand_data,
            tile_type_data=tile_type_data,
            tile_size_data=tile_size_data,
        )

        # ── 12. PLUMBING ESTIMATION ───────────────────────────────────────────
        plumbing_estimation = MaterialEngine._calculate_plumbing(
            rooms=rooms,
            total_area_sqft=total_area_sqft,
            floors=floors,
            plumbing_brand_data=plumbing_brand_data,
        )

        # ── 13. ELECTRICAL ESTIMATION ─────────────────────────────────────────
        electrical_estimation = MaterialEngine._calculate_electrical(
            rooms=rooms,
            total_area_sqft=total_area_sqft,
            floors=floors,
            electrical_brand_data=electrical_brand_data,
        )

        # ── 14. DOORS & WINDOWS ESTIMATION ────────────────────────────────────
        doors_count = params.get("doors_count", floors * 5)
        windows_count = params.get("windows_count", floors * 6)
        door_estimation = MaterialEngine._calculate_doors(doors_count, floors)
        window_estimation = MaterialEngine._calculate_windows(windows_count, floors)

        # ── 15. ROOM-LEVEL ESTIMATION ─────────────────────────────────────────
        room_estimates = MaterialEngine._calculate_room_estimates(
            rooms=rooms,
            floor_height_m=floor_height_m,
            wall_thickness_m=wall_thickness_m,
            waste_factor=waste_factor,
            brick_data=brick_data,
            brick_type=brick_type,
        )

        # ── VALIDATION (IS Code Limits) ──────────────────────────────────────
        if total_area_sqft > 0:
            concrete_per_sqft = final_concrete_volume / total_area_sqft
            if concrete_per_sqft > VALIDATION_BOUNDS["concrete_max_per_sqft_m3"]:
                validation_warnings.append("Calculated concrete quantity exceeds standard residential construction limits.")

            steel_ratio = total_steel_weight / total_concrete_volume if total_concrete_volume > 0 else 0
            if steel_ratio < VALIDATION_BOUNDS["steel_min_kg_per_m3"] or steel_ratio > VALIDATION_BOUNDS["steel_max_kg_per_m3"]:
                validation_warnings.append("Calculated reinforcement ratio lies outside standard residential limits.")

            bricks_per_sqft = final_bricks_count / total_area_sqft if total_area_sqft > 0 else 0
            if bricks_per_sqft > VALIDATION_BOUNDS["bricks_max_per_sqft"]:
                validation_warnings.append("Calculated brick quantity exceeds standard residential construction limits.")

            cement_per_sqft = total_cement_bags / total_area_sqft if total_area_sqft > 0 else 0
            if cement_per_sqft > VALIDATION_BOUNDS["cement_max_per_sqft_bags"]:
                validation_warnings.append("Calculated cement bag count exceeds standard residential construction limits.")

        if any(v < 0 for v in [final_concrete_volume, final_steel_weight, total_cement_bags, total_sand_m3, total_aggregate_m3]):
            validation_warnings.append("Calculated quantity contains negative values, reflecting faulty input parameters.")

        return {
            "concrete_volume_m3": round(final_concrete_volume, 2),
            "steel_weight_kg": round(final_steel_weight, 2),
            "bricks_count": final_bricks_count,
            "blocks_count": final_blocks_count,
            "cement_bags": total_cement_bags,
            "sand_volume_m3": round(total_sand_m3, 2),
            "aggregate_volume_m3": round(total_aggregate_m3, 2),
            "plaster_area_sq_m": round(final_plaster_area, 2),
            "paint_area_sq_m": round(final_paint_area, 2),
            "tile_area_sq_m": round(final_tiles_area, 2),
            "waterproofing_area_sq_m": round(final_waterproofing_area, 2),
            "excavation_volume_m3": round(final_excavation_volume, 2),
            "mortar_volume_m3": round(wet_mortar_volume * waste_factor, 2),

            # Brand selections used
            "brand_selections": {
                "brick": {"id": brick_brand_id, "name": brick_data["name"], "price_per_unit": brick_data["price_per_unit"]},
                "cement": {"id": cement_brand_id, "name": cement_data["name"], "price_per_bag": cement_data["price_per_bag"]},
                "steel": {"id": steel_brand_id, "name": steel_brand_data["name"], "price_per_kg": steel_brand_data["price_per_kg"], "grade": steel_grade_data["name"]},
                "sand": {"id": sand_type_id, "name": sand_data["name"], "price_per_m3": sand_data["price_per_m3"]},
                "aggregate": {"id": aggregate_type_id, "name": aggregate_data["name"], "price_per_m3": aggregate_data["price_per_m3"]},
                "paint": {"id": paint_brand_id, "name": paint_brand_data["name"]},
                "tile": {"id": tile_brand_id, "name": tile_brand_data["name"], "type": tile_type_data["name"], "size": tile_size_data["name"]},
                "plumbing": {"id": plumbing_brand_id, "name": plumbing_brand_data["name"]},
                "electrical": {"id": electrical_brand_id, "name": electrical_brand_data["name"]},
            },

            # Detailed sub-estimations
            "shuttering": shuttering,
            "paint_detailed": paint_estimation,
            "tile_detailed": tile_estimation,
            "plumbing": plumbing_estimation,
            "electrical": electrical_estimation,
            "doors": door_estimation,
            "windows": window_estimation,
            "room_estimates": room_estimates,

            # Audit Details
            "geometry": {
                "built_up_area_m2": {"val": round(area_m2, 2), "unit": "m²", "formula": "Area (sq ft) × 0.0929", "calculations": f"{total_area_sqft} × 0.0929 = {round(area_m2, 2)}"},
                "perimeter_m": {"val": round(perimeter_m, 2), "unit": "m", "formula": "2 × (L + W) where L = √(Built-up Area) × 1.25", "calculations": f"2 × ({round(length, 2)} + {round(width, 2)}) = {round(perimeter_m, 2)}"},
                "wall_volume_m3": {"val": round(wall_volume_m3, 2), "unit": "m³", "formula": "Perimeter × Floor Ht × Wall Thick × Floors × 0.90", "calculations": f"{round(perimeter_m, 2)} × {floor_height_m} × {wall_thickness_m} × {floors} × 0.90 = {round(wall_volume_m3, 2)}"},
            },
            "rcc": {
                "slab_concrete": {"val": round(slab_concrete, 2), "unit": "m³", "formula": "Built-up Area × Slab Thick × Floors", "calculations": f"{round(area_m2, 2)} × {slab_thickness_m} × {floors} = {round(slab_concrete, 2)}"},
                "beam_concrete": {"val": round(beam_concrete, 2), "unit": "m³", "formula": "Slab Concrete × 10%", "calculations": f"{round(slab_concrete, 2)} × 0.10 = {round(beam_concrete, 2)}"},
                "column_concrete": {"val": round(column_concrete, 2), "unit": "m³", "formula": "Slab Concrete × 5%", "calculations": f"{round(slab_concrete, 2)} × 0.05 = {round(column_concrete, 2)}"},
                "foundation_concrete": {"val": round(foundation_concrete, 2), "unit": "m³", "formula": "Superstructure RCC × Found. Coeff.", "calculations": f"({round(slab_concrete + beam_concrete + column_concrete, 2)}) × {found_coeff} = {round(foundation_concrete, 2)}"},
                "total_concrete": {"val": round(total_concrete_volume, 2), "unit": "m³", "formula": "Slab + Beam + Column + Foundation", "calculations": f"{round(slab_concrete, 2)} + {round(beam_concrete, 2)} + {round(column_concrete, 2)} + {round(foundation_concrete, 2)} = {round(total_concrete_volume, 2)}"},
                "steel_reinforcement": {"val": round(total_steel_weight, 2), "unit": "kg", "formula": "Total Concrete × Steel Index", "calculations": f"{round(total_concrete_volume, 2)} × {85.0} = {round(total_steel_weight, 2)}"},
            },
            "masonry": {
                "brickwork_volume": {"val": round(wall_volume_m3, 2), "unit": "m³", "formula": "Wall Volume", "calculations": f"{round(wall_volume_m3, 2)} m³"},
                "masonry_units": {"val": bricks_count if bricks_count > 0 else blocks_count, "unit": "pcs", "formula": f"Wall Volume × {masonry_unit_rate} ({masonry_label})", "calculations": f"{round(wall_volume_m3, 2)} × {masonry_unit_rate} = {bricks_count if bricks_count > 0 else blocks_count}"},
                "mortar_wet_volume": {"val": round(wet_mortar_volume, 2), "unit": "m³", "formula": "Wall Volume × 30%", "calculations": f"{round(wall_volume_m3, 2)} × 0.30 = {round(wet_mortar_volume, 2)}"},
                "mortar_dry_volume": {"val": round(dry_mortar_volume, 2), "unit": "m³", "formula": "Wet Mortar × 1.33", "calculations": f"{round(wet_mortar_volume, 2)} × 1.33 = {round(dry_mortar_volume, 2)}"},
            },
            "finishing": {
                "plaster_area": {"val": round(total_plaster_area, 2), "unit": "m²", "formula": "Internal Plaster + External Plaster", "calculations": f"({round(plaster_internal, 2)}) + ({round(plaster_external, 2)}) = {round(total_plaster_area, 2)}"},
                "paint_area": {"val": round(paint_area, 2), "unit": "m²", "formula": "Plaster Area × 1.5", "calculations": f"{round(total_plaster_area, 2)} × 1.5 = {round(paint_area, 2)}"},
                "flooring_area": {"val": round(tiles_area, 2), "unit": "m²", "formula": "Total Built-up Area", "calculations": f"{round(area_m2, 2)} m²"},
                "waterproofing_area": {"val": round(waterproofing_area, 2), "unit": "m²", "formula": "Roof Footprint + Bathroom Area + Plinth base", "calculations": f"{round(roof_area, 2)} + {round(bathrooms_area, 2)} + {round(roof_area * 0.8, 2)} = {round(waterproofing_area, 2)}"},
            },
            "validation_warnings": validation_warnings,
        }

    # ══════════════════════════════════════════════════════════════════════════
    # SUB-ESTIMATION MODULES
    # ══════════════════════════════════════════════════════════════════════════

    @staticmethod
    def _calculate_shuttering(
        slab_concrete: float, beam_concrete: float, column_concrete: float,
        slab_thickness_m: float, floor_height_m: float, floors: int, area_m2: float,
    ) -> dict:
        """Calculate centering/shuttering (formwork) requirements."""
        # Slab shuttering = floor area per floor × floors
        slab_shuttering_m2 = (area_m2 / floors if floors > 0 else area_m2) * floors

        # Beam shuttering (3 sides: bottom + 2 sides)
        # Beam cross-section assumed 230mm × 450mm, spaced at ~3m centers
        beam_length_est = (area_m2 / floors) ** 0.5 * 4 * floors if floors > 0 else 0
        beam_shuttering_m2 = beam_length_est * (0.23 + 2 * 0.45)

        # Column shuttering (4 sides)
        # Column assumed 300mm × 300mm
        num_columns_est = max(4, int(area_m2 / 15))  # ~1 column per 15 m²
        column_shuttering_m2 = num_columns_est * 4 * 0.3 * floor_height_m * floors

        # Staircase shuttering (waist slab + steps)
        staircase_area_m2 = 3.0 * floors  # ~3 m² per floor

        total_shuttering_m2 = slab_shuttering_m2 + beam_shuttering_m2 + column_shuttering_m2 + staircase_area_m2
        rate_per_m2 = 150.0  # ₹/m²
        rate_per_sqft = rate_per_m2 / 10.764

        return {
            "slab_area_m2": round(slab_shuttering_m2, 2),
            "beam_area_m2": round(beam_shuttering_m2, 2),
            "column_area_m2": round(column_shuttering_m2, 2),
            "staircase_area_m2": round(staircase_area_m2, 2),
            "total_area_m2": round(total_shuttering_m2, 2),
            "total_area_sqft": round(total_shuttering_m2 * 10.764, 2),
            "rate_per_sqft": round(rate_per_sqft, 2),
            "rate_per_m2": rate_per_m2,
            "total_cost": round(total_shuttering_m2 * rate_per_m2, 0),
        }

    @staticmethod
    def _calculate_paint(
        internal_wall_area: float, external_wall_area: float,
        ceiling_area: float, paint_brand_data: dict,
    ) -> dict:
        """Detailed paint estimation with primer, putty, and coats."""
        brand_multiplier = paint_brand_data.get("price_multiplier", 1.0)
        results = {}

        for pt in PAINT_TYPES:
            pid = pt["id"]
            if pid == "exterior_emulsion":
                area = external_wall_area
            elif pid == "ceiling_paint":
                area = ceiling_area
            elif pid == "putty":
                area = internal_wall_area + ceiling_area
                coverage_per_unit = pt.get("coverage_m2_per_kg", 1.2)
                coats = pt.get("coats", 2)
                total_qty_kg = (area / coverage_per_unit) * coats
                bags_needed = math.ceil(total_qty_kg / pt.get("bag_kg", 40))
                bag_price = pt.get("bag_price", 900) * brand_multiplier
                results[pid] = {
                    "name": pt["name"],
                    "area_m2": round(area, 2),
                    "coats": coats,
                    "quantity_kg": round(total_qty_kg, 1),
                    "bags_needed": bags_needed,
                    "bag_size_kg": pt.get("bag_kg", 40),
                    "price_per_bag": round(bag_price, 0),
                    "material_cost": round(bags_needed * bag_price, 0),
                }
                continue
            else:
                area = internal_wall_area + ceiling_area

            coverage = pt.get("coverage_m2_per_liter", 10)
            coats = pt.get("coats", 2)
            total_liters = (area / coverage) * coats
            bucket_liters = pt.get("bucket_liters", 20)
            buckets_needed = math.ceil(total_liters / bucket_liters)
            bucket_price = pt.get("bucket_price", 3000) * brand_multiplier

            results[pid] = {
                "name": pt["name"],
                "area_m2": round(area, 2),
                "coats": coats,
                "total_liters": round(total_liters, 1),
                "buckets_needed": buckets_needed,
                "bucket_liters": bucket_liters,
                "price_per_bucket": round(bucket_price, 0),
                "material_cost": round(buckets_needed * bucket_price, 0),
            }

        total_paint_material = sum(r.get("material_cost", 0) for r in results.values())
        total_paint_area = internal_wall_area + external_wall_area + ceiling_area
        labour_cost = round(total_paint_area * 25, 0)  # ₹25/m² for painting labour

        return {
            "items": results,
            "total_material_cost": total_paint_material,
            "labour_cost": labour_cost,
            "total_cost": total_paint_material + labour_cost,
        }

    @staticmethod
    def _calculate_tiles(
        floor_area_m2: float, wall_tile_area_m2: float,
        tile_brand_data: dict, tile_type_data: dict, tile_size_data: dict,
    ) -> dict:
        """Detailed tile estimation with boxes, adhesive, grout, and wastage."""
        brand_multiplier = tile_brand_data.get("price_multiplier", 1.0)
        base_price = tile_type_data.get("base_price_per_m2", 650)
        wastage_pct = tile_type_data.get("wastage_pct", 5)
        box_coverage = tile_size_data.get("box_coverage_m2", 1.44)
        tiles_per_box = tile_size_data.get("tiles_per_box", 4)

        # Floor tiles
        floor_with_waste = floor_area_m2 * (1 + wastage_pct / 100)
        floor_boxes = math.ceil(floor_with_waste / box_coverage)
        floor_tile_count = floor_boxes * tiles_per_box
        floor_price = round(floor_with_waste * base_price * brand_multiplier, 0)

        # Wall tiles (bathroom/kitchen) — use smaller size (300×600 typically)
        wall_with_waste = wall_tile_area_m2 * (1 + wastage_pct / 100)
        wall_box_coverage = 1.08  # 300×600 box coverage
        wall_boxes = math.ceil(wall_with_waste / wall_box_coverage)
        wall_tile_count = wall_boxes * 6
        wall_price = round(wall_with_waste * (base_price * 0.7) * brand_multiplier, 0)

        total_area = floor_with_waste + wall_with_waste

        # Adhesive
        adhesive = TILE_ACCESSORIES.get("adhesive", {})
        adhesive_bags = math.ceil(total_area / adhesive.get("coverage_m2_per_bag", 4.5))
        adhesive_cost = adhesive_bags * adhesive.get("price_per_bag", 550)

        # Grout
        grout = TILE_ACCESSORIES.get("grout", {})
        grout_kg = math.ceil(total_area / grout.get("coverage_m2_per_kg", 3.0))
        grout_cost = grout_kg * grout.get("price_per_kg", 180)

        labour_cost = round(total_area * 35, 0)  # ₹35/m² for tiling labour

        return {
            "floor_tiles": {
                "area_m2": round(floor_area_m2, 2),
                "area_with_waste_m2": round(floor_with_waste, 2),
                "boxes_required": floor_boxes,
                "tiles_count": floor_tile_count,
                "tile_size": tile_size_data.get("name", "600×600 mm"),
                "material_cost": floor_price,
            },
            "wall_tiles": {
                "area_m2": round(wall_tile_area_m2, 2),
                "area_with_waste_m2": round(wall_with_waste, 2),
                "boxes_required": wall_boxes,
                "tiles_count": wall_tile_count,
                "material_cost": wall_price,
            },
            "adhesive": {
                "bags_required": adhesive_bags,
                "bag_weight_kg": adhesive.get("bag_weight_kg", 20),
                "cost": adhesive_cost,
            },
            "grout": {
                "quantity_kg": grout_kg,
                "cost": grout_cost,
            },
            "wastage_pct": wastage_pct,
            "total_material_cost": floor_price + wall_price + adhesive_cost + grout_cost,
            "labour_cost": labour_cost,
            "total_cost": floor_price + wall_price + adhesive_cost + grout_cost + labour_cost,
        }

    @staticmethod
    def _calculate_plumbing(
        rooms: list, total_area_sqft: float, floors: int,
        plumbing_brand_data: dict,
    ) -> dict:
        """Estimate plumbing requirements based on room types."""
        brand_multiplier = plumbing_brand_data.get("price_multiplier", 1.0)

        room_plumbing = []
        total_pipe_cost = 0
        total_fittings_cost = 0
        total_fixtures_cost = 0
        total_labour_cost = 0

        # If rooms detected, use per-room estimation
        if rooms:
            for room in rooms:
                label = room.get("label", "room").lower()
                est = get_plumbing_estimate_for_room(label)
                if est:
                    adjusted = {
                        "room": room.get("label", "Room"),
                        "pipe_cost": round(est.get("pipe_cost", 0) * brand_multiplier),
                        "fittings_cost": round(est.get("fittings_cost", 0) * brand_multiplier),
                        "fixtures_cost": round(est.get("fixtures_cost", 0) * brand_multiplier),
                        "labour_cost": est.get("labour_cost", 0),
                    }
                    room_plumbing.append(adjusted)
                    total_pipe_cost += adjusted["pipe_cost"]
                    total_fittings_cost += adjusted["fittings_cost"]
                    total_fixtures_cost += adjusted["fixtures_cost"]
                    total_labour_cost += adjusted["labour_cost"]
        else:
            # Fallback: estimate based on area
            # Typical residential: 2 bathrooms + 1 kitchen per 1000 sqft
            num_bathrooms = max(1, int(total_area_sqft / 500))
            num_kitchens = max(1, floors)
            num_toilets = max(1, int(total_area_sqft / 800))

            for i in range(num_bathrooms):
                est = get_plumbing_estimate_for_room("bathroom")
                adjusted = {
                    "room": f"Bathroom {i+1}",
                    "pipe_cost": round(est.get("pipe_cost", 3500) * brand_multiplier),
                    "fittings_cost": round(est.get("fittings_cost", 5500) * brand_multiplier),
                    "fixtures_cost": round(est.get("fixtures_cost", 12000) * brand_multiplier),
                    "labour_cost": est.get("labour_cost", 4000),
                }
                room_plumbing.append(adjusted)

            for i in range(num_kitchens):
                est = get_plumbing_estimate_for_room("kitchen")
                adjusted = {
                    "room": f"Kitchen {i+1}" if num_kitchens > 1 else "Kitchen",
                    "pipe_cost": round(est.get("pipe_cost", 3000) * brand_multiplier),
                    "fittings_cost": round(est.get("fittings_cost", 4000) * brand_multiplier),
                    "fixtures_cost": round(est.get("fixtures_cost", 6000) * brand_multiplier),
                    "labour_cost": est.get("labour_cost", 3500),
                }
                room_plumbing.append(adjusted)

            for rp in room_plumbing:
                total_pipe_cost += rp["pipe_cost"]
                total_fittings_cost += rp["fittings_cost"]
                total_fixtures_cost += rp["fixtures_cost"]
                total_labour_cost += rp["labour_cost"]

        # Infrastructure costs
        infra = PLUMBING_INFRASTRUCTURE
        infra_cost = (
            infra.get("overhead_tank_cost", 8000) +
            infra.get("underground_sump_cost", 25000) +
            infra.get("main_supply_pipe_cost", 4500) +
            infra.get("sewer_connection_cost", 8000)
        )

        total_material = total_pipe_cost + total_fittings_cost + total_fixtures_cost + infra_cost
        grand_total = total_material + total_labour_cost

        return {
            "rooms": room_plumbing,
            "pipe_cost": total_pipe_cost,
            "fittings_cost": total_fittings_cost,
            "fixtures_cost": total_fixtures_cost,
            "infrastructure_cost": infra_cost,
            "total_material_cost": total_material,
            "labour_cost": total_labour_cost,
            "total_cost": grand_total,
        }

    @staticmethod
    def _calculate_electrical(
        rooms: list, total_area_sqft: float, floors: int,
        electrical_brand_data: dict,
    ) -> dict:
        """Estimate electrical requirements based on room types."""
        brand_multiplier = electrical_brand_data.get("price_multiplier", 1.0)

        room_electrical = []
        total_switches = 0
        total_sockets = 0
        total_lights = 0
        total_fans = 0
        total_wiring_m = 0
        total_wire_cost = 0
        total_switch_cost = 0
        total_light_cost = 0
        total_fan_cost = 0
        total_labour_cost = 0

        if rooms:
            for room in rooms:
                label = room.get("label", "bedroom")
                est = get_electrical_estimate_for_room(label)
                adjusted = {
                    "room": room.get("label", "Room"),
                    "switches": est.get("switches", 3),
                    "sockets": est.get("sockets", 3),
                    "lights": est.get("lights", 2),
                    "fans": est.get("fans", 1),
                    "wiring_m": est.get("wiring_m", 20),
                    "wire_cost": round(est.get("wire_cost", 1500) * brand_multiplier),
                    "switch_cost": round(est.get("switch_cost", 1000) * brand_multiplier),
                    "light_cost": round(est.get("light_cost", 2000) * brand_multiplier),
                    "fan_cost": round(est.get("fan_cost", 2500) * brand_multiplier),
                    "labour_cost": est.get("labour_cost", 2000),
                }
                room_electrical.append(adjusted)
                total_switches += adjusted["switches"]
                total_sockets += adjusted["sockets"]
                total_lights += adjusted["lights"]
                total_fans += adjusted["fans"]
                total_wiring_m += adjusted["wiring_m"]
                total_wire_cost += adjusted["wire_cost"]
                total_switch_cost += adjusted["switch_cost"]
                total_light_cost += adjusted["light_cost"]
                total_fan_cost += adjusted["fan_cost"]
                total_labour_cost += adjusted["labour_cost"]
        else:
            # Fallback: estimate based on area and standard room composition
            room_types = []
            if total_area_sqft <= 500:
                room_types = ["living_room", "bedroom", "kitchen", "bathroom"]
            elif total_area_sqft <= 1000:
                room_types = ["living_room", "bedroom", "bedroom", "kitchen", "bathroom", "bathroom", "dining", "balcony"]
            elif total_area_sqft <= 2000:
                room_types = ["living_room", "master_bedroom", "bedroom", "bedroom", "kitchen", "bathroom", "bathroom", "toilet", "dining", "balcony", "passage", "store_room"]
            else:
                room_types = ["living_room", "master_bedroom", "bedroom", "bedroom", "bedroom", "kitchen", "bathroom", "bathroom", "bathroom", "toilet", "dining", "balcony", "balcony", "passage", "passage", "store_room", "staircase"]

            for rt in room_types:
                est = get_electrical_estimate_for_room(rt)
                adjusted = {
                    "room": rt.replace("_", " ").title(),
                    "switches": est.get("switches", 3),
                    "sockets": est.get("sockets", 3),
                    "lights": est.get("lights", 2),
                    "fans": est.get("fans", 1),
                    "wiring_m": est.get("wiring_m", 20),
                    "wire_cost": round(est.get("wire_cost", 1500) * brand_multiplier),
                    "switch_cost": round(est.get("switch_cost", 1000) * brand_multiplier),
                    "light_cost": round(est.get("light_cost", 2000) * brand_multiplier),
                    "fan_cost": round(est.get("fan_cost", 2500) * brand_multiplier),
                    "labour_cost": est.get("labour_cost", 2000),
                }
                room_electrical.append(adjusted)
                total_switches += adjusted["switches"]
                total_sockets += adjusted["sockets"]
                total_lights += adjusted["lights"]
                total_fans += adjusted["fans"]
                total_wiring_m += adjusted["wiring_m"]
                total_wire_cost += adjusted["wire_cost"]
                total_switch_cost += adjusted["switch_cost"]
                total_light_cost += adjusted["light_cost"]
                total_fan_cost += adjusted["fan_cost"]
                total_labour_cost += adjusted["labour_cost"]

        # Infrastructure
        infra = ELECTRICAL_INFRASTRUCTURE
        infra_cost = (
            infra["distribution_board"]["cost"] +
            infra["mcb"]["count"] * infra["mcb"]["cost_per_unit"] +
            infra["rccb"]["cost"] +
            infra["earthing"]["count"] * infra["earthing"]["cost_per_unit"] +
            infra["main_cable"]["cost"] +
            infra["meter_box"]["cost"] +
            infra["inverter_wiring"]["cost"]
        )

        total_material = total_wire_cost + total_switch_cost + total_light_cost + total_fan_cost + infra_cost
        grand_total = total_material + total_labour_cost

        return {
            "rooms": room_electrical,
            "summary": {
                "total_switches": total_switches,
                "total_sockets": total_sockets,
                "total_lights": total_lights,
                "total_fans": total_fans,
                "total_wiring_m": total_wiring_m,
            },
            "wire_cost": total_wire_cost,
            "switch_cost": total_switch_cost,
            "light_cost": total_light_cost,
            "fan_cost": total_fan_cost,
            "infrastructure_cost": infra_cost,
            "total_material_cost": total_material,
            "labour_cost": total_labour_cost,
            "total_cost": grand_total,
        }

    @staticmethod
    def _calculate_doors(doors_count: int, floors: int) -> dict:
        """Estimate door costs based on count and standard door types."""
        # Assume: 1 main door + rest flush + 30% PVC for wet areas
        main_door = DOOR_TYPES[3]  # main entrance
        flush_door = DOOR_TYPES[0]
        pvc_door = DOOR_TYPES[2]

        main_count = 1
        pvc_count = max(1, int(doors_count * 0.25))
        flush_count = doors_count - main_count - pvc_count

        main_cost = main_count * (main_door["price"] + main_door["frame_cost"])
        flush_cost = max(0, flush_count) * (flush_door["price"] + flush_door["frame_cost"])
        pvc_cost = pvc_count * (pvc_door["price"] + pvc_door["frame_cost"])
        total_cost = main_cost + flush_cost + pvc_cost

        return {
            "total_count": doors_count,
            "main_doors": {"count": main_count, "cost": main_cost},
            "flush_doors": {"count": max(0, flush_count), "cost": flush_cost},
            "pvc_doors": {"count": pvc_count, "cost": pvc_cost},
            "total_cost": total_cost,
        }

    @staticmethod
    def _calculate_windows(windows_count: int, floors: int) -> dict:
        """Estimate window costs."""
        aluminium = WINDOW_TYPES[0]
        avg_area_sqft = 12  # 4×3 ft
        cost_per_window = aluminium["price_per_sqft"] * avg_area_sqft
        total_cost = windows_count * cost_per_window

        return {
            "total_count": windows_count,
            "type": aluminium["name"],
            "avg_area_sqft": avg_area_sqft,
            "cost_per_window": cost_per_window,
            "total_cost": total_cost,
        }

    @staticmethod
    def _calculate_room_estimates(
        rooms: list, floor_height_m: float, wall_thickness_m: float,
        waste_factor: float, brick_data: dict, brick_type: str,
    ) -> list:
        """Calculate per-room material estimates from detected rooms."""
        if not rooms:
            return []

        results = []
        for room in rooms:
            label = room.get("label", "Room")
            area_m2 = room.get("area", 0)
            perimeter_m = room.get("perimeter", 0)

            # If area/perimeter not directly available, try to compute from bounding box
            if area_m2 <= 0 and "box" in room:
                box = room["box"]
                w = abs(box[2] - box[0])
                h = abs(box[3] - box[1])
                scale = room.get("scale", 0.01)
                area_m2 = (w * scale) * (h * scale)
                perimeter_m = 2 * ((w * scale) + (h * scale))

            if area_m2 <= 0:
                continue

            length_m = math.sqrt(area_m2) * 1.1 if area_m2 > 0 else 0
            width_m = area_m2 / length_m if length_m > 0 else 0

            wall_area_m2 = perimeter_m * floor_height_m if perimeter_m > 0 else 4 * math.sqrt(area_m2) * floor_height_m
            wall_volume_m3 = wall_area_m2 * wall_thickness_m * 0.9  # 10% openings
            ceiling_area_m2 = area_m2
            floor_area_m2 = area_m2

            # Brick/block count for this room
            units_per_m3 = brick_data["units_per_m3"]
            masonry_units = math.ceil(wall_volume_m3 * units_per_m3 * waste_factor)

            # Mortar for this room
            mortar_vol = wall_volume_m3 * 0.30 * 1.33
            cement_m3 = (1 / 7) * mortar_vol
            cement_bags = math.ceil(cement_m3 / 0.0347 * waste_factor)

            results.append({
                "room_name": label,
                "area_m2": round(area_m2, 2),
                "area_sqft": round(area_m2 * 10.764, 2),
                "length_m": round(length_m, 2),
                "width_m": round(width_m, 2),
                "wall_perimeter_m": round(perimeter_m, 2),
                "floor_area_m2": round(floor_area_m2, 2),
                "ceiling_area_m2": round(ceiling_area_m2, 2),
                "wall_area_m2": round(wall_area_m2, 2),
                "wall_volume_m3": round(wall_volume_m3, 2),
                "masonry_units": masonry_units,
                "masonry_type": brick_data["name"],
                "cement_bags": cement_bags,
                "plaster_area_m2": round(wall_area_m2 + ceiling_area_m2, 2),
                "paint_area_m2": round((wall_area_m2 + ceiling_area_m2) * 1.2, 2),
                "tile_area_m2": round(floor_area_m2, 2),
            })

        return results
