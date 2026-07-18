"""
BuildWise AI — Material Brand Catalog Database
================================================
Complete brand catalogs for all construction materials used in Indian
residential and commercial construction. Each entry includes:
  - brand name, type/grade, default price
  - size specifications where applicable
  - coverage/yield data for finishing materials

All prices are in INR (Indian Rupees) as of 2024-25 market rates.
Prices are defaults and MUST be overridable by the user or regional DB.
"""

from typing import Dict, List, Any

# ══════════════════════════════════════════════════════════════════════════════
# BRICKS & BLOCKS
# ══════════════════════════════════════════════════════════════════════════════

BRICK_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "red_clay_standard",
        "name": "Standard Red Clay Brick",
        "type": "red_brick",
        "size_mm": {"length": 230, "width": 110, "height": 75},
        "size_with_mortar_mm": {"length": 240, "width": 120, "height": 85},
        "weight_kg": 3.0,
        "units_per_m3": 500,
        "price_per_unit": 10.0,
        "compressive_strength_mpa": 7.5,
    },
    {
        "id": "fly_ash_brick",
        "name": "Fly Ash Brick",
        "type": "fly_ash",
        "size_mm": {"length": 230, "width": 110, "height": 75},
        "size_with_mortar_mm": {"length": 240, "width": 120, "height": 85},
        "weight_kg": 2.6,
        "units_per_m3": 500,
        "price_per_unit": 8.0,
        "compressive_strength_mpa": 9.0,
    },
    {
        "id": "aac_block",
        "name": "AAC Block",
        "type": "aac_block",
        "size_mm": {"length": 600, "width": 200, "height": 200},
        "size_with_mortar_mm": {"length": 603, "width": 203, "height": 203},
        "weight_kg": 12.0,
        "units_per_m3": 42,
        "price_per_unit": 55.0,
        "compressive_strength_mpa": 4.0,
    },
    {
        "id": "hollow_concrete_block",
        "name": "Hollow Concrete Block",
        "type": "hollow_block",
        "size_mm": {"length": 400, "width": 200, "height": 200},
        "size_with_mortar_mm": {"length": 410, "width": 210, "height": 210},
        "weight_kg": 15.0,
        "units_per_m3": 56,
        "price_per_unit": 45.0,
        "compressive_strength_mpa": 5.0,
    },
    {
        "id": "solid_concrete_block",
        "name": "Solid Concrete Block",
        "type": "solid_block",
        "size_mm": {"length": 400, "width": 200, "height": 200},
        "size_with_mortar_mm": {"length": 410, "width": 210, "height": 210},
        "weight_kg": 24.0,
        "units_per_m3": 56,
        "price_per_unit": 50.0,
        "compressive_strength_mpa": 8.0,
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# CEMENT BRANDS
# ══════════════════════════════════════════════════════════════════════════════

CEMENT_CATALOG: List[Dict[str, Any]] = [
    {"id": "ultratech",     "name": "UltraTech Cement",  "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 430, "bag_volume_m3": 0.0347},
    {"id": "acc",           "name": "ACC Cement",         "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 420, "bag_volume_m3": 0.0347},
    {"id": "ambuja",        "name": "Ambuja Cement",      "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 415, "bag_volume_m3": 0.0347},
    {"id": "shree",         "name": "Shree Cement",       "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 400, "bag_volume_m3": 0.0347},
    {"id": "jk_cement",     "name": "JK Cement",          "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 405, "bag_volume_m3": 0.0347},
    {"id": "dalmia",        "name": "Dalmia Cement",      "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 395, "bag_volume_m3": 0.0347},
    {"id": "birla",         "name": "Birla Cement",       "grade": "OPC 43",  "bag_weight_kg": 50, "price_per_bag": 390, "bag_volume_m3": 0.0347},
    {"id": "ramco",         "name": "Ramco Cement",       "grade": "PPC",     "bag_weight_kg": 50, "price_per_bag": 385, "bag_volume_m3": 0.0347},
    {"id": "custom_cement", "name": "Custom Brand",       "grade": "OPC 53",  "bag_weight_kg": 50, "price_per_bag": 430, "bag_volume_m3": 0.0347},
]

# ══════════════════════════════════════════════════════════════════════════════
# STEEL BRANDS & GRADES
# ══════════════════════════════════════════════════════════════════════════════

STEEL_BRANDS: List[Dict[str, Any]] = [
    {"id": "tata_tmt",       "name": "TATA Tiscon TMT",     "price_per_kg": 78.0},
    {"id": "jsw_steel",      "name": "JSW Steel",           "price_per_kg": 75.0},
    {"id": "jindal_panther",  "name": "Jindal Panther",      "price_per_kg": 73.0},
    {"id": "kamdhenu",       "name": "Kamdhenu TMT",        "price_per_kg": 72.0},
    {"id": "sail",           "name": "SAIL TMT",            "price_per_kg": 70.0},
    {"id": "vizag_steel",    "name": "Vizag Steel",         "price_per_kg": 71.0},
    {"id": "custom_steel",   "name": "Custom Brand",        "price_per_kg": 75.0},
]

STEEL_GRADES: List[Dict[str, Any]] = [
    {"id": "fe415",  "name": "Fe415",  "yield_strength_mpa": 415, "price_multiplier": 0.95},
    {"id": "fe500",  "name": "Fe500",  "yield_strength_mpa": 500, "price_multiplier": 1.00},
    {"id": "fe550",  "name": "Fe550",  "yield_strength_mpa": 550, "price_multiplier": 1.05},
    {"id": "fe600",  "name": "Fe600",  "yield_strength_mpa": 600, "price_multiplier": 1.10},
]

# ══════════════════════════════════════════════════════════════════════════════
# SAND TYPES
# ══════════════════════════════════════════════════════════════════════════════

SAND_CATALOG: List[Dict[str, Any]] = [
    {"id": "m_sand",     "name": "M-Sand (Manufactured Sand)",  "price_per_m3": 1200, "price_per_brass": 3600,  "density_kg_m3": 1750},
    {"id": "river_sand", "name": "River Sand",                   "price_per_m3": 1400, "price_per_brass": 4200,  "density_kg_m3": 1600},
    {"id": "robo_sand",  "name": "Robo Sand",                    "price_per_m3": 1100, "price_per_brass": 3300,  "density_kg_m3": 1700},
]

# 1 Brass = 100 cubic feet = 2.8317 m³

# ══════════════════════════════════════════════════════════════════════════════
# STONE DUST & AGGREGATES
# ══════════════════════════════════════════════════════════════════════════════

STONE_DUST_CATALOG: List[Dict[str, Any]] = [
    {"id": "stone_dust", "name": "Stone Dust", "price_per_m3": 800, "price_per_brass": 2400, "density_kg_m3": 1600},
]

AGGREGATE_CATALOG: List[Dict[str, Any]] = [
    {"id": "agg_10mm", "name": "10 mm Aggregate",  "price_per_m3": 1800, "price_per_brass": 5400,  "density_kg_m3": 1500},
    {"id": "agg_20mm", "name": "20 mm Aggregate",  "price_per_m3": 1600, "price_per_brass": 4800,  "density_kg_m3": 1450},
    {"id": "agg_40mm", "name": "40 mm Aggregate",  "price_per_m3": 1500, "price_per_brass": 4500,  "density_kg_m3": 1400},
]

# ══════════════════════════════════════════════════════════════════════════════
# PAINT BRANDS & TYPES
# ══════════════════════════════════════════════════════════════════════════════

PAINT_BRANDS: List[Dict[str, Any]] = [
    {"id": "asian_paints", "name": "Asian Paints",  "price_multiplier": 1.00},
    {"id": "berger",       "name": "Berger Paints", "price_multiplier": 0.95},
    {"id": "nerolac",      "name": "Nerolac",       "price_multiplier": 0.90},
    {"id": "dulux",        "name": "Dulux",         "price_multiplier": 1.10},
    {"id": "indigo",       "name": "Indigo Paints", "price_multiplier": 0.85},
    {"id": "custom_paint", "name": "Custom Brand",  "price_multiplier": 1.00},
]

PAINT_TYPES: List[Dict[str, Any]] = [
    {"id": "primer",           "name": "Primer",               "coverage_m2_per_liter": 10, "coats": 1, "price_per_liter": 150, "bucket_liters": 20, "bucket_price": 2800},
    {"id": "putty",            "name": "Wall Putty",           "coverage_m2_per_kg": 1.2,   "coats": 2, "price_per_kg": 35,     "bag_kg": 40,        "bag_price": 900},
    {"id": "interior_emulsion","name": "Interior Emulsion",    "coverage_m2_per_liter": 12, "coats": 2, "price_per_liter": 250, "bucket_liters": 20, "bucket_price": 4800},
    {"id": "exterior_emulsion","name": "Exterior Emulsion",    "coverage_m2_per_liter": 10, "coats": 2, "price_per_liter": 320, "bucket_liters": 20, "bucket_price": 6000},
    {"id": "ceiling_paint",    "name": "Ceiling Paint",        "coverage_m2_per_liter": 12, "coats": 1, "price_per_liter": 180, "bucket_liters": 20, "bucket_price": 3400},
]

# ══════════════════════════════════════════════════════════════════════════════
# TILE BRANDS, TYPES & SIZES
# ══════════════════════════════════════════════════════════════════════════════

TILE_BRANDS: List[Dict[str, Any]] = [
    {"id": "kajaria",      "name": "Kajaria",        "price_multiplier": 1.00},
    {"id": "somany",       "name": "Somany",         "price_multiplier": 0.90},
    {"id": "johnson",      "name": "Johnson",        "price_multiplier": 0.95},
    {"id": "nitco",        "name": "Nitco",          "price_multiplier": 0.85},
    {"id": "simpolo",      "name": "Simpolo",        "price_multiplier": 0.80},
    {"id": "orientbell",   "name": "Orientbell",     "price_multiplier": 0.88},
    {"id": "custom_tile",  "name": "Custom Brand",   "price_multiplier": 1.00},
]

TILE_TYPES: List[Dict[str, Any]] = [
    {"id": "ceramic",    "name": "Ceramic Tile",    "base_price_per_m2": 450,  "wastage_pct": 5},
    {"id": "vitrified",  "name": "Vitrified Tile",  "base_price_per_m2": 650,  "wastage_pct": 5},
    {"id": "granite",    "name": "Granite Tile",    "base_price_per_m2": 1200, "wastage_pct": 8},
    {"id": "marble",     "name": "Marble Tile",     "base_price_per_m2": 1500, "wastage_pct": 10},
]

TILE_SIZES: List[Dict[str, Any]] = [
    {"id": "2x2",       "name": "2×2 ft (600×600 mm)",     "size_mm": (600, 600),   "tiles_per_box": 4,  "box_coverage_m2": 1.44},
    {"id": "2x4",       "name": "2×4 ft (600×1200 mm)",    "size_mm": (600, 1200),  "tiles_per_box": 3,  "box_coverage_m2": 2.16},
    {"id": "600x600",   "name": "600×600 mm",               "size_mm": (600, 600),   "tiles_per_box": 4,  "box_coverage_m2": 1.44},
    {"id": "800x800",   "name": "800×800 mm",               "size_mm": (800, 800),   "tiles_per_box": 3,  "box_coverage_m2": 1.92},
    {"id": "300x300",   "name": "300×300 mm (Wall Tile)",   "size_mm": (300, 300),   "tiles_per_box": 10, "box_coverage_m2": 0.90},
    {"id": "300x600",   "name": "300×600 mm (Wall Tile)",   "size_mm": (300, 600),   "tiles_per_box": 6,  "box_coverage_m2": 1.08},
]

TILE_ACCESSORIES: Dict[str, Dict[str, Any]] = {
    "adhesive": {"name": "Tile Adhesive", "coverage_m2_per_bag": 4.5, "bag_weight_kg": 20, "price_per_bag": 550},
    "grout":    {"name": "Tile Grout",    "coverage_m2_per_kg": 3.0,  "bag_weight_kg": 1,  "price_per_kg": 180},
}

# ══════════════════════════════════════════════════════════════════════════════
# PLUMBING MATERIALS
# ══════════════════════════════════════════════════════════════════════════════

PLUMBING_BRANDS: List[Dict[str, Any]] = [
    {"id": "ashirvad",       "name": "Ashirvad",       "price_multiplier": 1.00},
    {"id": "supreme",        "name": "Supreme",        "price_multiplier": 1.05},
    {"id": "astral",         "name": "Astral",         "price_multiplier": 1.10},
    {"id": "finolex",        "name": "Finolex",        "price_multiplier": 0.95},
    {"id": "prince",         "name": "Prince",         "price_multiplier": 0.90},
    {"id": "custom_plumbing","name": "Custom Brand",   "price_multiplier": 1.00},
]

# Per-room plumbing estimates (based on room type)
PLUMBING_ROOM_ESTIMATES: Dict[str, Dict[str, Any]] = {
    "bathroom": {
        "water_supply_pipe_m": 12, "drainage_pipe_m": 8,
        "fittings_count": 8, "pipe_cost": 3500, "fittings_cost": 5500,
        "fixtures_cost": 12000, "labour_cost": 4000,
    },
    "toilet": {
        "water_supply_pipe_m": 8, "drainage_pipe_m": 6,
        "fittings_count": 5, "pipe_cost": 2500, "fittings_cost": 3500,
        "fixtures_cost": 8000, "labour_cost": 3000,
    },
    "kitchen": {
        "water_supply_pipe_m": 10, "drainage_pipe_m": 6,
        "fittings_count": 6, "pipe_cost": 3000, "fittings_cost": 4000,
        "fixtures_cost": 6000, "labour_cost": 3500,
    },
    "utility": {
        "water_supply_pipe_m": 6, "drainage_pipe_m": 4,
        "fittings_count": 3, "pipe_cost": 1500, "fittings_cost": 2000,
        "fixtures_cost": 3000, "labour_cost": 2000,
    },
}

# Common plumbing infrastructure (per building)
PLUMBING_INFRASTRUCTURE: Dict[str, Any] = {
    "overhead_tank_liters": 1000,
    "overhead_tank_cost": 8000,
    "underground_sump_liters": 2000,
    "underground_sump_cost": 25000,
    "main_supply_pipe_m": 15,
    "main_supply_pipe_cost": 4500,
    "sewer_connection_cost": 8000,
    "rainwater_harvesting_cost": 15000,
}

# ══════════════════════════════════════════════════════════════════════════════
# ELECTRICAL MATERIALS
# ══════════════════════════════════════════════════════════════════════════════

ELECTRICAL_BRANDS: List[Dict[str, Any]] = [
    {"id": "havells",        "name": "Havells",         "price_multiplier": 1.00},
    {"id": "anchor",         "name": "Anchor",          "price_multiplier": 0.85},
    {"id": "schneider",      "name": "Schneider",       "price_multiplier": 1.15},
    {"id": "legrand",        "name": "Legrand",         "price_multiplier": 1.10},
    {"id": "gm",             "name": "GM Modular",      "price_multiplier": 0.80},
    {"id": "polycab",        "name": "Polycab",         "price_multiplier": 0.90},
    {"id": "custom_elec",    "name": "Custom Brand",    "price_multiplier": 1.00},
]

# Per-room electrical estimates (based on room type)
ELECTRICAL_ROOM_ESTIMATES: Dict[str, Dict[str, Any]] = {
    "bedroom": {
        "switches": 4, "sockets": 4, "lights": 2, "fans": 1,
        "wiring_m": 25, "wire_cost": 1800, "switch_cost": 1200,
        "light_cost": 2000, "fan_cost": 2500, "labour_cost": 2000,
    },
    "master_bedroom": {
        "switches": 6, "sockets": 6, "lights": 3, "fans": 1,
        "wiring_m": 35, "wire_cost": 2500, "switch_cost": 1800,
        "light_cost": 3500, "fan_cost": 3000, "labour_cost": 2500,
    },
    "living_room": {
        "switches": 6, "sockets": 6, "lights": 4, "fans": 2,
        "wiring_m": 40, "wire_cost": 3000, "switch_cost": 1800,
        "light_cost": 5000, "fan_cost": 5000, "labour_cost": 3000,
    },
    "kitchen": {
        "switches": 4, "sockets": 6, "lights": 2, "fans": 1,
        "wiring_m": 30, "wire_cost": 2200, "switch_cost": 1500,
        "light_cost": 2500, "fan_cost": 2500, "labour_cost": 2500,
    },
    "bathroom": {
        "switches": 2, "sockets": 1, "lights": 1, "fans": 1,
        "wiring_m": 15, "wire_cost": 1000, "switch_cost": 600,
        "light_cost": 800, "fan_cost": 1500, "labour_cost": 1200,
    },
    "toilet": {
        "switches": 1, "sockets": 0, "lights": 1, "fans": 1,
        "wiring_m": 10, "wire_cost": 700, "switch_cost": 400,
        "light_cost": 500, "fan_cost": 1500, "labour_cost": 800,
    },
    "dining": {
        "switches": 3, "sockets": 3, "lights": 2, "fans": 1,
        "wiring_m": 25, "wire_cost": 1800, "switch_cost": 1000,
        "light_cost": 3000, "fan_cost": 2500, "labour_cost": 2000,
    },
    "balcony": {
        "switches": 1, "sockets": 1, "lights": 1, "fans": 0,
        "wiring_m": 10, "wire_cost": 700, "switch_cost": 400,
        "light_cost": 800, "fan_cost": 0, "labour_cost": 600,
    },
    "passage": {
        "switches": 2, "sockets": 1, "lights": 2, "fans": 0,
        "wiring_m": 15, "wire_cost": 1000, "switch_cost": 600,
        "light_cost": 1200, "fan_cost": 0, "labour_cost": 800,
    },
    "staircase": {
        "switches": 2, "sockets": 0, "lights": 2, "fans": 0,
        "wiring_m": 20, "wire_cost": 1400, "switch_cost": 600,
        "light_cost": 1200, "fan_cost": 0, "labour_cost": 1000,
    },
    "store_room": {
        "switches": 1, "sockets": 1, "lights": 1, "fans": 0,
        "wiring_m": 10, "wire_cost": 700, "switch_cost": 400,
        "light_cost": 500, "fan_cost": 0, "labour_cost": 600,
    },
}

# Common electrical infrastructure (per building)
ELECTRICAL_INFRASTRUCTURE: Dict[str, Any] = {
    "distribution_board": {"name": "Distribution Board (DB)", "count": 1, "cost": 3500},
    "mcb": {"name": "MCB (Miniature Circuit Breaker)", "count": 8, "cost_per_unit": 350},
    "rccb": {"name": "RCCB (Earth Leakage)", "count": 1, "cost": 2500},
    "earthing": {"name": "Earthing System", "count": 2, "cost_per_unit": 3500},
    "main_cable": {"name": "Main Power Cable", "length_m": 20, "cost": 4000},
    "meter_box": {"name": "Electric Meter Box", "count": 1, "cost": 2000},
    "inverter_wiring": {"name": "Inverter Wiring", "cost": 5000},
}

# ══════════════════════════════════════════════════════════════════════════════
# DOORS & WINDOWS (basic catalog for cost estimation)
# ══════════════════════════════════════════════════════════════════════════════

DOOR_TYPES: List[Dict[str, Any]] = [
    {"id": "flush_door",        "name": "Flush Door (Plywood)",        "size": "7×3 ft", "price": 5500,  "frame_cost": 3500},
    {"id": "panel_door",        "name": "Panel Door (Teak)",           "size": "7×3 ft", "price": 12000, "frame_cost": 6000},
    {"id": "pvc_door",          "name": "PVC Door (Bathroom)",         "size": "7×2.5 ft","price": 2500, "frame_cost": 1500},
    {"id": "main_door",         "name": "Main Entrance Door (Teak)",   "size": "7×3.5 ft","price": 25000,"frame_cost": 8000},
    {"id": "sliding_glass_door","name": "Sliding Glass Door",          "size": "7×5 ft", "price": 18000, "frame_cost": 5000},
]

WINDOW_TYPES: List[Dict[str, Any]] = [
    {"id": "aluminium_sliding", "name": "Aluminium Sliding Window",  "size": "4×3 ft",  "price_per_sqft": 450},
    {"id": "upvc_window",       "name": "UPVC Window",               "size": "4×3 ft",  "price_per_sqft": 550},
    {"id": "wooden_window",     "name": "Wooden Window (Teak)",      "size": "4×3 ft",  "price_per_sqft": 700},
    {"id": "glass_fixed",       "name": "Fixed Glass Panel",         "size": "4×4 ft",  "price_per_sqft": 350},
]


# ══════════════════════════════════════════════════════════════════════════════
# HELPER: Lookup functions
# ══════════════════════════════════════════════════════════════════════════════

def get_brick_by_id(brick_id: str) -> Dict[str, Any]:
    """Return brick catalog entry by id, or first (red clay) as default."""
    for b in BRICK_CATALOG:
        if b["id"] == brick_id:
            return b
    return BRICK_CATALOG[0]

def get_cement_by_id(cement_id: str) -> Dict[str, Any]:
    """Return cement brand by id, or UltraTech as default."""
    for c in CEMENT_CATALOG:
        if c["id"] == cement_id:
            return c
    return CEMENT_CATALOG[0]

def get_steel_brand_by_id(brand_id: str) -> Dict[str, Any]:
    """Return steel brand by id, or TATA as default."""
    for s in STEEL_BRANDS:
        if s["id"] == brand_id:
            return s
    return STEEL_BRANDS[0]

def get_steel_grade_by_id(grade_id: str) -> Dict[str, Any]:
    """Return steel grade by id, or Fe500 as default."""
    for g in STEEL_GRADES:
        if g["id"] == grade_id:
            return g
    return STEEL_GRADES[1]  # Fe500

def get_sand_by_id(sand_id: str) -> Dict[str, Any]:
    for s in SAND_CATALOG:
        if s["id"] == sand_id:
            return s
    return SAND_CATALOG[1]  # River sand default

def get_aggregate_by_id(agg_id: str) -> Dict[str, Any]:
    for a in AGGREGATE_CATALOG:
        if a["id"] == agg_id:
            return a
    return AGGREGATE_CATALOG[1]  # 20mm default

def get_paint_brand_by_id(brand_id: str) -> Dict[str, Any]:
    for p in PAINT_BRANDS:
        if p["id"] == brand_id:
            return p
    return PAINT_BRANDS[0]

def get_tile_brand_by_id(brand_id: str) -> Dict[str, Any]:
    for t in TILE_BRANDS:
        if t["id"] == brand_id:
            return t
    return TILE_BRANDS[0]

def get_tile_type_by_id(type_id: str) -> Dict[str, Any]:
    for t in TILE_TYPES:
        if t["id"] == type_id:
            return t
    return TILE_TYPES[1]  # Vitrified default

def get_tile_size_by_id(size_id: str) -> Dict[str, Any]:
    for s in TILE_SIZES:
        if s["id"] == size_id:
            return s
    return TILE_SIZES[0]  # 2x2 default

def get_plumbing_brand_by_id(brand_id: str) -> Dict[str, Any]:
    for p in PLUMBING_BRANDS:
        if p["id"] == brand_id:
            return p
    return PLUMBING_BRANDS[0]

def get_electrical_brand_by_id(brand_id: str) -> Dict[str, Any]:
    for e in ELECTRICAL_BRANDS:
        if e["id"] == brand_id:
            return e
    return ELECTRICAL_BRANDS[0]

def get_electrical_estimate_for_room(room_type: str) -> Dict[str, Any]:
    """Return electrical estimate for a room type. Falls back to bedroom defaults."""
    normalized = room_type.lower().replace(" ", "_")
    for key in ELECTRICAL_ROOM_ESTIMATES:
        if key in normalized or normalized in key:
            return ELECTRICAL_ROOM_ESTIMATES[key]
    return ELECTRICAL_ROOM_ESTIMATES.get("bedroom", {})

def get_plumbing_estimate_for_room(room_type: str) -> Dict[str, Any]:
    """Return plumbing estimate for wet rooms. Returns empty dict for dry rooms."""
    normalized = room_type.lower().replace(" ", "_")
    for key in PLUMBING_ROOM_ESTIMATES:
        if key in normalized or normalized in key:
            return PLUMBING_ROOM_ESTIMATES[key]
    return {}
