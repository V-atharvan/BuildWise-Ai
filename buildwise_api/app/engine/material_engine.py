import math
from typing import Dict, List, Any
from app.engine.is_codes import (
    CONCRETE_MIX_RATIOS, CONCRETE_DRY_VOLUME_FACTOR, CEMENT_BAG_VOLUME_M3,
    MORTAR_MIX, MORTAR_FRACTION_OF_MASONRY, MORTAR_DRY_VOLUME_FACTOR,
    BRICKS_PER_M3, AAC_BLOCKS_PER_M3, BEAM_FRACTION, COLUMN_FRACTION,
    FOUNDATION_FRACTION, STEEL_INDEX_KG_PER_M3, PLASTER_THICKNESS_MM,
    PLASTER_INTERNAL_MULTIPLIER, PAINT_TO_PLASTER_RATIO, DEFAULT_EXCAVATION_DEPTH_M,
    FOUNDATION_AREA_FRACTION, WATERPROOFING_WET_AREA_FRACTION, VALIDATION_BOUNDS
)
from app.engine.geometry import GeometryCalculator

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

        # ── 1. GEOMETRY ────────────────────────────────────────────────────────
        # Built-up Area in m2
        area_m2 = GeometryCalculator.sqft_to_m2(total_area_sqft)
        
        # Perimeter using the built-up area directly (as per prompt specification)
        length = math.sqrt(area_m2) * 1.25 if area_m2 > 0 else 0.0
        width = area_m2 / length if length > 0 else 0.0
        perimeter_m = GeometryCalculator.estimate_perimeter(area_m2)
        
        # Wall Volume = Perimeter * Floor Height * Wall Thickness * Floors
        # Deduct 10% for doors/windows
        wall_volume_m3 = GeometryCalculator.calculate_wall_volume(
            perimeter_m=perimeter_m,
            floor_height_m=floor_height_m,
            wall_thickness_m=wall_thickness_m,
            floors=floors,
            deduction_pct=10.0
        )

        # ── 2. RCC (CONCRETE) ──────────────────────────────────────────────────
        # Slab Concrete = Built-up Area * Slab Thickness * Floors
        slab_concrete = area_m2 * slab_thickness_m * floors
        
        # Beams (10% of slab)
        beam_concrete = slab_concrete * BEAM_FRACTION
        
        # Columns (5% of slab)
        column_concrete = slab_concrete * COLUMN_FRACTION
        
        # Superstructure concrete
        super_concrete = slab_concrete + beam_concrete + column_concrete
        
        # Foundation Concrete
        found_coeff = FOUNDATION_FRACTION.get(foundation_type, 0.18)
        foundation_concrete = super_concrete * found_coeff
        
        # Total Concrete Volume (Wet)
        total_concrete_volume = foundation_concrete + super_concrete

        # ── 3. STEEL ───────────────────────────────────────────────────────────
        # Default Index: 85 kg per m³ of concrete structure
        steel_index = STEEL_INDEX_KG_PER_M3.get("default", 85.0)
        total_steel_weight = total_concrete_volume * steel_index

        # ── 4. MASONRY ─────────────────────────────────────────────────────────
        # Bricks or Blocks count
        bricks_count = 0
        blocks_count = 0
        
        if "aac" in brick_type or "block" in brick_type:
            blocks_count = math.ceil(wall_volume_m3 * AAC_BLOCKS_PER_M3)
            masonry_unit_rate = AAC_BLOCKS_PER_M3
            masonry_label = "AAC Blocks"
        else:
            bricks_count = math.ceil(wall_volume_m3 * BRICKS_PER_M3)
            masonry_unit_rate = BRICKS_PER_M3
            masonry_label = "Red Bricks"

        # Mortar volume (30% of total masonry volume)
        wet_mortar_volume = wall_volume_m3 * MORTAR_FRACTION_OF_MASONRY
        dry_mortar_volume = wet_mortar_volume * MORTAR_DRY_VOLUME_FACTOR
        
        # Masonry mortar ratio 1:6
        m_c, m_s = MORTAR_MIX.get("brick_standard", (1, 6))
        mortar_total_parts = m_c + m_s
        masonry_mortar_cement_m3 = (m_c / mortar_total_parts) * dry_mortar_volume
        masonry_mortar_sand_m3 = (m_s / mortar_total_parts) * dry_mortar_volume

        # ── 5. FINISHING ───────────────────────────────────────────────────────
        # Plaster
        plaster_internal = PLASTER_INTERNAL_MULTIPLIER * area_m2
        plaster_external = perimeter_m * floor_height_m * floors
        total_plaster_area = plaster_internal + plaster_external
        
        # Wet plaster volume internal (12mm) & external (20mm)
        wet_plaster_vol = (plaster_internal * (PLASTER_THICKNESS_MM["internal"] / 1000.0) +
                           plaster_external * (PLASTER_THICKNESS_MM["external"] / 1000.0))
        dry_plaster_vol = wet_plaster_vol * MORTAR_DRY_VOLUME_FACTOR

        # Plaster mortar decomposition (avg 1:4 mix)
        p_c, p_s = MORTAR_MIX.get("plaster_internal", (1, 4))
        plaster_total_parts = p_c + p_s
        plaster_cement_m3 = (p_c / plaster_total_parts) * dry_plaster_vol
        plaster_sand_m3 = (p_s / plaster_total_parts) * dry_plaster_vol

        # Paint (1.5x ratio covers primer, ceiling, and multi-coat finishes)
        paint_area = total_plaster_area * 1.5

        # Tiling (Flooring = total built-up area)
        tiles_area = area_m2

        # Waterproofing (Roof area + Bathrooms 12%)
        roof_area = area_m2 / floors if floors > 0 else area_m2
        bathrooms_area = area_m2 * WATERPROOFING_WET_AREA_FRACTION
        # Plinth/Slab waterproofing base factor adds 1.0 * footprint
        waterproofing_area = roof_area + bathrooms_area + (roof_area * 0.8)

        # ── 6. EARTHWORK (EXCAVATION) ──────────────────────────────────────────
        # Foundation Area = Built-up Area * 0.35
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
        # Sum of cement (concrete + masonry mortar + plaster mortar)
        total_cement_m3 = concrete_cement_m3 + masonry_mortar_cement_m3 + plaster_cement_m3
        total_cement_bags = math.ceil((total_cement_m3 / CEMENT_BAG_VOLUME_M3) * waste_factor)

        # Sum of sand (concrete + masonry mortar + plaster mortar)
        total_sand_m3 = (concrete_sand_m3 + masonry_mortar_sand_m3 + plaster_sand_m3) * waste_factor

        # Sum of aggregates (concrete only)
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
        final_excavation_volume = excavation_volume  # Excavation doesn't have waste factor

        # ── 9. GEOTECHNICAL & CIVIL ENGINE VALIDATION (IS Code Limits) ─────────
        # Concrete check
        concrete_per_sqft = final_concrete_volume / total_area_sqft if total_area_sqft > 0 else 0
        if concrete_per_sqft > VALIDATION_BOUNDS["concrete_max_per_sqft_m3"]:
            validation_warnings.append("Calculated concrete quantity exceeds standard residential construction limits.")

        # Steel check
        steel_ratio = total_steel_weight / total_concrete_volume if total_concrete_volume > 0 else 0
        if steel_ratio < VALIDATION_BOUNDS["steel_min_kg_per_m3"] or steel_ratio > VALIDATION_BOUNDS["steel_max_kg_per_m3"]:
            validation_warnings.append("Calculated reinforcement ratio lies outside standard residential limits.")

        # Bricks check
        bricks_per_sqft = final_bricks_count / total_area_sqft if total_area_sqft > 0 else 0
        if bricks_per_sqft > VALIDATION_BOUNDS["bricks_max_per_sqft"]:
            validation_warnings.append("Calculated brick quantity exceeds standard residential construction limits.")

        # Cement check
        cement_per_sqft = total_cement_bags / total_area_sqft if total_area_sqft > 0 else 0
        if cement_per_sqft > VALIDATION_BOUNDS["cement_max_per_sqft_bags"]:
            validation_warnings.append("Calculated cement bag count exceeds standard residential construction limits.")

        # Plaster check
        if final_plaster_area > total_area_sqft * 5.0:
            validation_warnings.append("Plaster area takeoff exceeds validation boundaries (Max 5x of plot area).")

        # Paint check
        if final_paint_area > total_area_sqft * 5.0:
            validation_warnings.append("Paint area takeoff exceeds validation boundaries.")

        # Check negative outputs
        if any(v < 0 for v in [final_concrete_volume, final_steel_weight, total_cement_bags, total_sand_m3, total_aggregate_m3]):
            validation_warnings.append("Calculated quantity contains negative values, reflecting faulty input parameters.")

        # Return flat output fields matching DB schema / frontend expectation
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
            
            # Audit Details
            "geometry": {
                "built_up_area_m2": {"val": round(area_m2, 2), "unit": "m²", "formula": "Area (sq ft) * 0.0929", "calculations": f"{total_area_sqft} * 0.0929 = {round(area_m2, 2)}"},
                "perimeter_m": {"val": round(perimeter_m, 2), "unit": "m", "formula": "2 * (L + W) where L = sqrt(Built-up Area) * 1.25", "calculations": f"2 * ({round(length, 2)} + {round(width, 2)}) = {round(perimeter_m, 2)}"},
                "wall_volume_m3": {"val": round(wall_volume_m3, 2), "unit": "m³", "formula": "Perimeter * Floor Ht * Wall Thick * Floors * 0.90", "calculations": f"{round(perimeter_m, 2)} * {floor_height_m} * {wall_thickness_m} * {floors} * 0.90 = {round(wall_volume_m3, 2)}"}
            },
            "rcc": {
                "slab_concrete": {"val": round(slab_concrete, 2), "unit": "m³", "formula": "Built-up Area * Slab Thick * Floors", "calculations": f"{round(area_m2, 2)} * {slab_thickness_m} * {floors} = {round(slab_concrete, 2)}"},
                "beam_concrete": {"val": round(beam_concrete, 2), "unit": "m³", "formula": "Slab Concrete * 10%", "calculations": f"{round(slab_concrete, 2)} * 0.10 = {round(beam_concrete, 2)}"},
                "column_concrete": {"val": round(column_concrete, 2), "unit": "m³", "formula": "Slab Concrete * 5%", "calculations": f"{round(slab_concrete, 2)} * 0.05 = {round(column_concrete, 2)}"},
                "foundation_concrete": {"val": round(foundation_concrete, 2), "unit": "m³", "formula": "Superstructure RCC * Found. Coeff.", "calculations": f"({round(slab_concrete + beam_concrete + column_concrete, 2)}) * {found_coeff} = {round(foundation_concrete, 2)}"},
                "total_concrete": {"val": round(total_concrete_volume, 2), "unit": "m³", "formula": "Slab + Beam + Column + Foundation", "calculations": f"{round(slab_concrete, 2)} + {round(beam_concrete, 2)} + {round(column_concrete, 2)} + {round(foundation_concrete, 2)} = {round(total_concrete_volume, 2)}"},
                "steel_reinforcement": {"val": round(total_steel_weight, 2), "unit": "kg", "formula": "Total Concrete * Steel Index", "calculations": f"{round(total_concrete_volume, 2)} * {85.0} = {round(total_steel_weight, 2)}"}
            },
            "masonry": {
                "brickwork_volume": {"val": round(wall_volume_m3, 2), "unit": "m³", "formula": "Wall Volume", "calculations": f"{round(wall_volume_m3, 2)} m³"},
                "masonry_units": {"val": bricks_count if bricks_count > 0 else blocks_count, "unit": "pcs", "formula": f"Wall Volume * {masonry_unit_rate} ({masonry_label})", "calculations": f"{round(wall_volume_m3, 2)} * {masonry_unit_rate} = {bricks_count if bricks_count > 0 else blocks_count}"},
                "mortar_wet_volume": {"val": round(wet_mortar_volume, 2), "unit": "m³", "formula": "Wall Volume * 30%", "calculations": f"{round(wall_volume_m3, 2)} * 0.30 = {round(wet_mortar_volume, 2)}"},
                "mortar_dry_volume": {"val": round(dry_mortar_volume, 2), "unit": "m³", "formula": "Wet Mortar * 1.33", "calculations": f"{round(wet_mortar_volume, 2)} * 1.33 = {round(dry_mortar_volume, 2)}"}
            },
            "finishing": {
                "plaster_area": {"val": round(total_plaster_area, 2), "unit": "m²", "formula": "Internal Plaster + External Plaster", "calculations": f"({round(plaster_internal, 2)}) + ({round(plaster_external, 2)}) = {round(total_plaster_area, 2)}"},
                "paint_area": {"val": round(paint_area, 2), "unit": "m²", "formula": "Plaster Area * 1.5", "calculations": f"{round(total_plaster_area, 2)} * 1.5 = {round(paint_area, 2)}"},
                "flooring_area": {"val": round(tiles_area, 2), "unit": "m²", "formula": "Total Built-up Area", "calculations": f"{round(area_m2, 2)} m²"},
                "waterproofing_area": {"val": round(waterproofing_area, 2), "unit": "m²", "formula": "Roof Footprint + Bathroom Area + Plinth waterproofing base", "calculations": f"{round(roof_area, 2)} + {round(bathrooms_area, 2)} + {round(roof_area * 0.8, 2)} = {round(waterproofing_area, 2)}"}
            },
            "validation_warnings": validation_warnings
        }
