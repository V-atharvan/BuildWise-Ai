import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../models/estimation_result.dart';
import '../../domain/snap_engine.dart';

class FloorPlanPainter extends CustomPainter {
  final FloorPlanAnalysisResult plan;
  final double zoom;
  final List<double> panOffset;
  final String? selectedId;
  final String? selectedType;
  final SnapTarget? activeSnapTarget;

  FloorPlanPainter({
    required this.plan,
    required this.zoom,
    required this.panOffset,
    this.selectedId,
    this.selectedType,
    this.activeSnapTarget,
  });

  Offset _worldToScreen(List<double> pt) {
    const pxPerMeter = 40.0;
    final sx = panOffset[0] + (pt[0] * pxPerMeter * zoom);
    final sy = panOffset[1] + (pt[1] * pxPerMeter * zoom);
    return Offset(sx, sy);
  }

  @override
  void paint(Canvas canvas, Size size) {
    const pxPerMeter = 40.0;

    // ── 1. Render Rooms ──
    for (final room in plan.rooms) {
      final poly = room.polygon;
      if (poly.length < 3) continue;

      final path = Path();
      final start = _worldToScreen(poly.first);
      path.moveTo(start.dx, start.dy);

      for (var i = 1; i < poly.length; i++) {
        final pt = _worldToScreen(poly[i]);
        path.lineTo(pt.dx, pt.dy);
      }
      path.close();

      final isSelected = selectedId == room.id;

      final fillPaint = Paint()
        ..color = isSelected
            ? const Color(0xFF8B5CF6).withOpacity(0.35)
            : const Color(0xFF3B82F6).withOpacity(0.12)
        ..style = PaintingStyle.fill;

      final strokePaint = Paint()
        ..color = isSelected ? const Color(0xFFA855F7) : const Color(0xFF64748B)
        ..strokeWidth = isSelected ? 3.0 : 1.5
        ..style = PaintingStyle.stroke;

      canvas.drawPath(path, fillPaint);
      canvas.drawPath(path, strokePaint);

      // Room label & area text
      final centroid = _worldToScreen(room.centroid);
      final textPainter = TextPainter(
        text: TextSpan(
          text: '${room.label}\n${room.areaM2.toStringAsFixed(1)} m²',
          style: TextStyle(
            color: Colors.white,
            fontSize: (12.0 * zoom).clamp(10.0, 18.0),
            fontWeight: FontWeight.bold,
            shadows: const [Shadow(blurRadius: 3, color: Colors.black)],
          ),
        ),
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(centroid.dx - textPainter.width / 2, centroid.dy - textPainter.height / 2),
      );
    }

    // ── 2. Render Walls ──
    for (final wall in plan.walls) {
      if (wall.start.isEmpty || wall.end.isEmpty) continue;

      final p1 = _worldToScreen(wall.start);
      final p2 = _worldToScreen(wall.end);
      final isSelected = selectedId == wall.id;

      final wallThickPx = (wall.thicknessM > 0 ? wall.thicknessM : 0.23) * pxPerMeter * zoom;

      final wallPaint = Paint()
        ..color = isSelected
            ? const Color(0xFFEC4899)
            : (wall.wallType == 'internal' ? const Color(0xFF94A3B8) : const Color(0xFF475569))
        ..strokeWidth = math.max(2.0, wallThickPx)
        ..strokeCap = StrokeCap.square;

      canvas.drawLine(p1, p2, wallPaint);

      // Centerline
      final centerPaint = Paint()
        ..color = isSelected ? Colors.yellow : const Color(0xFF38BDF8).withOpacity(0.5)
        ..strokeWidth = 1.0;
      canvas.drawLine(p1, p2, centerPaint);
    }

    // ── 3. Render Doors ──
    for (final door in plan.doors) {
      if (door.center.isEmpty) continue;
      final c = _worldToScreen(door.center);
      final isSelected = selectedId == door.id;

      final doorPaint = Paint()
        ..color = isSelected ? const Color(0xFFF59E0B) : const Color(0xFF10B981)
        ..style = PaintingStyle.fill;

      canvas.drawCircle(c, math.max(4.0, 6.0 * zoom), doorPaint);
    }

    // ── 4. Render Windows ──
    for (final win in plan.windows) {
      if (win.center.isEmpty) continue;
      final c = _worldToScreen(win.center);
      final isSelected = selectedId == win.id;

      final winPaint = Paint()
        ..color = isSelected ? const Color(0xFFF59E0B) : const Color(0xFF06B6D4)
        ..style = PaintingStyle.fill;

      final rect = Rect.fromCenter(
        center: c,
        width: math.max(8.0, 14.0 * zoom),
        height: math.max(4.0, 8.0 * zoom),
      );
      canvas.drawRect(rect, winPaint);
    }

    // ── 5. Render Columns ──
    for (final col in plan.columns) {
      if (col.center.isEmpty) continue;
      final c = _worldToScreen(col.center);
      final isSelected = selectedId == col.id;

      final colPaint = Paint()
        ..color = isSelected ? const Color(0xFFEF4444) : const Color(0xFFDC2626)
        ..style = PaintingStyle.fill;

      final side = math.max(6.0, 10.0 * zoom);
      final rect = Rect.fromCenter(center: c, width: side, height: side);
      canvas.drawRect(rect, colPaint);
    }

    // ── 6. Render Active Snap Highlights ──
    if (activeSnapTarget != null) {
      final targetPt = _worldToScreen(activeSnapTarget!.point);

      if (activeSnapTarget!.guideSegment != null) {
        final g1 = _worldToScreen(activeSnapTarget!.guideSegment!.p1);
        final g2 = _worldToScreen(activeSnapTarget!.guideSegment!.p2);
        final guidePaint = Paint()
          ..color = const Color(0xFFA855F7)
          ..strokeWidth = 2.0
          ..style = PaintingStyle.stroke;
        canvas.drawLine(g1, g2, guidePaint);
      }

      final snapPaint = Paint()
        ..color = const Color(0xFFEAB308)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(targetPt, 6.0, snapPaint);
    }
  }

  @override
  bool shouldRepaint(covariant FloorPlanPainter oldDelegate) {
    return oldDelegate.plan != plan ||
        oldDelegate.zoom != zoom ||
        oldDelegate.panOffset[0] != panOffset[0] ||
        oldDelegate.panOffset[1] != panOffset[1] ||
        oldDelegate.selectedId != selectedId ||
        oldDelegate.selectedType != selectedType ||
        oldDelegate.activeSnapTarget != activeSnapTarget;
  }
}
