import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:printing/printing.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../models/estimation_result.dart';
import '../../../editor/presentation/providers/editor_notifier.dart';
import '../providers/report_notifier.dart';
import '../../data/pdf_report_generator.dart';

class RealReportPreviewScreen extends ConsumerStatefulWidget {
  final String projectId;
  final Map<String, dynamic>? estimationData;

  const RealReportPreviewScreen({
    super.key,
    required this.projectId,
    this.estimationData,
  });

  @override
  ConsumerState<RealReportPreviewScreen> createState() => _RealReportPreviewScreenState();
}

class _RealReportPreviewScreenState extends ConsumerState<RealReportPreviewScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initReportData();
    });
  }

  void _initReportData() {
    final editorState = ref.read(editorProvider);
    EstimationResult? est = editorState.estimation;

    if (est == null && widget.estimationData != null) {
      try {
        est = EstimationResult.fromJson(widget.estimationData!);
      } catch (_) {}
    }

    if (est == null) {
      // Fallback sample plan estimation for offline preview
      final samplePlan = FloorPlanAnalysisResult(
        id: 'plan_${widget.projectId}',
        planId: 'plan_${widget.projectId}',
        projectId: widget.projectId,
      );
      final integration = ref.read(editorProvider.notifier);
      integration.setPlan(samplePlan);
      est = ref.read(editorProvider).estimation;
    }

    if (est != null) {
      ref.read(boqReportProvider.notifier).generateReports(
            projectName: 'Project ${widget.projectId}',
            estimation: est,
            validation: editorState.validation,
            confidence: editorState.confidence,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reportState = ref.watch(boqReportProvider);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'BOQ Report & Export Center',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        actions: [
          if (reportState.pdfFile != null)
            IconButton(
              icon: const Icon(Icons.print_rounded),
              tooltip: 'Print Report',
              onPressed: () {
                ref.read(boqReportProvider.notifier).printPdf();
              },
            ),
        ],
      ),
      body: SafeArea(
        child: reportState.isLoading
            ? const Center(child: BuildWiseLoading(message: 'Compiling IS 1200 / IS 456 BOQ Reports...'))
            : reportState.errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline_rounded, size: 60, color: AppColors.error),
                          const SizedBox(height: 16),
                          Text(
                            reportState.errorMessage!,
                            style: AppTypography.bodyMedium,
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          BuildWiseButton.primary(
                            label: 'Retry Report Generation',
                            onPressed: _initReportData,
                          ),
                        ],
                      ),
                    ),
                  )
                : Column(
                    children: [
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Report Summary Card
                              if (reportState.reportModel != null)
                                BuildWiseCard(
                                  hasBorder: true,
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              reportState.reportModel!.projectName,
                                              style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: AppColors.primary.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                'IS 1200 AUDIT READY',
                                                style: AppTypography.labelSmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Grand Total: ₹ ${reportState.reportModel!.estimation.costBreakdown.grandTotal.toStringAsFixed(0)}',
                                          style: AppTypography.titleMedium.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'BOQ Items: ${reportState.reportModel!.boqItems.length} | Materials: ${reportState.reportModel!.estimation.materials.netWallVolumeM3.toStringAsFixed(1)} m³ Masonry',
                                          style: AppTypography.bodySmall.copyWith(color: AppColors.gray500),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              const SizedBox(height: 16),

                              // Interactive PDF Document Preview
                              Expanded(
                                child: reportState.pdfFile != null
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: PdfPreview(
                                          build: (format) => PDFReportGenerator.generatePdfBytes(reportState.reportModel!),
                                          allowPrinting: true,
                                          allowSharing: true,
                                          canChangeOrientation: false,
                                          canChangePageFormat: false,
                                          previewPageMargin: const EdgeInsets.all(8),
                                        ),
                                      )
                                    : const Center(child: Text('No PDF file generated.')),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Export Action Controls
                      Padding(
                        padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: BuildWiseButton.secondary(
                                    label: 'Excel (.xlsx)',
                                    icon: Icons.table_chart_rounded,
                                    onPressed: () {
                                      if (reportState.excelFile != null) {
                                        BuildWiseSnackBar.showSuccess(context, 'Excel exported: ${reportState.excelFile!.path.split('/').last}');
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: BuildWiseButton.secondary(
                                    label: 'CSV (.csv)',
                                    icon: Icons.description_rounded,
                                    onPressed: () {
                                      if (reportState.csvFile != null) {
                                        BuildWiseSnackBar.showSuccess(context, 'CSV exported: ${reportState.csvFile!.path.split('/').last}');
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: BuildWiseButton.secondary(
                                    label: 'Share',
                                    icon: Icons.share_rounded,
                                    onPressed: () {
                                      _showShareOptionsModal(context, ref);
                                    },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            BuildWiseButton.primary(
                              label: 'Return to Editor',
                              onPressed: () => context.pop(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  void _showShareOptionsModal(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Share Report Export',
                  style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red),
                  title: const Text('Share PDF Report'),
                  subtitle: const Text('Full formatted visual PDF document'),
                  onTap: () {
                    Navigator.pop(context);
                    ref.read(boqReportProvider.notifier).sharePdf();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.table_view_rounded, color: Colors.green),
                  title: const Text('Share Excel Workbook (.xlsx)'),
                  subtitle: const Text('Multi-tab XLSX audit workbook'),
                  onTap: () {
                    Navigator.pop(context);
                    ref.read(boqReportProvider.notifier).shareExcel();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.grid_on_rounded, color: Colors.blue),
                  title: const Text('Share CSV File (.csv)'),
                  subtitle: const Text('Machine-readable BOQ data'),
                  onTap: () {
                    Navigator.pop(context);
                    ref.read(boqReportProvider.notifier).shareCsv();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
