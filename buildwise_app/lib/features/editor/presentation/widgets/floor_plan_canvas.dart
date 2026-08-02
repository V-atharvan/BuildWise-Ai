import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../painters/floor_plan_painter.dart';
import '../providers/editor_notifier.dart';
import 'editor_grid.dart';

class FloorPlanCanvas extends ConsumerStatefulWidget {
  const FloorPlanCanvas({super.key});

  @override
  ConsumerState<FloorPlanCanvas> createState() => _FloorPlanCanvasState();
}

class _FloorPlanCanvasState extends ConsumerState<FloorPlanCanvas> {
  Offset? _lastPanStart;

  void _onTapDown(TapDownDetails details) {
    final state = ref.read(editorProvider);
    final notifier = ref.read(editorProvider.notifier);

    final localPos = details.localPosition;
    const pxPerMeter = 40.0;

    final worldX = (localPos.dx - state.panOffset[0]) / (pxPerMeter * state.zoom);
    final worldY = (localPos.dy - state.panOffset[1]) / (pxPerMeter * state.zoom);

    // Hit test elements (rooms, walls, doors, windows, columns)
    String? hitId;
    String? hitType;

    // Hit test rooms
    for (final room in state.plan.rooms) {
      if (_isPointInPolygon([worldX, worldY], room.polygon)) {
        hitId = room.id;
        hitType = 'room';
        break;
      }
    }

    // Hit test walls if no room clicked
    if (hitId == null) {
      for (final wall in state.plan.walls) {
        if (wall.start.isNotEmpty && wall.end.isNotEmpty) {
          final dist = _pointToSegmentDist([worldX, worldY], wall.start, wall.end);
          if (dist < 0.4) {
            hitId = wall.id;
            hitType = 'wall';
            break;
          }
        }
      }
    }

    notifier.selectElement(hitId, hitType);
  }

  bool _isPointInPolygon(List<double> pt, List<List<double>> polygon) {
    if (polygon.length < 3) return false;
    var inside = false;
    final x = pt[0], y = pt[1];

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      final xi = polygon[i][0], yi = polygon[i][1];
      final xj = polygon[j][0], yj = polygon[j][1];

      final intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  double _pointToSegmentDist(List<double> pt, List<double> p1, List<double> p2) {
    final x = pt[0], y = pt[1];
    final x1 = p1[0], y1 = p1[1];
    final x2 = p2[0], y2 = p2[1];
    final dx = x2 - x1, dy = y2 - y1;
    final lenSq = dx * dx + dy * dy;
    var t = lenSq > 0 ? ((x - x1) * dx + (y - y1) * dy) / lenSq : 0.0;
    t = t.clamp(0.0, 1.0);
    final px = x1 + t * dx, py = y1 + t * dy;
    return math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(editorProvider);
    final notifier = ref.read(editorProvider.notifier);

    return GestureDetector(
      onTapDown: _onTapDown,
      onPanStart: (details) {
        _lastPanStart = details.localPosition;
      },
      onPanUpdate: (details) {
        if (_lastPanStart != null) {
          final dx = details.localPosition.dx - _lastPanStart!.dx;
          final dy = details.localPosition.dy - _lastPanStart!.dy;
          _lastPanStart = details.localPosition;

          notifier.updateViewport(
            state.zoom,
            [state.panOffset[0] + dx, state.panOffset[1] + dy],
          );
        }
      },
      onPanEnd: (_) {
        _lastPanStart = null;
      },
      child: MouseRegion(
        onHover: (event) {
          const pxPerMeter = 40.0;
          final localPos = event.localPosition;
          final worldX = (localPos.dx - state.panOffset[0]) / (pxPerMeter * state.zoom);
          final worldY = (localPos.dy - state.panOffset[1]) / (pxPerMeter * state.zoom);
          notifier.updateHoverPoint([worldX, worldY]);
        },
        child: Container(
          color: const Color(0xFF0F172A),
          child: Stack(
            children: [
              EditorGrid(
                zoom: state.zoom,
                panOffset: state.panOffset,
                showGrid: state.showGrid,
              ),
              Positioned.fill(
                child: CustomPaint(
                  painter: FloorPlanPainter(
                    plan: state.plan,
                    zoom: state.zoom,
                    panOffset: state.panOffset,
                    selectedId: state.selectedId,
                    selectedType: state.selectedType,
                    activeSnapTarget: state.activeSnapTarget,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
