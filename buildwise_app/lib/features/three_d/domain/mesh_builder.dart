import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:vector_math/vector_math_64.dart' as v64;

import '../../../models/ai_column.dart';
import '../../../models/ai_door.dart';
import '../../../models/ai_room.dart';
import '../../../models/ai_wall.dart';
import '../../../models/ai_window.dart';

/// Centralized 2D -> 3D Coordinate Transformer
/// 2D X -> 3D X
/// 2D Y -> 3D Z
/// Height -> 3D Y
class Building3DTransform {
  final double scaleFactor;
  final v64.Vector2 centerOffset;

  const Building3DTransform({
    this.scaleFactor = 0.035,
    required this.centerOffset,
  });

  factory Building3DTransform.fromRooms(List<AIRoom> rooms, {double scaleFactor = 0.035}) {
    if (rooms.isEmpty) {
      return Building3DTransform(scaleFactor: scaleFactor, centerOffset: v64.Vector2.zero());
    }

    double minX = double.infinity;
    double minY = double.infinity;
    double maxX = double.negativeInfinity;
    double maxY = double.negativeInfinity;

    for (final room in rooms) {
      for (final p in room.polygon) {
        if (p.length >= 2) {
          final sx = p[0] * scaleFactor;
          final sy = p[1] * scaleFactor;
          if (sx < minX) minX = sx;
          if (sy < minY) minY = sy;
          if (sx > maxX) maxX = sx;
          if (sy > maxY) maxY = sy;
        }
      }
    }

    if (minX.isInfinite || maxX.isInfinite) {
      return Building3DTransform(scaleFactor: scaleFactor, centerOffset: v64.Vector2.zero());
    }

    return Building3DTransform(
      scaleFactor: scaleFactor,
      centerOffset: v64.Vector2((minX + maxX) / 2.0, (minY + maxY) / 2.0),
    );
  }

  v64.Vector3 to3DPoint(double x2d, double y2d, [double height3d = 0.0]) {
    final x3d = x2d * scaleFactor - centerOffset.x;
    final z3d = y2d * scaleFactor - centerOffset.y;
    return v64.Vector3(x3d, height3d, z3d);
  }
}

/// Room Colors matching Web ROOM_3D_COLORS
const Map<String, Color> ROOM_3D_COLORS = {
  'bedroom': Color(0xFF8B5CF6),
  'master_bedroom': Color(0xFF7C3AED),
  'living_room': Color(0xFF10B981),
  'kitchen': Color(0xFFF59E0B),
  'bathroom': Color(0xFF3B82F6),
  'toilet': Color(0xFF6366F1),
  'dining_room': Color(0xFFEC4899),
  'balcony': Color(0xFF22C55E),
  'passage': Color(0xFF9CA3AF),
  'staircase': Color(0xFFA855F7),
  'store_room': Color(0xFF6B7280),
  'utility': Color(0xFF4B5563),
  'pooja_room': Color(0xFFFB923C),
  'study': Color(0xFF0EA5E9),
  'corridor': Color(0xFF9CA3AF),
  'entrance': Color(0xFF10B981),
  'lobby': Color(0xFF10B981),
  'garage': Color(0xFF6B7280),
};

Color getRoom3DColor(String label) {
  final key = label.toLowerCase().replaceAll(RegExp(r'\s+'), '_').replaceAll(RegExp(r'\d+'), '').replaceAll(RegExp(r'_+$'), '');
  return ROOM_3D_COLORS[key] ?? const Color(0xFF7C3AED);
}

/// 3D Mesh representation of a Wall
class WallMesh3D {
  final String id;
  final v64.Vector3 midPosition;
  final double length;
  final double height;
  final double thickness;
  final double angle;
  final String wallType; // 'internal' | 'external'
  final Color color;

  const WallMesh3D({
    required this.id,
    required this.midPosition,
    required this.length,
    required this.height,
    required this.thickness,
    required this.angle,
    required this.wallType,
    required this.color,
  });

