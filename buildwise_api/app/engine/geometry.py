import math
from app.engine.is_codes import SQ_FT_TO_SQ_M, FOUNDATION_AREA_FRACTION

class GeometryCalculator:
    @staticmethod
    def sqft_to_m2(sqft: float) -> float:
        """Converts square feet to square meters."""
        return sqft * SQ_FT_TO_SQ_M

    @staticmethod
    def estimate_perimeter(area_m2: float) -> float:
        """
        Estimates the building perimeter (in meters) from its built-up area
        using a standard rectangular footprint with an aspect ratio factor.
        Length = sqrt(Area) * 1.25
        Width = Area / Length
        Perimeter = 2 * (Length + Width)
        """
        if area_m2 <= 0:
            return 0.0
        length = math.sqrt(area_m2) * 1.25
        width = area_m2 / length
        return 2.0 * (length + width)

    @staticmethod
    def calculate_wall_volume(
        perimeter_m: float,
        floor_height_m: float,
        wall_thickness_m: float,
        floors: int,
        deduction_pct: float = 10.0
    ) -> float:
        """
        Calculates total masonry wall volume in cubic meters.
        Deduct 10% by default for openings (doors, windows, ventilators).
        """
        raw_volume = perimeter_m * floor_height_m * wall_thickness_m * floors
        deduction = (deduction_pct / 100.0) * raw_volume
        return max(0.0, raw_volume - deduction)

    @staticmethod
    def estimate_foundation_area(area_m2: float) -> float:
        """
        Estimates the footprint area of foundation footings.
        Default is 35% of the single floor built-up area footprint.
        """
        return area_m2 * FOUNDATION_AREA_FRACTION
