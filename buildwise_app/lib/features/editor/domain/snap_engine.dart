import 'dart:math' as math;
import '../../../models/ai_room.dart';
import '../../../models/ai_wall.dart';

enum SnapType {
  endpoint,
  vertex,
  intersection,
  midpoint,
  orthoAngle,
  grid,
  magneticEdge,
}

class GuideSegment {
  final List<double> p1; // [x, y]
  final List<double> p2; // [x, y]

  const GuideSegment({
    required this.p1,
    required this.p2,
  });

  Map<String, dynamic> toJson() => {
        'p1': p1,
        'p2': p2,
      };
}

class SnapTarget {
  final SnapType type;
  final List<double> point; // [x, y]
  final double distancePx;
  final String label;
  final String color;
  final String? sourceId;
  final double? angleDeg;
  final GuideSegment? guideSegment;

  const SnapTarget({
    required this.type,
    required this.point,
    required this.distancePx,
    required this.label,
    required this.color,
    this.sourceId,
    this.angleDeg,
    this.guideSegment,
  });
}

class SnapConfig {
  final bool enabled;
  final double snapRadiusPx;
  final bool enableEndpoint;
  final bool enableMidpoint;
  final bool enableIntersection;
  final bool enableOrthoAngle;
  final bool enableGrid;
  final double gridSizeMm;

  const SnapConfig({
    this.enabled = true,
    this.snapRadiusPx = 6.0,
    this.enableEndpoint = true,
    this.enableMidpoint = true,
    this.enableIntersection = true,
    this.enableOrthoAngle = true,
    this.enableGrid = true,
    this.gridSizeMm = 100.0,
  });
}

const DEFAULT_SNAP_CONFIG = SnapConfig();

class SpatialGridItem {
  final String id;
  final List<double> point;
  final String type; // 'endpoint' | 'vertex' | 'midpoint'
  final String? sourceId;

  const SpatialGridItem({
    required this.id,
    required this.point,
    required this.type,
    this.sourceId,
  });
}

class SpatialHashGrid {
  final double cellSize;
  final Map<String, List<SpatialGridItem>> _grid = {};

  SpatialHashGrid({this.cellSize = 50.0});

  String _getKey(double x, double y) {
    final cx = (x / cellSize).floor();
    final cy = (y / cellSize).floor();
    return '$cx:$cy';
  }

  void clear() {
    _grid.clear();
  }

  void insertPoint(String id, List<double> point, String type, [String? sourceId]) {
    final key = _getKey(point[0], point[1]);
    _grid.putIfAbsent(key, () => []).add(
          SpatialGridItem(id: id, point: point, type: type, sourceId: sourceId),
        );
  }

  List<SpatialGridItem> getNearbyPoints(List<double> point, double radius) {
    final minCx = ((point[0] - radius) / cellSize).floor();
    final maxCx = ((point[0] + radius) / cellSize).floor();
    final minCy = ((point[1] - radius) / cellSize).floor();
    final maxCy = ((point[1] + radius) / cellSize).floor();

    final results = <SpatialGridItem>[];

    for (var cx = minCx; cx <= maxCx; cx++) {
      for (var cy = minCy; cy <= maxCy; cy++) {
        final key = '$cx:$cy';
        final cell = _grid[key];
        if (cell != null) {
          results.addAll(cell);
        }
      }
    }
    return results;
  }
}

List<double>? getLineIntersection(
  GuideSegment line1,
  GuideSegment line2,
) {
  final x1 = line1.p1[0], y1 = line1.p1[1];
  final x2 = line1.p2[0], y2 = line1.p2[1];
  final x3 = line2.p1[0], y3 = line2.p1[1];
  final x4 = line2.p2[0], y4 = line2.p2[1];

  final denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom.abs() < 1e-6) return null;

  final ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  final ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    final ix = x1 + ua * (x2 - x1);
    final iy = y1 + ua * (y2 - y1);
    return [ix, iy];
  }
  return null;
}

