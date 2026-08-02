import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:excel/excel.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/domain/estimation_engine.dart';
import 'package:buildwise_app/features/analysis/domain/confidence_engine.dart';
import 'package:buildwise_app/features/analysis/domain/validation_engine.dart';
import 'package:buildwise_app/features/report/domain/report_model.dart';
import 'package:buildwise_app/features/report/data/boq_excel_exporter.dart';
import 'package:buildwise_app/features/report/data/boq_csv_exporter.dart';
import 'package:buildwise_app/features/report/data/pdf_report_generator.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late FloorPlanAnalysisResult samplePlan;
  late TakeoffParams takeoffParams;
  late EstimationResult estimationResult;
  late SevenLayerValidationReport validationReport;
  late ProjectConfidenceReport confidenceReport;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('report_test_');

    const room1 = AIRoom(
      id: 'r1',
      label: 'Living Room',
      roomType: 'living_room',
      polygon: [
        [0.0, 0.0],
        [5.0, 0.0],
        [5.0, 4.0],
        [0.0, 4.0]
      ],
      centroid: [2.5, 2.0],
      boundingBox: [0.0, 0.0, 5.0, 4.0],
      areaM2: 20.0,
      areaSqft: 215.28,
      perimeterM: 18.0,
      lengthM: 5.0,
      widthM: 4.0,
      aspectRatio: 1.25,
      classification: RoomClassification(
        classifiedLabel: 'Living Room',
        roomType: 'living_room',
        confidence: RoomConfidenceScore(overall: 0.95),
      ),
    );

    const wall1 = AIWall(
      id: 'w1',
      start: [0.0, 0.0],
      end: [5.0, 0.0],
      lengthPx: 200.0,
      lengthM: 5.0,
      thicknessPx: 15.0,
      thicknessM: 0.23,
    );

    samplePlan = const FloorPlanAnalysisResult(
      id: 'plan_rep',
      planId: 'plan_rep',
      projectId: 'proj_rep',
      rooms: [room1],
      walls: [wall1],
      totalAreaM2: 20.0,
      totalAreaSqft: 215.28,
    );

    takeoffParams = const TakeoffParams(
      buildingType: 'house',
      numFloors: 1,
      floorHeight: 3.0,
      wallThickness: 0.23,
      slabThickness: 0.12,
      concreteGrade: 'M20',
      steelGrade: 'Fe500',
      mortarRatio: '1:5',
      brickType: 'red_brick',
      wastePercentage: 5.0,
    );

    estimationResult = EstimationEngine.calculateTakeoff(samplePlan, takeoffParams);
    validationReport = validateSevenLayers(samplePlan, estimationResult);
    confidenceReport = calculateProjectConfidence(samplePlan);
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('Phase 6: Reporting & Export System Tests', () {
    test('BOQReportModel from Estimation builds valid items and audit steps', () {
      final report = BOQReportModel.fromEstimation(
        projectName: 'Villa 101',
        estimation: estimationResult,
        validation: validationReport,
        confidence: confidenceReport,
      );

      expect(report.projectName, equals('Villa 101'));
      expect(report.boqItems.length, greaterThan(0));

      final earthwork = report.boqItems.firstWhere((i) => i.category == 'Civil & Earthwork');
      expect(earthwork.isCode, contains('IS 1200'));

      final rcc = report.boqItems.firstWhere((i) => i.category == 'Structural RCC' && i.unit == 'm³');
      expect(rcc.isCode, contains('IS 456'));

      expect(report.estimation.calculationAudits.length, greaterThanOrEqualTo(5));
      for (final audit in report.estimation.calculationAudits) {
        expect(audit.isCodeReference, isNotEmpty);
        expect(audit.formula, isNotEmpty);
      }
    });

    test('CSV Exporter creates properly escaped CSV file', () async {
      final report = BOQReportModel.fromEstimation(
        projectName: 'Commercial & Multi-Tenant Complex',
        estimation: estimationResult,
      );

      final file = await BOQCsvExporter.exportToCsv(report, tempDir);
      expect(file.existsSync(), isTrue);

      final content = await file.readAsString();
      expect(content, contains('BUILDWISE AI — BOQ ESTIMATION REPORT'));
      expect(content, contains('GRAND TOTAL ESTIMATE AMOUNT'));
      expect(content, contains('IS 1200'));

      // Verify CSV content
      expect(content, contains('Commercial & Multi-Tenant Complex'));
    });

    test('Excel Exporter generates 11 multi-tab XLSX workbook', () async {
      final report = BOQReportModel.fromEstimation(
        projectName: 'Project Alpha',
        estimation: estimationResult,
        validation: validationReport,
        confidence: confidenceReport,
      );

      final file = await BOQExcelExporter.exportToExcel(report, tempDir);
      expect(file.existsSync(), isTrue);

      final bytes = await file.readAsBytes();
      final excel = Excel.decodeBytes(bytes);

      expect(excel.sheets.containsKey('Executive Summary'), isTrue);
      expect(excel.sheets.containsKey('BOQ Report'), isTrue);
      expect(excel.sheets.containsKey('Materials'), isTrue);
      expect(excel.sheets.containsKey('Labour'), isTrue);
      expect(excel.sheets.containsKey('Equipment'), isTrue);
      expect(excel.sheets.containsKey('Wall Takeoff'), isTrue);
      expect(excel.sheets.containsKey('Room Schedule'), isTrue);
      expect(excel.sheets.containsKey('Openings'), isTrue);
      expect(excel.sheets.containsKey('Calculation Audit'), isTrue);
      expect(excel.sheets.containsKey('Validation'), isTrue);
      expect(excel.sheets.containsKey('Standards & References'), isTrue);
    });

    test('PDF Generator generates valid multi-page PDF document bytes', () async {
      final report = BOQReportModel.fromEstimation(
        projectName: 'Residence B-202',
        estimation: estimationResult,
        validation: validationReport,
        confidence: confidenceReport,
      );

      final pdfBytes = await PDFReportGenerator.generatePdfBytes(report);
      expect(pdfBytes.length, greaterThan(1000));

      // Header signature bytes for PDF
      final pdfHeader = String.fromCharCodes(pdfBytes.sublist(0, 5));
      expect(pdfHeader, equals('%PDF-'));
    });

    test('Empty project handling generates valid report without exceptions', () {
      const emptyPlan = FloorPlanAnalysisResult(
        id: 'empty_plan',
        planId: 'empty_plan',
        projectId: 'empty_proj',
      );

      final emptyEst = EstimationEngine.calculateTakeoff(emptyPlan, takeoffParams);
      final report = BOQReportModel.fromEstimation(
        projectName: 'Empty Project Test',
        estimation: emptyEst,
      );

      expect(report.boqItems.isNotEmpty, isTrue);
      expect(report.estimation.costBreakdown.grandTotal, greaterThanOrEqualTo(0));
    });
  });
}
