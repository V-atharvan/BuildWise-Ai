import 'package:flutter_test/flutter_test.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/features/editor/domain/editor_integration_service.dart';
import 'package:buildwise_app/features/editor/presentation/providers/editor_state.dart';
import 'package:buildwise_app/features/editor/presentation/providers/editor_notifier.dart';

void main() {
  group('Editor Integration & Live BOQ Recalculation Tests', () {
    late FloorPlanAnalysisResult samplePlan;

    setUp(() {
      const room1 = AIRoom(
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

      const wall1 = AIWall(
        id: 'w1',
        start: [0.0, 0.0],
        end: [5.0, 0.0],
        lengthPx: 200.0,
        lengthM: 5.0,
        thicknessPx: 15.0,
        thicknessM: 0.23,
      );

      samplePlan = const FloorPlanAnalysisResult(
        id: 'plan_test',
        planId: 'plan_test',
        projectId: 'proj_test',
        rooms: [room1],
        walls: [wall1],
        totalAreaM2: 20.0,
        totalAreaSqft: 215.28,
      );
    });

    test('EditorIntegrationService recalculates project BOQ, validation, and confidence', () {
      final res = EditorIntegrationService.recalculateProject(samplePlan);

      expect(res.estimation.costBreakdown.grandTotal, greaterThan(0));
      expect(res.validation.overallHealthScore, greaterThanOrEqualTo(90));
      expect(res.confidence.overallConfidence, greaterThan(0.90));
    });

    test('EditorNotifier updates wall thickness and triggers live BOQ recalculation', () {
      final notifier = EditorNotifier(samplePlan);
      final initialCost = notifier.debugState.estimation!.costBreakdown.grandTotal;

      // Update wall thickness from 0.23m to 0.115m
      notifier.updateWallThickness('w1', 0.115);

      final updatedCost = notifier.debugState.estimation!.costBreakdown.grandTotal;
      expect(updatedCost, isNot(equals(initialCost)));
      expect(notifier.debugState.plan.walls.first.thicknessM, equals(0.115));
    });

    test('EditorNotifier updates room label and type', () {
      final notifier = EditorNotifier(samplePlan);

      notifier.updateRoomLabel('r1', 'Master Suite');
      expect(notifier.debugState.plan.rooms.first.label, equals('Master Suite'));

      notifier.updateRoomType('r1', 'master_bedroom');
      expect(notifier.debugState.plan.rooms.first.roomType, equals('master_bedroom'));
    });

    test('EditorNotifier Undo and Redo restores exact BOQ calculations', () {
      final notifier = EditorNotifier(samplePlan);
      final initialCost = notifier.debugState.estimation!.costBreakdown.grandTotal;

      notifier.updateWallThickness('w1', 0.115);
      expect(notifier.debugState.estimation!.costBreakdown.grandTotal, isNot(equals(initialCost)));

      notifier.undo();
      expect(notifier.debugState.estimation!.costBreakdown.grandTotal, equals(initialCost));

      notifier.redo();
      expect(notifier.debugState.estimation!.costBreakdown.grandTotal, isNot(equals(initialCost)));
    });

    test('Deleting selected room updates room count and BOQ', () {
      final notifier = EditorNotifier(samplePlan);
      notifier.selectElement('r1', 'room');

      notifier.deleteSelectedElement();

      expect(notifier.debugState.plan.rooms.isEmpty, isTrue);
      expect(notifier.debugState.plan.roomCount, equals(0));
    });
  });
}

extension _EditorNotifierDebug on EditorNotifier {
  EditorState get debugState => state;
}
