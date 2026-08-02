import 'package:flutter_test/flutter_test.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/features/analysis/domain/confidence_engine.dart';

void main() {
  group('Confidence Engine Tests', () {
    test('calculateProjectConfidence calculates weighted aggregate confidence score', () {
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

      const plan = FloorPlanAnalysisResult(
        id: 'plan_1',
        planId: 'plan_1',
        projectId: 'proj_1',
        rooms: [room],
        walls: [wall],
        totalAreaM2: 20.0,
        totalAreaSqft: 215.28,
      );

      final confReport = calculateProjectConfidence(plan);
      expect(confReport.overallConfidence, greaterThan(0.90));
      expect(confReport.wallConfidence, equals(0.98));
      expect(confReport.roomConfidence, equals(0.98));
      expect(confReport.breakdown.length, equals(6));
      expect(confReport.breakdown.first.rating, equals('High'));
    });
  });
}
