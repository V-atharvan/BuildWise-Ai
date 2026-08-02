import 'ai_room.dart';
import 'ai_wall.dart';
import 'ai_door.dart';
import 'ai_window.dart';
import 'ai_column.dart';

class TakeoffParams {
  final String buildingType;
  final int numFloors;
  final double floorHeight;
  final double wallThickness;
  final double slabThickness;
  final String concreteGrade;
  final String steelGrade;
  final String mortarRatio;
  final String foundationType;
  final String roofType;
  final String brickType;
  final double wastePercentage;

  final double? wasteBrick;
  final double? wasteSteel;
  final double? wasteConcrete;
  final double? wasteTiles;
  final double? wastePaint;
  final double? wastePlaster;

  final String? regionState;
  final String? regionCity;

  final double? rateBrick;
  final double? rateCement;
  final double? rateSteel;
  final double? rateSand;
  final double? rateAggregate;
  final double? ratePlaster;
  final double? ratePaint;
  final double? rateTiles;

  const TakeoffParams({
    required this.buildingType,
    this.numFloors = 1,
    this.floorHeight = 3.0,
    this.wallThickness = 0.23,
    this.slabThickness = 0.12,
    this.concreteGrade = 'M20',
    this.steelGrade = 'Fe500',
    this.mortarRatio = '1:5',
    this.foundationType = 'isolated',
    this.roofType = 'flat_rcc',
    this.brickType = 'red_brick',
    this.wastePercentage = 5.0,
    this.wasteBrick,
    this.wasteSteel,
    this.wasteConcrete,
    this.wasteTiles,
    this.wastePaint,
    this.wastePlaster,
    this.regionState,
    this.regionCity,
    this.rateBrick,
    this.rateCement,
    this.rateSteel,
    this.rateSand,
    this.rateAggregate,
    this.ratePlaster,
    this.ratePaint,
    this.rateTiles,
  });

