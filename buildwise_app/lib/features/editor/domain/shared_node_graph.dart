import 'dart:math' as math;
import '../../../models/ai_room.dart';
import '../../../models/ai_wall.dart';

class RoomVertexRef {
  final String roomId;
  final int vertexIdx;

  const RoomVertexRef({
    required this.roomId,
    required this.vertexIdx,
  });

  Map<String, dynamic> toJson() => {
        'roomId': roomId,
        'vertexIdx': vertexIdx,
      };
}

class SharedNode {
  final String id;
  final List<double> point; // [x, y]
  final List<String> wallStartIds;
  final List<String> wallEndIds;
  final List<RoomVertexRef> roomVertices;

  SharedNode({
    required this.id,
    required this.point,
    List<String>? wallStartIds,
    List<String>? wallEndIds,
    List<RoomVertexRef>? roomVertices,
  })  : wallStartIds = wallStartIds ?? [],
        wallEndIds = wallEndIds ?? [],
        roomVertices = roomVertices ?? [];

  Map<String, dynamic> toJson() => {
        'id': id,
        'point': point,
        'wallStartIds': wallStartIds,
        'wallEndIds': wallEndIds,
        'roomVertices': roomVertices.map((v) => v.toJson()).toList(),
      };
}

List<List<double>> removeDuplicateVertices(
  List<List<double>> polygon, [
  double thresholdPx = 1.5,
]) {
  if (polygon.length < 3) return polygon;

  final cleaned = <List<double>>[];
  for (var i = 0; i < polygon.length; i++) {
    final curr = polygon[i];
    final next = polygon[(i + 1) % polygon.length];
    final dist = math.sqrt((curr[0] - next[0]) * (curr[0] - next[0]) +
        (curr[1] - next[1]) * (curr[1] - next[1]));
    if (dist > thresholdPx) {
      cleaned.add(curr);
    }
  }
  return cleaned.length >= 3 ? cleaned : polygon;
}

const double SNAP_TOLERANCE_PX = 12.0;

List<List<double>> snapPolygonClosure(
  List<List<double>> polygon, [
  double thresholdPx = SNAP_TOLERANCE_PX,
]) {
  if (polygon.length < 3) return polygon;

  final first = polygon.first;
  final last = polygon.last;
  final dist = math.sqrt(
      (first[0] - last[0]) * (first[0] - last[0]) + (first[1] - last[1]) * (first[1] - last[1]));

  if (dist <= thresholdPx && polygon.length > 3) {
    return polygon.sublist(0, polygon.length - 1);
  }
  return polygon;
}

List<AIWall> mergeCoincidentWalls(
  List<AIWall> walls, [
  double thresholdPx = 12.0,
]) {
  if (walls.length < 2) return walls;

  final merged = <AIWall>[];
  final visited = <String>{};

  for (var i = 0; i < walls.length; i++) {
    final w1 = walls[i];
    final w1Key = w1.id.isNotEmpty ? w1.id : '${w1.start.join(',')}_${w1.end.join(',')}';
    if (visited.contains(w1Key)) continue;
    visited.add(w1Key);

    var wallToKeep = w1;

    for (var j = i + 1; j < walls.length; j++) {
      final w2 = walls[j];
      final w2Key = w2.id.isNotEmpty ? w2.id : '${w2.start.join(',')}_${w2.end.join(',')}';
      if (visited.contains(w2Key)) continue;

      if (w1.start.isNotEmpty && w1.end.isNotEmpty && w2.start.isNotEmpty && w2.end.isNotEmpty) {
        final dStart = math.sqrt((w1.start[0] - w2.start[0]) * (w1.start[0] - w2.start[0]) +
            (w1.start[1] - w2.start[1]) * (w1.start[1] - w2.start[1]));
        final dEnd = math.sqrt((w1.end[0] - w2.end[0]) * (w1.end[0] - w2.end[0]) +
            (w1.end[1] - w2.end[1]) * (w1.end[1] - w2.end[1]));
        final dCross1 = math.sqrt((w1.start[0] - w2.end[0]) * (w1.start[0] - w2.end[0]) +
            (w1.start[1] - w2.end[1]) * (w1.start[1] - w2.end[1]));
        final dCross2 = math.sqrt((w1.end[0] - w2.start[0]) * (w1.end[0] - w2.start[0]) +
            (w1.end[1] - w2.start[1]) * (w1.end[1] - w2.start[1]));

        if ((dStart <= thresholdPx && dEnd <= thresholdPx) ||
            (dCross1 <= thresholdPx && dCross2 <= thresholdPx)) {
          visited.add(w2Key);
          if (w2.id.isNotEmpty) visited.add(w2.id);

          final combinedRooms = {...wallToKeep.roomIds, ...w2.roomIds}.toList();
          final isInternal = combinedRooms.length > 1;

          wallToKeep = AIWall(
            id: wallToKeep.id,
            start: wallToKeep.start,
            end: wallToKeep.end,
            lengthPx: wallToKeep.lengthPx,
            lengthM: wallToKeep.lengthM,
            thicknessPx: wallToKeep.thicknessPx,
            thicknessM: isInternal ? 0.115 : wallToKeep.thicknessM,
            wallType: isInternal ? 'internal' : wallToKeep.wallType,
            roomIds: combinedRooms,
            doorIds: {...wallToKeep.doorIds, ...w2.doorIds}.toList(),
            windowIds: {...wallToKeep.windowIds, ...w2.windowIds}.toList(),
            isStructural: wallToKeep.isStructural,
            confidence: wallToKeep.confidence,
          );
        }
      }
    }

    merged.add(wallToKeep);
  }

  return merged;
}

