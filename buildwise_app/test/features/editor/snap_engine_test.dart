import 'package:flutter_test/flutter_test.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/features/editor/domain/snap_engine.dart';

void main() {
  group('Snap Engine Tests', () {
    test('SpatialHashGrid inserts and retrieves points in radius', () {
      final grid = SpatialHashGrid(cellSize: 50.0);
      grid.insertPoint('pt1', [10.0, 10.0], 'endpoint', 'w1');
      grid.insertPoint('pt2', [200.0, 200.0], 'vertex', 'r1');

      final nearby = grid.getNearbyPoints([12.0, 12.0], 10.0);
      expect(nearby.length, equals(1));
      expect(nearby.first.id, equals('pt1'));
    });

    test('getLineIntersection calculates intersection point accurately', () {
      const line1 = GuideSegment(p1: [0.0, 5.0], p2: [10.0, 5.0]);
      const line2 = GuideSegment(p1: [5.0, 0.0], p2: [5.0, 10.0]);

      final intersection = getLineIntersection(line1, line2);
      expect(intersection, isNotNull);
      expect(intersection![0], equals(5.0));
      expect(intersection[1], equals(5.0));
    });

    test('findNearestSnapTarget Priority Cascade (Endpoint over Grid)', () {
      const walls = [
        AIWall(
          id: 'w1',
          start: [100.0, 100.0],
          end: [200.0, 100.0],
          lengthPx: 100.0,
          lengthM: 2.5,
          thicknessPx: 12.0,
          thicknessM: 0.23,
        )
      ];

      final target = findNearestSnapTarget(
        [102.0, 101.0], // Mouse near endpoint [100, 100]
        [],
        walls,
        1.0,
        40.0,
      );

      expect(target, isNotNull);
      expect(target!.type, equals(SnapType.endpoint));
      expect(target.point, equals([100.0, 100.0]));
    });

    test('findCanvaEdgeMagneticSnap locks to boundary line', () {
      final rooms = [
        const AIRoom(
          id: 'r1',
          label: 'Living Room',
          roomType: 'living_room',
          polygon: [
            [0.0, 0.0],
            [100.0, 0.0],
            [100.0, 100.0],
            [0.0, 100.0]
          ],
          centroid: [50.0, 50.0],
          boundingBox: [0.0, 0.0, 100.0, 100.0],
          areaM2: 25.0,
          areaSqft: 269.0,
          perimeterM: 20.0,
          lengthM: 5.0,
          widthM: 5.0,
          aspectRatio: 1.0,
          classification: RoomClassification(
            classifiedLabel: 'Living Room',
            roomType: 'living_room',
            confidence: RoomConfidenceScore(overall: 0.95),
          ),
        )
      ];

      final res = findCanvaEdgeMagneticSnap(
        'left',
        102.0, // Dragging handle near X=100
        const BoundingBoxRect(minX: 102.0, maxX: 200.0, minY: 0.0, maxY: 100.0),
        rooms,
        [],
        'r2',
      );

      expect(res, isNotNull);
      expect(res!.snappedPos, equals(100.0));
    });
  });
}
