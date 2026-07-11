class LabourCalculator:
    @staticmethod
    def calculate(materials: dict) -> dict:
        # Standard indexes from Indian Standard (IS) codes
        # Concrete: 2.5 mandays per cubic meter
        concrete_m3 = materials.get("concrete_volume_m3", 0.0)
        concrete_labour = concrete_m3 * 2.5
        
        # Masonry: 1.2 mandays per thousand bricks
        bricks_k = materials.get("bricks_count", 0) / 1000.0
        masonry_labour = bricks_k * 1.2
        
        # Plastering: 0.15 mandays per sqm
        plaster_sqm = materials.get("plaster_area_sq_m", 0.0)
        plaster_labour = plaster_sqm * 0.15
        
        # Painting: 0.08 mandays per sqm
        paint_sqm = materials.get("paint_area_sq_m", 0.0)
        paint_labour = paint_sqm * 0.08
        
        # Tile laying: 0.2 mandays per sqm
        tile_sqm = materials.get("tile_area_sq_m", 0.0)
        tile_labour = tile_sqm * 0.2

        total_mandays = concrete_labour + masonry_labour + plaster_labour + paint_labour + tile_labour
        
        return {
            "concrete_mandays": float(round(concrete_labour, 1)),
            "masonry_mandays": float(round(masonry_labour, 1)),
            "plaster_mandays": float(round(plaster_labour, 1)),
            "paint_mandays": float(round(paint_labour, 1)),
            "tile_mandays": float(round(tile_labour, 1)),
            "total_mandays": float(round(total_mandays, 1))
        }