List<AIWall> syncCoincidentRoomWalls(
  List<AIRoom> rooms,
  List<AIWall> walls, [
  double thresholdPx = 8.0,
]) {
  final updatedWalls = List<AIWall>.from(walls);

  for (var i = 0; i < rooms.length; i++) {
    for (var j = i + 1; j < rooms.length; j++) {
      final roomA = rooms[i];
      final roomB = rooms[j];
      final polyA = roomA.polygon;
      final polyB = roomB.polygon;

      for (var a = 0; a < polyA.length; a++) {
        final a1 = polyA[a];
        final a2 = polyA[(a + 1) % polyA.length];

        for (var b = 0; b < polyB.length; b++) {
          final b1 = polyB[b];
          final b2 = polyB[(b + 1) % polyB.length];

          final dDirect1 = math.sqrt(
              (a1[0] - b1[0]) * (a1[0] - b1[0]) + (a1[1] - b1[1]) * (a1[1] - b1[1]));
          final dDirect2 = math.sqrt(
              (a2[0] - b2[0]) * (a2[0] - b2[0]) + (a2[1] - b2[1]) * (a2[1] - b2[1]));
          final dCross1 = math.sqrt(
              (a1[0] - b2[0]) * (a1[0] - b2[0]) + (a1[1] - b2[1]) * (a1[1] - b2[1]));
          final dCross2 = math.sqrt(
              (a2[0] - b1[0]) * (a2[0] - b1[0]) + (a2[1] - b1[1]) * (a2[1] - b1[1]));

          final isCoincident = (dDirect1 <= thresholdPx && dDirect2 <= thresholdPx) ||
              (dCross1 <= thresholdPx && dCross2 <= thresholdPx);

          if (isCoincident) {
            final wallIndex = updatedWalls.indexWhere((w) {
              final dS = math.sqrt((w.start[0] - a1[0]) * (w.start[0] - a1[0]) +
                  (w.start[1] - a1[1]) * (w.start[1] - a1[1]));
              final dE = math.sqrt((w.end[0] - a2[0]) * (w.end[0] - a2[0]) +
                  (w.end[1] - a2[1]) * (w.end[1] - a2[1]));
              final dCS = math.sqrt((w.start[0] - a2[0]) * (w.start[0] - a2[0]) +
                  (w.start[1] - a2[1]) * (w.start[1] - a2[1]));
              final dCE = math.sqrt((w.end[0] - a1[0]) * (w.end[0] - a1[0]) +
                  (w.end[1] - a1[1]) * (w.end[1] - a1[1]));
              return (dS <= thresholdPx && dE <= thresholdPx) ||
                  (dCS <= thresholdPx && dCE <= thresholdPx);
            });

            final roomIds = {roomA.id, roomB.id}.toList();
            final startPt = [
              ((a1[0] + (dDirect1 <= thresholdPx ? b1[0] : b2[0])) / 2).roundToDouble(),
              ((a1[1] + (dDirect1 <= thresholdPx ? b1[1] : b2[1])) / 2).roundToDouble(),
            ];
            final endPt = [
              ((a2[0] + (dDirect1 <= thresholdPx ? b2[0] : b1[0])) / 2).roundToDouble(),
              ((a2[1] + (dDirect1 <= thresholdPx ? b2[1] : b1[1])) / 2).roundToDouble(),
            ];
            final dx = endPt[0] - startPt[0];
            final dy = endPt[1] - startPt[1];
            final lenPx = math.sqrt(dx * dx + dy * dy);

            if (wallIndex >= 0) {
              final existing = updatedWalls[wallIndex];
              updatedWalls[wallIndex] = AIWall(
                id: existing.id,
                start: startPt,
                end: endPt,
                lengthPx: lenPx,
                lengthM: existing.lengthM,
                thicknessPx: existing.thicknessPx,
                thicknessM: 0.115,
                wallType: 'internal',
                roomIds: {...existing.roomIds, ...roomIds}.toList(),
                doorIds: existing.doorIds,
                windowIds: existing.windowIds,
                isStructural: existing.isStructural,
                confidence: existing.confidence,
              );
            } else {
              final newWall = AIWall(
                id: 'wall_shared_${DateTime.now().millisecondsSinceEpoch}_${i}_$j',
                start: startPt,
                end: endPt,
                lengthPx: lenPx,
                lengthM: (lenPx / 40.0 * 100).round() / 100.0,
                thicknessPx: 12.0,
                thicknessM: 0.115,
                wallType: 'internal',
                roomIds: roomIds,
                doorIds: const [],
                windowIds: const [],
                isStructural: false,
                confidence: 0.99,
              );
              updatedWalls.add(newWall);
            }
          }
        }
      }
    }
  }

  return mergeCoincidentWalls(updatedWalls, thresholdPx);
}

