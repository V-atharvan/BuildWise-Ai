import 'dart:io';
import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import '../domain/report_model.dart';

class BOQExcelExporter {
  static Future<File> exportToExcel(BOQReportModel report, [Directory? outputDir]) async {
    final excel = Excel.createExcel();

    // 1. Executive Summary Sheet
    _buildExecutiveSummarySheet(excel, report);

    // 2. BOQ Report Sheet
    _buildBOQReportSheet(excel, report);

    // 3. Materials Sheet
    _buildMaterialsSheet(excel, report);

    // 4. Labour Sheet
    _buildLabourSheet(excel, report);

    // 5. Equipment Sheet
    _buildEquipmentSheet(excel, report);

    // 6. Wall Takeoff Sheet
    _buildWallTakeoffSheet(excel, report);

    // 7. Room Schedule Sheet
    _buildRoomScheduleSheet(excel, report);

    // 8. Openings Sheet
    _buildOpeningsSheet(excel, report);

    // 9. Calculation Audit Sheet
    _buildCalculationAuditSheet(excel, report);

    // 10. Validation Sheet
    _buildValidationSheet(excel, report);

    // 11. Standards & References Sheet
    _buildStandardsSheet(excel, report);

    // Remove default sheet if exists
    if (excel.sheets.containsKey('Sheet1')) {
      excel.delete('Sheet1');
    }

    final bytes = excel.save();
    final sanitizedProjectName = report.projectName.replaceAll(RegExp(r'[^\w\.-]'), '_');
    final fileName = 'BuildWise_${sanitizedProjectName}_BOQ.xlsx';

    final dir = outputDir ?? await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$fileName');
    if (bytes != null) {
      await file.writeAsBytes(bytes);
    }
    return file;
  }

  static void _buildExecutiveSummarySheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Executive Summary'];
    final c = report.estimation.costBreakdown;

    sheet.appendRow([TextCellValue('BUILDWISE AI — EXECUTIVE BOQ ESTIMATION REPORT')]);
    sheet.appendRow([TextCellValue('Project Name'), TextCellValue(report.projectName)]);
    sheet.appendRow([TextCellValue('Project ID'), TextCellValue(report.projectId)]);
    sheet.appendRow([TextCellValue('Generated Date'), TextCellValue(report.generatedDate)]);
    sheet.appendRow([TextCellValue('Civil Standard'), TextCellValue('IS 1200 / IS 456 / IS 1786 / IS 2502')]);
    sheet.appendRow([TextCellValue('Software Engine'), TextCellValue('BuildWise AI Engine v2.5')]);
    sheet.appendRow([]);

