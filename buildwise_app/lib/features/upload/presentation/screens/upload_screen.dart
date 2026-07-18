import 'dart:io';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../../projects/presentation/providers/projects_notifier.dart';
import '../providers/upload_notifier.dart';
import '../../../analysis/presentation/screens/cv_analysis_screen.dart';

class UploadScreen extends ConsumerStatefulWidget {
  const UploadScreen({super.key});

  @override
  ConsumerState<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends ConsumerState<UploadScreen>
    with SingleTickerProviderStateMixin {
  File? _selectedFile;
  String? _selectedProjectId;

  // Config state
  String _concreteMix = 'M20 (1:1.5:3)';
  double _wallThickness = 0; // 0 = 9-inch, 1 = 4.5-inch
  final double _wetToDryFactor = 1.54;
  int _steelIndex = 80;
  final _steelController = TextEditingController(text: '80');

  final List<String> _concreteMixes = [
    'M15 (1:2:4)',
    'M20 (1:1.5:3)',
    'M25 (1:1:2)',
    'M30 (1:0.75:1.5)',
  ];

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _steelController.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'dwg', 'dxf'],
      );
      if (result != null && result.files.single.path != null) {
        setState(() => _selectedFile = File(result.files.single.path!));
      }
    } catch (e) {
      if (mounted) BuildWiseSnackBar.showError(context, 'Error picking file: $e');
    }
  }

  Future<void> _captureImage() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.camera);
      if (image != null) {
        setState(() => _selectedFile = File(image.path));
      }
    } catch (e) {
      if (mounted) BuildWiseSnackBar.showError(context, 'Camera access failed: $e');
    }
  }

  Future<void> _handleUpload() async {
    if (_selectedFile == null) {
      BuildWiseSnackBar.showWarning(context, 'Please select a drawing file first.');
      return;
    }

    String targetProjectId = _selectedProjectId ?? '';
    if (targetProjectId.isEmpty) {
      final projectsState = ref.read(projectsNotifierProvider);
      if (projectsState.projects.isNotEmpty) {
        targetProjectId = projectsState.projects.first.id;
      } else {
        await ref.read(projectsNotifierProvider.notifier).createProject('Quick Estimate Project', 'House');
        final updatedState = ref.read(projectsNotifierProvider);
        targetProjectId = updatedState.projects.first.id;
      }
    }

    final plan = await ref.read(uploadNotifierProvider.notifier).uploadPlanFile(
          _selectedFile!,
          targetProjectId,
        );

    if (plan != null && mounted) {
      BuildWiseSnackBar.showSuccess(context, 'Drawing uploaded successfully');
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => CvAnalysisScreen(planId: plan.id),
        ),
      );
    } else if (mounted) {
      final error = ref.read(uploadNotifierProvider).errorMessage ?? 'Upload failed';
      BuildWiseSnackBar.showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(uploadNotifierProvider);
    const bg = Color(0xFF09090B);
    const surfaceContainer = Color(0xFF1C1B1D);
    const surfaceContainerLow = Color(0xFF1C1B1D);
    const border = Color(0x12FFFFFF);
    const primary = AppColors.primary;
    const textPrimary = Color(0xFFE5E1E4);
    const textSecondary = Color(0xFFCCC3D8);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          // Background glow
          Positioned(
            top: -80,
            right: -60,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    primary.withOpacity(0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top App Bar
                _buildTopBar(textPrimary, primary),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section label
                        Text(
                          'ENGINEERING WORKFLOW',
                          style: AppTypography.labelSmall.copyWith(
                            color: primary,
                            letterSpacing: 1.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Blueprint Analysis',
                          style: AppTypography.headlineSmall.copyWith(
                            color: textPrimary,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Upload drawings and configure structural parameters for AI-driven estimation.',
                          style: AppTypography.bodyMedium.copyWith(color: textSecondary),
                        ),
                        const SizedBox(height: 20),

                        // Upload Zone
                        _buildUploadZone(primary, textPrimary, textSecondary),

                        const SizedBox(height: 8),

                        // Quick actions row
                        Row(
                          children: [
                            Expanded(
                              child: _buildSecondaryAction(
                                icon: Icons.folder_open_rounded,
                                label: 'Browse Files',
                                onTap: _pickFile,
                                primary: primary,
                                border: border,
                                surfaceContainer: surfaceContainer,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildSecondaryAction(
                                icon: Icons.camera_alt_outlined,
                                label: 'Scan Camera',
                                onTap: _captureImage,
                                primary: primary,
                                border: border,
                                surfaceContainer: surfaceContainer,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Config section header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'STRUCTURAL PARAMETERS',
                              style: AppTypography.labelSmall.copyWith(
                                color: textSecondary,
                                letterSpacing: 1.2,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              'Calculations V1.4',
                              style: AppTypography.labelSmall.copyWith(
                                color: primary,
                                letterSpacing: 0.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Config Card
                        _buildConfigCard(
                          primary: primary,
                          textPrimary: textPrimary,
                          textSecondary: textSecondary,
                          surfaceContainerLow: surfaceContainerLow,
                          border: border,
                        ),

                        const SizedBox(height: 16),

                        // AI Status Strip
                        _buildAiStatusStrip(primary, textSecondary, surfaceContainer, border),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Fixed bottom CTA
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, bg.withOpacity(0.97), bg],
                  stops: const [0, 0.4, 1],
                ),
              ),
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              child: state.isUploading
                  ? const Center(child: BuildWiseLoading(message: 'Uploading plan drawing...'))
                  : GestureDetector(
                      onTap: _handleUpload,
                      child: Container(
                        height: 56,
                        decoration: BoxDecoration(
                          color: primary,
                          borderRadius: BorderRadius.circular(999),
                          boxShadow: [
                            BoxShadow(
                              color: primary.withOpacity(0.4),
                              blurRadius: 30,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.analytics_rounded, color: Colors.white, size: 22),
                            const SizedBox(width: 10),
                            Text(
                              'Analyze Blueprint with AI',
                              style: AppTypography.titleSmall.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(Color textPrimary, Color primary) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF09090B).withOpacity(0.85),
        border: const Border(bottom: BorderSide(color: Color(0x0DFFFFFF), width: 1)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.architecture_rounded, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 10),
          Text(
            'BuildWise AI',
            style: AppTypography.titleMedium.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const Spacer(),
          Icon(Icons.dark_mode_rounded, color: textPrimary.withOpacity(0.5), size: 22),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF2A2A2C),
            child: Icon(Icons.person_rounded, size: 18, color: textPrimary.withOpacity(0.7)),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadZone(Color primary, Color textPrimary, Color textSecondary) {
    final hasFile = _selectedFile != null;
    return GestureDetector(
      onTap: _pickFile,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 180,
        decoration: BoxDecoration(
          color: hasFile ? primary.withOpacity(0.06) : const Color(0xFF1C1B1D),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasFile ? primary.withOpacity(0.5) : primary.withOpacity(0.25),
            width: 1.5,
            style: BorderStyle.solid,
          ),
        ),
        child: Stack(
          children: [
            // Dot grid background
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CustomPaint(painter: _DotGridPainter(primary.withOpacity(0.06))),
              ),
            ),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: primary.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      hasFile ? Icons.check_circle_rounded : Icons.cloud_upload_rounded,
                      color: primary,
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    hasFile ? _selectedFile!.path.split(Platform.pathSeparator).last : 'Upload Blueprint Drawing',
                    style: AppTypography.titleSmall.copyWith(
                      color: primary,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    hasFile ? 'Tap to change file' : 'Tap to select PDF, PNG or CAD blueprint',
                    style: AppTypography.bodySmall.copyWith(color: textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecondaryAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color primary,
    required Color border,
    required Color surfaceContainer,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: primary, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: AppTypography.bodySmall.copyWith(
                color: const Color(0xFFE5E1E4),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfigCard({
    required Color primary,
    required Color textPrimary,
    required Color textSecondary,
    required Color surfaceContainerLow,
    required Color border,
  }) {
    const inputBg = Color(0xFF0E0E10);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0x1519191E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border.withOpacity(1.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Concrete Mix
          _buildConfigRow(
            icon: Icons.conveyor_belt,
            label: 'Concrete Mix Grade',
            child: Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: inputBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _concreteMix,
                  isExpanded: true,
                  dropdownColor: const Color(0xFF1C1B1D),
                  style: AppTypography.bodyMedium.copyWith(color: textPrimary),
                  icon: Icon(Icons.expand_more_rounded, color: textSecondary, size: 20),
                  items: _concreteMixes.map((m) => DropdownMenuItem(
                    value: m,
                    child: Text(m),
                  )).toList(),
                  onChanged: (v) => setState(() => _concreteMix = v ?? _concreteMix),
                ),
              ),
            ),
            textPrimary: textPrimary,
            primary: primary,
          ),

          const SizedBox(height: 16),
          Divider(color: border, height: 1),
          const SizedBox(height: 16),

          // Wall Thickness Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.layers_rounded, color: primary, size: 18),
                  const SizedBox(width: 8),
                  Text('Wall Thickness', style: AppTypography.bodyMedium.copyWith(color: textPrimary)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _wallThickness == 0 ? '9-inch Brick' : '4.5-inch Partition',
                  style: AppTypography.labelSmall.copyWith(color: primary, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: primary,
              inactiveTrackColor: Colors.white.withOpacity(0.08),
              thumbColor: const Color(0xFFD2BBFF),
              overlayColor: primary.withOpacity(0.12),
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 9),
              trackHeight: 4,
            ),
            child: Slider(
              value: _wallThickness,
              min: 0,
              max: 1,
              divisions: 1,
              onChanged: (v) => setState(() => _wallThickness = v),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('9" Brick', style: AppTypography.labelSmall.copyWith(color: textSecondary.withOpacity(0.6))),
              Text('4.5" Partition', style: AppTypography.labelSmall.copyWith(color: textSecondary.withOpacity(0.6))),
            ],
          ),

          const SizedBox(height: 16),
          Divider(color: border, height: 1),
          const SizedBox(height: 16),

          // Two column row: Wet-to-Dry + Steel Index
          Row(
            children: [
              // Wet-to-Dry (locked)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'WET-TO-DRY',
                          style: AppTypography.labelSmall.copyWith(color: textSecondary, letterSpacing: 1.0),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.lock_outline_rounded, color: textSecondary, size: 11),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: inputBg.withOpacity(0.5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: border),
                      ),
                      child: Center(
                        child: Text(
                          '${_wetToDryFactor}x',
                          style: AppTypography.labelMedium.copyWith(color: textSecondary),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Steel Index
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'STEEL INDEX',
                      style: AppTypography.labelSmall.copyWith(color: textSecondary, letterSpacing: 1.0),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: inputBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: border),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _steelController,
                              keyboardType: TextInputType.number,
                              style: AppTypography.labelMedium.copyWith(color: textPrimary),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 12),
                              ),
                              onChanged: (v) => setState(() => _steelIndex = int.tryParse(v) ?? 80),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: Text(
                              'kg/m³',
                              style: AppTypography.labelSmall.copyWith(color: textSecondary),
                            ),
                          ),
                        ],
                      ),
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

  Widget _buildConfigRow({
    required IconData icon,
    required String label,
    required Widget child,
    required Color textPrimary,
    required Color primary,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: primary, size: 18),
            const SizedBox(width: 8),
            Text(label, style: AppTypography.bodyMedium.copyWith(color: textPrimary)),
          ],
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }

  Widget _buildAiStatusStrip(Color primary, Color textSecondary, Color surface, Color border) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: border),
          ),
          child: Row(
            children: [
              Stack(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: primary.withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.psychology_rounded, color: primary, size: 20),
                  ),
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: primary.withOpacity(_pulseAnimation.value),
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF09090B), width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AI ENGINE STATUS',
                    style: AppTypography.labelSmall.copyWith(
                      color: primary,
                      letterSpacing: 1.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    'Ready to scan. Model: Arch-LLM-v2',
                    style: AppTypography.bodySmall.copyWith(color: textSecondary),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

// Custom dot-grid painter
class _DotGridPainter extends CustomPainter {
  final Color color;
  _DotGridPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    const spacing = 20.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Thin wrapper for AnalysisScreen (kept for backward compat)
class AnalysisScreen extends StatelessWidget {
  final String planId;
  const AnalysisScreen({super.key, required this.planId});

  @override
  Widget build(BuildContext context) {
    return CvAnalysisScreen(planId: planId);
  }
}
