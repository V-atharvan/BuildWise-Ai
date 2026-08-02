import 'package:flutter/material.dart';
import '../painters/grid_painter.dart';

class EditorGrid extends StatelessWidget {
  final double zoom;
  final List<double> panOffset;
  final bool showGrid;

  const EditorGrid({
    super.key,
    required this.zoom,
    required this.panOffset,
    this.showGrid = true,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: CustomPaint(
        painter: GridPainter(
          zoom: zoom,
          panOffset: panOffset,
          showGrid: showGrid,
        ),
      ),
    );
  }
}
