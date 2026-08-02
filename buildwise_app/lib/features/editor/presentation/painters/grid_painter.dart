import 'package:flutter/material.dart';

class GridPainter extends CustomPainter {
  final double zoom;
  final List<double> panOffset;
  final bool showGrid;
  final double gridSizeMm;

  GridPainter({
    required this.zoom,
    required this.panOffset,
    this.showGrid = true,
    this.gridSizeMm = 100.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (!showGrid) return;

    final panX = panOffset[0];
    final panY = panOffset[1];

    // Grid spacing in screen pixels
    const pxPerMeter = 40.0;
    final gridPx = (gridSizeMm / 1000.0) * pxPerMeter * zoom;

    if (gridPx < 4.0) return; // Hide if too dense

    final minorPaint = Paint()
      ..color = const Color(0xFF334155).withOpacity(0.25)
      ..strokeWidth = 1.0;

    final majorPaint = Paint()
      ..color = const Color(0xFF475569).withOpacity(0.50)
      ..strokeWidth = 1.5;

    final originPaint = Paint()
      ..color = const Color(0xFF3B82F6).withOpacity(0.70)
      ..strokeWidth = 2.0;

    final startX = (panX % gridPx) - gridPx;
    final startY = (panY % gridPx) - gridPx;

    // Draw Vertical Grid Lines
    for (var x = startX; x < size.width + gridPx; x += gridPx) {
      final worldX = (x - panX) / (pxPerMeter * zoom);
      final isMajor = (worldX.round() % 5 == 0);

      canvas.drawLine(
        Offset(x, 0),
        Offset(x, size.height),
        isMajor ? majorPaint : minorPaint,
      );
    }

    // Draw Horizontal Grid Lines
    for (var y = startY; y < size.height + gridPx; y += gridPx) {
      final worldY = (y - panY) / (pxPerMeter * zoom);
      final isMajor = (worldY.round() % 5 == 0);

      canvas.drawLine(
        Offset(0, y),
        Offset(size.width, y),
        isMajor ? majorPaint : minorPaint,
      );
    }

    // Draw Origin Axis X=0, Y=0
    if (panX >= 0 && panX <= size.width) {
      canvas.drawLine(Offset(panX, 0), Offset(panX, size.height), originPaint);
    }
    if (panY >= 0 && panY <= size.height) {
      canvas.drawLine(Offset(0, panY), Offset(size.width, panY), originPaint);
    }
  }

  @override
  bool shouldRepaint(covariant GridPainter oldDelegate) {
    return oldDelegate.zoom != zoom ||
        oldDelegate.panOffset[0] != panOffset[0] ||
        oldDelegate.panOffset[1] != panOffset[1] ||
        oldDelegate.showGrid != showGrid ||
        oldDelegate.gridSizeMm != gridSizeMm;
  }
}