  /// Deduplicates shared room walls (matching Web Building3DViewer.tsx)
  static List<WallMesh3D> buildDeduplicatedWalls({
    required List<AIRoom> rooms,
    required List<AIWall> explicitWalls,
    required Building3DTransform transform,
    double floorHeight = 3.0,
    double wallThickness = 0.23,
  }) {
    if (explicitWalls.isNotEmpty) {
      return explicitWalls.asMap().entries.map((entry) {
        final idx = entry.key;
        final w = entry.value;
        final p1 = transform.to3DPoint(w.start[0], w.start[1], floorHeight / 2);
        final p2 = transform.to3DPoint(w.end[0], w.end[1], floorHeight / 2);
        final dx = p2.x - p1.x;
        final dz = p2.z - p1.z;
        final len = math.max(0.1, math.sqrt(dx * dx + dz * dz));
        final angle = math.atan2(dz, dx);
        final thick = w.thicknessM > 0
            ? w.thicknessM
            : (w.wallType == 'internal' ? 0.115 : wallThickness);

        return WallMesh3D(
          id: w.id.isNotEmpty ? w.id : 'wall_$idx',
          midPosition: v64.Vector3((p1.x + p2.x) / 2, floorHeight / 2, (p1.z + p2.z) / 2),
          length: len,
          height: floorHeight,
          thickness: thick,
          angle: angle,
          wallType: w.wallType,
          color: w.wallType == 'internal' ? const Color(0xFFCBD5E1) : const Color(0xFF94A3B8),
        );
      }).toList();
    }

    if (rooms.isEmpty) return [];

    // Build edge map from room polygons
    final edgeMap = <String, _EdgeData>{};

    for (final room in rooms) {
      final poly = room.polygon;
      if (poly.length < 3) continue;

      for (int i = 0; i < poly.length; i++) {
        final p1 = transform.to3DPoint(poly[i][0], poly[i][1]);
        final p2 = transform.to3DPoint(poly[(i + 1) % poly.length][0], poly[(i + 1) % poly.length][1]);

        final k1 = '${p1.x.toStringAsFixed(2)},${p1.z.toStringAsFixed(2)}';
        final k2 = '${p2.x.toStringAsFixed(2)},${p2.z.toStringAsFixed(2)}';
        final edgeKey = k1.compareTo(k2) < 0 ? '${k1}_$k2' : '${k2}_$k1';

        if (edgeMap.containsKey(edgeKey)) {
          edgeMap[edgeKey]!.count += 1;
        } else {
          edgeMap[edgeKey] = _EdgeData(p1: p1, p2: p2, count: 1);
        }
      }
    }

    final result = <WallMesh3D>[];
    int idx = 0;

    for (final edge in edgeMap.values) {
      final dx = edge.p2.x - edge.p1.x;
      final dz = edge.p2.z - edge.p1.z;
      final len = math.sqrt(dx * dx + dz * dz);
      if (len < 0.05) continue;

      final isInternal = edge.count > 1;
      final thick = isInternal ? 0.115 : wallThickness;
      final angle = math.atan2(dz, dx);

      result.add(WallMesh3D(
        id: 'room_wall_${idx++}',
        midPosition: v64.Vector3((edge.p1.x + edge.p2.x) / 2, floorHeight / 2, (edge.p1.z + edge.p2.z) / 2),
        length: len,
        height: floorHeight,
        thickness: thick,
        angle: angle,
        wallType: isInternal ? 'internal' : 'external',
        color: isInternal ? const Color(0xFFCBD5E1) : const Color(0xFF94A3B8),
      ));
    }

    return result;
  }
}

class _EdgeData {
  final v64.Vector3 p1;
  final v64.Vector3 p2;
  int count;

  _EdgeData({required this.p1, required this.p2, required this.count});
}