class PointToSegmentResult {
  final double dist;
  final List<double> proj;

  const PointToSegmentResult({required this.dist, required this.proj});
}

PointToSegmentResult pointToSegmentDistance(
  List<double> pt,
  List<double> p1,
  List<double> p2,
) {
  final x = pt[0], y = pt[1];
  final x1 = p1[0], y1 = p1[1];
  final x2 = p2[0], y2 = p2[1];
  final dx = x2 - x1;
  final dy = y2 - y1;
  final lenSq = dx * dx + dy * dy;
  var t = lenSq > 0 ? ((x - x1) * dx + (y - y1) * dy) / lenSq : 0.0;
  t = math.max(0.0, math.min(1.0, t));
  final px = x1 + t * dx;
  final py = y1 + t * dy;
  final dist = math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
  return PointToSegmentResult(dist: dist, proj: [px, py]);
}

SnapTarget? findNearestSnapTarget(
  List<double> mouseWorldPoint,
  List<AIRoom> rooms,
  List<AIWall> walls,
  double zoom,
  double pxPerMeter, {
  SnapConfig config = DEFAULT_SNAP_CONFIG,
  List<double>? activeStartPoint,
}) {
  if (!config.enabled) return null;

  final worldRadius = config.snapRadiusPx / math.max(0.1, zoom);
  final mx = mouseWorldPoint[0];
  final my = mouseWorldPoint[1];

  final spatialGrid = SpatialHashGrid(cellSize: math.max(50.0, worldRadius * 4));

  for (final w in walls) {
    if (w.start.isNotEmpty) {
      spatialGrid.insertPoint('${w.id}_start', w.start, 'endpoint', w.id);
    }
    if (w.end.isNotEmpty) {
      spatialGrid.insertPoint('${w.id}_end', w.end, 'endpoint', w.id);
    }
    if (w.start.isNotEmpty && w.end.isNotEmpty) {
      final mid = [(w.start[0] + w.end[0]) / 2, (w.start[1] + w.end[1]) / 2];
      spatialGrid.insertPoint('${w.id}_mid', mid, 'midpoint', w.id);
    }
  }

  for (final r in rooms) {
    for (var idx = 0; idx < r.polygon.length; idx++) {
      spatialGrid.insertPoint('${r.id}_v$idx', r.polygon[idx], 'vertex', r.id);
    }
  }

  // 0. MAGNETIC EDGE ATTRACTION
  final magRadiusWorld = 5.0 / math.max(0.1, zoom);
  SnapTarget? bestMagnetic;
  var minMagDist = magRadiusWorld;

  final allSegments = <_NamedSegment>[];
  for (final r in rooms) {
    final poly = r.polygon;
    for (var i = 0; i < poly.length; i++) {
      allSegments.add(_NamedSegment(p1: poly[i], p2: poly[(i + 1) % poly.length], id: r.id));
    }
  }
  for (final w in walls) {
    if (w.start.isNotEmpty && w.end.isNotEmpty) {
      allSegments.add(_NamedSegment(p1: w.start, p2: w.end, id: w.id));
    }
  }

  for (final seg in allSegments) {
    final res = pointToSegmentDistance(mouseWorldPoint, seg.p1, seg.p2);
    if (res.dist < minMagDist) {
      minMagDist = res.dist;
      bestMagnetic = SnapTarget(
        type: SnapType.magneticEdge,
        point: res.proj,
        distancePx: res.dist * zoom,
        label: 'Magnetic Edge Snap',
        color: '#A855F7',
        sourceId: seg.id,
        guideSegment: GuideSegment(p1: seg.p1, p2: seg.p2),
      );
    }
  }

  // 1. ENDPOINT SNAP (Priority 1)
  if (config.enableEndpoint) {
    final candidatePoints = spatialGrid.getNearbyPoints(mouseWorldPoint, worldRadius);
    SnapTarget? bestEndpoint;
    var minDist = worldRadius;

    for (final cand in candidatePoints) {
      if (cand.type == 'endpoint') {
        final dist = math.sqrt((cand.point[0] - mx) * (cand.point[0] - mx) +
            (cand.point[1] - my) * (cand.point[1] - my));
        if (dist < minDist) {
          minDist = dist;
          bestEndpoint = SnapTarget(
            type: SnapType.endpoint,
            point: cand.point,
            distancePx: dist * zoom,
            label: 'Endpoint',
            color: '#3B82F6',
            sourceId: cand.sourceId,
          );
        }
      }
    }
    if (bestEndpoint != null) return bestEndpoint;
  }

  // 2. EXISTING VERTEX SNAP (Priority 2)
  if (config.enableEndpoint) {
    final candidatePoints = spatialGrid.getNearbyPoints(mouseWorldPoint, worldRadius);
    SnapTarget? bestVertex;
    var minDist = worldRadius;

    for (final cand in candidatePoints) {
      if (cand.type == 'vertex') {
        final dist = math.sqrt((cand.point[0] - mx) * (cand.point[0] - mx) +
            (cand.point[1] - my) * (cand.point[1] - my));
        if (dist < minDist) {
          minDist = dist;
          bestVertex = SnapTarget(
            type: SnapType.vertex,
            point: cand.point,
            distancePx: dist * zoom,
            label: 'Vertex',
            color: '#A855F7',
            sourceId: cand.sourceId,
          );
        }
      }
    }
    if (bestVertex != null) return bestVertex;
  }

  // 3. WALL INTERSECTION SNAP (Priority 3)
  if (config.enableIntersection) {
    SnapTarget? bestIntersection;
    var minDist = worldRadius;

    for (var i = 0; i < walls.length; i++) {
      for (var j = i + 1; j < walls.length; j++) {
        final w1 = walls[i];
        final w2 = walls[j];
        if (w1.start.isNotEmpty && w1.end.isNotEmpty && w2.start.isNotEmpty && w2.end.isNotEmpty) {
          final ix = getLineIntersection(
            GuideSegment(p1: w1.start, p2: w1.end),
            GuideSegment(p1: w2.start, p2: w2.end),
          );
          if (ix != null) {
            final dist = math.sqrt((ix[0] - mx) * (ix[0] - mx) + (ix[1] - my) * (ix[1] - my));
            if (dist < minDist) {
              minDist = dist;
              bestIntersection = SnapTarget(
                type: SnapType.intersection,
                point: ix,
                distancePx: dist * zoom,
                label: 'Intersection',
                color: '#F97316',
              );
            }
          }
        }
      }
    }
    if (bestIntersection != null) return bestIntersection;
  }

  // 4. MIDPOINT SNAP (Priority 4)
  if (config.enableMidpoint) {
    final candidatePoints = spatialGrid.getNearbyPoints(mouseWorldPoint, worldRadius);
    SnapTarget? bestMidpoint;
    var minDist = worldRadius;

    for (final cand in candidatePoints) {
      if (cand.type == 'midpoint') {
        final dist = math.sqrt((cand.point[0] - mx) * (cand.point[0] - mx) +
            (cand.point[1] - my) * (cand.point[1] - my));
        if (dist < minDist) {
          minDist = dist;
          bestMidpoint = SnapTarget(
            type: SnapType.midpoint,
            point: cand.point,
            distancePx: dist * zoom,
            label: 'Midpoint',
            color: '#10B981',
            sourceId: cand.sourceId,
          );
        }
      }
    }
    if (bestMidpoint != null) return bestMidpoint;
  }

  // 5. ORTHOGONAL ANGLE SNAP (Priority 5)
  if (config.enableOrthoAngle && activeStartPoint != null && activeStartPoint.length >= 2) {
    final dx = mx - activeStartPoint[0];
    final dy = my - activeStartPoint[1];
    final dist = math.sqrt(dx * dx + dy * dy);

    if (dist > 5.0) {
      final angleRad = math.atan2(dy, dx);
      var angleDeg = (angleRad * 180) / math.pi;
      if (angleDeg < 0) angleDeg += 360;

      const orthoAngles = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0, 360.0];
      const toleranceDeg = 5.0;

      for (final targetDeg in orthoAngles) {
        final diff = (angleDeg - targetDeg).abs();
        if (diff <= toleranceDeg || (diff - 360).abs() <= toleranceDeg) {
          final rad = (targetDeg * math.pi) / 180;
          final snappedX = activeStartPoint[0] + dist * math.cos(rad);
          final snappedY = activeStartPoint[1] + dist * math.sin(rad);
          return SnapTarget(
            type: SnapType.orthoAngle,
            point: [snappedX, snappedY],
            distancePx: (angleDeg - targetDeg).abs() * zoom,
            label: '${(targetDeg % 360).toInt()}° Ortho',
            color: '#EAB308',
            angleDeg: targetDeg % 360,
          );
        }
      }
    }
  }

  // 6. GRID SNAP (Priority 6)
  if (config.enableGrid && config.gridSizeMm > 0) {
    final gridPx = (config.gridSizeMm / 1000.0) * pxPerMeter;
    if (gridPx > 2) {
      final gx = (mx / gridPx).round() * gridPx;
      final gy = (my / gridPx).round() * gridPx;
      final dist = math.sqrt((gx - mx) * (gx - mx) + (gy - my) * (gy - my));
      if (dist < worldRadius) {
        return SnapTarget(
          type: SnapType.grid,
          point: [gx, gy],
          distancePx: dist * zoom,
          label: 'Grid ${config.gridSizeMm.toInt()}mm',
          color: '#64748B',
        );
      }
    }
  }

  if (bestMagnetic != null) return bestMagnetic;
  return null;
}

