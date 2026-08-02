import 'package:flutter_test/flutter_test.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/ai_door.dart';
import 'package:buildwise_app/models/ai_window.dart';
import 'package:buildwise_app/models/ai_column.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/domain/estimation_engine.dart';

void main() {
  group('AI Data Models Tests', () {
    test('AIRoom.fromJson and toJson roundtrip', () {
      final json = {
        'id': 'r1',
        'label': 'Living Room',
        'room_type': 'living_room',
        'polygon': [
          [0.0, 0.0],
          [5.0, 0.0],
          [5.0, 4.0],
          [0.0, 4.0]
        ],
        'centroid': [2.5, 2.0],
        'bounding_box': [0.0, 0.0, 5.0, 4.0],
        'area_m2': 20.0,
        'area_sqft': 215.28,
        'perimeter_m': 18.0,
        'length_m': 5.0,
        'width_m': 4.0,
        'aspect_ratio': 1.25,
        'floor_height_m': 3.0,
        'classification': {
          'classified_label': 'Living Room',
          'room_type': 'living_room',
          'confidence': {'overall': 0.95},
          'low_confidence_flag': false,
          'flag_level': 'ok',
          'reason': 'High confidence',
          'all_candidates': {'Living Room': 0.95},
          'needs_user_confirmation': false
        },
        'adjacent_room_ids': ['r2'],
        'door_ids': ['d1'],
        'window_ids': ['w1'],
        'wall_ids': ['wall1'],
      };

      final room = AIRoom.fromJson(json);
      expect(room.id, 'r1');
      expect(room.label, 'Living Room');
      expect(room.areaM2, 20.0);
      expect(room.classification.confidence.overall, 0.95);

      final exportedJson = room.toJson();
      expect(exportedJson['id'], 'r1');
      expect(exportedJson['area_m2'], 20.0);
    });

    test('AIWall.fromJson and toJson roundtrip', () {
      final json = {
        'id': 'w1',
        'start': [0.0, 0.0],
        'end': [5.0, 0.0],
        'length_px': 250.0,
        'length_m': 5.0,
        'thickness_px': 15.0,
        'thickness_m': 0.23,
        'wall_type': 'external',
        'room_ids': ['r1'],
        'door_ids': ['d1'],
        'window_ids': [],
        'is_structural': true,
        'confidence': 0.98,
      };

      final wall = AIWall.fromJson(json);
      expect(wall.id, 'w1');
      expect(wall.lengthM, 5.0);
      expect(wall.thicknessM, 0.23);
      expect(wall.isStructural, true);

      final exported = wall.toJson();
      expect(exported['id'], 'w1');
      expect(exported['thickness_m'], 0.23);
    });
  });

  group('Estimation Engine Deterministic Formulas Tests', () {
    late FloorPlanAnalysisResult samplePlan;

    setUp(() {
      final rooms = [
        const AIRoom(
          id: 'r1',
          label: 'Living Room',
          roomType: 'living_room',
          polygon: [
            [0.0, 0.0],
            [6.0, 0.0],
            [6.0, 4.0],
            [0.0, 4.0]
          ],
          centroid: [3.0, 2.0],
          boundingBox: [0.0, 0.0, 6.0, 4.0],
          areaM2: 24.0,
          areaSqft: 258.33,
          perimeterM: 20.0,
          lengthM: 6.0,
          widthM: 4.0,
          aspectRatio: 1.5,
          classification: RoomClassification(
            classifiedLabel: 'Living Room',
            roomType: 'living_room',
            confidence: RoomConfidenceScore(overall: 0.95),
          ),
        ),
        const AIRoom(
          id: 'r2',
          label: 'Master Bedroom',
          roomType: 'master_bedroom',
          polygon: [
            [6.0, 0.0],
            [10.0, 0.0],
            [10.0, 4.0],
            [6.0, 4.0]
          ],
          centroid: [8.0, 2.0],
          boundingBox: [6.0, 0.0, 4.0, 4.0],
          areaM2: 16.0,
          areaSqft: 172.22,
          perimeterM: 16.0,
          lengthM: 4.0,
          widthM: 4.0,
          aspectRatio: 1.0,
          classification: RoomClassification(
            classifiedLabel: 'Master Bedroom',
            roomType: 'master_bedroom',
            confidence: RoomConfidenceScore(overall: 0.92),
          ),
        ),
      ];

      final walls = [
        const AIWall(
          id: 'wall1',
          start: [0.0, 0.0],
          end: [10.0, 0.0],
          lengthPx: 500.0,
          lengthM: 10.0,
          thicknessPx: 15.0,
          thicknessM: 0.23,
          wallType: 'external',
          roomIds: ['r1', 'r2'],
          doorIds: ['d1'],
        ),
        const AIWall(
          id: 'wall2',
          start: [0.0, 4.0],
          end: [10.0, 4.0],
          lengthPx: 500.0,
          lengthM: 10.0,
          thicknessPx: 15.0,
          thicknessM: 0.23,
          wallType: 'external',
          roomIds: ['r1', 'r2'],
        ),
      ];

      final doors = [
        const AIDoor(
          id: 'd1',
          wallId: 'wall1',
          roomId: 'r1',
          center: [3.0, 0.0],
          widthM: 0.9,
          heightM: 2.1,
        )
      ];

      final windows = [
        const AIWindow(
          id: 'win1',
          wallId: 'wall2',
          roomId: 'r1',
          center: [3.0, 4.0],
          widthM: 1.2,
          heightM: 1.2,
        )
      ];

      final columns = [
        const AIColumn(id: 'col1', center: [0.0, 0.0]),
        const AIColumn(id: 'col2', center: [10.0, 0.0]),
        const AIColumn(id: 'col3', center: [0.0, 4.0]),
        const AIColumn(id: 'col4', center: [10.0, 4.0]),
      ];

      samplePlan = FloorPlanAnalysisResult(
        id: 'plan_101',
        planId: 'plan_101',
        projectId: 'proj_101',
        rooms: rooms,
        walls: walls,
        doors: doors,
        windows: windows,
        columns: columns,
        totalAreaM2: 40.0,
        totalAreaSqft: 430.55,
      );
    });

    test('Red Clay Brick Takeoff Calculation', () {
      const params = TakeoffParams(
        buildingType: 'house',
        numFloors: 1,
        floorHeight: 3.0,
        brickType: 'red_brick',
        concreteGrade: 'M20',
        steelGrade: 'Fe500',
        wastePercentage: 5.0,
      );

      final result = EstimationEngine.calculateTakeoff(samplePlan, params);

      expect(result.materials.bricksCount, greaterThan(0));
      expect(result.materials.blocksCount, equals(0));
      expect(result.materials.cementBags, greaterThan(0));
      expect(result.materials.steelWeight, greaterThan(0));
      expect(result.costBreakdown.grandTotal, greaterThan(0));
      expect(result.costBreakdown.gstAmount, greaterThan(0));
      expect(result.calculationAudits.length, equals(5));
    });

    test('AAC Block Takeoff Calculation', () {
      const params = TakeoffParams(
        buildingType: 'house',
        numFloors: 1,
        floorHeight: 3.0,
        brickType: 'aac_block',
        concreteGrade: 'M25',
        steelGrade: 'Fe500',
        wastePercentage: 5.0,
      );

      final result = EstimationEngine.calculateTakeoff(samplePlan, params);

      expect(result.materials.bricksCount, equals(0));
      expect(result.materials.blocksCount, greaterThan(0));
      expect(result.materials.cementBags, greaterThan(0));
      expect(result.costBreakdown.blockCost, greaterThan(0));
      expect(result.costBreakdown.brickCost, equals(0.0));
    });

    test('GST Calculation is exactly 18% of taxable base', () {
      const params = TakeoffParams(
        buildingType: 'villa',
        numFloors: 2,
        floorHeight: 3.2,
      );

      final result = EstimationEngine.calculateTakeoff(samplePlan, params);

      final costMat = result.costBreakdown.totalMaterialCost;
      final costLab = result.costBreakdown.labourCost;
      final costEqu = result.costBreakdown.equipmentCost;
      final costTrs = result.costBreakdown.transportCost;

      final baseExecution = costMat + costLab + costEqu + costTrs;
      final margin = (baseExecution * 0.10).roundToDouble();
      final contingency = (baseExecution * 0.05).roundToDouble();
      final taxable = baseExecution + margin + contingency;
      final expectedGst = (taxable * 0.18).roundToDouble();

      expect(result.costBreakdown.gstAmount, equals(expectedGst));
      expect(result.costBreakdown.grandTotal, equals(taxable + expectedGst));
    });
  });
}
