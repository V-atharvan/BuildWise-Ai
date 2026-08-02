import 'dart:io';
import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import '../domain/report_model.dart';

// ══════════════════════════════════════════════════════════════════════════════
//  BuildWise AI — BOQ Excel Exporter  (Phase 9 — Reference-1 Format)
//
//  Sheet 1 : BOQ Report  ← Reference-1 style (title, categories, items, summary)
//  Sheet 2 : Executive Summary
//  Sheet 3 : Materials
//  Sheet 4 : Labour
//  Sheet 5 : Equipment
//  Sheet 6 : Wall Takeoff
//  Sheet 7 : Room Schedule
//  Sheet 8 : Openings
//  Sheet 9 : Calculation Audit
//  Sheet 10: Validation
//  Sheet 11: Standards & References
// ══════════════════════════════════════════════════════════════════════════════

class BOQExcelExporter {
  // ── Colour palette (Reference-1 inspired) ─────────────────────────────────
  static final _headerBg     = ExcelColor.fromHexString('FF4F3B8C'); // deep purple
  static final _subHeaderBg  = ExcelColor.fromHexString('FF7B5EA7'); // medium purple
  static final _categoryBg   = ExcelColor.fromHexString('FFE8E2F5'); // light lavender
  static final _summaryBg    = ExcelColor.fromHexString('FF2E7D32'); // dark green
  static final _summaryRowBg = ExcelColor.fromHexString('FFE8F5E9'); // light green
  static final _totalBg      = ExcelColor.fromHexString('FF1B5E20'); // very dark green
  static final _white        = ExcelColor.fromHexString('FFFFFFFF');
  static final _darkText     = ExcelColor.fromHexString('FF1A1A2E');
  static final _greyBorder   = ExcelColor.fromHexString('FFBDBDBD');
  static final _purpleBorder = ExcelColor.fromHexString('FF6B21A8');
  static final _categoryText = ExcelColor.fromHexString('FF4A0082');

  // ── Border helpers (static final — not const because Border is not const) ──
  static Border get _thinBorder => Border(
    borderStyle: BorderStyle.Thin,
    borderColorHex: _greyBorder,
  );

  static Border get _mediumBorder => Border(
    borderStyle: BorderStyle.Medium,
    borderColorHex: _purpleBorder,
  );

  // ── NaN / Infinity guard ───────────────────────────────────────────────────
  /// Returns [v] if it is a finite, non-null double; otherwise returns [fallback].
  /// NEVER pass NaN or Infinity into an Excel cell.
  static double _safeDouble(double? v, {double fallback = 0.0}) {
    if (v == null) return fallback;
    if (v.isNaN || v.isInfinite) return fallback;
    return v;
  }

  static int _safeInt(int? v, {int fallback = 0}) {
    if (v == null) return fallback;
    return v;
  }

  // ── Quantity formatting ────────────────────────────────────────────────────
  /// Returns sensible decimal formatting:
  ///   45.0   → "45"
  ///   38.5   → "38.5"
  ///   3.14   → "3.14"
  static String _fmtQty(double v) {
    final safe = _safeDouble(v);
    if (safe == safe.truncateToDouble()) {
      return safe.toInt().toString();
    }
    // Remove trailing zeros but keep up to 2 decimal places
    final s = safe.toStringAsFixed(2);
    if (s.endsWith('0')) {
      final trimmed = s.replaceAll(RegExp(r'0+$'), '');
      return trimmed.endsWith('.') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
    }
    return s;
  }

