import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:buildwise_app/models/ai_column.dart';
import 'package:buildwise_app/models/ai_door.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/ai_window.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/features/editor/presentation/providers/editor_notifier.dart';
import 'package:buildwise_app/features/three_d/domain/mesh_builder.dart';
import 'package:buildwise_app/features/three_d/presentation/providers/three_d_viewer_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AIRoom room1;
  late AIRoom room2;
  late AIWall sharedWall;
  late AIDoor door1;
  late AIWindow window1;
  late AIColumn column1;

  setUp(() {
    room1 = const AIRoom(
      id: 'r1',
      label: 'Master Bedroom',
      roomType: 'master_bedroom',
      polygon: [
        [0.0, 0.0],
        [4.0, 0.0],
        [4.0, 3.0],
        [0.0, 3.0]
      ],
      centroid: [2.0, 1.5],
      boundingBox: [0.0, 0.0, 4.0, 3.0],
      areaM2: 12.0,
      areaSqft: 129.17,
      perimeterM: 14.0,
      lengthM: 4.0,
      widthM: 3.0,
      aspectRatio: 1.33,
      classification: const RoomClassification(
        classifiedLabel: 'Master Bedroom',
        roomType: 'master_bedroom',
        confidence: RoomConfidenceScore(overall: 0.95),
      ),
    );

    room2 = const AIRoom(
      id: 'r2',
      label: 'Ensuite Bathroom',
      roomType: 'bathroom',
      polygon: [
        [4.0, 0.0],
        [6.0, 0.0],
        [6.0, 3.0],
        [4.0, 3.0] // Shared wall along [4.0, 0.0] -> [4.0, 3.0]
      ],
      centroid: [5.0, 1.5],
      boundingBox: [4.0, 0.0, 6.0, 3.0],
      areaM2: 6.0,
      areaSqft: 64.58,
      perimeterM: 10.0,
      lengthM: 3.0,
      widthM: 2.0,
      aspectRatio: 1.5,
      classification: const RoomClassification(
        classifiedLabel: 'Ensuite Bathroom',
        roomType: 'bathroom',
        confidence: RoomConfidenceScore(overall: 0.90),
      ),
    );

    sharedWall = const AIWall(
      id: 'w_shared',
      start: [4.0, 0.0],
      end: [4.0, 3.0],
      lengthPx: 120.0,
      lengthM: 3.0,
      thicknessPx: 15.0,
      thicknessM: 0.115,
      wallType: 'internal',
    );

    door1 = const AIDoor(
      id: 'd1',
      center: [2.0, 0.0],
      widthM: 0.9,
      heightM: 2.1,
    );

    window1 = const AIWindow(
      id: 'win1',
      center: [2.0, 3.0],
      widthM: 1.2,
      heightM: 1.2,
      sillHeightM: 0.9,
    );

    column1 = const AIColumn(
      id: 'col1',
      center: [0.0, 0.0],
      sizeM: [0.23, 0.23],
      shape: 'square',
    );
  });

  group('Phase 7: Full 3D Building Viewer Tests', () {
    test('Building3DTransform converts 2D coordinates to centered 3D points', () {
      final transform = Building3DTransform.fromRooms([room1, room2]);
      final p3d = transform.to3DPoint(4.0, 3.0, 1.5);

      expect(p3d.y, equals(1.5));
      expect(p3d.x, isA<double>());
      expect(p3d.z, isA<double>());
    });

    test('WallMesh3D deduplicates shared internal walls and assigns correct 115mm/230mm thickness', () {
      final transform = Building3DTransform.fromRooms([room1, room2]);
      final walls = WallMesh3D.buildDeduplicatedWalls(
        rooms: [room1, room2],
        explicitWalls: [],
        transform: transform,
      );

      expect(walls.length, equals(7)); // 4 outer edges + 3 outer edges - 1 shared edge = 7

      final internalWalls = walls.where((w) => w.wallType == 'internal').toList();
      final externalWalls = walls.where((w) => w.wallType == 'external').toList();

      expect(internalWalls.length, equals(1));
      expect(internalWalls.first.thickness, equals(0.115));
      expect(externalWalls.every((w) => w.thickness == 0.23), isTrue);
    });

    test('RoomMesh3D, DoorMesh3D, WindowMesh3D, and ColumnMesh3D build valid geometry representations', () {
      final transform = Building3DTransform.fromRooms([room1]);

      final roomMesh = RoomMesh3D.fromAIRoom(room1, transform);
      expect(roomMesh.label, equals('Master Bedroom'));
      expect(roomMesh.color, equals(const Color(0xFF7C3AED)));
      expect(roomMesh.polygon3D.length, equals(4));

      final doorMesh = DoorMesh3D.fromAIDoor(door1, transform);
      expect(doorMesh.width, equals(0.9));
      expect(doorMesh.height, greaterThan(1.5));

      final windowMesh = WindowMesh3D.fromAIWindow(window1, transform);
      expect(windowMesh.width, equals(1.2));
      expect(windowMesh.sillHeight, equals(0.9));

      final columnMesh = ColumnMesh3D.fromAIColumn(column1, transform);
      expect(columnMesh.shape, equals('square'));
      expect(columnMesh.width, equals(0.23));
    });

    test('ThreeDViewerNotifier manages camera presets, explore modes, and selections', () {
      final notifier = ThreeDViewerNotifier();

      expect(notifier.state.cameraPreset, equals(CameraPreset.perspective));
      expect(notifier.state.exploreMode, equals(ExploreMode.normal));

      notifier.setCameraPreset(CameraPreset.top);
      expect(notifier.state.cameraPreset, equals(CameraPreset.top));

      notifier.setExploreMode(ExploreMode.wireframe);
      expect(notifier.state.exploreMode, equals(ExploreMode.wireframe));

      notifier.toggleWalkthroughMode();
      expect(notifier.state.walkthroughMode, isTrue);
      expect(notifier.state.cameraPreset, equals(CameraPreset.walkthrough));

      notifier.selectWall(
        wallId: 'w1',
        wallType: 'external',
        length: 5.0,
        thickness: 0.23,
      );

      expect(notifier.state.selectedObjectType, equals('wall'));
      expect(notifier.state.selectedWallInfo, isNotNull);
      expect(notifier.state.selectedWallInfo!.netVolume, greaterThan(0));
      expect(notifier.state.selectedWallInfo!.brickCount, greaterThan(0));

      notifier.clearSelection();
      expect(notifier.state.selectedObjectType, isNull);
    });

    test('Live 2D to 3D Synchronization updates scene when 2D Editor State changes', () {
      final editorNotifier = EditorNotifier();
      final initialPlan = FloorPlanAnalysisResult(
        id: 'plan_3d_sync',
        planId: 'plan_3d_sync',
        projectId: 'proj_3d_sync',
        rooms: [room1],
        walls: [sharedWall],
      );

      editorNotifier.setPlan(initialPlan);
      expect(editorNotifier.state.plan!.walls.length, equals(1));

      // Modify wall thickness in 2D editor
      editorNotifier.updateWallThickness('w_shared', 0.35);
      final updatedPlan = editorNotifier.state.plan!;
      final updatedWall = updatedPlan.walls.firstWhere((w) => w.id == 'w_shared');

      expect(updatedWall.thicknessM, equals(0.35));

      // Rebuild 3D wall mesh from updated 2D state
      final transform = Building3DTransform.fromRooms(updatedPlan.rooms);
      final updated3DWalls = WallMesh3D.buildDeduplicatedWalls(
        rooms: updatedPlan.rooms,
        explicitWalls: updatedPlan.walls,
        transform: transform,
      );

      expect(updated3DWalls.first.thickness, equals(0.35));
    });

    test('Empty project rendering handles zero rooms and walls gracefully', () {
      const emptyPlan = FloorPlanAnalysisResult(
        id: 'empty_3d_plan',
        planId: 'empty_3d_plan',
        projectId: 'empty_3d_proj',
      );

      final transform = Building3DTransform.fromRooms(emptyPlan.rooms);
      final emptyWalls = WallMesh3D.buildDeduplicatedWalls(
        rooms: emptyPlan.rooms,
        explicitWalls: emptyPlan.walls,
        transform: transform,
      );

      expect(emptyWalls.isEmpty, isTrue);
    });
  });
}
