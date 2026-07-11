"""
BuildWise AI — IS Code Constants & Engineering Reference Data
=============================================================
All constants sourced from:
  - IS 456:2000  (Plain and Reinforced Concrete)
  - IS 1200:1992 (Methods of Measurement)
  - IS 875:1987  (Code of Practice for Design Loads)
  - NBC 2016     (National Building Code of India)
  - CPWD DSR 2024 (Delhi Schedule of Rates)
  - Standard PWD estimation practices
"""

# ── Unit Conversion ────────────────────────────────────────────────────────────
SQ_FT_TO_SQ_M = 0.092903       # 1 sq ft = 0.092903 m²
SQ_M_TO_SQ_FT = 10.7639        # 1 m² = 10.7639 sq ft

# ── Concrete Mix Ratios (IS 456:2000 Table 5) ──────────────────────────────────
# Format: (cement_parts, sand_parts, aggregate_parts)
CONCRETE_MIX_RATIOS = {
    "M10": (1, 3.0, 6.0),       # Nominal mix, lean concrete
    "M15": (1, 2.0, 4.0),       # Nominal mix
    "M20": (1, 1.5, 3.0),       # Min grade for RCC (IS 456 Cl 6.1.2)
    "M25": (1, 1.0, 2.0),       # For moderate exposure
    "M30": (1, 0.75, 1.5),      # Design mix required above M25
    "M35": (1, 0.5, 1.0),       # High strength – design mix
    "M40": (1, 0.4, 0.8),       # High strength – design mix
}

# Dry volume factor for concrete (volume shrinkage on hydration)
# IS 1200 Part II: wet volume × 1.54 = dry volume of ingredients
CONCRETE_DRY_VOLUME_FACTOR = 1.54

# Volume of one 50 kg cement bag in m³
CEMENT_BAG_VOLUME_M3 = 0.0347   # Bulk density ~1440 kg/m³

# ── Mortar Mix Ratios (IS 2250:1981) ─────────────────────────────────────────
# Standard mortar for load-bearing masonry: 1:6 (Cement:Sand)
# Standard mortar for framed structure infill: 1:6
# Standard plaster mix: 1:4 (internal), 1:5 (external)
MORTAR_MIX = {
    "brick_standard":    (1, 6),    # Cement : Sand for brickwork
    "block_aac":         (1, 6),    # Same for AAC block
    "plaster_internal":  (1, 4),
    "plaster_external":  (1, 5),
}

# Mortar volume fraction of total masonry (IS 2212:1991)
MORTAR_FRACTION_OF_MASONRY = 0.30  # 30% of total wall volume

# Mortar dry/wet volume ratio (shrinkage during curing)
MORTAR_DRY_VOLUME_FACTOR = 1.33

# ── Masonry Unit Counts (per m³ of wall volume) ───────────────────────────────
# Standard modular brick: 190×90×90 mm with 10mm mortar joints → 200×100×100 mm
# 1 m³ / (0.200 × 0.100 × 0.100) = 500 bricks
BRICKS_PER_M3 = 500             # IS 2185 / standard red clay brick (modular)

# AAC block: 600×200×200 mm with 3mm mortar joints → 603×203×203 mm
# ~390 blocks per m³
AAC_BLOCKS_PER_M3 = 390         # IS 2185 Part 3

# ── RCC Structural Volume Ratios (Based on CPWD practice) ────────────────────
# Expressed as fraction of total slab concrete volume
BEAM_FRACTION    = 0.10         # Beams ≈ 10% of slab concrete
COLUMN_FRACTION  = 0.05         # Columns ≈ 5% of slab concrete

# Foundation volume as fraction of total superstructure RCC (slab+beam+column)
FOUNDATION_FRACTION = {
    "isolated":  0.20,   # Isolated footings
    "combined":  0.25,   # Combined footings
    "raft":      0.40,   # Raft / mat foundation
    "pile":      0.30,   # Pile foundation estimate
    "strip":     0.22,   # Strip footing
}

# ── Steel Reinforcement Index (IS 456:2000 / CPWD) ───────────────────────────
# kg of steel per m³ of RCC (weighted average across slab+beam+col+foundation)
# IS 456 limits: min 0.12%, practical residential: 80–100 kg/m³
STEEL_INDEX_KG_PER_M3 = {
    "default":      85.0,   # Standard residential (G+1 to G+3)
    "heavy_frame":  95.0,   # Commercial / industrial
    "light":        75.0,   # Lightweight slabs only
}
STEEL_INDEX_MIN = 70.0     # Validation lower bound
STEEL_INDEX_MAX = 130.0    # Validation upper bound