  // ── Indian Rupee formatting ────────────────────────────────────────────────
  /// Formats a double as Indian ₹ with comma grouping.
  /// Example: 211750.0 → "₹2,11,750"
  static String _fmtRupee(double v) {
    final safe = _safeDouble(v);
    final intPart = safe.toInt().abs();
    final negative = safe < 0 ? '-' : '';
    final s = intPart.toString();

    // Indian comma grouping: last 3 digits then every 2
    if (s.length <= 3) return '$negative\u20B9$s';
    final last3 = s.substring(s.length - 3);
    final rest = s.substring(0, s.length - 3);
    final buf = StringBuffer();
    for (int i = 0; i < rest.length; i++) {
      if (i > 0 && (rest.length - i) % 2 == 0) buf.write(',');
      buf.write(rest[i]);
    }
    return '$negative₹$buf,$last3';
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC ENTRY POINT
  // ══════════════════════════════════════════════════════════════════════════

  static Future<File> exportToExcel(BOQReportModel report, [Directory? outputDir]) async {
    final excel = Excel.createExcel();

    // Sheet order matters — first sheet becomes the default tab
    _buildBOQReportSheet(excel, report);          // Sheet 1 ← PRIMARY (Reference-1)
    _buildExecutiveSummarySheet(excel, report);   // Sheet 2
    _buildMaterialsSheet(excel, report);          // Sheet 3
    _buildLabourSheet(excel, report);             // Sheet 4
    _buildEquipmentSheet(excel, report);          // Sheet 5
    _buildWallTakeoffSheet(excel, report);        // Sheet 6
    _buildRoomScheduleSheet(excel, report);       // Sheet 7
    _buildOpeningsSheet(excel, report);           // Sheet 8
    _buildCalculationAuditSheet(excel, report);   // Sheet 9
    _buildValidationSheet(excel, report);         // Sheet 10
    _buildStandardsSheet(excel, report);          // Sheet 11

    // Remove default blank sheet
    if (excel.sheets.containsKey('Sheet1')) {
      excel.delete('Sheet1');
    }

    final bytes = excel.save();
    final sanitized = report.projectName.replaceAll(RegExp(r'[^\w\.\-]'), '_');
    final fileName = 'BuildWise_${sanitized}_BOQ.xlsx';

    final dir = outputDir ?? await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$fileName');
    if (bytes != null) {
      await file.writeAsBytes(bytes);
    }
    return file;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 1: BOQ REPORT  (Reference-1 style)
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildBOQReportSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['BOQ Report'];
    final c = report.estimation.costBreakdown;
    final date = DateTime.now();
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year;
    final dateStr = '$day/$month/$year';

    // ── Column widths (Reference-1: Sl No narrow, Description wide) ──────────
    sheet.setColumnWidth(0, 8.0);   // A: Sl No
    sheet.setColumnWidth(1, 48.0);  // B: Item Description  ← widest
    sheet.setColumnWidth(2, 10.0);  // C: Unit
    sheet.setColumnWidth(3, 14.0);  // D: Quantity
    sheet.setColumnWidth(4, 16.0);  // E: Rate (₹)
    sheet.setColumnWidth(5, 22.0);  // F: Amount (₹)

    // ── Row 1: TITLE ─────────────────────────────────────────────────────────
    _writeCell(sheet, 0, 0,
      TextCellValue('BuildWise AI \u2014 Construction BOQ Report'),
      CellStyle(
        bold: true,
        fontSize: 14,
        fontColorHex: _white,
        backgroundColorHex: _subHeaderBg,
        horizontalAlign: HorizontalAlign.Center,
        verticalAlign: VerticalAlign.Center,
      ),
    );
    sheet.merge(
      CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 0),
      CellIndex.indexByColumnRow(columnIndex: 5, rowIndex: 0),
    );
    sheet.setRowHeight(0, 28.0);

    // ── Row 2: Project / Date ─────────────────────────────────────────────────
    _writeCell(sheet, 1, 0,
      TextCellValue('Project: ${report.projectName}   |   Date: $dateStr'),
      CellStyle(
        bold: false,
        fontSize: 10,
        fontColorHex: _white,
        backgroundColorHex: _headerBg,
        horizontalAlign: HorizontalAlign.Center,
        verticalAlign: VerticalAlign.Center,
      ),
    );
    sheet.merge(
      CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 1),
      CellIndex.indexByColumnRow(columnIndex: 5, rowIndex: 1),
    );
    sheet.setRowHeight(1, 20.0);

    // ── Row 3: blank spacer ───────────────────────────────────────────────────
    sheet.setRowHeight(2, 6.0);

    // ── Row 4: Table header (0-indexed row 3) ─────────────────────────────────
    const headers = ['Sl No', 'Item Description', 'Unit', 'Quantity', 'Rate (\u20B9)', 'Amount (\u20B9)'];
    for (int col = 0; col < headers.length; col++) {
      _writeCell(sheet, 3, col,
        TextCellValue(headers[col]),
        CellStyle(
          bold: true,
          fontSize: 10,
          fontColorHex: _white,
          backgroundColorHex: _headerBg,
          horizontalAlign: col == 0 ? HorizontalAlign.Center
              : col == 2 ? HorizontalAlign.Center
              : col >= 3 ? HorizontalAlign.Right
              : HorizontalAlign.Left,
          verticalAlign: VerticalAlign.Center,
          topBorder: _thinBorder,
          bottomBorder: _thinBorder,
          leftBorder: _thinBorder,
          rightBorder: _thinBorder,
        ),
      );
    }
    sheet.setRowHeight(3, 20.0);

