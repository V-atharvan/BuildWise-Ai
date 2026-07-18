import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../estimation/presentation/screens/boq_materials_screen.dart';

class CvAnalysisScreen extends StatefulWidget {
  final String planId;
  const CvAnalysisScreen({super.key, required this.planId});

  @override
  State<CvAnalysisScreen> createState() => _CvAnalysisScreenState();
}

class _CvAnalysisScreenState extends State<CvAnalysisScreen>
    with TickerProviderStateMixin {
  double _confidenceThreshold = 85;
  bool _sheetExpanded = false;

  late AnimationController _scanController;
  late Animation<double> _scanAnimation;

  late AnimationController _sheetController;
  late Animation<double> _sheetAnimation;

  final List<_RoomEntity> _rooms = const [
    _RoomEntity(
      name: 'Living Room',
      icon: Icons.weekend_rounded,
      wallLength: 72,
      area: 320,
      color: Color(0xFF22C55E),
    ),
    _RoomEntity(
      name: 'Bedroom 1',
      icon: Icons.bed_rounded,
      wallLength: 50,
      area: 150,
      color: Color(0xFF3B82F6),
    ),
    _RoomEntity(
      name: 'Kitchen',
      icon: Icons.countertops_rounded,
      wallLength: 44,
      area: 120,
      color: Color(0xFFF97316),
    ),
    _RoomEntity(
      name: 'Bathroom',
      icon: Icons.bathtub_rounded,
      wallLength: 28,
      area: 60,
      color: Color(0xFF8B5CF6),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
    _scanAnimation = Tween<double>(begin: 0, end: 1).animate(_scanController);

    _sheetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
      value: 0.0,
    );
    _sheetAnimation = CurvedAnimation(
      parent: _sheetController,
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _scanController.dispose();
    _sheetController.dispose();
    super.dispose();
  }

  void _toggleSheet() {
    setState(() => _sheetExpanded = !_sheetExpanded);
    if (_sheetExpanded) {
      _sheetController.forward();
    } else {
      _sheetController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFF09090B);
    const primary = AppColors.primary;
    const textPrimary = Color(0xFFE5E1E4);
    const textSecondary = Color(0xFFCCC3D8);

    return Scaffold(
      backgroundColor: const Color(0xFF0E0E12),
      body: Stack(
        children: [
          // ── Blueprint Canvas ──
          Positioned.fill(
            child: _buildBlueprintCanvas(primary),
          ),

          // ── Top App Bar ──
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                height: 56,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: bg.withOpacity(0.85),
                  border: const Border(
                    bottom: BorderSide(color: Color(0x0DFFFFFF), width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: const Icon(Icons.arrow_back_rounded, color: Color(0xFFCCC3D8), size: 24),
                    ),
                    const SizedBox(width: 14),
                    Text(
                      'CV Visualizer',
                      style: AppTypography.titleMedium.copyWith(
                        color: primary,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const Spacer(),
                    const Icon(Icons.settings_rounded, color: Color(0xFFCCC3D8), size: 22),
                    const SizedBox(width: 14),
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: primary.withOpacity(0.1),
                        shape: BoxShape.circle,
                        border: Border.all(color: primary.withOpacity(0.3)),
                      ),
                      child: Icon(Icons.person_rounded, color: primary, size: 18),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Float zoom controls ──
          Positioned(
            top: 80,
            right: 16,
            child: SafeArea(
              child: Column(
                children: [
                  _buildFloatButton(Icons.zoom_in_rounded, primary),
                  const SizedBox(height: 8),
                  _buildFloatButton(Icons.zoom_out_rounded, primary),
                  const SizedBox(height: 8),
                  _buildFloatButton(Icons.layers_rounded, primary),
                ],
              ),
            ),
          ),

          // ── Confidence Slider ──
          Positioned(
            left: 0,
            right: 0,
            bottom: _sheetExpanded ? 360 : 100,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0x99201F22),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x0DFFFFFF)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'CV Confidence Threshold',
                          style: AppTypography.labelSmall.copyWith(
                            color: textSecondary,
                            letterSpacing: 0.8,
                          ),
                        ),
                        Text(
                          '${_confidenceThreshold.round()}%',
                          style: AppTypography.labelMedium.copyWith(
                            color: primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: primary,
                        inactiveTrackColor: Colors.white.withOpacity(0.08),
                        thumbColor: Colors.white,
                        overlayColor: primary.withOpacity(0.12),
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
                        trackHeight: 4,
                      ),
                      child: Slider(
                        value: _confidenceThreshold,
                        min: 0,
                        max: 100,
                        onChanged: (v) => setState(() => _confidenceThreshold = v),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Collapsible Bottom Sheet ──
          AnimatedBuilder(
            animation: _sheetAnimation,
            builder: (context, child) {
              final dy = (1 - _sheetAnimation.value) * 0.65;
              return Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: FractionalTranslation(
                  translation: Offset(0, dy),
                  child: child!,
                ),
              );
            },
            child: Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.65,
              ),
              decoration: const BoxDecoration(
                color: Color(0xD919191E),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
                border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Drag handle
                  GestureDetector(
                    onTap: _toggleSheet,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Center(
                        child: Container(
                          width: 48,
                          height: 5,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Sheet content
                  Flexible(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Parsed Entities',
                                    style: AppTypography.headlineSmall.copyWith(
                                      color: textPrimary,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  Text(
                                    'Extracting dimensions from scan_v2.pdf',
                                    style: AppTypography.bodySmall.copyWith(color: textSecondary),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: primary.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(99),
                                  border: Border.all(color: primary.withOpacity(0.2)),
                                ),
                                child: Row(
                                  children: [
                                    _PulsingDot(color: primary),
                                    const SizedBox(width: 6),
                                    Text(
                                      'LIVE OCR',
                                      style: AppTypography.labelSmall.copyWith(
                                        color: primary,
                                        letterSpacing: 1.0,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          ..._rooms.map((room) => _buildRoomRow(room, primary, textPrimary, textSecondary)),
                          const SizedBox(height: 16),
                          // Export button
                          GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const BoqMaterialsScreen(
                                    projectName: 'Greenwood Villa',
                                    totalCost: 48250.00,
                                  ),
                                ),
                              );
                            },
                            child: Container(
                              height: 52,
                              decoration: BoxDecoration(
                                color: primary,
                                borderRadius: BorderRadius.circular(99),
                                boxShadow: [
                                  BoxShadow(
                                    color: primary.withOpacity(0.3),
                                    blurRadius: 20,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.file_upload_rounded, color: Colors.white, size: 20),
                                  const SizedBox(width: 10),
                                  Text(
                                    'Export Estimation Report',
                                    style: AppTypography.titleSmall.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBlueprintCanvas(Color primary) {
    return AnimatedBuilder(
      animation: _scanAnimation,
      builder: (context, child) {
        return CustomPaint(
          painter: _BlueprintPainter(
            scanProgress: _scanAnimation.value,
            primaryColor: primary,
          ),
          child: Container(),
        );
      },
    );
  }

  Widget _buildFloatButton(IconData icon, Color primary) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: const Color(0xCC2A2A2C),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Icon(icon, color: const Color(0xFFCCC3D8), size: 20),
    );
  }

  Widget _buildRoomRow(_RoomEntity room, Color primary, Color textPrimary, Color textSecondary) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0x801C1B1D),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: room.color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(room.icon, color: room.color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  room.name,
                  style: AppTypography.bodyLarge.copyWith(
                    color: textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  '${room.wallLength} ft total wall',
                  style: AppTypography.labelMedium.copyWith(color: textSecondary),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: '${room.area}',
                      style: AppTypography.titleMedium.copyWith(
                        color: primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    TextSpan(
                      text: ' sq ft',
                      style: AppTypography.bodySmall.copyWith(color: textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Data models
class _RoomEntity {
  final String name;
  final IconData icon;
  final double wallLength;
  final double area;
  final Color color;

  const _RoomEntity({
    required this.name,
    required this.icon,
    required this.wallLength,
    required this.area,
    required this.color,
  });
}

// Custom painter for blueprint with overlays
class _BlueprintPainter extends CustomPainter {
  final double scanProgress;
  final Color primaryColor;

  _BlueprintPainter({required this.scanProgress, required this.primaryColor});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFF0E0E12);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    // Grid lines (blueprint)
    final gridPaint = Paint()
      ..color = Colors.white.withOpacity(0.04)
      ..strokeWidth = 0.5;
    const gridSize = 32.0;
    for (double x = 0; x < size.width; x += gridSize) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += gridSize) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final cx = size.width * 0.5;
    final cy = size.height * 0.42;
    final w = size.width * 0.82;
    final h = size.height * 0.52;
    final left = cx - w / 2;
    final top = cy - h / 2;

    // Room walls (white lines)
    final wallPaint = Paint()
      ..color = Colors.white.withOpacity(0.25)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    _drawBlueprintWalls(canvas, left, top, w, h, wallPaint);

    // Room overlays
    _drawRoomOverlay(canvas, left + w * 0.05, top + h * 0.05, w * 0.38, h * 0.27,
        const Color(0xFF22C55E), 'Kitchen 12x14');
    _drawRoomOverlay(canvas, left + w * 0.05, top + h * 0.38, w * 0.82, h * 0.36,
        const Color(0xFF22C55E), 'Living Room 320 sq ft');

    // Wall segment highlights (orange)
    final orangePaint = Paint()
      ..color = const Color(0xCCF97316)
      ..strokeWidth = 2;
    canvas.drawLine(
      Offset(left + w * 0.43, top + h * 0.05),
      Offset(left + w * 0.43, top + h * 0.32),
      orangePaint,
    );
    canvas.drawLine(
      Offset(left + w * 0.05, top + h * 0.35),
      Offset(left + w * 0.87, top + h * 0.35),
      orangePaint,
    );

    // OCR callout
    _drawOcrCallout(canvas, Offset(cx + 20, top + h * 0.30), "24'-6\" CALIBRATED", primaryColor);

    // Scan line
    final scanY = top + h * scanProgress;
    final gradient = LinearGradient(
      colors: [Colors.transparent, primaryColor.withOpacity(0.5), Colors.transparent],
    );
    final scanPaint = Paint()
      ..shader = gradient.createShader(Rect.fromLTWH(left, scanY, w, 2));
    canvas.drawLine(Offset(left, scanY), Offset(left + w, scanY), scanPaint..strokeWidth = 2);
  }

  void _drawBlueprintWalls(
      Canvas canvas, double left, double top, double w, double h, Paint paint) {
    // Outer walls
    canvas.drawRect(Rect.fromLTWH(left, top, w, h), paint);
    // Interior walls
    canvas.drawLine(Offset(left + w * 0.43, top), Offset(left + w * 0.43, top + h * 0.35), paint);
    canvas.drawLine(Offset(left, top + h * 0.35), Offset(left + w, top + h * 0.35), paint);
    canvas.drawLine(Offset(left, top + h * 0.70), Offset(left + w * 0.40, top + h * 0.70), paint);
  }

  void _drawRoomOverlay(Canvas canvas, double x, double y, double w, double h,
      Color color, String label) {
    final fillPaint = Paint()..color = color.withOpacity(0.12);
    final strokePaint = Paint()
      ..color = color.withOpacity(0.8)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(x, y, w, h),
      const Radius.circular(4),
    );
    canvas.drawRRect(rect, fillPaint);
    canvas.drawRRect(rect, strokePaint);

    // Label background
    final labelBgPaint = Paint()..color = color;
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final labelRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(x + 4, y + 4, textPainter.width + 10, 16),
      const Radius.circular(4),
    );
    canvas.drawRRect(labelRect, labelBgPaint);
    textPainter.paint(canvas, Offset(x + 9, y + 3.5));
  }

  void _drawOcrCallout(Canvas canvas, Offset position, String text, Color color) {
    // Vertical line
    final linePaint = Paint()..color = color..strokeWidth = 1;
    canvas.drawLine(position, position + const Offset(0, 20), linePaint);

    // Badge
    final textPainter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final badgePaint = Paint()..color = color.withOpacity(0.9);
    final badgeRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(position.dx - 2, position.dy + 20, textPainter.width + 14, 18),
      const Radius.circular(99),
    );
    canvas.drawRRect(badgeRect, badgePaint);
    textPainter.paint(canvas, Offset(position.dx + 5, position.dy + 24));
  }

  @override
  bool shouldRepaint(covariant _BlueprintPainter oldDelegate) =>
      oldDelegate.scanProgress != scanProgress;
}

// Pulsing dot widget
class _PulsingDot extends StatefulWidget {
  final Color color;
  const _PulsingDot({required this.color});

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 1))
      ..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (_, __) => Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: widget.color.withOpacity(_animation.value),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