class SharedNodeGraph {
  final Map<String, SharedNode> _nodes = {};

  void buildGraph(List<AIRoom> rooms, List<AIWall> walls, [double thresholdPx = 3.0]) {
    _nodes.clear();
    var nodeCounter = 0;

    SharedNode findOrCreateNode(List<double> point) {
      for (final node in _nodes.values) {
        final dist = math.sqrt((node.point[0] - point[0]) * (node.point[0] - point[0]) +
            (node.point[1] - point[1]) * (node.point[1] - point[1]));
        if (dist <= thresholdPx) {
          return node;
        }
      }
      nodeCounter++;
      final newNode = SharedNode(
        id: 'node_$nodeCounter',
        point: List<double>.from(point),
      );
      _nodes[newNode.id] = newNode;
      return newNode;
    }

    for (final w in walls) {
      if (w.start.isNotEmpty) {
        final node = findOrCreateNode(w.start);
        if (!node.wallStartIds.contains(w.id)) node.wallStartIds.add(w.id);
      }
      if (w.end.isNotEmpty) {
        final node = findOrCreateNode(w.end);
        if (!node.wallEndIds.contains(w.id)) node.wallEndIds.add(w.id);
      }
    }

    for (final r in rooms) {
      for (var idx = 0; idx < r.polygon.length; idx++) {
        final node = findOrCreateNode(r.polygon[idx]);
        node.roomVertices.add(RoomVertexRef(roomId: r.id, vertexIdx: idx));
      }
    }
  }

  List<SharedNode> getAllNodes() {
    return _nodes.values.toList();
  }
}

class TopologyCleanResult {
  final List<AIRoom> rooms;
  final List<AIWall> walls;

  const TopologyCleanResult({
    required this.rooms,
    required this.walls,
  });
}

class _VertexRef {
  final int roomIdx;
  final int polyIdx;
  final double x;
  final double y;

  const _VertexRef({
    required this.roomIdx,
    required this.polyIdx,
    required this.x,
    required this.y,
  });
}

