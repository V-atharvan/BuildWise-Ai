class BuildingParams {
  final String buildingType;
  final int floors;
  final double wallThicknessMm;
  final double floorHeightM;
  final String concreteGrade;
  final String steelGrade;
  final String foundationType;
  final double slabThicknessMm;
  final String brickType;
  final double plasterThicknessMm;
  final String paintType;
  final String tileType;
  final double wastePercentage;
  final String location;
  
  // Confirmed parameters from AI detection
  final double wallLengthM;
  final int roomCount;
  final int doorCount;
  final int windowCount;

  const BuildingParams({
    required this.buildingType,
    this.floors = 1,
    this.wallThicknessMm = 230.0,
    this.floorHeightM = 3.0,
    this.concreteGrade = 'M20',
    this.steelGrade = 'Fe500',
    this.foundationType = 'Isolated Footing',
    this.slabThicknessMm = 125.0,
    this.brickType = 'Red Clay Bricks',
    this.plasterThicknessMm = 12.0,
    this.paintType = 'Emulsion Paint',
    this.tileType = 'Ceramic Tiles',
    this.wastePercentage = 5.0,
    this.location = 'Mumbai',
    required this.wallLengthM,
    required this.roomCount,
    required this.doorCount,
    required this.windowCount,
  });

  Map<String, dynamic> toJson() {
    return {
      'building_type': buildingType,
      'floors': floors,
      'wall_thickness_mm': wallThicknessMm,
      'floor_height_m': floorHeightM,
      'concrete_grade': concreteGrade,
      'steel_grade': steelGrade,
      'foundation_type': foundationType,
      'slab_thickness_mm': slabThicknessMm,
      'brick_type': brickType,
      'plaster_thickness_mm': plasterThicknessMm,
      'paint_type': paintType,
      'tile_type': tileType,
      'waste_percentage': wastePercentage,
      'location': location,
      'wall_length_m': wallLengthM,
      'room_count': roomCount,
      'door_count': doorCount,
      'window_count': windowCount,
    };
  }
}
