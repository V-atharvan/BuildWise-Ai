import 'package:flutter_test/flutter_test.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/features/analysis/domain/validation_engine.dart';
import 'package:buildwise_app/domain/estimation_engine.dart';

void main() {
  group('Validation Engine Tests', () {
    late FloorPlanAnalysisResult samplePlan;

    setUp(() {
      const room = AIRoom(
        id: 'r1',
        label: 'Living Room',
        roomType: 'living_room',
        polygon: [
          [0.0, 0.0],
          [5.0, 0.0],
          [5.0, 4.0],
          [0.0, 4.0]
        ],
        centroid: [2.5, 2.0],
        boundingBox: [0.0, 0.0, 5.0, 4.0],
        areaM2: 20.0,
        areaSqft: 215.28,
        perimeterM: 18.0,
        lengthM: 5.0,
        widthM: 4.0,
        aspectRatio: 1.25,
        classification: RoomClassification(
          classifiedLabel: 'Living Room',
          roomType: 'living_room',
          confidence: RoomConfidenceScore(overall: 0.95),
        ),
      );

      const wall = AIWall(
        id: 'w1',
        start: [0.0, 0.0],
        end: [5.0, 0.0],
        lengthPx: 200.0,
        lengthM: 5.0,
        thicknessPx: 15.0,
        thicknessM: 0.23,
      );

      samplePlan = const FloorPlanAnalysisResult(
        id: 'plan_1',
        planId: 'plan_1',
        projectId: 'proj_1',
        rooms: [room],
        walls: [wall],
        totalAreaM2: 20.0,
        totalAreaSqft: 215.28,
      );
    });

    test('validateFloorPlanGeometry detects zero area or invalid thickness', () {
      final report = validateFloorPlanGeometry(samplePlan);
      expect(report.isValid, isTrue);
      expect(report.criticalCount, equals(0));
      expect(report.overallHealthScore, equals(100));
    });

    test('validateSevenLayers checks cost balance identity', () {
      const params = TakeoffParams(buildingType: 'house');
      final estimation = EstimationEngine.calculateTakeoff(samplePlan, params);

      final sevenReport = validateSevenLayers(samplePlan, estimation);
      expect(sevenReport.isExportReady, isTrue);
      expect(sevenReport.moduleScores.length, equals(6));
      expect(sevenReport.structuralAssumptions.length, equals(5));
    });

    test('validateComprehensivePipeline returns 10-module complete validation', () {
      const params = TakeoffParams(buildingType: 'house');
      final estimation = EstimationEngine.calculateTakeoff(samplePlan, params);

      final compResult = validateComprehensivePipeline(samplePlan, estimation);
      expect(compResult.isExportReady, isTrue);
      expect(compResult.domainConfidence.overallConfidence, equals(97.0));
      expect(compResult.categorizedWarnings.length, equals(2));
      expect(compResult.toleranceChecks.length, equals(4));
    });
  });
}
