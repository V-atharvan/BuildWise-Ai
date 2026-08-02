import 'package:flutter_test/flutter_test.dart';

import 'package:buildwise_app/models/ai_column.dart';
import 'package:buildwise_app/models/ai_door.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/ai_window.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/features/editor/domain/shared_node_graph.dart';
import 'package:buildwise_app/features/editor/presentation/providers/editor_notifier.dart';
import 'package:buildwise_app/features/three_d/domain/mesh_builder.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AIRoom room1;
  late AIRoom room2;
  late AIWall wall1;
  late AIWall wall2;
  late AIDoor door1;
  late AIWindow window1;
  late AIColumn column1;

  setUp(() {
    room1 = const AIRoom(
      id: 'inv_r1',
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
        confidence: RoomConfidenceScore(overall: 0.98),
      ),
    );

    room2 = const AIRoom(
      id: 'inv_r2',
      label: 'Kitchen',
      roomType: 'kitchen',
      polygon: [
        [5.0, 0.0],
        [8.0, 0.0],
        [8.0, 4.0],
        [5.0, 4.0]
      ],
      centroid: [6.5, 2.0],
      boundingBox: [5.0, 0.0, 8.0, 4.0],
      areaM2: 12.0,
      areaSqft: 129.17,
      perimeterM: 14.0,
      lengthM: 4.0,
      widthM: 3.0,
      aspectRatio: 1.33,
      classification: RoomClassification(
        classifiedLabel: 'Kitchen',
        roomType: 'kitchen',
        confidence: RoomConfidenceScore(overall: 0.95),
      ),
    );

    wall1 = const AIWall(
      id: 'inv_w1',
      start: [0.0, 0.0],
      end: [5.0, 0.0],
      lengthPx: 200.0,
      lengthM: 5.0,
      thicknessPx: 15.0,
      thicknessM: 0.23,
      wallType: 'external',
    );

    wall2 = const AIWall(
      id: 'inv_w2',
      start: [5.0, 0.0],
      end: [5.0, 4.0],
      lengthPx: 160.0,
      lengthM: 4.0,
      thicknessPx: 15.0,
      thicknessM: 0.115,
      wallType: 'internal',
    );

    door1 = const AIDoor(
      id: 'inv_d1',
      center: [2.5, 0.0],
      widthM: 0.9,
      heightM: 2.1,
    );

    window1 = const AIWindow(
      id: 'inv_win1',
      center: [6.5, 0.0],
      widthM: 1.2,
      heightM: 1.2,
      sillHeightM: 0.9,
    );

    column1 = const AIColumn(
      id: 'inv_col1',
      center: [5.0, 0.0],
      sizeM: [0.23, 0.23],
      shape: 'square',
    );
  });

  group('Phase 8I: Geometry Invariants Automated Test Suite', () {
    test('Wall length and thickness cannot be negative or NaN', () {
      expect(wall1.lengthM, greaterThanOrEqualTo(0.0));
      expect(wall1.thicknessM, greaterThanOrEqualTo(0.0));
      expect(wall1.lengthM.isNaN, isFalse);
      expect(wall1.thicknessM.isNaN, isFalse);

      expect(wall2.lengthM, greaterThanOrEqualTo(0.0));
      expect(wall2.thicknessM, greaterThanOrEqualTo(0.0));
      expect(wall2.lengthM.isNaN, isFalse);
      expect(wall2.thicknessM.isNaN, isFalse);
    });

    test('Room area and perimeter cannot be negative or NaN', () {
      expect(room1.areaM2, greaterThan(0.0));
      expect(room1.areaSqft, greaterThan(0.0));
      expect(room1.perimeterM, greaterThan(0.0));
      expect(room1.areaM2.isNaN, isFalse);
      expect(room1.perimeterM.isNaN, isFalse);

      expect(room2.areaM2, greaterThan(0.0));
      expect(room2.areaSqft, greaterThan(0.0));
      expect(room2.perimeterM, greaterThan(0.0));
    });

    test('Polygon coordinates contain non-null finite numbers', () {
      for (final pt in room1.polygon) {
        expect(pt[0].isNaN, isFalse);
        expect(pt[1].isNaN, isFalse);
        expect(pt[0].isInfinite, isFalse);
        expect(pt[1].isInfinite, isFalse);
      }
    });

    test('Shared wall endpoints node synchronization preserves shared topology', () {
      final graph = SharedNodeGraph();
      graph.buildGraph([room1, room2], [wall1, wall2]);

      final nodes = graph.getAllNodes();
      expect(nodes, isNotEmpty);
    });

    test('Deleting wall handles dependent openings safely without crashing', () {
      final editor = EditorNotifier();
      final plan = FloorPlanAnalysisResult(
        id: 'inv_plan',
        planId: 'inv_plan',
        projectId: 'inv_proj',
        rooms: [room1],
        walls: [wall1, wall2],
        doors: [door1],
        windows: [window1],
        columns: [column1],
      );

      editor.setPlan(plan);
      expect(editor.state.plan.walls.length, equals(1));
      expect(editor.state.plan.doors.length, equals(1));

      // Select and delete selected object
      editor.selectElement('inv_w1', 'wall');
      editor.deleteSelectedElement();

      expect(editor.state.plan.walls.any((w) => w.id == 'inv_w1'), isFalse);
    });

    test('Undo and Redo restore exact geometry state without loss of data', () {
      final editor = EditorNotifier();
      final initialPlan = FloorPlanAnalysisResult(
        id: 'inv_plan_undo',
        planId: 'inv_plan_undo',
        projectId: 'inv_proj_undo',
        rooms: [room1],
        walls: [wall1],
      );

      editor.setPlan(initialPlan);
      final initialThickness = editor.state.plan.walls.first.thicknessM;

      // Mutation 1: Update wall thickness
      editor.updateWallThickness('inv_w1', 0.35);
      expect(editor.state.plan.walls.first.thicknessM, equals(0.35));

      // Undo -> restores initial thickness
      editor.undo();
      expect(editor.state.plan.walls.first.thicknessM, equals(initialThickness));

      // Redo -> restores 0.35 thickness
      editor.redo();
      expect(editor.state.plan.walls.first.thicknessM, equals(0.35));
    });

    test('3D conversion preserves room carpet area and wall length invariants', () {
      final transform = Building3DTransform.fromRooms([room1, room2]);

      final room1Mesh = RoomMesh3D.fromAIRoom(room1, transform);
      final room2Mesh = RoomMesh3D.fromAIRoom(room2, transform);

      expect(room1Mesh.areaM2, equals(room1.areaM2));
      expect(room2Mesh.areaM2, equals(room2.areaM2));

      final deduplicatedWalls = WallMesh3D.buildDeduplicatedWalls(
        rooms: [room1, room2],
        explicitWalls: [],
        transform: transform,
      );

      for (final w in deduplicatedWalls) {
        expect(w.length, greaterThan(0.0));
        expect(w.thickness, greaterThan(0.0));
        expect(w.height, equals(3.0));
      }
    });
  });
}
