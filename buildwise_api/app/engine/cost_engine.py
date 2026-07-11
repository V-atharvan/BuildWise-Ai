from app.engine.is_codes import CPWD_BASE_RATES_2024, CONTRACTOR_MARGIN, EQUIPMENT_FACTOR, CONTINGENCY, GST_RATE

class CostEngine:
    @staticmethod
    def calculate_cost(materials: dict, custom_rates: dict = None) -> dict:
        """
        Calculates itemized material costs, labour, equipment, contractor margins,
        contingencies, and GST using standard CPWD cost buildup factors.
        """
        # Load default base rates
        rates = dict(CPWD_BASE_RATES_2024)
        if custom_rates:
            rates.update(custom_rates)

        # 1. Itemized Material Calculations
        concrete_cost = round(materials.get("concrete_volume_m3", 0.0) * rates["concrete_rcc_m3"])
        steel_cost = round(materials.get("steel_weight_kg", 0.0) * rates["steel_tmt_kg"])
        cement_cost = round(materials.get("cement_bags", 0) * rates["cement_bag_50kg"])
        sand_cost = round(materials.get("sand_volume_m3", 0.0) * rates["sand_m3"])
        aggregate_cost = round(materials.get("aggregate_volume_m3", 0.0) * rates["aggregate_20mm_m3"])
        brick_cost = round(materials.get("bricks_count", 0) * rates["brick_red_pc"])
        block_cost = round(materials.get("blocks_count", 0) * rates["block_aac_pc"])
        mortar_cost = round(materials.get("mortar_volume_m3", 0.0) * 200.0) # Mixing & hydration rate
        plaster_cost = round(materials.get("plaster_area_sq_m", 0.0) * rates["plaster_m2"])
        paint_cost = round(materials.get("paint_area_sq_m", 0.0) * rates["paint_interior_m2"])
        tiles_cost = round(materials.get("tile_area_sq_m", 0.0) * rates["tiles_m2"])
        waterproofing_cost = round(materials.get("waterproofing_area_sq_m", 0.0) * rates["waterproofing_m2"])
        excavation_cost = round(materials.get("excavation_volume_m3", 0.0) * rates["excavation_m3"])

        # 2. Total Material Cost
        total_material_cost = (
            concrete_cost + steel_cost + cement_cost + sand_cost + aggregate_cost +
            brick_cost + block_cost + mortar_cost + plaster_cost + paint_cost +
            tiles_cost + waterproofing_cost + excavation_cost
        )

        # 3. Cost Build-up (CPWD standard guidelines)
        labour_cost = round(total_material_cost * 0.30)  # Labour is ~30% of material base
        equipment_cost = round(total_material_cost * EQUIPMENT_FACTOR) # 5% of material base
        
        # Supertotal of raw execution
        base_execution_cost = total_material_cost + labour_cost + equipment_cost
        
        margin_cost = round(base_execution_cost * CONTRACTOR_MARGIN)  # 10% Contractor profit
        contingency_cost = round(base_execution_cost * CONTINGENCY)   # 5% emergency buffer
        
        # Subtotal for tax base
        taxable_subtotal = base_execution_cost + margin_cost + contingency_cost
        gst_amount = round(taxable_subtotal * GST_RATE) # 18% GST
        
        grand_total = taxable_subtotal + gst_amount

        return {
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
            
            "labour_cost": labour_cost,
            "equipment_cost": equipment_cost,
            "total_material_cost": total_material_cost,
            "gst_amount": gst_amount,
            "contractor_margin": margin_cost,
            "contingency": contingency_cost,
            "grand_total": grand_total
        }
