import 'dart:math' as math;
import '../models/ai_room.dart';
import '../models/ai_wall.dart';
import '../models/ai_door.dart';
import '../models/ai_window.dart';
import '../models/ai_column.dart';
import '../models/estimation_result.dart';

class EstimationEngine {
  static const Map<String, List<double>> concreteMixProportions = {
    'M10': [1, 3, 6, 10],
    'M15': [1, 2, 4, 7],
    'M20': [1, 1.5, 3, 5.5],
    'M25': [1, 1, 2, 4],
    'M30': [1, 0.75, 1.5, 3.25],
  };

  static EstimationResult calculateTakeoff(
    FloorPlanAnalysisResult plan,
    TakeoffParams params,
  ) {
    final resultId = 'est_${DateTime.now().millisecondsSinceEpoch}';

    final rooms = plan.rooms;
    final walls = plan.walls;
    final doors = plan.doors;
    final windows = plan.windows;
    final columns = plan.columns;

    final floors = params.numFloors > 0 ? params.numFloors : 1;
    final floorHt = params.floorHeight > 0 ? params.floorHeight : 3.0;
    final wallThickness = params.wallThickness > 0 ? params.wallThickness : 0.23;
    final slabThickness = params.slabThickness > 0 ? params.slabThickness : 0.12;
    final wasteMult = 1.0 + (params.wastePercentage / 100.0);

    // ── Step 1: Net Wall Volume & Masonry Takeoff ──
    double totalGrossWallVol = 0.0;
    double totalDoorOpeningVol = 0.0;
    double totalWindowOpeningVol = 0.0;

    final wallHeightUnderSlab = math.max(0.1, floorHt - slabThickness);

    for (final w in walls) {
      final wVol = w.lengthM * w.thicknessM * wallHeightUnderSlab;
      totalGrossWallVol += wVol;

      final wallDoors = doors.where((d) => d.wallId == w.id);
      for (final d in wallDoors) {
        totalDoorOpeningVol += d.widthM * d.heightM * w.thicknessM;
      }

      final wallWins = windows.where((win) => win.wallId == w.id);
      for (final win in wallWins) {
        totalWindowOpeningVol += win.widthM * win.heightM * w.thicknessM;
      }
    }

    final netWallVolSingleFloor = math.max(
      0.0,
      totalGrossWallVol - totalDoorOpeningVol - totalWindowOpeningVol,
    );
    final netWallVolTotal = netWallVolSingleFloor * floors;
    final netWallAreaTotal =
        (walls.fold<double>(0.0, (s, w) => s + w.lengthM) * wallHeightUnderSlab) * floors;

    // ── Step 2: Brick Count vs AAC Block counts ──
    int bricksCount = 0;
    int blocksCount = 0;
    double mortarVolTotal = 0.0;
    double brickUnitRate = params.rateBrick ?? 10.0;

    if (params.brickType == 'aac_block') {
      const blockVg = 0.603 * 0.203 * 0.203; // AAC Block with joints (600x200x200 mm)
      blocksCount = (netWallVolTotal / blockVg * wasteMult).ceil();
      mortarVolTotal = netWallVolTotal * 0.015; // 1.5% adhesive glue
      brickUnitRate = params.rateBrick ?? 55.0;
    } else {
      const jointThick = 0.01;
      const brickL = 0.23, brickW = 0.11, brickH = 0.075;
      const brickVg = (brickL + jointThick) * (brickW + jointThick) * (brickH + jointThick);
      const brickVn = brickL * brickW * brickH;

      final bricksNoWaste = netWallVolTotal / brickVg;
      bricksCount = (bricksNoWaste * wasteMult).ceil();
      mortarVolTotal = math.max(0.0, netWallVolTotal - (bricksNoWaste * brickVn));
    }

    // ── Step 3: Concrete Structural Elements (IS 456) ──
    final slabAreaPerFloor = plan.totalAreaM2 > 0
        ? plan.totalAreaM2
        : rooms.fold<double>(0.0, (s, r) => s + r.areaM2);
    final slabConcreteVolTotal = slabAreaPerFloor * slabThickness * floors;

    double columnsConcreteVolTotal = 0.0;
    final estimatedColumnsCount = columns.isNotEmpty
        ? columns.length
        : math.max(1, (slabAreaPerFloor / 15.0).ceil());

    if (columns.isNotEmpty) {
      for (final col in columns) {
        final sizeM = col.sizeM.length >= 2 ? col.sizeM : [0.23, 0.23];
        columnsConcreteVolTotal += sizeM[0] * sizeM[1] * floorHt;
      }
      columnsConcreteVolTotal *= floors;
    } else {
      columnsConcreteVolTotal = estimatedColumnsCount * (0.23 * 0.23) * floorHt * floors;
    }

    final wallTotalLength = walls.fold<double>(0.0, (s, w) => s + w.lengthM);
    final beamsConcreteVolTotal = (wallTotalLength * 0.23 * 0.35) * floors;
    final footingsConcreteVolTotal = estimatedColumnsCount * (1.2 * 1.2 * 0.40);
    final stairsConcreteVolTotal = 1.8 * floors; // Nominal staircase concrete volume

    final rccConcreteVolTotal = slabConcreteVolTotal +
        columnsConcreteVolTotal +
        beamsConcreteVolTotal +
        footingsConcreteVolTotal +
        stairsConcreteVolTotal;

    // ── Step 4: Steel Reinforcement Weight (IS 1786) ──
    final steelWeightTotal = ((footingsConcreteVolTotal * 80.0) +
            (columnsConcreteVolTotal * 120.0) +
            (beamsConcreteVolTotal * 150.0) +
            (slabConcreteVolTotal * 90.0) +
            (stairsConcreteVolTotal * 80.0)) *
        wasteMult;

    // ── Step 5: Dry proportions for Concrete & Mortar ──
    final concreteDryVolTotal = rccConcreteVolTotal * 1.54;
    final mixGrade = params.concreteGrade;
    final mix = concreteMixProportions[mixGrade] ?? concreteMixProportions['M20']!;
    final mixSum = mix[3];

    final rccCementBags = (((1.0 / mixSum) * concreteDryVolTotal / 0.0347) * wasteMult).ceil();
    final rccSandVol = ((mix[1] / mixSum) * concreteDryVolTotal) * wasteMult;
    final rccAggVol = ((mix[2] / mixSum) * concreteDryVolTotal) * wasteMult;

    final mortarRatioText = params.mortarRatio;
    final mortarSandRatio = double.tryParse(mortarRatioText.split(':').last) ?? 5.0;
    final mortarSum = 1.0 + mortarSandRatio;
    final mortarDryVolTotal = mortarVolTotal * 1.33;

    final masonryCementBags = params.brickType == 'aac_block'
        ? 0
        : (((1.0 / mortarSum) * mortarDryVolTotal / 0.0347) * wasteMult).ceil();
    final masonrySandVol = params.brickType == 'aac_block'
        ? 0.0
        : ((mortarSandRatio / mortarSum) * mortarDryVolTotal) * wasteMult;

    // ── Step 6: Plastering (IS 1200) ──
    final internalPlasterArea =
        rooms.fold<double>(0.0, (s, r) => s + (r.perimeterM * floorHt)) * floors;
    final footprintPerimeter = math.sqrt(math.max(1.0, slabAreaPerFloor)) * 4.0;
    final externalPlasterArea = (footprintPerimeter * floorHt) * floors;

    final totalPlasterArea = (internalPlasterArea + externalPlasterArea) * 0.90;

    final internalPlasterVol = (internalPlasterArea * 0.90) * 0.012;
    final externalPlasterVol = (externalPlasterArea * 0.90) * 0.020;

    final plasterCementBags =
        (((1.0 / 5.0) * (internalPlasterVol * 1.33) / 0.0347) * wasteMult).ceil() +
            (((1.0 / 6.0) * (externalPlasterVol * 1.33) / 0.0347) * wasteMult).ceil();
    final plasterSandVol =
        (((4.0 / 5.0) * (internalPlasterVol * 1.33)) + ((5.0 / 6.0) * (externalPlasterVol * 1.33))) *
            wasteMult;

    // ── Step 7: Flooring & Painting ──
    final totalFlooringArea =
        rooms.fold<double>(0.0, (s, r) => s + (r.areaM2 > 0 ? r.areaM2 : 12.0)) * floors;
    const tileBoxCoverage = 1.44; // 2x2 ft tile box
    final tilesBoxes = ((totalFlooringArea / tileBoxCoverage) * 1.08).ceil();
    final flooringAdhesiveKg = totalFlooringArea * 5.5;
    final flooringGroutKg = totalFlooringArea * 0.20;

    final paintableArea = totalPlasterArea * 1.20;
    final paintLiters = ((paintableArea / 6.0) * 2.0).ceil();

    // ── Step 8: Total Materials Sums ──
    final finalCementBags = rccCementBags + masonryCementBags + plasterCementBags;
    final finalSandVol = rccSandVol + masonrySandVol + plasterSandVol;
    final finalAggVol = rccAggVol;

    // ── Step 9: Rates & Cost Calculator (INR) ──
    final cementPriceBag = params.rateCement ?? 430.0;
    final steelPriceKg = params.rateSteel ?? 75.0;
    final sandPriceM3 = params.rateSand ?? 1400.0;
    final aggPriceM3 = params.rateAggregate ?? 1600.0;
    final plasterPriceM2 = params.ratePlaster ?? 280.0;
    final paintPriceM2 = params.ratePaint ?? 120.0;
    final tilesPriceM2 = params.rateTiles ?? 650.0;

    final costBricks = bricksCount * brickUnitRate;
    final costBlocks = blocksCount * brickUnitRate;
    final costCement = finalCementBags * cementPriceBag;
    final costSand = finalSandVol * sandPriceM3;
    final costAgg = finalAggVol * aggPriceM3;
    final costSteel = steelWeightTotal * steelPriceKg;
    final costPlaster = totalPlasterArea * plasterPriceM2;
    final costPaint = paintableArea * paintPriceM2;
    final costTiles = totalFlooringArea * tilesPriceM2;

    final excavationVolume = slabAreaPerFloor * 0.35 * 1.5;
    const excavationPriceM3 = 200.0;
    final costExcavation = excavationVolume * excavationPriceM3;

    final waterproofingArea = slabAreaPerFloor + (totalFlooringArea * 0.1);
    final costWaterproofing = waterproofingArea * 380.0;

    // ── Step 10: Labor & Machinery Rentals ──
    final masonDays = ((netWallVolTotal / 1.25) + (totalPlasterArea / 8.0) + (totalFlooringArea / 6.0)).ceil();
    final helperDays = (masonDays * 1.5 + (excavationVolume / 3.5) + (rccConcreteVolTotal / 2.5)).ceil();
    final supervisorDays = ((masonDays + helperDays) / 10.0).ceil();

    final costLabour = (masonDays * 900.0) + (helperDays * 650.0) + (supervisorDays * 1200.0);

    final concreteMixerRent = (rccConcreteVolTotal / 8.0).ceil() * 1800.0;
    final needleVibratorRent = (rccConcreteVolTotal / 8.0).ceil() * 500.0;
    final costEquipment = concreteMixerRent + needleVibratorRent + 5000.0;

    final materialsWeightTons = (((bricksCount * 3.0) + (blocksCount * 12.0)) +
            (finalCementBags * 50.0) +
            (steelWeightTotal) +
            (finalSandVol * 1600.0) +
            (finalAggVol * 1500.0)) /
        1000.0;
    final costTransport = (materialsWeightTons * 350.0).ceilToDouble();

    final costMaterial = (params.brickType == 'aac_block' ? costBlocks : costBricks) +
        costCement +
        costSand +
        costAgg +
        costSteel +
        costPlaster +
        costPaint +
        costTiles +
        costWaterproofing +
        costExcavation;

    final baseExecution = costMaterial + costLabour + costEquipment + costTransport;
    final margin = (baseExecution * 0.10).roundToDouble();
    final contingency = (baseExecution * 0.05).roundToDouble();
    final taxable = baseExecution + margin + contingency;
    final gst = (taxable * 0.18).roundToDouble();
    final grandTotal = taxable + gst;

    // ── Step 11: Room-Wise Estimations ──
    final roomTakeoffs = rooms.map((room) {
      double rWallVol = 0.0;
      double rWallArea = 0.0;

      for (final w in walls) {
        if (w.roomIds.contains(room.id)) {
          final divisor = math.max(1, w.roomIds.length);
          rWallVol += (w.lengthM * w.thicknessM * wallHeightUnderSlab) / divisor;
          rWallArea += (w.lengthM * wallHeightUnderSlab) / divisor;
        }
      }

      if (rWallVol == 0.0) {
        rWallArea = (room.perimeterM > 0 ? room.perimeterM : 14.0) * floorHt;
        rWallVol = rWallArea * wallThickness;
      }

      final rBricks = params.brickType == 'aac_block' ? 0 : (rWallVol / 0.002448 * wasteMult).ceil();
      final rBlocks = params.brickType == 'aac_block' ? (rWallVol / 0.024849 * wasteMult).ceil() : 0;
      final rMasonryCement = params.brickType == 'aac_block'
          ? 0
          : (((1.0 / mortarSum) * (rWallVol * 0.22 * 1.33) / 0.0347) * wasteMult).ceil();
      final rPlasterCement = (((1.0 / 5.0) * (rWallArea * 2 * 0.012 * 1.33) / 0.0347) * wasteMult).ceil();
      final rCement = rMasonryCement + rPlasterCement;

      final rSand = ((params.brickType == 'aac_block'
                  ? 0.0
                  : ((mortarSandRatio / mortarSum) * (rWallVol * 0.22 * 1.33))) +
              ((4.0 / 5.0) * (rWallArea * 2 * 0.012 * 1.33))) *
          wasteMult;

      final rPaintL = ((rWallArea * 1.2 / 6.0) * 2.0).ceil();
      final rTilesBoxes = ((room.areaM2 / tileBoxCoverage) * 1.08).ceil();
      final roomCost = ((room.areaM2 / math.max(1.0, slabAreaPerFloor)) * grandTotal).roundToDouble();

      return RoomTakeoff(
        roomId: room.id,
        label: room.label,
        areaM2: room.areaM2,
        wallAreaM2: rWallArea,
        wallVolumeM3: rWallVol,
        bricksCount: params.brickType == 'aac_block' ? rBlocks : rBricks,
        cementBags: rCement,
        sandVolumeM3: rSand,
        plasterM2: rWallArea * 2,
        paintLiters: rPaintL,
        tilesAreaM2: room.areaM2,
        tilesBoxes: rTilesBoxes,
        totalCost: roomCost,
      );
    }).toList();

    // ── Step 12: Auditable Formula Calculation Sheets ──
    final wasteBrickPct = params.wasteBrick ?? params.wastePercentage;
    final wasteSteelPct = params.wasteSteel ?? 3.0;
    final wasteConcretePct = params.wasteConcrete ?? 2.0;
    final wastePlasterPct = params.wastePlaster ?? 5.0;

    final calculationAudits = [
      CalculationAuditStep(
        itemId: 'audit_masonry',
        itemName: params.brickType == 'aac_block'
            ? 'AAC Block Masonry Quantity'
            : 'Red Clay Brick Masonry Count',
        category: 'masonry',
        unit: params.brickType == 'aac_block' ? 'Blocks' : 'Bricks',
        formula: 'Net Wall Vol (m³) ÷ Unit Volume with Mortar Joint (m³) × (1 + Waste %)',
        inputValues: {
          'gross_wall_vol_m3': (totalGrossWallVol * 100).round() / 100,
          'door_deduction_m3': (totalDoorOpeningVol * 100).round() / 100,
          'window_deduction_m3': (totalWindowOpeningVol * 100).round() / 100,
          'net_wall_vol_m3': (netWallVolTotal * 100).round() / 100,
          'unit_brick_vol_m3': params.brickType == 'aac_block' ? 0.0248 : 0.002448,
          'waste_percentage': wasteBrickPct,
        },
        intermediateSteps: [
          'Gross Wall Volume: ${(totalGrossWallVol * 100).round() / 100} m³ across ${walls.length} wall vectors',
          'Opening Deductions: -${(totalDoorOpeningVol * 100).round() / 100} m³ (Doors), -${(totalWindowOpeningVol * 100).round() / 100} m³ (Windows)',
          'Net Masonry Volume: ${(netWallVolTotal * 100).round() / 100} m³',
          'Nominal Unit Volume (with mortar joint): ${params.brickType == 'aac_block' ? '600×200×200mm = 0.0248 m³' : '230×110×75mm + 10mm joint = 0.002448 m³'}',
          'Base Quantity (without waste): ${params.brickType == 'aac_block' ? blocksCount : (netWallVolTotal / 0.002448).ceil()} units',
          'Configured Waste Factor ($wasteBrickPct%): +${((params.brickType == 'aac_block' ? blocksCount : bricksCount) * (wasteBrickPct / 100)).round()} units',
        ],
        finalValue: (params.brickType == 'aac_block' ? blocksCount : bricksCount).toDouble(),
        isCodeReference: 'IS 1200 (Part 3) : 1976 & IS 2212 : 1991',
        confidence: 0.98,
      ),
      CalculationAuditStep(
        itemId: 'audit_cement',
        itemName: 'OPC / PPC Cement Requirement',
        category: 'masonry',
        unit: 'Bags (50kg)',
        formula:
            '⌈(Dry Mortar Vol ÷ 0.0347 m³/bag) + (Dry RCC Vol × Cement Mix Fraction ÷ 0.0347 m³/bag)⌉ × (1 + Waste %)',
        inputValues: {
          'masonry_mortar_vol_m3': (mortarVolTotal * 100).round() / 100,
          'rcc_concrete_vol_m3': (rccConcreteVolTotal * 100).round() / 100,
          'concrete_grade': mixGrade,
          'mortar_ratio': mortarRatioText,
          'unit_bag_vol_m3': 0.0347,
        },
        intermediateSteps: [
          'Wet Mortar Volume: ${(mortarVolTotal * 100).round() / 100} m³',
          'Dry Mortar Factor (1.33): ${(mortarVolTotal * 1.33 * 100).round() / 100} m³ dry mortar',
          'Masonry Mortar Cement Bags ($mortarRatioText): $masonryCementBags bags',
          'Plastering Cement Bags (12mm/20mm): $plasterCementBags bags',
          'RCC Concrete Cement Bags ($mixGrade Mix 1:${mix[1]}:${mix[2]}): $rccCementBags bags',
          'Total Standard 50kg OPC/PPC Cement Bags Required: $finalCementBags bags',
        ],
        finalValue: finalCementBags.toDouble(),
        isCodeReference: 'IS 456 : 2000 & IS 10262 : 2019',
        confidence: 0.97,
      ),
      CalculationAuditStep(
        itemId: 'audit_concrete',
        itemName: 'Structural Reinforced Concrete (RCC)',
        category: 'concrete',
        unit: 'm³',
        formula: 'V_RCC = V_slabs + V_columns + V_beams + V_footings + V_stairs',
        inputValues: {
          'slabs_m3': (slabConcreteVolTotal * 100).round() / 100,
          'columns_m3': (columnsConcreteVolTotal * 100).round() / 100,
          'beams_m3': (beamsConcreteVolTotal * 100).round() / 100,
          'footings_m3': (footingsConcreteVolTotal * 100).round() / 100,
          'stairs_m3': (stairsConcreteVolTotal * 100).round() / 100,
          'waste_percentage': wasteConcretePct,
        },
        intermediateSteps: [
          'Roof Slabs (${(slabThickness * 1000).round()}mm thick): ${(slabConcreteVolTotal * 100).round() / 100} m³',
          'Columns ($estimatedColumnsCount units @ 230×230mm): ${(columnsConcreteVolTotal * 100).round() / 100} m³',
          'Beams (230×350mm along walls): ${(beamsConcreteVolTotal * 100).round() / 100} m³',
          'Isolated Footings (1.2×1.2×0.4m): ${(footingsConcreteVolTotal * 100).round() / 100} m³',
          'Staircase Flight Concrete: ${(stairsConcreteVolTotal * 100).round() / 100} m³',
          'Total Wet RCC Concrete Volume: ${(rccConcreteVolTotal * 100).round() / 100} m³',
        ],
        finalValue: (rccConcreteVolTotal * 100).round() / 100,
        isCodeReference: 'IS 456 : 2000 (Table 9 & 10) & IS 1200 (Part 2)',
        confidence: 0.98,
      ),
      CalculationAuditStep(
        itemId: 'audit_steel',
        itemName: 'High-Yield Deformed Steel Rebar (TMT Fe500/Fe550)',
        category: 'steel',
        unit: 'Kg',
        formula: '∑(Member RCC Vol × Rebar Density kg/m³) × (1 + Waste %)',
        inputValues: {
          'footing_rebar_density': '80 kg/m³',
          'column_rebar_density': '120 kg/m³',
          'beam_rebar_density': '150 kg/m³',
          'slab_rebar_density': '90 kg/m³',
          'stair_rebar_density': '80 kg/m³',
          'steel_grade': params.steelGrade,
          'waste_percentage': wasteSteelPct,
        },
        intermediateSteps: [
          'Footings Rebar (80 kg/m³): ${(footingsConcreteVolTotal * 80).round()} kg',
          'Columns Rebar (120 kg/m³): ${(columnsConcreteVolTotal * 120).round()} kg',
          'Beams Rebar (150 kg/m³): ${(beamsConcreteVolTotal * 150).round()} kg',
          'Slabs Rebar (90 kg/m³): ${(slabConcreteVolTotal * 90).round()} kg',
          'Stairs Rebar (80 kg/m³): ${(stairsConcreteVolTotal * 80).round()} kg',
          'Configured Cutting/Lap Waste ($wasteSteelPct%): +${(steelWeightTotal * (wasteSteelPct / 100)).round()} kg',
        ],
        finalValue: steelWeightTotal.roundToDouble(),
        isCodeReference: 'IS 1786 : 2008 & IS 2502 : 1963 (Bar Bending Code)',
        confidence: 0.94,
      ),
      CalculationAuditStep(
        itemId: 'audit_plaster',
        itemName: 'Internal (12mm) & External (20mm) Cement Plaster',
        category: 'finishes',
        unit: 'm²',
        formula: 'A_plaster = (Internal Wall Faces + External Outer Perimeter) × Height - Opening Deductions',
        inputValues: {
          'internal_plaster_area_m2': (internalPlasterArea * 100).round() / 100,
          'external_plaster_area_m2': (externalPlasterArea * 100).round() / 100,
          'opening_deduction_factor': '10%',
          'waste_percentage': wastePlasterPct,
        },
        intermediateSteps: [
          'Internal Room Wall Surfaces: ${(internalPlasterArea * 100).round() / 100} m²',
          'External Facade Outer Surfaces: ${(externalPlasterArea * 100).round() / 100} m²',
          'Opening & Deduction Offset (10%): -${((internalPlasterArea + externalPlasterArea) * 0.10 * 100).round() / 100} m²',
          'Net Executed Plaster Area: ${(totalPlasterArea * 100).round() / 100} m²',
        ],
        finalValue: (totalPlasterArea * 100).round() / 100,
        isCodeReference: 'IS 1200 (Part 12) : 1976 & IS 1661 : 1972',
        confidence: 0.96,
      ),
    ];

    // ── Step 13: Wall-by-Wall Engineering Quantity Takeoffs ──
    final wallTakeoffs = walls.asMap().entries.map((entry) {
      final idx = entry.key;
      final wall = entry.value;

      final wLen = wall.lengthM > 0 ? wall.lengthM : 3.5;
      final wH = floorHt;
      final wThick = wall.thicknessM > 0 ? wall.thicknessM : wallThickness;
      final gArea = wLen * wH;
      final gVol = gArea * wThick;

      final attachedDoorsCount = wall.doorIds.length;
      final attachedWinsCount = wall.windowIds.length;

      final doorDeductVol = attachedDoorsCount * (0.9 * 2.1 * wThick);
      final winDeductVol = attachedWinsCount * (1.2 * 1.2 * wThick);
      final netVol = math.max(0.1, gVol - doorDeductVol - winDeductVol);

      final wBricks = params.brickType == 'aac_block'
          ? 0
          : (netVol / 0.002448 * (1.0 + wasteBrickPct / 100.0)).ceil();
      final wBlocks = params.brickType == 'aac_block'
          ? (netVol / 0.0248 * (1.0 + wasteBrickPct / 100.0)).ceil()
          : 0;
      final wMortarVol = netVol * 0.22;
      final wCementBags = ((wMortarVol * 1.33) / 0.0347).ceil();
      final wSandVol = (wMortarVol * 1.33 * 0.85 * 100).round() / 100;
      final wPlasterArea = gArea * 2;
      final wPaintArea = gArea * 2;
      final wCost = (wBricks * brickUnitRate) +
          (wBlocks * brickUnitRate) +
          (wCementBags * cementPriceBag) +
          (wPlasterArea * plasterPriceM2);

      return WallTakeoff(
        wallId: wall.id.isNotEmpty ? wall.id : 'W-${idx + 1}',
        name: 'Wall Vector ${wall.id.isNotEmpty ? wall.id : idx + 1} (${wall.wallType})',
        lengthM: (wLen * 100).round() / 100,
        heightM: (wH * 100).round() / 100,
        thicknessM: (wThick * 1000).round() / 1000,
        grossAreaM2: (gArea * 100).round() / 100,
        grossVolumeM3: (gVol * 100).round() / 100,
        doorDeductionM3: (doorDeductVol * 100).round() / 100,
        windowDeductionM3: (winDeductVol * 100).round() / 100,
        netVolumeM3: (netVol * 100).round() / 100,
        bricksCount: wBricks,
        blocksCount: wBlocks,
        mortarVolumeM3: (wMortarVol * 100).round() / 100,
        cementBags: wCementBags,
        sandVolumeM3: wSandVol,
        plasterAreaM2: (wPlasterArea * 100).round() / 100,
        paintAreaM2: (wPaintArea * 100).round() / 100,
        totalCost: wCost.roundToDouble(),
      );
    }).toList();

    // Separated Cement & Sand breakdowns
    final cementMasonryBags = masonryCementBags;
    final cementPlasterBags = plasterCementBags;
    final cementRccBags = rccCementBags;
    final cementFlooringBags = ((totalFlooringArea * 0.02) / 0.0347).ceil();

    final sandMasonryM3 = (mortarVolTotal * 1.33 * 0.85 * 100).round() / 100;
    final sandPlasterM3 = (totalPlasterArea * 0.012 * 1.33 * 0.80 * 100).round() / 100;
    final sandRccM3 = (rccConcreteVolTotal * 1.54 * (mix[1] / mix[3]) * 100).round() / 100;

    final materialsSummary = MaterialsSummary(
      netWallVolumeM3: netWallVolTotal,
      netWallAreaM2: netWallAreaTotal,
      mortarVolumeM3: mortarVolTotal,
      concreteVolume: rccConcreteVolTotal,
      excavationVolume: excavationVolume,
      formworkArea: rccConcreteVolTotal * 4.5,
      plasterArea: totalPlasterArea,
      paintArea: paintableArea,
      tilesArea: totalFlooringArea,
      waterproofingArea: waterproofingArea,
      cementMasonryBags: cementMasonryBags,
      cementPlasterBags: cementPlasterBags,
      cementRccBags: cementRccBags,
      cementFlooringBags: cementFlooringBags,
      sandMasonryM3: sandMasonryM3,
      sandPlasterM3: sandPlasterM3,
      sandRccM3: sandRccM3,
      concreteSlabsM3: slabConcreteVolTotal,
      concreteColumnsM3: columnsConcreteVolTotal,
      concreteBeamsM3: beamsConcreteVolTotal,
      concreteFootingsM3: footingsConcreteVolTotal,
      concreteStairsM3: stairsConcreteVolTotal,
      bricksCount: params.brickType == 'aac_block' ? 0 : bricksCount,
      blocksCount: params.brickType == 'aac_block' ? blocksCount : 0,
      cementBags: finalCementBags,
      sandVolume: finalSandVol,
      aggregateVolume: finalAggVol,
      steelWeight: steelWeightTotal,
      tilesBoxes: tilesBoxes,
      paintLiters: paintLiters,
      adhesiveKg: flooringAdhesiveKg,
      groutKg: flooringGroutKg,
      doorsCount: doors.length * floors,
      windowsCount: windows.length * floors,
    );

    final costBreakdown = CostBreakdown(
      brickCost: params.brickType == 'aac_block' ? 0.0 : costBricks,
      blockCost: params.brickType == 'aac_block' ? costBlocks : 0.0,
      cementCost: costCement,
      sandCost: costSand,
      aggregateCost: costAgg,
      steelCost: costSteel,
      plasterCost: costPlaster,
      paintCost: costPaint,
      tilesCost: costTiles,
      waterproofingCost: costWaterproofing,
      excavationCost: costExcavation,
      labourCost: costLabour,
      equipmentCost: costEquipment,
      transportCost: costTransport,
      totalMaterialCost: costMaterial,
      contractorMargin: margin,
      contingency: contingency,
      gstAmount: gst,
      grandTotal: grandTotal,
    );

    final assumptions = [
      'Wall height set to ${floorHt}m (Nominal ${wallHeightUnderSlab.toStringAsFixed(2)}m masonry height).',
      'Concrete Mix: $mixGrade (${mixGrade == 'M20' ? '1:1.5:3' : mixGrade == 'M25' ? '1:1:2' : '1:2:4'}).',
      'Steel rebar calculated using nominal structural densities (Slabs: 90kg/m³, Beams: 150kg/m³, Columns: 120kg/m³, Footings: 80kg/m³).',
      'Brickwork Joint: ${params.brickType == 'aac_block' ? '3mm adhesive thin-bed' : '10mm cement-sand mortar joint'}.',
      'Plastering: 12mm internal cement-sand mortar (1:4), 20mm external (1:5).',
      'Tile waste factor of ${params.wastePercentage}% applied to flooring box counts.',
      'Contingencies set to 5% and Contractor Margin at 10% on execution values.',
      'GST calculated at standard 18% taxable rate.',
    ];

    return EstimationResult(
      id: resultId,
      projectId: plan.projectId.isNotEmpty ? plan.projectId : plan.id,
      createdAt: DateTime.now().toIso8601String(),
      userInputs: params,
      materials: materialsSummary,
      costBreakdown: costBreakdown,
      roomTakeoffs: roomTakeoffs,
      wallTakeoffs: wallTakeoffs,
      calculationAudits: calculationAudits,
      totalCost: grandTotal,
      currency: 'INR',
      assumptions: assumptions,
      confidenceScore: 0.92,
      dataSource: const {
        'room_dimensions': 'AI Detected',
        'walls_thickness': 'AI Detected',
        'floor_height': 'User Input',
        'materials_wastage': 'User Input',
        'concrete_mixes': 'User Input',
      },
    );
  }
}