    sheet.appendRow([TextCellValue('COST BREAKDOWN SUMMARY')]);
    sheet.appendRow([TextCellValue('Direct Material Cost'), DoubleCellValue(c.totalMaterialCost)]);
    sheet.appendRow([TextCellValue('Direct Craft Labour Wages'), DoubleCellValue(c.labourCost)]);
    sheet.appendRow([TextCellValue('Equipment & Machinery Rentals'), DoubleCellValue(c.equipmentCost)]);
    sheet.appendRow([TextCellValue('Transportation & Logistics'), DoubleCellValue(c.transportCost)]);
    sheet.appendRow([TextCellValue('Contractor Overheads & Margin'), DoubleCellValue(c.contractorMargin)]);
    sheet.appendRow([TextCellValue('Contingency Buffer'), DoubleCellValue(c.contingency)]);
    sheet.appendRow([TextCellValue('GST Tax Amount (18%)'), DoubleCellValue(c.gstAmount)]);
    sheet.appendRow([TextCellValue('GRAND TOTAL CONTRACT AMOUNT'), DoubleCellValue(c.grandTotal)]);
  }

  static void _buildBOQReportSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['BOQ Report'];
    sheet.appendRow([
      TextCellValue('Item No.'),
      TextCellValue('Category'),
      TextCellValue('Description'),
      TextCellValue('IS Standard Reference'),
      TextCellValue('Formula'),
      TextCellValue('Quantity'),
      TextCellValue('Unit'),
      TextCellValue('Rate (₹)'),
      TextCellValue('Amount (₹)'),
    ]);

    for (final item in report.boqItems) {
      sheet.appendRow([
        IntCellValue(item.srNo),
        TextCellValue(item.category),
        TextCellValue(item.description),
        TextCellValue(item.isCode),
        TextCellValue(item.formula),
        DoubleCellValue(item.quantity),
        TextCellValue(item.unit),
        DoubleCellValue(item.rate),
        DoubleCellValue(item.amount),
      ]);
    }

    final c = report.estimation.costBreakdown;
    sheet.appendRow([]);
    sheet.appendRow([TextCellValue('SUBTOTAL MATERIAL COST'), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.totalMaterialCost)]);
    sheet.appendRow([TextCellValue('LABOUR WAGES'), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.labourCost)]);
    sheet.appendRow([TextCellValue('EQUIPMENT RENTALS'), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.equipmentCost)]);
    sheet.appendRow([TextCellValue('CONTRACTOR MARGIN'), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.contractorMargin)]);
    sheet.appendRow([TextCellValue('GST TAX (18%)'), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.gstAmount)]);
    sheet.appendRow([TextCellValue('GRAND TOTAL AMOUNT'), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.grandTotal)]);
  }

  static void _buildMaterialsSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Materials'];
    final m = report.estimation.materials;
    final c = report.estimation.costBreakdown;
    final p = report.estimation.userInputs;

    sheet.appendRow([
      TextCellValue('Material'),
      TextCellValue('Quantity'),
      TextCellValue('Unit'),
      TextCellValue('Rate (₹)'),
      TextCellValue('Amount (₹)'),
      TextCellValue('Waste %'),
    ]);

    sheet.appendRow([TextCellValue(p.brickType == 'aac_block' ? 'AAC Blocks' : 'Red Clay Bricks'), DoubleCellValue(p.brickType == 'aac_block' ? m.blocksCount.toDouble() : m.bricksCount.toDouble()), TextCellValue(p.brickType == 'aac_block' ? 'nos (AAC)' : 'nos'), DoubleCellValue(p.rateBrick ?? 10.0), DoubleCellValue(p.brickType == 'aac_block' ? c.blockCost : c.brickCost), DoubleCellValue(p.wasteBrick ?? 5.0)]);
    sheet.appendRow([TextCellValue('OPC / PPC Cement'), DoubleCellValue(m.cementBags.toDouble()), TextCellValue('bags'), DoubleCellValue(p.rateCement ?? 430.0), DoubleCellValue(c.cementCost), DoubleCellValue(5.0)]);
    sheet.appendRow([TextCellValue('Coarse Sand / M-Sand'), DoubleCellValue(m.sandVolume), TextCellValue('m³'), DoubleCellValue(p.rateSand ?? 1400.0), DoubleCellValue(c.sandCost), DoubleCellValue(5.0)]);
    sheet.appendRow([TextCellValue('Graded Aggregate'), DoubleCellValue(m.aggregateVolume), TextCellValue('m³'), DoubleCellValue(p.rateAggregate ?? 1600.0), DoubleCellValue(c.aggregateCost), DoubleCellValue(5.0)]);
    sheet.appendRow([TextCellValue('TMT Steel Rebar'), DoubleCellValue(m.steelWeight), TextCellValue('kg'), DoubleCellValue(p.rateSteel ?? 75.0), DoubleCellValue(c.steelCost), DoubleCellValue(p.wasteSteel ?? 3.0)]);
    sheet.appendRow([TextCellValue('Cement Plaster'), DoubleCellValue(m.plasterArea), TextCellValue('m²'), DoubleCellValue(p.ratePlaster ?? 280.0), DoubleCellValue(c.plasterCost), DoubleCellValue(p.wastePlaster ?? 5.0)]);
    sheet.appendRow([TextCellValue('Wall Paint'), DoubleCellValue(m.paintArea), TextCellValue('m²'), DoubleCellValue(p.ratePaint ?? 120.0), DoubleCellValue(c.paintCost), DoubleCellValue(p.wastePaint ?? 10.0)]);
    sheet.appendRow([TextCellValue('Vitrified Tiles'), DoubleCellValue(m.tilesArea), TextCellValue('m²'), DoubleCellValue(p.rateTiles ?? 650.0), DoubleCellValue(c.tilesCost), DoubleCellValue(p.wasteTiles ?? 8.0)]);
  }

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
      TextCellValue('Daily Wage Rate (₹)'),
      TextCellValue('Total Cost (₹)'),
    ]);

    sheet.appendRow([TextCellValue('Masons'), IntCellValue(masonDays), DoubleCellValue(900.0), DoubleCellValue(masonDays * 900.0)]);
    sheet.appendRow([TextCellValue('Helpers / Unskilled Labour'), IntCellValue(helperDays), DoubleCellValue(650.0), DoubleCellValue(helperDays * 650.0)]);
    sheet.appendRow([TextCellValue('Site Supervisors'), IntCellValue(supervisorDays), DoubleCellValue(1200.0), DoubleCellValue(supervisorDays * 1200.0)]);
    sheet.appendRow([TextCellValue('TOTAL LABOUR COST'), TextCellValue(''), TextCellValue(''), DoubleCellValue(c.labourCost)]);
  }

  static void _buildEquipmentSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Equipment'];
    final m = report.estimation.materials;
    final c = report.estimation.costBreakdown;

    final mixerRent = (m.concreteVolume / 8.0).ceil() * 1800.0;
    final vibratorRent = (m.concreteVolume / 8.0).ceil() * 500.0;

    sheet.appendRow([
      TextCellValue('Equipment / Machine'),
      TextCellValue('Usage Specification'),
      TextCellValue('Rental Cost (₹)'),
    ]);

    sheet.appendRow([TextCellValue('Concrete Batch Mixer'), TextCellValue('${(m.concreteVolume / 8.0).ceil()} machine shifts'), DoubleCellValue(mixerRent)]);
    sheet.appendRow([TextCellValue('Needle Vibrator'), TextCellValue('${(m.concreteVolume / 8.0).ceil()} machine shifts'), DoubleCellValue(vibratorRent)]);
    sheet.appendRow([TextCellValue('Scaffolding & Shuttering Rentals'), TextCellValue('Lump sum shuttering sets'), DoubleCellValue(5000.0)]);
    sheet.appendRow([TextCellValue('TOTAL EQUIPMENT COST'), TextCellValue(''), DoubleCellValue(c.equipmentCost)]);
  }

  static void _buildWallTakeoffSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Wall Takeoff'];
    sheet.appendRow([
      TextCellValue('Wall ID'),
      TextCellValue('Name'),
      TextCellValue('Length (m)'),
      TextCellValue('Thickness (m)'),
      TextCellValue('Height (m)'),
      TextCellValue('Gross Vol (m³)'),
      TextCellValue('Door Ded. (m³)'),
      TextCellValue('Window Ded. (m³)'),
      TextCellValue('Net Vol (m³)'),
      TextCellValue('Bricks / Blocks'),
      TextCellValue('Cement (bags)'),
      TextCellValue('Sand (m³)'),
      TextCellValue('Wall Cost (₹)'),
    ]);

    for (final w in report.estimation.wallTakeoffs) {
      sheet.appendRow([
        TextCellValue(w.wallId),
        TextCellValue(w.name),
        DoubleCellValue(w.lengthM),
        DoubleCellValue(w.thicknessM),
        DoubleCellValue(w.heightM),
        DoubleCellValue(w.grossVolumeM3),
        DoubleCellValue(w.doorDeductionM3),
        DoubleCellValue(w.windowDeductionM3),
        DoubleCellValue(w.netVolumeM3),
        IntCellValue(w.bricksCount > 0 ? w.bricksCount : w.blocksCount),
        IntCellValue(w.cementBags),
        DoubleCellValue(w.sandVolumeM3),
        DoubleCellValue(w.totalCost),
      ]);
    }
  }

  static void _buildRoomScheduleSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Room Schedule'];
    sheet.appendRow([
      TextCellValue('Room ID'),
      TextCellValue('Label'),
      TextCellValue('Carpet Area (m²)'),
      TextCellValue('Wall Surface (m²)'),
      TextCellValue('Wall Volume (m³)'),
      TextCellValue('Cement Bags'),
      TextCellValue('Sand Volume (m³)'),
      TextCellValue('Paint Liters'),
      TextCellValue('Tile Boxes'),
      TextCellValue('Total Cost (₹)'),
    ]);

    for (final r in report.estimation.roomTakeoffs) {
      sheet.appendRow([
        TextCellValue(r.roomId),
        TextCellValue(r.label),
        DoubleCellValue(r.areaM2),
        DoubleCellValue(r.wallAreaM2),
        DoubleCellValue(r.wallVolumeM3),
        IntCellValue(r.cementBags),
        DoubleCellValue(r.sandVolumeM3),
        IntCellValue(r.paintLiters),
        IntCellValue(r.tilesBoxes),
        DoubleCellValue(r.totalCost),
      ]);
    }
  }

  static void _buildOpeningsSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Openings'];
    sheet.appendRow([
      TextCellValue('Opening Type'),
      TextCellValue('Quantity'),
      TextCellValue('Unit Rate (₹)'),
      TextCellValue('Total Amount (₹)'),
    ]);

    final m = report.estimation.materials;
    sheet.appendRow([TextCellValue('Flush Wooden Doors'), IntCellValue(m.doorsCount), DoubleCellValue(4500.0), DoubleCellValue(m.doorsCount * 4500.0)]);
    sheet.appendRow([TextCellValue('UPVC / Aluminium Windows'), IntCellValue(m.windowsCount), DoubleCellValue(3500.0), DoubleCellValue(m.windowsCount * 3500.0)]);
  }

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
        DoubleCellValue(audit.finalValue),
        TextCellValue(audit.unit),
        TextCellValue(audit.isCodeReference),
      ]);
    }
  }

  static void _buildValidationSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Validation'];
    final val = report.validation;

    sheet.appendRow([TextCellValue('IS 1200 / IS 456 SEVEN-LAYER VALIDATION SUMMARY')]);
    sheet.appendRow([TextCellValue('Export Ready Status'), TextCellValue(val?.isExportReady == true ? 'PASSED — EXPORT READY' : 'ISSUES DETECTED')]);
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

  static void _buildStandardsSheet(Excel excel, BOQReportModel report) {
    final sheet = excel['Standards & References'];
    sheet.appendRow([
      TextCellValue('Standard Code'),
      TextCellValue('Specification & Description'),
    ]);

    final standards = [
      ['IS 1200 (Part 1)', 'Method of Measurement of Building Works: Earthwork Excavation'],
      ['IS 1200 (Part 2)', 'Method of Measurement of Building Works: Concrete Works'],
      ['IS 1200 (Part 3)', 'Method of Measurement of Building Works: Brickwork & Masonry'],
      ['IS 1200 (Part 8)', 'Method of Measurement of Building Works: Openings, Doors & Windows'],
      ['IS 1200 (Part 11)', 'Method of Measurement of Building Works: Paving & Floor Tiles'],
      ['IS 1200 (Part 12)', 'Method of Measurement of Building Works: Plastering & Pointing'],
      ['IS 1200 (Part 13)', 'Method of Measurement of Building Works: Painting & Finishing'],
      ['IS 456 : 2000', 'Plain and Reinforced Concrete Code of Practice'],
      ['IS 1786 : 2008', 'High Strength Deformed Steel Bars and Wires for Concrete Reinforcement'],
      ['IS 2502 : 1963', 'Code of Practice for Bending and Fixing of Bars for Concrete Reinforcement'],
      ['IS 10262 : 2019', 'Concrete Mix Proportioning Guidelines'],
      ['IS 383 : 2016', 'Coarse and Fine Aggregate for Concrete Specification'],
      ['IS 2212 : 1991', 'Code of Practice for Brickwork Masonry'],
    ];

    for (final st in standards) {
      sheet.appendRow([TextCellValue(st[0]), TextCellValue(st[1])]);
    }
  }
}