/// 3D Mesh representation of a Room
class RoomMesh3D {
  final String id;
  final String label;
  final Color color;
  final double areaM2;
  final double perimeterM;
  final List<v64.Vector3> polygon3D;
  final v64.Vector3 centroid;

  const RoomMesh3D({
    required this.id,
    required this.label,
    required this.color,
    required this.areaM2,
    required this.perimeterM,
    required this.polygon3D,
    required this.centroid,
  });

  factory RoomMesh3D.fromAIRoom(AIRoom room, Building3DTransform transform, {double floorHeight = 3.0}) {
    final poly3d = room.polygon.map((p) => transform.to3DPoint(p[0], p[1], 0.0)).toList();

    double cx = 0.0;
    double cz = 0.0;
    if (poly3d.isNotEmpty) {
      cx = poly3d.fold(0.0, (sum, pt) => sum + pt.x) / poly3d.length;
      cz = poly3d.fold(0.0, (sum, pt) => sum + pt.z) / poly3d.length;
    }

    return RoomMesh3D(
      id: room.id,
      label: room.label,
      color: getRoom3DColor(room.label),
      areaM2: room.areaM2,
      perimeterM: room.perimeterM,
      polygon3D: poly3d,
      centroid: v64.Vector3(cx, floorHeight * 0.5, cz),
    );
  }
}

/// 3D Marker representation of a Door
class DoorMesh3D {
  final String id;
  final v64.Vector3 position;
  final double width;
  final double height;
  final double swingAngle;

  const DoorMesh3D({
    required this.id,
    required this.position,
    required this.width,
    required this.height,
    this.swingAngle = 90.0,
  });

  factory DoorMesh3D.fromAIDoor(AIDoor door, Building3DTransform transform, {double floorHeight = 3.0}) {
    final pos3d = transform.to3DPoint(door.center[0], door.center[1], 0.0);
    final w = door.widthM > 0 ? door.widthM : 0.9;
    final h = math.min(w * 2.33, floorHeight * 0.85);

    return DoorMesh3D(
      id: door.id,
      position: pos3d,
      width: w,
      height: h,
      swingAngle: door.swingAngle,
    );
  }
}

/// 3D Marker representation of a Window
class WindowMesh3D {
  final String id;
  final v64.Vector3 position;
  final double width;
  final double height;
  final double sillHeight;

  const WindowMesh3D({
    required this.id,
    required this.position,
    required this.width,
    required this.height,
    required this.sillHeight,
  });

  factory WindowMesh3D.fromAIWindow(AIWindow window, Building3DTransform transform) {
    final pos3d = transform.to3DPoint(window.center[0], window.center[1], window.sillHeightM);
    return WindowMesh3D(
      id: window.id,
      position: pos3d,
      width: window.widthM > 0 ? window.widthM : 1.2,
      height: window.heightM > 0 ? window.heightM : 1.2,
      sillHeight: window.sillHeightM > 0 ? window.sillHeightM : 0.9,
    );
  }
}

/// 3D Mesh representation of a Column
class ColumnMesh3D {
  final String id;
  final v64.Vector3 position;
  final double width;
  final double depth;
  final double height;
  final String shape; // 'square' | 'circular'

  const ColumnMesh3D({
    required this.id,
    required this.position,
    required this.width,
    required this.depth,
    required this.height,
    required this.shape,
  });

  factory ColumnMesh3D.fromAIColumn(AIColumn column, Building3DTransform transform, {double floorHeight = 3.0}) {
    final center = column.center.length >= 2 ? column.center : [0.0, 0.0];
    final size = column.sizeM.length >= 2 ? column.sizeM : [0.23, 0.23];
    final pos3d = transform.to3DPoint(center[0], center[1], floorHeight / 2);

    return ColumnMesh3D(
      id: column.id,
      position: pos3d,
      width: size[0],
      depth: size[1],
      height: floorHeight,
      shape: column.shape,
    );
  }
}
