import '../../../models/estimation_result.dart';
import '../../../domain/estimation_engine.dart';
import '../domain/shared_node_graph.dart';
import '../../analysis/domain/validation_engine.dart';
import '../../analysis/domain/confidence_engine.dart';

class EditorIntegrationResult {
  final FloorPlanAnalysisResult updatedPlan;
  final EstimationResult estimation;
  final SevenLayerValidationReport validation;
  final ComprehensiveValidationResult comprehensiveValidation;
  final ProjectConfidenceReport confidence;

  const EditorIntegrationResult({
    required this.updatedPlan,
    required this.estimation,
    required this.validation,
    required this.comprehensiveValidation,
    required this.confidence,
  });
}

class EditorIntegrationService {
  static EditorIntegrationResult recalculateProject(
    FloorPlanAnalysisResult plan, [
    TakeoffParams? params,
  ]) {
    final takeoffParams = params ??
        const TakeoffParams(
          buildingType: 'house',
          numFloors: 1,
          floorHeight: 3.0,
          wallThickness: 0.23,
          slabThickness: 0.12,
          concreteGrade: 'M20',
          steelGrade: 'Fe500',
          mortarRatio: '1:5',
          brickType: 'red_brick',
          wastePercentage: 5.0,
        );

    // 1. Shared Node Topology Synchronization
    final syncedWalls = syncCoincidentRoomWalls(plan.rooms, plan.walls, 15.0);

    final syncedPlan = FloorPlanAnalysisResult(
      id: plan.id,
      planId: plan.planId,
      projectId: plan.projectId,
      rooms: plan.rooms,
      walls: syncedWalls,
      doors: plan.doors,
      windows: plan.windows,
      columns: plan.columns,
      totalAreaM2: plan.rooms.fold(0.0, (s, r) => s + r.areaM2),
      totalAreaSqft: plan.rooms.fold(0.0, (s, r) => s + r.areaSqft),
      roomCount: plan.rooms.length,
      doorCount: plan.doors.length,
      windowCount: plan.windows.length,
      wallCount: syncedWalls.length,
      columnCount: plan.columns.length,
      floorHeightM: plan.floorHeightM,
      wallThicknessM: plan.wallThicknessM,
      overallConfidence: plan.overallConfidence,
    );

    // 2. Estimation Takeoff Engine
    final estimation = EstimationEngine.calculateTakeoff(syncedPlan, takeoffParams);

    // 3. Validation Engine
    final validation = validateSevenLayers(syncedPlan, estimation);
    final comprehensive = validateComprehensivePipeline(syncedPlan, estimation);

    // 4. Confidence Engine
    final confidence = calculateProjectConfidence(syncedPlan);

    return EditorIntegrationResult(
      updatedPlan: syncedPlan,
      estimation: estimation,
      validation: validation,
      comprehensiveValidation: comprehensive,
      confidence: confidence,
    );
  }
}