    // ── Determine canonical category ordering from web BOQ model ─────────────
    //
    // Web boq-generator.ts categories → Reference-1 category names:
    //   "Civil & Earthwork"    → "A. EARTHWORK"
    //   "Structural RCC"       → "B. RCC & STRUCTURAL WORKS"
    //   "Masonry & Partition"  → "C. MASONRY & MATERIALS"
    //   "Finishes & Plaster"   → "D. FINISHING WORKS"
    //
    // Openings are kept in their own sheet but NOT shown in the primary BOQ sheet
    // to match Reference-1's category structure exactly.

    const categoryOrder = [
      'Civil & Earthwork',
      'Structural RCC',
      'Masonry & Partition',
      'Finishes & Plaster',
    ];

    const categoryLabels = {
      'Civil & Earthwork'   : 'A. EARTHWORK',
      'Structural RCC'      : 'B. RCC & STRUCTURAL WORKS',
      'Masonry & Partition' : 'C. MASONRY & MATERIALS',
      'Finishes & Plaster'  : 'D. FINISHING WORKS',
    };

    // Filter items to only those in our canonical categories
    final boqItems = report.boqItems
        .where((item) => categoryOrder.contains(item.category))
        .toList();

    // Track amount cell row indices for SUM formula in summary
    final amountRows = <int>[];

    int currentRow = 4; // 0-indexed, so row index 4 = Excel row 5

    for (final catKey in categoryOrder) {
      final catItems = boqItems.where((i) => i.category == catKey).toList();
      if (catItems.isEmpty) continue;

      final catLabel = categoryLabels[catKey] ?? catKey.toUpperCase();

      // ── Category header row ────────────────────────────────────────────────
      _writeCell(sheet, currentRow, 0,
        TextCellValue(catLabel),
        CellStyle(
          bold: true,
          fontSize: 10,
          fontColorHex: _categoryText,
          backgroundColorHex: _categoryBg,
          horizontalAlign: HorizontalAlign.Left,
          verticalAlign: VerticalAlign.Center,
          topBorder: _mediumBorder,
          bottomBorder: _thinBorder,
          leftBorder: _mediumBorder,
          rightBorder: _thinBorder,
        ),
      );
      // Fill remaining columns of category row with same style (no content)
      for (int col = 1; col <= 5; col++) {
        _writeCell(sheet, currentRow, col,
          null,
          CellStyle(
            backgroundColorHex: _categoryBg,
            topBorder: _mediumBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: col == 5 ? _mediumBorder : _thinBorder,
          ),
        );
      }
      // Merge category row across all 6 columns
      sheet.merge(
        CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow),
        CellIndex.indexByColumnRow(columnIndex: 5, rowIndex: currentRow),
      );
      sheet.setRowHeight(currentRow, 18.0);
      currentRow++;

