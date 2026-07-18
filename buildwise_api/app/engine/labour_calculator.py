"""
BuildWise AI — Labour Calculator
=================================
Estimates labour requirements based on IS 1200 norms, project area,
and construction trade categories.

Supports:
- Worker count estimation by project area tier
- Per-category daily rates
- Total mandays and cost calculation
- Custom vs. default rates
"""

import math
from typing import Dict, Any, List, Optional


# ── Default Labour Rates (INR per day) ────────────────────────────────────────
DEFAULT_LABOUR_RATES: Dict[str, Dict[str, Any]] = {
    "general_labour": {"name": "General Labour", "rate_per_day": 650, "rate_per_sqft": 250},
    "mason":          {"name": "Mason",          "rate_per_day": 900},
    "helper":         {"name": "Helper",         "rate_per_day": 650},
    "carpenter":      {"name": "Carpenter",      "rate_per_day": 1000},
    "bar_bender":     {"name": "Bar Bender",     "rate_per_day": 1000},
    "painter":        {"name": "Painter",        "rate_per_day": 850},
    "tile_installer": {"name": "Tile Installer", "rate_per_day": 900},
    "electrician":    {"name": "Electrician",    "rate_per_day": 1200},
    "plumber":        {"name": "Plumber",        "rate_per_day": 1200},
}

# ── Worker Count Tiers by Project Area ────────────────────────────────────────
WORKER_TIERS: List[Dict[str, Any]] = [
    {
        "min_sqft": 0, "max_sqft": 500,
        "label": "Small (0–500 sq ft)",
        "workers": {
            "mason": 2, "helper": 2, "carpenter": 0,
            "bar_bender": 1, "painter": 1, "tile_installer": 1,
            "electrician": 1, "plumber": 1,
        },
        "est_duration_days": 90,
    },
    {
        "min_sqft": 500, "max_sqft": 1000,
        "label": "Medium (500–1000 sq ft)",
        "workers": {
            "mason": 4, "helper": 4, "carpenter": 1,
            "bar_bender": 1, "painter": 2, "tile_installer": 1,
            "electrician": 1, "plumber": 1,
        },
        "est_duration_days": 120,
    },
    {
        "min_sqft": 1000, "max_sqft": 2000,
        "label": "Large (1000–2000 sq ft)",
        "workers": {
            "mason": 6, "helper": 6, "carpenter": 2,
            "bar_bender": 2, "painter": 2, "tile_installer": 2,
            "electrician": 2, "plumber": 2,
        },
        "est_duration_days": 180,
    },
    {
        "min_sqft": 2000, "max_sqft": 5000,
        "label": "Extra Large (2000–5000 sq ft)",
        "workers": {
            "mason": 10, "helper": 10, "carpenter": 3,
            "bar_bender": 3, "painter": 3, "tile_installer": 3,
            "electrician": 3, "plumber": 3,
        },
        "est_duration_days": 270,
    },
    {
        "min_sqft": 5000, "max_sqft": 999999,
        "label": "Commercial (5000+ sq ft)",
        "workers": {
            "mason": 16, "helper": 16, "carpenter": 5,
            "bar_bender": 5, "painter": 5, "tile_installer": 4,
            "electrician": 4, "plumber": 4,
        },
        "est_duration_days": 365,
    },
]


