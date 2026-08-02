import 'dart:io';
import 'package:csv/csv.dart';
import 'package:path_provider/path_provider.dart';
import '../domain/report_model.dart';

class BOQCsvExporter {
  static Future<File> exportToCsv(BOQReportModel report, [Directory? outputDir]) async {
    final c = report.estimation.costBreakdown;
    final csvData = <List<dynamic>>[
      ['BUILDWISE AI — BOQ ESTIMATION REPORT'],
      ['Project Name', report.projectName],
      ['Project ID', report.projectId],
      ['Generated Date', report.generatedDate],
      ['Civil Code', 'IS 1200 / IS 456'],
      [],
      ['Sr No', 'Category', 'Description', 'IS Code Reference', 'Formula', 'Quantity', 'Unit', 'Rate (INR)', 'Amount (INR)'],
      ...report.boqItems.map((item) => [
            item.srNo,
            item.category,
            item.description,
            item.isCode,
            item.formula,
            item.quantity,
            item.unit,
            item.rate,
            item.amount,
          ]),
      [],
      ['SUMMARY BREAKDOWN'],
      ['Total Material Cost', '', '', '', '', '', '', '', c.totalMaterialCost],
      ['Labour Wages Cost', '', '', '', '', '', '', '', c.labourCost],
      ['Equipment Rentals Cost', '', '', '', '', '', '', '', c.equipmentCost],
      ['Transportation & Logistics Cost', '', '', '', '', '', '', '', c.transportCost],
      ['Contractor Overheads & Margin', '', '', '', '', '', '', '', c.contractorMargin],
      ['Contingency Buffer', '', '', '', '', '', '', '', c.contingency],
      ['GST Tax Amount (18%)', '', '', '', '', '', '', '', c.gstAmount],
      ['GRAND TOTAL ESTIMATE AMOUNT', '', '', '', '', '', '', '', c.grandTotal],
    ];

    const converter = ListToCsvConverter();
    final csvString = converter.convert(csvData);

    final sanitizedProjectName = report.projectName.replaceAll(RegExp(r'[^\w\.-]'), '_');
    final fileName = 'BuildWise_${sanitizedProjectName}_BOQ.csv';

    final dir = outputDir ?? await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$fileName');
    await file.writeAsString(csvString);
    return file;
  }
}