      // ── BOQ item rows ──────────────────────────────────────────────────────
      for (final item in catItems) {
        final safeQty    = _safeDouble(item.quantity);
        final safeRate   = _safeDouble(item.rate);
        final safeAmount = _safeDouble(item.amount);

        // Validate amount = qty × rate (within 1% tolerance, else recalculate)
        final recalcAmount = safeQty * safeRate;
        final finalAmount  = (safeAmount > 0 && !safeAmount.isNaN)
            ? safeAmount
            : recalcAmount;

        amountRows.add(currentRow);

        // Col A: Sl No
        _writeCell(sheet, currentRow, 0,
          IntCellValue(_safeInt(item.srNo, fallback: 0)),
          CellStyle(
            fontSize: 9,
            horizontalAlign: HorizontalAlign.Center,
            verticalAlign: VerticalAlign.Center,
            topBorder: _thinBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: _thinBorder,
          ),
        );

        // Col B: Item Description (left-aligned, wrapping)
        _writeCell(sheet, currentRow, 1,
          TextCellValue(item.description),
          CellStyle(
            fontSize: 9,
            horizontalAlign: HorizontalAlign.Left,
            verticalAlign: VerticalAlign.Center,
            textWrapping: TextWrapping.WrapText,
            topBorder: _thinBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: _thinBorder,
          ),
        );

        // Col C: Unit (centered)
        _writeCell(sheet, currentRow, 2,
          TextCellValue(item.unit),
          CellStyle(
            fontSize: 9,
            horizontalAlign: HorizontalAlign.Center,
            verticalAlign: VerticalAlign.Center,
            topBorder: _thinBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: _thinBorder,
          ),
        );

        // Col D: Quantity (right-aligned, sensible decimals)
        _writeCell(sheet, currentRow, 3,
          TextCellValue(_fmtQty(safeQty)),
          CellStyle(
            fontSize: 9,
            horizontalAlign: HorizontalAlign.Right,
            verticalAlign: VerticalAlign.Center,
            topBorder: _thinBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: _thinBorder,
          ),
        );

        // Col E: Rate ₹ (right-aligned, Indian rupee)
        _writeCell(sheet, currentRow, 4,
          TextCellValue(_fmtRupee(safeRate)),
          CellStyle(
            fontSize: 9,
            horizontalAlign: HorizontalAlign.Right,
            verticalAlign: VerticalAlign.Center,
            topBorder: _thinBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: _thinBorder,
          ),
        );

        // Col F: Amount ₹ (right-aligned, Indian rupee)
        _writeCell(sheet, currentRow, 5,
          TextCellValue(_fmtRupee(finalAmount)),
          CellStyle(
            fontSize: 9,
            horizontalAlign: HorizontalAlign.Right,
            verticalAlign: VerticalAlign.Center,
            topBorder: _thinBorder,
            bottomBorder: _thinBorder,
            leftBorder: _thinBorder,
            rightBorder: _thinBorder,
          ),
        );

        sheet.setRowHeight(currentRow, 16.0);
        currentRow++;
      }
    }

    // ── Spacer row ────────────────────────────────────────────────────────────
    currentRow++;

    // ── BOQ SUMMARY BREAKDOWN ─────────────────────────────────────────────────
    _writeCell(sheet, currentRow, 0,
      TextCellValue('BOQ SUMMARY BREAKDOWN'),
      CellStyle(
        bold: true,
        fontSize: 11,
        fontColorHex: _white,
        backgroundColorHex: _summaryBg,
        horizontalAlign: HorizontalAlign.Left,
        verticalAlign: VerticalAlign.Center,
      ),
    );
    sheet.merge(
      CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow),
      CellIndex.indexByColumnRow(columnIndex: 5, rowIndex: currentRow),
    );
    sheet.setRowHeight(currentRow, 22.0);
    currentRow++;

    // Calculate material total from item amounts (sum of valid canonical items)
    double materialTotal = 0.0;
    for (final item in boqItems) {
      final safeQty    = _safeDouble(item.quantity);
      final safeRate   = _safeDouble(item.rate);
      final safeAmount = _safeDouble(item.amount);
      final finalAmt   = (safeAmount > 0 && !safeAmount.isNaN)
          ? safeAmount
          : safeQty * safeRate;
      materialTotal += finalAmt;
    }

    // Use actual engine values for all summary rows
    final summaryRows = [
      ('Material Takeoff Cost',           materialTotal),
      ('Labour Takeoff Cost',             _safeDouble(c.labourCost)),
      ('Machinery & Rental Equipment',    _safeDouble(c.equipmentCost)),
      ('Overhead & Contractor Margin',    _safeDouble(c.contractorMargin)),
      ('Contingency Buffer',              _safeDouble(c.contingency)),
      ('GST (18% applied)',               _safeDouble(c.gstAmount)),
    ];

    for (final (label, value) in summaryRows) {
      final isGst = label.startsWith('GST');

      _writeCell(sheet, currentRow, 0,
        TextCellValue(label),
        CellStyle(
          fontSize: 10,
          bold: isGst,
          fontColorHex: _darkText,
          backgroundColorHex: _summaryRowBg,
          horizontalAlign: HorizontalAlign.Left,
          verticalAlign: VerticalAlign.Center,
          topBorder: _thinBorder,
          bottomBorder: _thinBorder,
          leftBorder: _thinBorder,
          rightBorder: _thinBorder,
        ),
      );
      sheet.merge(
        CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow),
        CellIndex.indexByColumnRow(columnIndex: 4, rowIndex: currentRow),
      );

      _writeCell(sheet, currentRow, 5,
        TextCellValue(_fmtRupee(value)),
        CellStyle(
          fontSize: 10,
          bold: true,
          fontColorHex: _darkText,
          backgroundColorHex: _summaryRowBg,
          horizontalAlign: HorizontalAlign.Right,
          verticalAlign: VerticalAlign.Center,
          topBorder: _thinBorder,
          bottomBorder: _thinBorder,
          leftBorder: _thinBorder,
          rightBorder: _thinBorder,
        ),
      );
      sheet.setRowHeight(currentRow, 18.0);
      currentRow++;
    }

    // ── GRAND TOTAL ROW ───────────────────────────────────────────────────────
    final grandTotal = _safeDouble(c.grandTotal);
    _writeCell(sheet, currentRow, 0,
      TextCellValue('GRAND TOTAL CONTRACT AMOUNT'),
      CellStyle(
        bold: true,
        fontSize: 11,
        fontColorHex: _white,
        backgroundColorHex: _totalBg,
        horizontalAlign: HorizontalAlign.Left,
        verticalAlign: VerticalAlign.Center,
        topBorder: _mediumBorder,
        bottomBorder: _mediumBorder,
        leftBorder: _mediumBorder,
        rightBorder: _thinBorder,
      ),
    );
    sheet.merge(
      CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow),
      CellIndex.indexByColumnRow(columnIndex: 4, rowIndex: currentRow),
    );

    _writeCell(sheet, currentRow, 5,
      TextCellValue(_fmtRupee(grandTotal)),
      CellStyle(
        bold: true,
        fontSize: 11,
        fontColorHex: _white,
        backgroundColorHex: _totalBg,
        horizontalAlign: HorizontalAlign.Right,
        verticalAlign: VerticalAlign.Center,
        topBorder: _mediumBorder,
        bottomBorder: _mediumBorder,
        leftBorder: _thinBorder,
        rightBorder: _mediumBorder,
      ),
    );
    sheet.setRowHeight(currentRow, 24.0);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 2: EXECUTIVE SUMMARY  (unchanged from previous phase)
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildExecutiveSummarySheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Executive Summary'];
    final c = report.estimation.costBreakdown;

    sheet.appendRow([TextCellValue('BUILDWISE AI \u2014 EXECUTIVE BOQ ESTIMATION REPORT')]);
    sheet.appendRow([TextCellValue('Project Name'), TextCellValue(report.projectName)]);
    sheet.appendRow([TextCellValue('Project ID'), TextCellValue(report.projectId)]);
    sheet.appendRow([TextCellValue('Generated Date'), TextCellValue(report.generatedDate)]);
    sheet.appendRow([TextCellValue('Civil Standard'), TextCellValue('IS 1200 / IS 456 / IS 1786 / IS 2502')]);
    sheet.appendRow([TextCellValue('Software Engine'), TextCellValue('BuildWise AI Engine v2.5')]);
    sheet.appendRow([]);

    sheet.appendRow([TextCellValue('COST BREAKDOWN SUMMARY')]);
    sheet.appendRow([TextCellValue('Direct Material Cost'),          DoubleCellValue(_safeDouble(c.totalMaterialCost))]);
    sheet.appendRow([TextCellValue('Direct Craft Labour Wages'),     DoubleCellValue(_safeDouble(c.labourCost))]);
    sheet.appendRow([TextCellValue('Equipment & Machinery Rentals'), DoubleCellValue(_safeDouble(c.equipmentCost))]);
    sheet.appendRow([TextCellValue('Transportation & Logistics'),    DoubleCellValue(_safeDouble(c.transportCost))]);
    sheet.appendRow([TextCellValue('Contractor Overheads & Margin'), DoubleCellValue(_safeDouble(c.contractorMargin))]);
    sheet.appendRow([TextCellValue('Contingency Buffer'),            DoubleCellValue(_safeDouble(c.contingency))]);
    sheet.appendRow([TextCellValue('GST Tax Amount (18%)'),          DoubleCellValue(_safeDouble(c.gstAmount))]);
    sheet.appendRow([TextCellValue('GRAND TOTAL CONTRACT AMOUNT'),   DoubleCellValue(_safeDouble(c.grandTotal))]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 3: MATERIALS
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildMaterialsSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Materials'];
    final m = report.estimation.materials;
    final c = report.estimation.costBreakdown;
    final p = report.estimation.userInputs;

    sheet.appendRow([
      TextCellValue('Material'),
      TextCellValue('Quantity'),
      TextCellValue('Unit'),
      TextCellValue('Rate (\u20B9)'),
      TextCellValue('Amount (\u20B9)'),
      TextCellValue('Waste %'),
    ]);

    final isAAC = p.brickType == 'aac_block';
    sheet.appendRow([
      TextCellValue(isAAC ? 'AAC Blocks' : 'Red Clay Bricks'),
      DoubleCellValue(_safeDouble(isAAC ? m.blocksCount.toDouble() : m.bricksCount.toDouble())),
      TextCellValue(isAAC ? 'nos (AAC)' : 'nos'),
      DoubleCellValue(_safeDouble(p.rateBrick ?? 10.0)),
      DoubleCellValue(_safeDouble(isAAC ? c.blockCost : c.brickCost)),
      DoubleCellValue(_safeDouble(p.wasteBrick ?? 5.0)),
    ]);
    sheet.appendRow([
      TextCellValue('OPC / PPC Cement'),
      DoubleCellValue(_safeDouble(m.cementBags.toDouble())),
      TextCellValue('bags'),
      DoubleCellValue(_safeDouble(p.rateCement ?? 430.0)),
      DoubleCellValue(_safeDouble(c.cementCost)),
      DoubleCellValue(5.0),
    ]);
    sheet.appendRow([
      TextCellValue('Coarse Sand / M-Sand'),
      DoubleCellValue(_safeDouble(m.sandVolume)),
      TextCellValue('m\u00B3'),
      DoubleCellValue(_safeDouble(p.rateSand ?? 1400.0)),
      DoubleCellValue(_safeDouble(c.sandCost)),
      DoubleCellValue(5.0),
    ]);
    sheet.appendRow([
      TextCellValue('Graded Aggregate'),
      DoubleCellValue(_safeDouble(m.aggregateVolume)),
      TextCellValue('m\u00B3'),
      DoubleCellValue(_safeDouble(p.rateAggregate ?? 1600.0)),
      DoubleCellValue(_safeDouble(c.aggregateCost)),
      DoubleCellValue(5.0),
    ]);
    sheet.appendRow([
      TextCellValue('TMT Steel Rebar'),
      DoubleCellValue(_safeDouble(m.steelWeight)),
      TextCellValue('kg'),
      DoubleCellValue(_safeDouble(p.rateSteel ?? 75.0)),
      DoubleCellValue(_safeDouble(c.steelCost)),
      DoubleCellValue(_safeDouble(p.wasteSteel ?? 3.0)),
    ]);
    sheet.appendRow([
      TextCellValue('Cement Plaster'),
      DoubleCellValue(_safeDouble(m.plasterArea)),
      TextCellValue('m\u00B2'),
      DoubleCellValue(_safeDouble(p.ratePlaster ?? 280.0)),
      DoubleCellValue(_safeDouble(c.plasterCost)),
      DoubleCellValue(_safeDouble(p.wastePlaster ?? 5.0)),
    ]);
    sheet.appendRow([
      TextCellValue('Wall Paint'),
      DoubleCellValue(_safeDouble(m.paintArea)),
      TextCellValue('m\u00B2'),
      DoubleCellValue(_safeDouble(p.ratePaint ?? 120.0)),
      DoubleCellValue(_safeDouble(c.paintCost)),
      DoubleCellValue(_safeDouble(p.wastePaint ?? 10.0)),
    ]);
    sheet.appendRow([
      TextCellValue('Vitrified Tiles'),
      DoubleCellValue(_safeDouble(m.tilesArea)),
      TextCellValue('m\u00B2'),
      DoubleCellValue(_safeDouble(p.rateTiles ?? 650.0)),
      DoubleCellValue(_safeDouble(c.tilesCost)),
      DoubleCellValue(_safeDouble(p.wasteTiles ?? 8.0)),
    ]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 4: LABOUR
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildLabourSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Labour'];
    final m = report.estimation.materials;
    final c = report.estimation.costBreakdown;

    final masonDays = ((m.netWallVolumeM3 / 1.25) + (m.plasterArea / 8.0) + (m.tilesArea / 6.0)).ceil();
    final helperDays = (masonDays * 1.5 + (m.excavationVolume / 3.5) + (m.concreteVolume / 2.5)).ceil();
    final supervisorDays = ((masonDays + helperDays) / 10.0).ceil();

    sheet.appendRow([
      TextCellValue('Craft Trade'),
      TextCellValue('Man Days'),
      TextCellValue('Daily Wage Rate (\u20B9)'),
      TextCellValue('Total Cost (\u20B9)'),
    ]);

    sheet.appendRow([TextCellValue('Masons'), IntCellValue(masonDays), DoubleCellValue(900.0), DoubleCellValue(masonDays * 900.0)]);
    sheet.appendRow([TextCellValue('Helpers / Unskilled Labour'), IntCellValue(helperDays), DoubleCellValue(650.0), DoubleCellValue(helperDays * 650.0)]);
    sheet.appendRow([TextCellValue('Site Supervisors'), IntCellValue(supervisorDays), DoubleCellValue(1200.0), DoubleCellValue(supervisorDays * 1200.0)]);
    sheet.appendRow([TextCellValue('TOTAL LABOUR COST'), TextCellValue(''), TextCellValue(''), DoubleCellValue(_safeDouble(c.labourCost))]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 5: EQUIPMENT
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildEquipmentSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Equipment'];
    final m = report.estimation.materials;
    final c = report.estimation.costBreakdown;

    final mixerRent = (m.concreteVolume / 8.0).ceil() * 1800.0;
    final vibratorRent = (m.concreteVolume / 8.0).ceil() * 500.0;

    sheet.appendRow([
      TextCellValue('Equipment / Machine'),
      TextCellValue('Usage Specification'),
      TextCellValue('Rental Cost (\u20B9)'),
    ]);

    sheet.appendRow([TextCellValue('Concrete Batch Mixer'), TextCellValue('${(m.concreteVolume / 8.0).ceil()} machine shifts'), DoubleCellValue(mixerRent)]);
    sheet.appendRow([TextCellValue('Needle Vibrator'), TextCellValue('${(m.concreteVolume / 8.0).ceil()} machine shifts'), DoubleCellValue(vibratorRent)]);
    sheet.appendRow([TextCellValue('Scaffolding & Shuttering Rentals'), TextCellValue('Lump sum shuttering sets'), DoubleCellValue(5000.0)]);
    sheet.appendRow([TextCellValue('TOTAL EQUIPMENT COST'), TextCellValue(''), DoubleCellValue(_safeDouble(c.equipmentCost))]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 6: WALL TAKEOFF
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildWallTakeoffSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Wall Takeoff'];
    sheet.appendRow([
      TextCellValue('Wall ID'),
      TextCellValue('Name'),
      TextCellValue('Length (m)'),
      TextCellValue('Thickness (m)'),
      TextCellValue('Height (m)'),
      TextCellValue('Gross Vol (m\u00B3)'),
      TextCellValue('Door Ded. (m\u00B3)'),
      TextCellValue('Window Ded. (m\u00B3)'),
      TextCellValue('Net Vol (m\u00B3)'),
      TextCellValue('Bricks / Blocks'),
      TextCellValue('Cement (bags)'),
      TextCellValue('Sand (m\u00B3)'),
      TextCellValue('Wall Cost (\u20B9)'),
    ]);

    for (final w in report.estimation.wallTakeoffs) {
      sheet.appendRow([
        TextCellValue(w.wallId),
        TextCellValue(w.name),
        DoubleCellValue(_safeDouble(w.lengthM)),
        DoubleCellValue(_safeDouble(w.thicknessM)),
        DoubleCellValue(_safeDouble(w.heightM)),
        DoubleCellValue(_safeDouble(w.grossVolumeM3)),
        DoubleCellValue(_safeDouble(w.doorDeductionM3)),
        DoubleCellValue(_safeDouble(w.windowDeductionM3)),
        DoubleCellValue(_safeDouble(w.netVolumeM3)),
        IntCellValue(w.bricksCount > 0 ? w.bricksCount : w.blocksCount),
        IntCellValue(w.cementBags),
        DoubleCellValue(_safeDouble(w.sandVolumeM3)),
        DoubleCellValue(_safeDouble(w.totalCost)),
      ]);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 7: ROOM SCHEDULE
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildRoomScheduleSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Room Schedule'];
    sheet.appendRow([
      TextCellValue('Room ID'),
      TextCellValue('Label'),
      TextCellValue('Carpet Area (m\u00B2)'),
      TextCellValue('Wall Surface (m\u00B2)'),
      TextCellValue('Wall Volume (m\u00B3)'),
      TextCellValue('Cement Bags'),
      TextCellValue('Sand Volume (m\u00B3)'),
      TextCellValue('Paint Liters'),
      TextCellValue('Tile Boxes'),
      TextCellValue('Total Cost (\u20B9)'),
    ]);

    for (final r in report.estimation.roomTakeoffs) {
      sheet.appendRow([
        TextCellValue(r.roomId),
        TextCellValue(r.label),
        DoubleCellValue(_safeDouble(r.areaM2)),
        DoubleCellValue(_safeDouble(r.wallAreaM2)),
        DoubleCellValue(_safeDouble(r.wallVolumeM3)),
        IntCellValue(r.cementBags),
        DoubleCellValue(_safeDouble(r.sandVolumeM3)),
        IntCellValue(r.paintLiters),
        IntCellValue(r.tilesBoxes),
        DoubleCellValue(_safeDouble(r.totalCost)),
      ]);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 8: OPENINGS
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildOpeningsSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Openings'];
    sheet.appendRow([
      TextCellValue('Opening Type'),
      TextCellValue('Quantity'),
      TextCellValue('Unit Rate (\u20B9)'),
      TextCellValue('Total Amount (\u20B9)'),
    ]);

    final m = report.estimation.materials;
    sheet.appendRow([
      TextCellValue('Flush Wooden Doors'),
      IntCellValue(_safeInt(m.doorsCount)),
      DoubleCellValue(4500.0),
      DoubleCellValue(_safeInt(m.doorsCount) * 4500.0),
    ]);
    sheet.appendRow([
      TextCellValue('UPVC / Aluminium Windows'),
      IntCellValue(_safeInt(m.windowsCount)),
      DoubleCellValue(3500.0),
      DoubleCellValue(_safeInt(m.windowsCount) * 3500.0),
    ]);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 9: CALCULATION AUDIT
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildCalculationAuditSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Calculation Audit'];
    sheet.appendRow([
      TextCellValue('Item ID'),
      TextCellValue('Item Name'),
      TextCellValue('Category'),
      TextCellValue('Formula'),
      TextCellValue('Intermediate Steps'),
      TextCellValue('Final Value'),
      TextCellValue('Unit'),
      TextCellValue('IS Code Reference'),
    ]);

    for (final audit in report.estimation.calculationAudits) {
      sheet.appendRow([
        TextCellValue(audit.itemId),
        TextCellValue(audit.itemName),
        TextCellValue(audit.category),
        TextCellValue(audit.formula),
        TextCellValue(audit.intermediateSteps.join(' | ')),
        DoubleCellValue(_safeDouble(audit.finalValue)),
        TextCellValue(audit.unit),
        TextCellValue(audit.isCodeReference),
      ]);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 10: VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildValidationSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Validation'];
    final val = report.validation;

    sheet.appendRow([TextCellValue('IS 1200 / IS 456 SEVEN-LAYER VALIDATION SUMMARY')]);
    sheet.appendRow([TextCellValue('Export Ready Status'), TextCellValue(val?.isExportReady == true ? 'PASSED \u2014 EXPORT READY' : 'ISSUES DETECTED')]);
    sheet.appendRow([TextCellValue('Overall Health Score'), IntCellValue(val?.overallHealthScore ?? 100)]);
    sheet.appendRow([TextCellValue('Severity Status'), TextCellValue(val?.severity ?? 'green')]);
    sheet.appendRow([]);

    sheet.appendRow([TextCellValue('MODULE SCORES')]);
    sheet.appendRow([TextCellValue('Module Name'), TextCellValue('Score'), TextCellValue('Status'), TextCellValue('Description')]);
    if (val != null) {
      for (final mod in val.moduleScores) {
        sheet.appendRow([
          TextCellValue(mod.moduleName),
          IntCellValue(mod.score),
          TextCellValue(mod.status),
          TextCellValue(mod.description),
        ]);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHEET 11: STANDARDS & REFERENCES
  // ══════════════════════════════════════════════════════════════════════════

  static void _buildStandardsSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Standards & References'];
    sheet.appendRow([
      TextCellValue('Standard Code'),
      TextCellValue('Specification & Description'),
    ]);

    final standards = [
      ['IS 1200 (Part 1)',  'Method of Measurement of Building Works: Earthwork Excavation'],
      ['IS 1200 (Part 2)',  'Method of Measurement of Building Works: Concrete Works'],
      ['IS 1200 (Part 3)',  'Method of Measurement of Building Works: Brickwork & Masonry'],
      ['IS 1200 (Part 8)',  'Method of Measurement of Building Works: Openings, Doors & Windows'],
      ['IS 1200 (Part 11)', 'Method of Measurement of Building Works: Paving & Floor Tiles'],
      ['IS 1200 (Part 12)', 'Method of Measurement of Building Works: Plastering & Pointing'],
      ['IS 1200 (Part 13)', 'Method of Measurement of Building Works: Painting & Finishing'],
      ['IS 456 : 2000',     'Plain and Reinforced Concrete Code of Practice'],
      ['IS 1786 : 2008',    'High Strength Deformed Steel Bars and Wires for Concrete Reinforcement'],
      ['IS 2502 : 1963',    'Code of Practice for Bending and Fixing of Bars for Concrete Reinforcement'],
      ['IS 10262 : 2019',   'Concrete Mix Proportioning Guidelines'],
      ['IS 383 : 2016',     'Coarse and Fine Aggregate for Concrete Specification'],
      ['IS 2212 : 1991',    'Code of Practice for Brickwork Masonry'],
    ];

    for (final st in standards) {
      sheet.appendRow([TextCellValue(st[0]), TextCellValue(st[1])]);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /// Writes a cell value with optional styling using `updateCell`.
  static void _writeCell(
    Sheet sheet,
    int rowIndex,
    int colIndex,
    CellValue? value,
    CellStyle style,
  ) {
    sheet.updateCell(
      CellIndex.indexByColumnRow(columnIndex: colIndex, rowIndex: rowIndex),
      value,
      cellStyle: style,
    );
  }
}