TopologyCleanResult autoAlignAndCleanTopology(
  List<AIRoom> rooms,
  List<AIWall> walls,
) {
  if (rooms.isEmpty) {
    return TopologyCleanResult(rooms: rooms, walls: walls);
  }

  try {
    final originalRooms = rooms;
    final originalWalls = walls;

    final currentRooms = rooms.map((r) {
      final polyCopy = r.polygon.map((pt) => List<double>.from(pt)).toList();
      return AIRoom(
        id: r.id,
        label: r.label,
        roomType: r.roomType,
        polygon: polyCopy,
        centroid: List<double>.from(r.centroid),
        boundingBox: List<double>.from(r.boundingBox),
        areaM2: r.areaM2,
        areaSqft: r.areaSqft,
        perimeterM: r.perimeterM,
        lengthM: r.lengthM,
        widthM: r.widthM,
        aspectRatio: r.aspectRatio,
        floorHeightM: r.floorHeightM,
        classification: r.classification,
        adjacentRoomIds: List<String>.from(r.adjacentRoomIds),
        doorIds: List<String>.from(r.doorIds),
        windowIds: List<String>.from(r.windowIds),
        wallIds: List<String>.from(r.wallIds),
      );
    }).toList();

    var currentWalls = walls.map((w) {
      return AIWall(
        id: w.id,
        start: List<double>.from(w.start),
        end: List<double>.from(w.end),
        lengthPx: w.lengthPx,
        lengthM: w.lengthM,
        thicknessPx: w.thicknessPx,
        thicknessM: w.thicknessM,
        wallType: w.wallType,
        roomIds: List<String>.from(w.roomIds),
        doorIds: List<String>.from(w.doorIds),
        windowIds: List<String>.from(w.windowIds),
        isStructural: w.isStructural,
        confidence: w.confidence,
      );
    }).toList();

    // ── STAGE A: Vertex Coincidence Solver ──
    final allRefs = <_VertexRef>[];
    for (var rIdx = 0; rIdx < currentRooms.length; rIdx++) {
      final r = currentRooms[rIdx];
      if (r.polygon.length >= 3) {
        for (var pIdx = 0; pIdx < r.polygon.length; pIdx++) {
          final pt = r.polygon[pIdx];
          allRefs.add(_VertexRef(roomIdx: rIdx, polyIdx: pIdx, x: pt[0], y: pt[1]));
        }
      }
    }

    final parent = List<int>.generate(allRefs.length, (i) => i);
    int find(int i) => parent[i] == i ? i : (parent[i] = find(parent[i]));
    void union(int i, int j) {
      final rootI = find(i);
      final rootJ = find(j);
      if (rootI != rootJ) parent[rootI] = rootJ;
    }

    for (var i = 0; i < allRefs.length; i++) {
      for (var j = i + 1; j < allRefs.length; j++) {
        if (allRefs[i].roomIdx != allRefs[j].roomIdx) {
          final dist = math.sqrt((allRefs[i].x - allRefs[j].x) * (allRefs[i].x - allRefs[j].x) +
              (allRefs[i].y - allRefs[j].y) * (allRefs[i].y - allRefs[j].y));
          if (dist <= 15.0) {
            union(i, j);
          }
        }
      }
    }

    final clusters = <int, _ClusterAccum>{};
    for (var idx = 0; idx < allRefs.length; idx++) {
      final root = find(idx);
      final cl = clusters.putIfAbsent(root, () => _ClusterAccum());
      cl.sumX += allRefs[idx].x;
      cl.sumY += allRefs[idx].y;
      cl.count += 1;
    }

    for (var idx = 0; idx < allRefs.length; idx++) {
      final ref = allRefs[idx];
      final root = find(idx);
      final cl = clusters[root]!;
      final midX = (cl.sumX / cl.count).roundToDouble();
      final midY = (cl.sumY / cl.count).roundToDouble();
      currentRooms[ref.roomIdx].polygon[ref.polyIdx] = [midX, midY];
    }

    for (var rIdx = 0; rIdx < currentRooms.length; rIdx++) {
      final r = currentRooms[rIdx];
      currentRooms[rIdx] = _updateRoomPolygon(r, removeDuplicateVertices(r.polygon, 1.5));
    }

    // ── STAGE B: Edge Alignment ──
    for (var i = 0; i < currentRooms.length; i++) {
      for (var j = i + 1; j < currentRooms.length; j++) {
        final polyA = currentRooms[i].polygon;
        final polyB = currentRooms[j].polygon;

        for (var a = 0; a < polyA.length; a++) {
          final a1 = polyA[a];
          final a2 = polyA[(a + 1) % polyA.length];
          final dxA = a2[0] - a1[0];
          final dyA = a2[1] - a1[1];
          final lenA = math.sqrt(dxA * dxA + dyA * dyA);
          if (lenA < 1) continue;
          final angleA = math.atan2(dyA, dxA);

          for (var b = 0; b < polyB.length; b++) {
            final b1 = polyB[b];
            final b2 = polyB[(b + 1) % polyB.length];
            final dxB = b2[0] - b1[0];
            final dyB = b2[1] - b1[1];
            final lenB = math.sqrt(dxB * dxB + dyB * dyB);
            if (lenB < 1) continue;
            final angleB = math.atan2(dyB, dxB);

            var diffDeg = ((angleA - angleB) * (180 / math.pi)).abs() % 180;
            if (diffDeg > 90) diffDeg = 180 - diffDeg;

            if (diffDeg <= 3.0) {
              final midA = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2];
              final midB = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2];
              final distMid = math.sqrt(
                  (midA[0] - midB[0]) * (midA[0] - midB[0]) + (midA[1] - midB[1]) * (midA[1] - midB[1]));

              if (distMid <= 15.0) {
                final isHorizontal = dxA.abs() > dyA.abs();
                if (isHorizontal) {
                  final targetY = ((midA[1] + midB[1]) / 2).roundToDouble();
                  polyA[a][1] = targetY;
                  polyA[(a + 1) % polyA.length][1] = targetY;
                  polyB[b][1] = targetY;
                  polyB[(b + 1) % polyB.length][1] = targetY;
                } else {
                  final targetX = ((midA[0] + midB[0]) / 2).roundToDouble();
                  polyA[a][0] = targetX;
                  polyA[(a + 1) % polyA.length][0] = targetX;
                  polyB[b][0] = targetX;
                  polyB[(b + 1) % polyB.length][0] = targetX;
                }
              }
            }
          }
        }
      }
    }

    // ── STAGE C: Air Gap Elimination & Recomputation ──
    for (var rIdx = 0; rIdx < currentRooms.length; rIdx++) {
      final r = currentRooms[rIdx];
      if (r.polygon.length >= 3) {
        final cleanedPoly = removeDuplicateVertices(r.polygon, 1.5);

        var minX = double.infinity, minY = double.infinity;
        var maxX = -double.infinity, maxY = -double.infinity;
        for (final pt in cleanedPoly) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] > maxY) maxY = pt[1];
        }
        final bboxW = maxX - minX;
        final bboxH = maxY - minY;
        final bbox = [minX, minY, bboxW, bboxH];

        final sumX = cleanedPoly.fold<double>(0.0, (s, p) => s + p[0]);
        final sumY = cleanedPoly.fold<double>(0.0, (s, p) => s + p[1]);
        final centroid = [(sumX / cleanedPoly.length).roundToDouble(), (sumY / cleanedPoly.length).roundToDouble()];

        var areaPx = 0.0;
        for (var k = 0; k < cleanedPoly.length; k++) {
          final nextK = (k + 1) % cleanedPoly.length;
          areaPx += cleanedPoly[k][0] * cleanedPoly[nextK][1];
          areaPx -= cleanedPoly[nextK][0] * cleanedPoly[k][1];
        }
        areaPx = areaPx.abs() / 2.0;

        final origAreaM2 = r.areaM2;
        final origPoly = originalRooms[rIdx].polygon;
        var calcAreaM2 = 0.0;

        if (origAreaM2 > 0 && origPoly.length >= 3) {
          var origAreaPx = 0.0;
          for (var k = 0; k < origPoly.length; k++) {
            final nextK = (k + 1) % origPoly.length;
            origAreaPx += origPoly[k][0] * origPoly[nextK][1];
            origAreaPx -= origPoly[nextK][0] * origPoly[k][1];
          }
          origAreaPx = origAreaPx.abs() / 2.0;
          if (origAreaPx > 0) {
            calcAreaM2 = ((areaPx * (origAreaM2 / origAreaPx)) * 10).round() / 10.0;
          }
        } else {
          calcAreaM2 = ((areaPx / 1600.0) * 10).round() / 10.0;
        }

        final areaSqft = (calcAreaM2 * 10.7639).roundToDouble();
        final perimeterM = (((bboxW + bboxH) * 2 / 40.0) * 10).round() / 10.0;

        currentRooms[rIdx] = AIRoom(
          id: r.id,
          label: r.label,
          roomType: r.roomType,
          polygon: cleanedPoly,
          centroid: centroid,
          boundingBox: bbox,
          areaM2: calcAreaM2,
          areaSqft: areaSqft,
          perimeterM: perimeterM,
          lengthM: r.lengthM,
          widthM: r.widthM,
          aspectRatio: r.aspectRatio,
          floorHeightM: r.floorHeightM,
          classification: r.classification,
          adjacentRoomIds: r.adjacentRoomIds,
          doorIds: r.doorIds,
          windowIds: r.windowIds,
          wallIds: r.wallIds,
        );
      }
    }

    // ── STAGE D: Shared Wall Deduplication ──
    currentWalls = syncCoincidentRoomWalls(currentRooms, currentWalls, 15.0);

    currentWalls = currentWalls.map((w) {
      if (w.roomIds.length > 1) {
        return AIWall(
          id: w.id,
          start: w.start,
          end: w.end,
          lengthPx: w.lengthPx,
          lengthM: w.lengthM,
          thicknessPx: w.thicknessPx,
          thicknessM: 0.115,
          wallType: 'internal',
          roomIds: w.roomIds.toSet().toList(),
          doorIds: w.doorIds,
          windowIds: w.windowIds,
          isStructural: w.isStructural,
          confidence: w.confidence,
        );
      }
      return w;
    }).toList();

    currentWalls = mergeCoincidentWalls(currentWalls, 2.0);

    // ── VALIDATION CHECKS ──
    final hasZeroLengthWall = currentWalls.any((w) =>
        w.start.isEmpty ||
        w.end.isEmpty ||
        (w.start[0] == w.end[0] && w.start[1] == w.end[1]));
    if (hasZeroLengthWall) return TopologyCleanResult(rooms: originalRooms, walls: originalWalls);

    final hasInvalidRoom = currentRooms.any((r) => r.polygon.length < 3);
    if (hasInvalidRoom) return TopologyCleanResult(rooms: originalRooms, walls: originalWalls);

    final hasInvalidSharedWall = currentWalls.any((w) => w.wallType == 'internal' && w.roomIds.length > 2);
    if (hasInvalidSharedWall) return TopologyCleanResult(rooms: originalRooms, walls: originalWalls);

    return TopologyCleanResult(rooms: currentRooms, walls: currentWalls);
  } catch (err) {
    return TopologyCleanResult(rooms: rooms, walls: walls);
  }
}

AIRoom _updateRoomPolygon(AIRoom room, List<List<double>> newPoly) {
  return AIRoom(
    id: room.id,
    label: room.label,
    roomType: room.roomType,
    polygon: newPoly,
    centroid: room.centroid,
    boundingBox: room.boundingBox,
    areaM2: room.areaM2,
    areaSqft: room.areaSqft,
    perimeterM: room.perimeterM,
    lengthM: room.lengthM,
    widthM: room.widthM,
    aspectRatio: room.aspectRatio,
    floorHeightM: room.floorHeightM,
    classification: room.classification,
    adjacentRoomIds: room.adjacentRoomIds,
    doorIds: room.doorIds,
    windowIds: room.windowIds,
    wallIds: room.wallIds,
  );
}

class _ClusterAccum {
  double sumX = 0.0;
  double sumY = 0.0;
  int count = 0;
}