  factory TakeoffParams.fromJson(Map<String, dynamic> json) {
    return TakeoffParams(
      buildingType: json['building_type'] as String? ?? 'house',
      numFloors: (json['num_floors'] as num?)?.toInt() ?? 1,
      floorHeight: (json['floor_height'] as num?)?.toDouble() ?? 3.0,
      wallThickness: (json['wall_thickness'] as num?)?.toDouble() ?? 0.23,
      slabThickness: (json['slab_thickness'] as num?)?.toDouble() ?? 0.12,
      concreteGrade: json['concrete_grade'] as String? ?? 'M20',
      steelGrade: json['steel_grade'] as String? ?? 'Fe500',
      mortarRatio: json['mortar_ratio'] as String? ?? '1:5',
      foundationType: json['foundation_type'] as String? ?? 'isolated',
      roofType: json['roof_type'] as String? ?? 'flat_rcc',
      brickType: json['brick_type'] as String? ?? 'red_brick',
      wastePercentage: (json['waste_percentage'] as num?)?.toDouble() ?? 5.0,
      wasteBrick: (json['waste_brick'] as num?)?.toDouble(),
      wasteSteel: (json['waste_steel'] as num?)?.toDouble(),
      wasteConcrete: (json['waste_concrete'] as num?)?.toDouble(),
      wasteTiles: (json['waste_tiles'] as num?)?.toDouble(),
      wastePaint: (json['waste_paint'] as num?)?.toDouble(),
      wastePlaster: (json['waste_plaster'] as num?)?.toDouble(),
      regionState: json['region_state'] as String?,
      regionCity: json['region_city'] as String?,
      rateBrick: (json['rate_brick'] as num?)?.toDouble(),
      rateCement: (json['rate_cement'] as num?)?.toDouble(),
      rateSteel: (json['rate_steel'] as num?)?.toDouble(),
      rateSand: (json['rate_sand'] as num?)?.toDouble(),
      rateAggregate: (json['rate_aggregate'] as num?)?.toDouble(),
      ratePlaster: (json['rate_plaster'] as num?)?.toDouble(),
      ratePaint: (json['rate_paint'] as num?)?.toDouble(),
      rateTiles: (json['rate_tiles'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'building_type': buildingType,
        'num_floors': numFloors,
        'floor_height': floorHeight,
        'wall_thickness': wallThickness,
        'slab_thickness': slabThickness,
        'concrete_grade': concreteGrade,
        'steel_grade': steelGrade,
        'mortar_ratio': mortarRatio,
        'foundation_type': foundationType,
        'roof_type': roofType,
        'brick_type': brickType,
        'waste_percentage': wastePercentage,
        if (wasteBrick != null) 'waste_brick': wasteBrick,
        if (wasteSteel != null) 'waste_steel': wasteSteel,
        if (wasteConcrete != null) 'waste_concrete': wasteConcrete,
        if (wasteTiles != null) 'waste_tiles': wasteTiles,
        if (wastePaint != null) 'waste_paint': wastePaint,
        if (wastePlaster != null) 'waste_plaster': wastePlaster,
        if (regionState != null) 'region_state': regionState,
        if (regionCity != null) 'region_city': regionCity,
        if (rateBrick != null) 'rate_brick': rateBrick,
        if (rateCement != null) 'rate_cement': rateCement,
        if (rateSteel != null) 'rate_steel': rateSteel,
        if (rateSand != null) 'rate_sand': rateSand,
        if (rateAggregate != null) 'rate_aggregate': rateAggregate,
        if (ratePlaster != null) 'rate_plaster': ratePlaster,
        if (ratePaint != null) 'rate_paint': ratePaint,
        if (rateTiles != null) 'rate_tiles': rateTiles,
      };
}

class WallTakeoff {
  final String wallId;
  final String name;
  final double lengthM;
  final double heightM;
  final double thicknessM;
  final double grossAreaM2;
  final double grossVolumeM3;
  final double doorDeductionM3;
  final double windowDeductionM3;
  final double netVolumeM3;
  final int bricksCount;
  final int blocksCount;
  final double mortarVolumeM3;
  final int cementBags;
  final double sandVolumeM3;
  final double plasterAreaM2;
  final double paintAreaM2;
  final double totalCost;

  const WallTakeoff({
    required this.wallId,
    required this.name,
    required this.lengthM,
    required this.heightM,
    required this.thicknessM,
    required this.grossAreaM2,
    required this.grossVolumeM3,
    required this.doorDeductionM3,
    required this.windowDeductionM3,
    required this.netVolumeM3,
    required this.bricksCount,
    required this.blocksCount,
    required this.mortarVolumeM3,
    required this.cementBags,
    required this.sandVolumeM3,
    required this.plasterAreaM2,
    required this.paintAreaM2,
    required this.totalCost,
  });

  factory WallTakeoff.fromJson(Map<String, dynamic> json) {
    return WallTakeoff(
      wallId: json['wall_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      lengthM: (json['length_m'] as num?)?.toDouble() ?? 0.0,
      heightM: (json['height_m'] as num?)?.toDouble() ?? 0.0,
      thicknessM: (json['thickness_m'] as num?)?.toDouble() ?? 0.0,
      grossAreaM2: (json['gross_area_m2'] as num?)?.toDouble() ?? 0.0,
      grossVolumeM3: (json['gross_volume_m3'] as num?)?.toDouble() ?? 0.0,
      doorDeductionM3: (json['door_deduction_m3'] as num?)?.toDouble() ?? 0.0,
      windowDeductionM3: (json['window_deduction_m3'] as num?)?.toDouble() ?? 0.0,
      netVolumeM3: (json['net_volume_m3'] as num?)?.toDouble() ?? 0.0,
      bricksCount: (json['bricks_count'] as num?)?.toInt() ?? 0,
      blocksCount: (json['blocks_count'] as num?)?.toInt() ?? 0,
      mortarVolumeM3: (json['mortar_volume_m3'] as num?)?.toDouble() ?? 0.0,
      cementBags: (json['cement_bags'] as num?)?.toInt() ?? 0,
      sandVolumeM3: (json['sand_volume_m3'] as num?)?.toDouble() ?? 0.0,
      plasterAreaM2: (json['plaster_area_m2'] as num?)?.toDouble() ?? 0.0,
      paintAreaM2: (json['paint_area_m2'] as num?)?.toDouble() ?? 0.0,
      totalCost: (json['total_cost'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'wall_id': wallId,
        'name': name,
        'length_m': lengthM,
        'height_m': heightM,
        'thickness_m': thicknessM,
        'gross_area_m2': grossAreaM2,
        'gross_volume_m3': grossVolumeM3,
        'door_deduction_m3': doorDeductionM3,
        'window_deduction_m3': windowDeductionM3,
        'net_volume_m3': netVolumeM3,
        'bricks_count': bricksCount,
        'blocks_count': blocksCount,
        'mortar_volume_m3': mortarVolumeM3,
        'cement_bags': cementBags,
        'sand_volume_m3': sandVolumeM3,
        'plaster_area_m2': plasterAreaM2,
        'paint_area_m2': paintAreaM2,
        'total_cost': totalCost,
      };
}

class CalculationAuditStep {
  final String itemId;
  final String itemName;
  final String category; // 'masonry' | 'concrete' | 'steel' | 'finishes' | 'earthwork'
  final String unit;
  final String formula;
  final Map<String, dynamic> inputValues;
  final List<String> intermediateSteps;
  final double finalValue;
  final String isCodeReference;
  final double confidence;

  const CalculationAuditStep({
    required this.itemId,
    required this.itemName,
    required this.category,
    required this.unit,
    required this.formula,
    required this.inputValues,
    required this.intermediateSteps,
    required this.finalValue,
    required this.isCodeReference,
    required this.confidence,
  });

  factory CalculationAuditStep.fromJson(Map<String, dynamic> json) {
    return CalculationAuditStep(
      itemId: json['item_id'] as String? ?? '',
      itemName: json['item_name'] as String? ?? '',
      category: json['category'] as String? ?? 'masonry',
      unit: json['unit'] as String? ?? '',
      formula: json['formula'] as String? ?? '',
      inputValues: (json['input_values'] as Map<String, dynamic>?) ?? {},
      intermediateSteps: (json['intermediate_steps'] as List?)?.map((e) => e.toString()).toList() ?? [],
      finalValue: (json['final_value'] as num?)?.toDouble() ?? 0.0,
      isCodeReference: json['is_code_reference'] as String? ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.95,
    );
  }

  Map<String, dynamic> toJson() => {
        'item_id': itemId,
        'item_name': itemName,
        'category': category,
        'unit': unit,
        'formula': formula,
        'input_values': inputValues,
        'intermediate_steps': intermediateSteps,
        'final_value': finalValue,
        'is_code_reference': isCodeReference,
        'confidence': confidence,
      };
}

class RoomTakeoff {
  final String roomId;
  final String label;
  final double areaM2;
  final double wallAreaM2;
  final double wallVolumeM3;
  final int bricksCount;
  final int cementBags;
  final double sandVolumeM3;
  final double plasterM2;
  final int paintLiters;
  final double tilesAreaM2;
  final int tilesBoxes;
  final double totalCost;

  const RoomTakeoff({
    required this.roomId,
    required this.label,
    required this.areaM2,
    required this.wallAreaM2,
    required this.wallVolumeM3,
    required this.bricksCount,
    required this.cementBags,
    required this.sandVolumeM3,
    required this.plasterM2,
    required this.paintLiters,
    required this.tilesAreaM2,
    required this.tilesBoxes,
    required this.totalCost,
  });

  factory RoomTakeoff.fromJson(Map<String, dynamic> json) {
    return RoomTakeoff(
      roomId: json['room_id'] as String? ?? '',
      label: json['label'] as String? ?? '',
      areaM2: (json['area_m2'] as num?)?.toDouble() ?? 0.0,
      wallAreaM2: (json['wall_area_m2'] as num?)?.toDouble() ?? 0.0,
      wallVolumeM3: (json['wall_volume_m3'] as num?)?.toDouble() ?? 0.0,
      bricksCount: (json['bricks_count'] as num?)?.toInt() ?? 0,
      cementBags: (json['cement_bags'] as num?)?.toInt() ?? 0,
      sandVolumeM3: (json['sand_volume_m3'] as num?)?.toDouble() ?? 0.0,
      plasterM2: (json['plaster_m2'] as num?)?.toDouble() ?? 0.0,
      paintLiters: (json['paint_liters'] as num?)?.toInt() ?? 0,
      tilesAreaM2: (json['tiles_area_m2'] as num?)?.toDouble() ?? 0.0,
      tilesBoxes: (json['tiles_boxes'] as num?)?.toInt() ?? 0,
      totalCost: (json['total_cost'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'room_id': roomId,
        'label': label,
        'area_m2': areaM2,
        'wall_area_m2': wallAreaM2,
        'wall_volume_m3': wallVolumeM3,
        'bricks_count': bricksCount,
        'cement_bags': cementBags,
        'sand_volume_m3': sandVolumeM3,
        'plaster_m2': plasterM2,
        'paint_liters': paintLiters,
        'tiles_area_m2': tilesAreaM2,
        'tiles_boxes': tilesBoxes,
        'total_cost': totalCost,
      };
}

class MaterialsSummary {
  final double netWallVolumeM3;
  final double netWallAreaM2;
  final double mortarVolumeM3;
  final double concreteVolume;
  final double excavationVolume;
  final double formworkArea;
  final double plasterArea;
  final double paintArea;
  final double tilesArea;
  final double waterproofingArea;

  final int cementMasonryBags;
  final int cementPlasterBags;
  final int cementRccBags;
  final int cementFlooringBags;

  final double sandMasonryM3;
  final double sandPlasterM3;
  final double sandRccM3;

  final double concreteSlabsM3;
  final double concreteColumnsM3;
  final double concreteBeamsM3;
  final double concreteFootingsM3;
  final double concreteStairsM3;

  final int bricksCount;
  final int blocksCount;
  final int cementBags;
  final double sandVolume;
  final double aggregateVolume;
  final double steelWeight;
  final int tilesBoxes;
  final int paintLiters;
  final double adhesiveKg;
  final double groutKg;

  final int doorsCount;
  final int windowsCount;

  const MaterialsSummary({
    required this.netWallVolumeM3,
    required this.netWallAreaM2,
    required this.mortarVolumeM3,
    required this.concreteVolume,
    required this.excavationVolume,
    required this.formworkArea,
    required this.plasterArea,
    required this.paintArea,
    required this.tilesArea,
    required this.waterproofingArea,
    required this.cementMasonryBags,
    required this.cementPlasterBags,
    required this.cementRccBags,
    required this.cementFlooringBags,
    required this.sandMasonryM3,
    required this.sandPlasterM3,
    required this.sandRccM3,
    required this.concreteSlabsM3,
    required this.concreteColumnsM3,
    required this.concreteBeamsM3,
    required this.concreteFootingsM3,
    required this.concreteStairsM3,
    required this.bricksCount,
    required this.blocksCount,
    required this.cementBags,
    required this.sandVolume,
    required this.aggregateVolume,
    required this.steelWeight,
    required this.tilesBoxes,
    required this.paintLiters,
    required this.adhesiveKg,
    required this.groutKg,
    required this.doorsCount,
    required this.windowsCount,
  });

  factory MaterialsSummary.fromJson(Map<String, dynamic> json) {
    return MaterialsSummary(
      netWallVolumeM3: (json['net_wall_volume_m3'] as num?)?.toDouble() ?? 0.0,
      netWallAreaM2: (json['net_wall_area_m2'] as num?)?.toDouble() ?? 0.0,
      mortarVolumeM3: (json['mortar_volume_m3'] as num?)?.toDouble() ?? 0.0,
      concreteVolume: (json['concrete_volume'] as num?)?.toDouble() ?? 0.0,
      excavationVolume: (json['excavation_volume'] as num?)?.toDouble() ?? 0.0,
      formworkArea: (json['formwork_area'] as num?)?.toDouble() ?? 0.0,
      plasterArea: (json['plaster_area'] as num?)?.toDouble() ?? 0.0,
      paintArea: (json['paint_area'] as num?)?.toDouble() ?? 0.0,
      tilesArea: (json['tiles_area'] as num?)?.toDouble() ?? 0.0,
      waterproofingArea: (json['waterproofing_area'] as num?)?.toDouble() ?? 0.0,
      cementMasonryBags: (json['cement_masonry_bags'] as num?)?.toInt() ?? 0,
      cementPlasterBags: (json['cement_plaster_bags'] as num?)?.toInt() ?? 0,
      cementRccBags: (json['cement_rcc_bags'] as num?)?.toInt() ?? 0,
      cementFlooringBags: (json['cement_flooring_bags'] as num?)?.toInt() ?? 0,
      sandMasonryM3: (json['sand_masonry_m3'] as num?)?.toDouble() ?? 0.0,
      sandPlasterM3: (json['sand_plaster_m3'] as num?)?.toDouble() ?? 0.0,
      sandRccM3: (json['sand_rcc_m3'] as num?)?.toDouble() ?? 0.0,
      concreteSlabsM3: (json['concrete_slabs_m3'] as num?)?.toDouble() ?? 0.0,
      concreteColumnsM3: (json['concrete_columns_m3'] as num?)?.toDouble() ?? 0.0,
      concreteBeamsM3: (json['concrete_beams_m3'] as num?)?.toDouble() ?? 0.0,
      concreteFootingsM3: (json['concrete_footings_m3'] as num?)?.toDouble() ?? 0.0,
      concreteStairsM3: (json['concrete_stairs_m3'] as num?)?.toDouble() ?? 0.0,
      bricksCount: (json['bricks_count'] as num?)?.toInt() ?? 0,
      blocksCount: (json['blocks_count'] as num?)?.toInt() ?? 0,
      cementBags: (json['cement_bags'] as num?)?.toInt() ?? 0,
      sandVolume: (json['sand_volume'] as num?)?.toDouble() ?? 0.0,
      aggregateVolume: (json['aggregate_volume'] as num?)?.toDouble() ?? 0.0,
      steelWeight: (json['steel_weight'] as num?)?.toDouble() ?? 0.0,
      tilesBoxes: (json['tiles_boxes'] as num?)?.toInt() ?? 0,
      paintLiters: (json['paint_liters'] as num?)?.toInt() ?? 0,
      adhesiveKg: (json['adhesive_kg'] as num?)?.toDouble() ?? 0.0,
      groutKg: (json['grout_kg'] as num?)?.toDouble() ?? 0.0,
      doorsCount: (json['doors_count'] as num?)?.toInt() ?? 0,
      windowsCount: (json['windows_count'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'net_wall_volume_m3': netWallVolumeM3,
        'net_wall_area_m2': netWallAreaM2,
        'mortar_volume_m3': mortarVolumeM3,
        'concrete_volume': concreteVolume,
        'excavation_volume': excavationVolume,
        'formwork_area': formworkArea,
        'plaster_area': plasterArea,
        'paint_area': paintArea,
        'tiles_area': tilesArea,
        'waterproofing_area': waterproofingArea,
        'cement_masonry_bags': cementMasonryBags,
        'cement_plaster_bags': cementPlasterBags,
        'cement_rcc_bags': cementRccBags,
        'cement_flooring_bags': cementFlooringBags,
        'sand_masonry_m3': sandMasonryM3,
        'sand_plaster_m3': sandPlasterM3,
        'sand_rcc_m3': sandRccM3,
        'concrete_slabs_m3': concreteSlabsM3,
        'concrete_columns_m3': concreteColumnsM3,
        'concrete_beams_m3': concreteBeamsM3,
        'concrete_footings_m3': concreteFootingsM3,
        'concrete_stairs_m3': concreteStairsM3,
        'bricks_count': bricksCount,
        'blocks_count': blocksCount,
        'cement_bags': cementBags,
        'sand_volume': sandVolume,
        'aggregate_volume': aggregateVolume,
        'steel_weight': steelWeight,
        'tiles_boxes': tilesBoxes,
        'paint_liters': paintLiters,
        'adhesive_kg': adhesiveKg,
        'grout_kg': groutKg,
        'doors_count': doorsCount,
        'windows_count': windowsCount,
      };
}

class CostBreakdown {
  final double brickCost;
  final double blockCost;
  final double cementCost;
  final double sandCost;
  final double aggregateCost;
  final double steelCost;
  final double plasterCost;
  final double paintCost;
  final double tilesCost;
  final double waterproofingCost;
  final double excavationCost;
  final double labourCost;
  final double equipmentCost;
  final double transportCost;

  final double totalMaterialCost;
  final double contractorMargin;
  final double contingency;
  final double gstAmount;
  final double grandTotal;

  const CostBreakdown({
    required this.brickCost,
    required this.blockCost,
    required this.cementCost,
    required this.sandCost,
    required this.aggregateCost,
    required this.steelCost,
    required this.plasterCost,
    required this.paintCost,
    required this.tilesCost,
    required this.waterproofingCost,
    required this.excavationCost,
    required this.labourCost,
    required this.equipmentCost,
    required this.transportCost,
    required this.totalMaterialCost,
    required this.contractorMargin,
    required this.contingency,
    required this.gstAmount,
    required this.grandTotal,
  });

  factory CostBreakdown.fromJson(Map<String, dynamic> json) {
    return CostBreakdown(
      brickCost: (json['brick_cost'] as num?)?.toDouble() ?? 0.0,
      blockCost: (json['block_cost'] as num?)?.toDouble() ?? 0.0,
      cementCost: (json['cement_cost'] as num?)?.toDouble() ?? 0.0,
      sandCost: (json['sand_cost'] as num?)?.toDouble() ?? 0.0,
      aggregateCost: (json['aggregate_cost'] as num?)?.toDouble() ?? 0.0,
      steelCost: (json['steel_cost'] as num?)?.toDouble() ?? 0.0,
      plasterCost: (json['plaster_cost'] as num?)?.toDouble() ?? 0.0,
      paintCost: (json['paint_cost'] as num?)?.toDouble() ?? 0.0,
      tilesCost: (json['tiles_cost'] as num?)?.toDouble() ?? 0.0,
      waterproofingCost: (json['waterproofing_cost'] as num?)?.toDouble() ?? 0.0,
      excavationCost: (json['excavation_cost'] as num?)?.toDouble() ?? 0.0,
      labourCost: (json['labour_cost'] as num?)?.toDouble() ?? 0.0,
      equipmentCost: (json['equipment_cost'] as num?)?.toDouble() ?? 0.0,
      transportCost: (json['transport_cost'] as num?)?.toDouble() ?? 0.0,
      totalMaterialCost: (json['total_material_cost'] as num?)?.toDouble() ?? 0.0,
      contractorMargin: (json['contractor_margin'] as num?)?.toDouble() ?? 0.0,
      contingency: (json['contingency'] as num?)?.toDouble() ?? 0.0,
      gstAmount: (json['gst_amount'] as num?)?.toDouble() ?? 0.0,
      grandTotal: (json['grand_total'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'brick_cost': brickCost,
        'block_cost': blockCost,
        'cement_cost': cementCost,
        'sand_cost': sandCost,
        'aggregate_cost': aggregateCost,
        'steel_cost': steelCost,
        'plaster_cost': plasterCost,
        'paint_cost': paintCost,
        'tiles_cost': tilesCost,
        'waterproofing_cost': waterproofingCost,
        'excavation_cost': excavationCost,
        'labour_cost': labourCost,
        'equipment_cost': equipmentCost,
        'transport_cost': transportCost,
        'total_material_cost': totalMaterialCost,
        'contractor_margin': contractorMargin,
        'contingency': contingency,
        'gst_amount': gstAmount,
        'grand_total': grandTotal,
      };
}

class FloorPlanAnalysisResult {
  final String id;
  final String planId;
  final String projectId;
  final List<AIRoom> rooms;
  final List<AIWall> walls;
  final List<AIDoor> doors;
  final List<AIWindow> windows;
  final List<AIColumn> columns;
  final double totalAreaM2;
  final double totalAreaSqft;
  final int roomCount;
  final int doorCount;
  final int windowCount;
  final int wallCount;
  final int columnCount;
  final double floorHeightM;
  final double wallThicknessM;
  final double overallConfidence;

  const FloorPlanAnalysisResult({
    required this.id,
    required this.planId,
    required this.projectId,
    this.rooms = const [],
    this.walls = const [],
    this.doors = const [],
    this.windows = const [],
    this.columns = const [],
    this.totalAreaM2 = 0.0,
    this.totalAreaSqft = 0.0,
    this.roomCount = 0,
    this.doorCount = 0,
    this.windowCount = 0,
    this.wallCount = 0,
    this.columnCount = 0,
    this.floorHeightM = 3.0,
    this.wallThicknessM = 0.23,
    this.overallConfidence = 0.90,
  });

  factory FloorPlanAnalysisResult.fromJson(Map<String, dynamic> json) {
    final roomsRaw = json['rooms'] as List? ?? [];
    final wallsRaw = json['walls'] as List? ?? [];
    final doorsRaw = json['doors'] as List? ?? [];
    final windowsRaw = json['windows'] as List? ?? [];
    final columnsRaw = json['columns'] as List? ?? [];

    final rooms = roomsRaw.map((r) => AIRoom.fromJson(r as Map<String, dynamic>)).toList();
    final walls = wallsRaw.map((w) => AIWall.fromJson(w as Map<String, dynamic>)).toList();
    final doors = doorsRaw.map((d) => AIDoor.fromJson(d as Map<String, dynamic>)).toList();
    final windows = windowsRaw.map((w) => AIWindow.fromJson(w as Map<String, dynamic>)).toList();
    final columns = columnsRaw.map((c) => AIColumn.fromJson(c as Map<String, dynamic>)).toList();

    final double areaM2 = (json['total_area_m2'] as num?)?.toDouble() ??
        rooms.fold<double>(0.0, (sum, r) => sum + r.areaM2);
    final double areaSqft = (json['total_area_sqft'] as num?)?.toDouble() ??
        (areaM2 > 0 ? areaM2 * 10.7639 : 0.0);

    return FloorPlanAnalysisResult(
      id: json['id'] as String? ?? '',
      planId: json['plan_id'] as String? ?? json['id'] as String? ?? '',
      projectId: json['project_id'] as String? ?? '',
      rooms: rooms,
      walls: walls,
      doors: doors,
      windows: windows,
      columns: columns,
      totalAreaM2: areaM2,
      totalAreaSqft: areaSqft,
      roomCount: (json['room_count'] as num?)?.toInt() ?? rooms.length,
      doorCount: (json['door_count'] as num?)?.toInt() ?? doors.length,
      windowCount: (json['window_count'] as num?)?.toInt() ?? windows.length,
      wallCount: (json['wall_count'] as num?)?.toInt() ?? walls.length,
      columnCount: (json['column_count'] as num?)?.toInt() ?? columns.length,
      floorHeightM: (json['floor_height_m'] as num?)?.toDouble() ?? 3.0,
      wallThicknessM: (json['wall_thickness_m'] as num?)?.toDouble() ?? 0.23,
      overallConfidence: (json['overall_confidence'] as num?)?.toDouble() ?? 0.90,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'plan_id': planId,
        'project_id': projectId,
        'rooms': rooms.map((r) => r.toJson()).toList(),
        'walls': walls.map((w) => w.toJson()).toList(),
        'doors': doors.map((d) => d.toJson()).toList(),
        'windows': windows.map((w) => w.toJson()).toList(),
        'columns': columns.map((c) => c.toJson()).toList(),
        'total_area_m2': totalAreaM2,
        'total_area_sqft': totalAreaSqft,
        'room_count': roomCount,
        'door_count': doorCount,
        'window_count': windowCount,
        'wall_count': wallCount,
        'column_count': columnCount,
        'floor_height_m': floorHeightM,
        'wall_thickness_m': wallThicknessM,
        'overall_confidence': overallConfidence,
      };
}

class EstimationResult {
  final String id;
  final String projectId;
  final String createdAt;
  final TakeoffParams userInputs;
  final MaterialsSummary materials;
  final CostBreakdown costBreakdown;
  final List<RoomTakeoff> roomTakeoffs;
  final List<WallTakeoff> wallTakeoffs;
  final List<CalculationAuditStep> calculationAudits;
  final double totalCost;
  final String currency;
  final List<String> assumptions;
  final double confidenceScore;
  final Map<String, String> dataSource;

  const EstimationResult({
    required this.id,
    required this.projectId,
    required this.createdAt,
    required this.userInputs,
    required this.materials,
    required this.costBreakdown,
    this.roomTakeoffs = const [],
    this.wallTakeoffs = const [],
    this.calculationAudits = const [],
    required this.totalCost,
    this.currency = 'INR',
    this.assumptions = const [],
    this.confidenceScore = 0.90,
    this.dataSource = const {},
  });

  factory EstimationResult.fromJson(Map<String, dynamic> json) {
    return EstimationResult(
      id: json['id'] as String? ?? '',
      projectId: json['project_id'] as String? ?? '',
      createdAt: json['created_at'] as String? ?? DateTime.now().toIso8601String(),
      userInputs: TakeoffParams.fromJson(json['user_inputs'] as Map<String, dynamic>? ?? {}),
      materials: MaterialsSummary.fromJson(json['materials'] as Map<String, dynamic>? ?? {}),
      costBreakdown: CostBreakdown.fromJson(json['cost_breakdown'] as Map<String, dynamic>? ?? {}),
      roomTakeoffs: (json['room_takeoffs'] as List?)
              ?.map((e) => RoomTakeoff.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      wallTakeoffs: (json['wall_takeoffs'] as List?)
              ?.map((e) => WallTakeoff.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      calculationAudits: (json['calculation_audits'] as List?)
              ?.map((e) => CalculationAuditStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalCost: (json['total_cost'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'INR',
      assumptions: (json['assumptions'] as List?)?.map((e) => e.toString()).toList() ?? [],
      confidenceScore: (json['confidence_score'] as num?)?.toDouble() ?? 0.90,
      dataSource: (json['data_source'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, v.toString()),
          ) ??
          {},
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'project_id': projectId,
        'created_at': createdAt,
        'user_inputs': userInputs.toJson(),
        'materials': materials.toJson(),
        'cost_breakdown': costBreakdown.toJson(),
        'room_takeoffs': roomTakeoffs.map((r) => r.toJson()).toList(),
        'wall_takeoffs': wallTakeoffs.map((w) => w.toJson()).toList(),
        'calculation_audits': calculationAudits.map((a) => a.toJson()).toList(),
        'total_cost': totalCost,
        'currency': currency,
        'assumptions': assumptions,
        'confidence_score': confidenceScore,
        'data_source': dataSource,
      };
}
