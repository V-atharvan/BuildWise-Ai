from app.engine.is_codes import CPWD_BASE_RATES_2024, CONTRACTOR_MARGIN, EQUIPMENT_FACTOR, CONTINGENCY, GST_RATE
from app.engine.regional_prices import get_regional_rates
from app.engine.material_brands import (
    get_brick_by_id, get_cement_by_id, get_steel_brand_by_id, get_steel_grade_by_id,
    get_sand_by_id, get_aggregate_by_id,
)

class CostEngine:
    @staticmethod
    def calculate_cost(materials: dict, custom_rates: dict = None, brand_config: dict = None,
                       region: dict = None, contractor_config: dict = None) -> dict:
        """
        Calculates itemized material costs, labour, equipment, contractor margins,
        contingencies, and GST using standard CPWD cost buildup factors.

        Supports:
        - Regional pricing (state/city)
        - Brand-specific pricing
        - Custom rate overrides
        - Configurable contractor charges (fixed or percentage)
        """
        # ── 1. Resolve Base Rates ─────────────────────────────────────────────
        # Start with CPWD defaults
        rates = dict(CPWD_BASE_RATES_2024)

        # Apply regional pricing if specified
        if region:
            state = region.get("state", "")
            city = region.get("city", "")
            if state:
                regional_rates = get_regional_rates(state, city)
                rates.update(regional_rates)

        # Apply brand-specific pricing
        if brand_config:
            brand_rates = CostEngine._resolve_brand_rates(brand_config)
            rates.update(brand_rates)

        # Apply user custom overrides last (highest priority)
        if custom_rates:
            rates.update(custom_rates)

        # ── 2. Itemized Material Calculations ─────────────────────────────────
        concrete_cost = round(materials.get("concrete_volume_m3", 0.0) * rates.get("concrete_rcc_m3", 5500))
        steel_cost = round(materials.get("steel_weight_kg", 0.0) * rates.get("steel_tmt_kg", 75))
        cement_cost = round(materials.get("cement_bags", 0) * rates.get("cement_bag_50kg", 430))
        sand_cost = round(materials.get("sand_volume_m3", 0.0) * rates.get("sand_m3", 1400))
        aggregate_cost = round(materials.get("aggregate_volume_m3", 0.0) * rates.get("aggregate_20mm_m3", 1600))
        brick_cost = round(materials.get("bricks_count", 0) * rates.get("brick_red_pc", 10))
        block_cost = round(materials.get("blocks_count", 0) * rates.get("block_aac_pc", 55))
        mortar_cost = round(materials.get("mortar_volume_m3", 0.0) * 200.0)
        plaster_cost = round(materials.get("plaster_area_sq_m", 0.0) * rates.get("plaster_m2", 280))
        paint_cost = round(materials.get("paint_area_sq_m", 0.0) * rates.get("paint_interior_m2", 120))
        tiles_cost = round(materials.get("tile_area_sq_m", 0.0) * rates.get("tiles_m2", 650))
        waterproofing_cost = round(materials.get("waterproofing_area_sq_m", 0.0) * rates.get("waterproofing_m2", 380))
        excavation_cost = round(materials.get("excavation_volume_m3", 0.0) * rates.get("excavation_m3", 200))

        # ── 3. Sub-estimation costs (from detailed modules) ───────────────────
        shuttering_cost = 0
        paint_detailed_cost = 0
        tile_detailed_cost = 0
        plumbing_cost = 0
        electrical_cost = 0
        door_cost = 0
        window_cost = 0

        if "shuttering" in materials:
            shuttering_cost = materials["shuttering"].get("total_cost", 0)

        if "paint_detailed" in materials:
            paint_detailed = materials["paint_detailed"]
            paint_detailed_cost = paint_detailed.get("total_cost", 0)
            # Use detailed paint cost instead of area-based
            if paint_detailed_cost > 0:
                paint_cost = paint_detailed_cost

        if "tile_detailed" in materials:
            tile_detailed = materials["tile_detailed"]
            tile_detailed_cost = tile_detailed.get("total_cost", 0)
            if tile_detailed_cost > 0:
                tiles_cost = tile_detailed_cost

        if "plumbing" in materials:
            plumbing_cost = materials["plumbing"].get("total_cost", 0)

        if "electrical" in materials:
            electrical_cost = materials["electrical"].get("total_cost", 0)

        if "doors" in materials:
            door_cost = materials["doors"].get("total_cost", 0)

        if "windows" in materials:
            window_cost = materials["windows"].get("total_cost", 0)

        # ── 4. Total Material Cost ────────────────────────────────────────────
        total_material_cost = (
            concrete_cost + steel_cost + cement_cost + sand_cost + aggregate_cost +
            brick_cost + block_cost + mortar_cost + plaster_cost + paint_cost +
            tiles_cost + waterproofing_cost + excavation_cost +
            shuttering_cost + plumbing_cost + electrical_cost +
            door_cost + window_cost
        )

        # ── 5. Labour & Equipment ─────────────────────────────────────────────
        # Labour from detailed modules (plumbing, electrical, painting, tiling
        # already include their own labour). For structural labour: ~25% of
        # structural material cost
        structural_material = concrete_cost + steel_cost + cement_cost + sand_cost + aggregate_cost + brick_cost + block_cost + mortar_cost + plaster_cost + excavation_cost + shuttering_cost
        structural_labour = round(structural_material * 0.30)

        # Sub-module labours already included in their total_cost
        labour_cost = structural_labour
        equipment_cost = round(structural_material * EQUIPMENT_FACTOR)

        # ── 6. Contractor Charges ─────────────────────────────────────────────
        base_execution_cost = total_material_cost + labour_cost + equipment_cost

        contractor_type = "percentage"
        contractor_pct = CONTRACTOR_MARGIN
        contractor_fixed = 0

        if contractor_config:
            contractor_type = contractor_config.get("type", "percentage")
            if contractor_type == "fixed":
                contractor_fixed = float(contractor_config.get("amount", 0))
            else:
                contractor_pct = float(contractor_config.get("percentage", CONTRACTOR_MARGIN * 100)) / 100.0

        if contractor_type == "fixed":
            margin_cost = round(contractor_fixed)
        else:
            margin_cost = round(base_execution_cost * contractor_pct)

        contingency_cost = round(base_execution_cost * CONTINGENCY)

        # ── 7. Transportation ─────────────────────────────────────────────────
        transport_cost = round(total_material_cost * 0.03)  # ~3% of material cost

        # ── 8. Tax ────────────────────────────────────────────────────────────
        taxable_subtotal = base_execution_cost + margin_cost + contingency_cost + transport_cost
        gst_amount = round(taxable_subtotal * GST_RATE)
        miscellaneous = round(base_execution_cost * 0.02)  # 2% miscellaneous

        grand_total = taxable_subtotal + gst_amount + miscellaneous

        # ── 9. Per-square-foot cost ───────────────────────────────────────────
        # Get total area from materials geometry if available
        total_area_sqft = 0
        if "geometry" in materials:
            area_m2 = materials["geometry"].get("built_up_area_m2", {}).get("val", 0)
            total_area_sqft = area_m2 * 10.764 if area_m2 > 0 else 0
        cost_per_sqft = round(grand_total / total_area_sqft, 2) if total_area_sqft > 0 else 0

        return {
            # Structural costs
            "concrete_cost": concrete_cost,
            "steel_cost": steel_cost,
            "cement_cost": cement_cost,
            "sand_cost": sand_cost,
            "aggregate_cost": aggregate_cost,
            "brick_cost": brick_cost,
            "block_cost": block_cost,
            "mortar_cost": mortar_cost,
            "plaster_cost": plaster_cost,
            "paint_cost": paint_cost,
            "tiles_cost": tiles_cost,
            "waterproofing_cost": waterproofing_cost,
            "excavation_cost": excavation_cost,

            # MEP & finishing
            "shuttering_cost": shuttering_cost,
            "plumbing_cost": plumbing_cost,
            "electrical_cost": electrical_cost,
            "door_cost": door_cost,
            "window_cost": window_cost,

            # Build-up
            "labour_cost": labour_cost,
            "equipment_cost": equipment_cost,
            "total_material_cost": total_material_cost,
            "transport_cost": transport_cost,
            "gst_amount": gst_amount,
            "contractor_margin": margin_cost,
            "contingency": contingency_cost,
            "miscellaneous": miscellaneous,
            "grand_total": grand_total,

            # Analytics
            "cost_per_sqft": cost_per_sqft,

            # Rates used (for transparency)
            "rates_applied": {
                "concrete_rcc_m3": rates.get("concrete_rcc_m3"),
                "steel_tmt_kg": rates.get("steel_tmt_kg"),
                "cement_bag_50kg": rates.get("cement_bag_50kg"),
                "sand_m3": rates.get("sand_m3"),
                "aggregate_20mm_m3": rates.get("aggregate_20mm_m3"),
                "brick_red_pc": rates.get("brick_red_pc"),
                "plaster_m2": rates.get("plaster_m2"),
                "paint_interior_m2": rates.get("paint_interior_m2"),
                "tiles_m2": rates.get("tiles_m2"),
            },
        }

    @staticmethod
    def _resolve_brand_rates(brand_config: dict) -> dict:
        """Convert brand selections into rate overrides."""
        rates = {}

        if "cement_brand_id" in brand_config:
            cement = get_cement_by_id(brand_config["cement_brand_id"])
            rates["cement_bag_50kg"] = cement["price_per_bag"]

        if "steel_brand_id" in brand_config:
            steel = get_steel_brand_by_id(brand_config["steel_brand_id"])
            base_price = steel["price_per_kg"]
            if "steel_grade_id" in brand_config:
                grade = get_steel_grade_by_id(brand_config["steel_grade_id"])
                base_price *= grade["price_multiplier"]
            rates["steel_tmt_kg"] = base_price

        if "brick_brand_id" in brand_config:
            brick = get_brick_by_id(brand_config["brick_brand_id"])
            rates["brick_red_pc"] = brick["price_per_unit"]
            rates["block_aac_pc"] = brick["price_per_unit"]

        if "sand_type_id" in brand_config:
            sand = get_sand_by_id(brand_config["sand_type_id"])
            rates["sand_m3"] = sand["price_per_m3"]

        if "aggregate_type_id" in brand_config:
            agg = get_aggregate_by_id(brand_config["aggregate_type_id"])
            rates["aggregate_20mm_m3"] = agg["price_per_m3"]

        return rates
