import 'package:flutter_test/flutter_test.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/features/editor/domain/shared_node_graph.dart';

void main() {
  group('Shared Node Graph & Topology Tests', () {
    test('removeDuplicateVertices cleans coincident polygon points', () {
      final poly = [
        [0.0, 0.0],
        [0.5, 0.5], // Within 1.5px
        [50.0, 0.0],
        [50.0, 50.0],
        [0.0, 50.0]
      ];

      final cleaned = removeDuplicateVertices(poly, 1.5);
      expect(cleaned.length, equals(4));
    });

    test('snapPolygonClosure drops duplicate last vertex', () {
      final poly = [
        [0.0, 0.0],
        [50.0, 0.0],
        [50.0, 50.0],
        [0.0, 50.0],
        [1.0, 1.0] // Near start
      ];

      final snapped = snapPolygonClosure(poly, 12.0);
      expect(snapped.length, equals(4));
    });

    test('syncCoincidentRoomWalls detects shared internal wall', () {
      final roomA = const AIRoom(
        id: 'r1',
        label: 'Room A',
        roomType: 'bedroom',
        polygon: [
          [0.0, 0.0],
          [50.0, 0.0],
          [50.0, 50.0],
          [0.0, 50.0]
        ],
        centroid: [25.0, 25.0],
        boundingBox: [0.0, 0.0, 50.0, 50.0],
        areaM2: 25.0,
        areaSqft: 269.0,
        perimeterM: 20.0,
        lengthM: 5.0,
        widthM: 5.0,
        aspectRatio: 1.0,
        classification: RoomClassification(
          classifiedLabel: 'Room A',
          roomType: 'bedroom',
          confidence: RoomConfidenceScore(overall: 0.95),
        ),
      );

      final roomB = const AIRoom(
        id: 'r2',
        label: 'Room B',
        roomType: 'bedroom',
        polygon: [
          [50.0, 0.0], // Shared edge X=50
          [100.0, 0.0],
          [100.0, 50.0],
          [50.0, 50.0]
        ],
        centroid: [75.0, 25.0],
        boundingBox: [50.0, 0.0, 50.0, 50.0],
        areaM2: 25.0,
        areaSqft: 269.0,
        perimeterM: 20.0,
        lengthM: 5.0,
        widthM: 5.0,
        aspectRatio: 1.0,
        classification: RoomClassification(
          classifiedLabel: 'Room B',
          roomType: 'bedroom',
          confidence: RoomConfidenceScore(overall: 0.95),
        ),
      );

      final sharedWalls = syncCoincidentRoomWalls([roomA, roomB], []);
      expect(sharedWalls.length, greaterThanOrEqualTo(1));
      final sharedWall = sharedWalls.firstWhere((w) => w.roomIds.length > 1);
      expect(sharedWall.wallType, equals('internal'));
      expect(sharedWall.thicknessM, equals(0.115));
      expect(sharedWall.roomIds, containsAll(['r1', 'r2']));
    });

    test('SharedNodeGraph indexes co-located wall endpoints into shared node', () {
      const w1 = AIWall(
        id: 'w1',
        start: [0.0, 0.0],
        end: [50.0, 0.0],
        lengthPx: 50.0,
        lengthM: 1.25,
        thicknessPx: 12.0,
        thicknessM: 0.23,
      );

      const w2 = AIWall(
        id: 'w2',
        start: [50.0, 0.0], // Shares node [50, 0] with w1.end
        end: [50.0, 50.0],
        lengthPx: 50.0,
        lengthM: 1.25,
        thicknessPx: 12.0,
        thicknessM: 0.23,
      );

      final graph = SharedNodeGraph();
      graph.buildGraph([], [w1, w2]);

      final nodes = graph.getAllNodes();
      final sharedNode = nodes.firstWhere((n) => n.wallEndIds.contains('w1') && n.wallStartIds.contains('w2'));
      expect(sharedNode, isNotNull);
      expect(sharedNode.point, equals([50.0, 0.0]));
    });
  });
}