class LabourCalculator:

    @staticmethod
    def calculate(materials: dict, total_area_sqft: float = 0,
                  custom_rates: Optional[Dict[str, float]] = None) -> dict:
        """
        Full labour calculation including:
        - Material-based mandays (IS 1200 norms)
        - Worker count recommendation by area tier
        - Per-trade cost breakdown
        - Duration estimation
        """
        rates = dict(DEFAULT_LABOUR_RATES)
        if custom_rates:
            for key, rate in custom_rates.items():
                if key in rates:
                    rates[key]["rate_per_day"] = rate

        # ── 1. Mandays from material quantities (IS 1200) ─────────────────────
        concrete_m3 = materials.get("concrete_volume_m3", 0.0)
        concrete_mandays = concrete_m3 * 2.5

        bricks_count = materials.get("bricks_count", 0)
        blocks_count = materials.get("blocks_count", 0)
        masonry_units = bricks_count + blocks_count
        masonry_mandays = (masonry_units / 1000.0) * 1.2

        plaster_sqm = materials.get("plaster_area_sq_m", 0.0)
        plaster_mandays = plaster_sqm * 0.15

        paint_sqm = materials.get("paint_area_sq_m", 0.0)
        paint_mandays = paint_sqm * 0.08

        tile_sqm = materials.get("tile_area_sq_m", 0.0)
        tile_mandays = tile_sqm * 0.2

        excavation_m3 = materials.get("excavation_volume_m3", 0.0)
        excavation_mandays = excavation_m3 * 0.6

        # Bar bending and carpentry based on steel and concrete
        bar_bending_mandays = (materials.get("steel_weight_kg", 0.0) / 100.0) * 0.5
        carpentry_mandays = concrete_m3 * 1.5  # formwork

        total_mandays = (
            concrete_mandays + masonry_mandays + plaster_mandays +
            paint_mandays + tile_mandays + excavation_mandays +
            bar_bending_mandays + carpentry_mandays
        )

        # ── 2. Worker Requirement by Area Tier ────────────────────────────────
        worker_tier = LabourCalculator._get_worker_tier(total_area_sqft)
        workers = worker_tier["workers"]
        est_duration = worker_tier["est_duration_days"]
        tier_label = worker_tier["label"]

        # ── 3. Per-Trade Cost Breakdown ───────────────────────────────────────
        trade_breakdown = []

        trade_mapping = [
            ("mason", "Mason", concrete_mandays + masonry_mandays),
            ("helper", "Helper", total_mandays * 0.5),
            ("carpenter", "Carpenter", carpentry_mandays),
            ("bar_bender", "Bar Bender", bar_bending_mandays),
            ("painter", "Painter", paint_mandays),
            ("tile_installer", "Tile Installer", tile_mandays),
            ("electrician", "Electrician", max(5, total_area_sqft / 200)),
            ("plumber", "Plumber", max(5, total_area_sqft / 300)),
        ]

        total_labour_cost = 0
        for trade_key, trade_name, mandays in trade_mapping:
            count = workers.get(trade_key, 0)
            rate = rates.get(trade_key, {}).get("rate_per_day", 700)
            cost = round(mandays * rate)
            total_labour_cost += cost

            trade_breakdown.append({
                "trade": trade_name,
                "workers_required": count,
                "mandays": round(mandays, 1),
                "rate_per_day": rate,
                "total_cost": cost,
            })

        # ── 4. Summary ────────────────────────────────────────────────────────
        return {
            # Manday breakdown
            "concrete_mandays": float(round(concrete_mandays, 1)),
            "masonry_mandays": float(round(masonry_mandays, 1)),
            "plaster_mandays": float(round(plaster_mandays, 1)),
            "paint_mandays": float(round(paint_mandays, 1)),
            "tile_mandays": float(round(tile_mandays, 1)),
            "excavation_mandays": float(round(excavation_mandays, 1)),
            "bar_bending_mandays": float(round(bar_bending_mandays, 1)),
            "carpentry_mandays": float(round(carpentry_mandays, 1)),
            "total_mandays": float(round(total_mandays, 1)),

            # Worker requirements
            "worker_tier": tier_label,
            "workers_required": workers,
            "estimated_duration_days": est_duration,
            "estimated_duration_months": round(est_duration / 30, 1),

            # Cost breakdown by trade
            "trade_breakdown": trade_breakdown,
            "total_labour_cost": total_labour_cost,

            # Rates used
            "rates_used": {k: v.get("rate_per_day", 0) for k, v in rates.items()},
        }

    @staticmethod
    def _get_worker_tier(total_area_sqft: float) -> dict:
        """Return the worker requirement tier for the given area."""
        for tier in WORKER_TIERS:
            if tier["min_sqft"] <= total_area_sqft < tier["max_sqft"]:
                return tier
        return WORKER_TIERS[-1]  # largest tier