class CanvaAlignmentResult {
  final double snappedPos;
  final GuideSegment? guideSegment;
  final String label;

  const CanvaAlignmentResult({
    required this.snappedPos,
    this.guideSegment,
    required this.label,
  });
}

class BoundingBoxRect {
  final double minX;
  final double maxX;
  final double minY;
  final double maxY;

  const BoundingBoxRect({
    required this.minX,
    required this.maxX,
    required this.minY,
    required this.maxY,
  });
}

CanvaAlignmentResult? findCanvaEdgeMagneticSnap(
  String handle, // 'top' | 'bottom' | 'left' | 'right'
  double currentVal,
  BoundingBoxRect initialBounds,
  List<AIRoom> rooms,
  List<AIWall> walls,
  String ignoreRoomId, {
  double tolerancePx = 8.0,
}) {
  final isVertical = handle == 'left' || handle == 'right';
  var bestDist = tolerancePx;
  double? bestVal;
  GuideSegment? bestGuide;
  var bestLabel = '';

  final targets = <_CanvaTarget>[];

  for (final r in rooms) {
    if (r.id == ignoreRoomId) continue;
    final poly = r.polygon;
    for (var i = 0; i < poly.length; i++) {
      final p1 = poly[i];
      final p2 = poly[(i + 1) % poly.length];

      if (isVertical && (p1[0] - p2[0]).abs() < 1e-3) {
        final targetX = p1[0];
        final minY = math.min(p1[1], p2[1]);
        final maxY = math.max(p1[1], p2[1]);
        targets.add(_CanvaTarget(coord: targetX, minOther: minY, maxOther: maxY, label: 'Boundary Snap'));
      } else if (!isVertical && (p1[1] - p2[1]).abs() < 1e-3) {
        final targetY = p1[1];
        final minX = math.min(p1[0], p2[0]);
        final maxX = math.max(p1[0], p2[0]);
        targets.add(_CanvaTarget(coord: targetY, minOther: minX, maxOther: maxX, label: 'Boundary Snap'));
      }
    }
  }

  for (final w in walls) {
    if (w.start.isEmpty || w.end.isEmpty) continue;
    if (isVertical && (w.start[0] - w.end[0]).abs() < 1e-3) {
      final targetX = w.start[0];
      final minY = math.min(w.start[1], w.end[1]);
      final maxY = math.max(w.start[1], w.end[1]);
      targets.add(_CanvaTarget(coord: targetX, minOther: minY, maxOther: maxY, label: 'Wall Alignment'));
    } else if (!isVertical && (w.start[1] - w.end[1]).abs() < 1e-3) {
      final targetY = w.start[1];
      final minX = math.min(w.start[0], w.end[0]);
      final maxX = math.max(w.start[0], w.end[0]);
      targets.add(_CanvaTarget(coord: targetY, minOther: minX, maxOther: maxX, label: 'Wall Alignment'));
    }
  }

  for (final t in targets) {
    final dist = (currentVal - t.coord).abs();
    if (dist < bestDist) {
      bestDist = dist;
      bestVal = t.coord;
      bestLabel = t.label;
      if (isVertical) {
        final guideMinY = math.min(initialBounds.minY, t.minOther) - 15.0;
        final guideMaxY = math.max(initialBounds.maxY, t.maxOther) + 15.0;
        bestGuide = GuideSegment(p1: [t.coord, guideMinY], p2: [t.coord, guideMaxY]);
      } else {
        final guideMinX = math.min(initialBounds.minX, t.minOther) - 15.0;
        final guideMaxX = math.max(initialBounds.maxX, t.maxOther) + 15.0;
        bestGuide = GuideSegment(p1: [guideMinX, t.coord], p2: [guideMaxX, t.coord]);
      }
    }
  }

  if (bestVal != null && bestGuide != null) {
    return CanvaAlignmentResult(snappedPos: bestVal, guideSegment: bestGuide, label: bestLabel);
  }
  return null;
}

