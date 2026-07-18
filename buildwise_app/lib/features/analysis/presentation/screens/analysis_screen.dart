import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../../../upload/presentation/providers/upload_notifier.dart';
import 'detection_results_screen.dart';

class _RealAnalysisScreen extends ConsumerStatefulWidget {
  final String planId;

  const _RealAnalysisScreen({required this.planId});

  @override
  ConsumerState<_RealAnalysisScreen> createState() => _RealAnalysisScreenState();
}

class _RealAnalysisScreenState extends ConsumerState<_RealAnalysisScreen> {
  Timer? _timer;
  int _currentStep = 0;
  final List<String> _analysisSteps = [
    'Adaptive thresholding & preprocessing...',
    'YOLO wall line & room extraction...',
    'EasyOCR dimension reading & text extraction...',
    'Calibrating drawings scale factor...',
    'Consolidating detected layout coordinates...'
  ];

  @override
  void initState() {
    super.initState();
    _startAnalysis();
  }

  Future<void> _startAnalysis() async {
    // 1. Trigger backend Celery task execution
    await ref.read(uploadNotifierProvider.notifier).startPlanAnalysis(widget.planId);
    
    // 2. Animate progress steps locally
    _timer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      if (_currentStep < _analysisSteps.length - 1) {
        setState(() => _currentStep++);
      }
      
      // Poll DB status
      final plan = await ref.read(uploadNotifierProvider.notifier).pollAnalysisStatus(widget.planId);
      if (plan != null) {
        if (plan.status == 'completed') {
          _timer?.cancel();
          if (mounted) {
            // Navigate to results confirmed
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => DetectionResultsScreen(plan: plan),
              ),
            );
          }
        } else if (plan.status == 'failed') {
          _timer?.cancel();
          if (mounted) {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('AI Analysis failed. Bypassing to manual parameters input.')),
            );
          }
        }
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Center(
                child: Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    size: 72,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: 48),
              Text(
                'AI Analysis in Progress',
                style: AppTypography.headlineLarge.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                _analysisSteps[_currentStep],
                style: AppTypography.bodyLarge.copyWith(color: AppColors.gray500),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              const BuildWiseLoading(size: 40),
            ],
          ),
        ),
      ),
    );
  }
}
