import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../models/estimation_result.dart';
import '../../../analysis/domain/confidence_engine.dart';
import '../../../analysis/domain/validation_engine.dart';
import '../../data/boq_csv_exporter.dart';
import '../../data/boq_excel_exporter.dart';
import '../../data/pdf_report_generator.dart';
import '../../domain/report_model.dart';

class BOQReportState {
  final bool isLoading;
  final BOQReportModel? reportModel;
  final File? pdfFile;
  final File? excelFile;
  final File? csvFile;
  final String? errorMessage;

  const BOQReportState({
    this.isLoading = false,
    this.reportModel,
    this.pdfFile,
    this.excelFile,
    this.csvFile,
    this.errorMessage,
  });

  BOQReportState copyWith({
    bool? isLoading,
    BOQReportModel? reportModel,
    File? pdfFile,
    File? excelFile,
    File? csvFile,
    String? errorMessage,
    bool clearErrorMessage = false,
  }) {
    return BOQReportState(
      isLoading: isLoading ?? this.isLoading,
      reportModel: reportModel ?? this.reportModel,
      pdfFile: pdfFile ?? this.pdfFile,
      excelFile: excelFile ?? this.excelFile,
      csvFile: csvFile ?? this.csvFile,
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class BOQReportNotifier extends StateNotifier<BOQReportState> {
  BOQReportNotifier() : super(const BOQReportState());

  Future<void> generateReports({
    required String projectName,
    required EstimationResult estimation,
    SevenLayerValidationReport? validation,
    ProjectConfidenceReport? confidence,
  }) async {
    state = state.copyWith(isLoading: true, clearErrorMessage: true);

    try {
      final reportModel = BOQReportModel.fromEstimation(
        projectName: projectName,
        estimation: estimation,
        validation: validation,
        confidence: confidence,
      );

      final pdfFile = await PDFReportGenerator.generateAndSavePdf(reportModel);
      final excelFile = await BOQExcelExporter.exportToExcel(reportModel);
      final csvFile = await BOQCsvExporter.exportToCsv(reportModel);

      state = state.copyWith(
        isLoading: false,
        reportModel: reportModel,
        pdfFile: pdfFile,
        excelFile: excelFile,
        csvFile: csvFile,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to generate report files: $e',
      );
    }
  }

  Future<void> sharePdf() async {
    if (state.pdfFile == null) return;
    await Share.shareXFiles(
      [XFile(state.pdfFile!.path)],
      subject: 'BuildWise AI — PDF Estimation Report',
    );
  }

  Future<void> shareExcel() async {
    if (state.excelFile == null) return;
    await Share.shareXFiles(
      [XFile(state.excelFile!.path)],
      subject: 'BuildWise AI — Excel BOQ Workbook',
    );
  }

  Future<void> shareCsv() async {
    if (state.csvFile == null) return;
    await Share.shareXFiles(
      [XFile(state.csvFile!.path)],
      subject: 'BuildWise AI — CSV BOQ Data',
    );
  }

  Future<void> printPdf() async {
    if (state.pdfFile == null) return;
    final bytes = await state.pdfFile!.readAsBytes();
    await Printing.layoutPdf(onLayout: (_) async => bytes);
  }
}

final boqReportProvider = StateNotifierProvider<BOQReportNotifier, BOQReportState>((ref) {
  return BOQReportNotifier();
});