class DoorWindowSnapResult {
  final List<double> center;
  final GuideSegment guideSegment;
  final String label;

  const DoorWindowSnapResult({
    required this.center,
    required this.guideSegment,
    required this.label,
  });
}

DoorWindowSnapResult? findDoorWindowSnapTarget(
  List<double> mousePos,
  List<AIRoom> rooms,
  List<AIWall> walls, {
  double tolerancePx = 14.0,
}) {
  final allSegments = <_NamedSegment>[];

  for (final r in rooms) {
    final poly = r.polygon;
    for (var i = 0; i < poly.length; i++) {
      allSegments.add(_NamedSegment(
        p1: poly[i],
        p2: poly[(i + 1) % poly.length],
        id: r.id,
        label: 'Boundary of ${r.label}',
      ));
    }
  }

  for (final w in walls) {
    if (w.start.isNotEmpty && w.end.isNotEmpty) {
      allSegments.add(_NamedSegment(p1: w.start, p2: w.end, id: w.id, label: 'Wall Vector'));
    }
  }

  var bestDist = tolerancePx;
  DoorWindowSnapResult? bestResult;

  for (final seg in allSegments) {
    final res = pointToSegmentDistance(mousePos, seg.p1, seg.p2);
    if (res.dist < bestDist) {
      bestDist = res.dist;
      bestResult = DoorWindowSnapResult(
        center: [res.proj[0].roundToDouble(), res.proj[1].roundToDouble()],
        guideSegment: GuideSegment(p1: seg.p1, p2: seg.p2),
        label: seg.label,
      );
    }
  }

  return bestResult;
}

class _NamedSegment {
  final List<double> p1;
  final List<double> p2;
  final String id;
  final String label;

  const _NamedSegment({
    required this.p1,
    required this.p2,
    required this.id,
    this.label = '',
  });
}

class _CanvaTarget {
  final double coord;
  final double minOther;
  final double maxOther;
  final String label;

  const _CanvaTarget({
    required this.coord,
    required this.minOther,
    required this.maxOther,
    required this.label,
  });
}