# ── Plaster Thickness (IS 1661:1972) ─────────────────────────────────────────
PLASTER_THICKNESS_MM = {
    "internal": 12,   # 12 mm for internal walls
    "external": 20,   # 20 mm for external walls
}

# Plaster area multiplier from floor area (covers all internal wall surfaces)
# Internal: floor + 4 walls + ceiling ≈ 2.2× floor area
PLASTER_INTERNAL_MULTIPLIER = 2.2   # Per floor (based on typical room proportions)

# ── Paint Coverage ────────────────────────────────────────────────────────────
# Interior emulsion: 10–12 m²/L per coat × 2 coats
# Paint area ≈ 1.2× plaster area (ceiling + extra coat)
PAINT_TO_PLASTER_RATIO = 1.2

# ── Excavation ────────────────────────────────────────────────────────────────
# Default excavation depth below GL for residential construction (IS 1080)
DEFAULT_EXCAVATION_DEPTH_M = 1.5

# Foundation footprint spread factor (isolated footings on residential)
# Footings typically extend 0.3–0.5m beyond column; overall 30–40% of plot area
FOUNDATION_AREA_FRACTION = 0.35   # of total_area_m²

# ── Waterproofing ─────────────────────────────────────────────────────────────
# Roof area = ground floor footprint = total_area / floors
# Wet area (bathrooms/kitchen) ≈ 12% of floor area per floor
WATERPROOFING_WET_AREA_FRACTION = 0.12

# ── IS Code Validation Bounds (per sq ft of built-up area) ──────────────────
VALIDATION_BOUNDS = {
    "concrete_max_per_sqft_m3":  0.08,    # m³/sq ft
    "steel_min_kg_per_m3":       STEEL_INDEX_MIN,
    "steel_max_kg_per_m3":       STEEL_INDEX_MAX,
    "bricks_max_per_sqft":       25,      # bricks/sq ft
    "cement_max_per_sqft_bags":  0.40,    # bags/sq ft
    "plaster_max_floor_area_x":  5.0,     # ≤ 5× total floor area
    "paint_max_floor_area_x":    5.0,
}

# ── CPWD DSR 2024 Base Rates (Delhi) ─────────────────────────────────────────
# These are defaults. They MUST be overridable per city/state/date from DB.
CPWD_BASE_RATES_2024 = {
    # Structural
    "concrete_rcc_m3":       5_500.0,   # Ready mix concrete M20 placed
    "steel_tmt_kg":           75.0,     # Fe500D TMT bars (supply only)
    # Masonry
    "brick_red_pc":            10.0,    # Per brick (supply + laying)
    "block_aac_pc":            55.0,    # Per AAC block 600×200×200
    "cement_bag_50kg":        430.0,    # OPC 53 grade
    "sand_m3":              1_400.0,    # River sand (zone II)
    "aggregate_20mm_m3":    1_600.0,    # Crushed stone aggregate
    # Finishing
    "plaster_m2":              280.0,   # 12mm cement plaster (supply+apply)
    "paint_interior_m2":       120.0,   # 2-coat interior emulsion
    "paint_exterior_m2":       160.0,   # 2-coat exterior weathershield
    "tiles_m2":                650.0,   # Vitrified tiles 600×600 (supply+fix)
    "waterproofing_m2":        380.0,   # Liquid membrane (2 coats)
    # Civil
    "excavation_m3":           200.0,   # Manual excavation in medium soil
    "formwork_m2":             150.0,   # Timber formwork (supply+fix+strike)
    # Labour (CPWD SR category IV city)
    "manday_mason":            700.0,
    "manday_unskilled":        550.0,
    "manday_skilled":          800.0,
}

# Labour intensity (mandays per unit quantity) — IS 1200 norms
LABOUR_INTENSITY = {
    "rcc_m3":           2.5,    # mandays per m³ RCC
    "masonry_m3":       3.5,    # mandays per m³ brickwork
    "plaster_m2":       0.35,   # mandays per m² plaster
    "paint_m2":         0.15,   # mandays per m² painting
    "tiles_m2":         0.45,   # mandays per m² tiling
    "excavation_m3":    0.60,   # mandays per m³ excavation
}

# ── Cost Build-up Factors ─────────────────────────────────────────────────────
CONTRACTOR_MARGIN   = 0.10   # 10% on material + labour
EQUIPMENT_FACTOR    = 0.05   # 5% on material cost
CONTINGENCY         = 0.05   # 5% project contingency
GST_RATE            = 0.18   # 18% GST on works contract
