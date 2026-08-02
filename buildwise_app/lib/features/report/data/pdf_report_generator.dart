import 'dart:io';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import '../domain/report_model.dart';

class PDFReportGenerator {
  static Future<Uint8List> generatePdfBytes(BOQReportModel report) async {
    final pdf = pw.Document();
    final c = report.estimation.costBreakdown;
    final val = report.validation;

    // Header Theme Colors
    const primaryColor = PdfColor.fromInt(0xFF7C3AED); // Violet-600
    const darkGray = PdfColor.fromInt(0xFF1F2937);
    const lightGray = PdfColor.fromInt(0xFFF3F4F6);

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('BuildWise AI', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                  pw.Text('IS 1200 / IS 456 CERTIFIED BOQ', style: pw.TextStyle(fontSize: 8, color: PdfColors.grey700, fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Text('Enterprise Construction BOQ & Takeoff Audit Report', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey600)),
              pw.Text('Project: ${report.projectName} | ID: ${report.projectId} | Date: ${report.generatedDate.split('T').first}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey500)),
              pw.SizedBox(height: 6),
              pw.Divider(color: primaryColor, thickness: 1.5),
              pw.SizedBox(height: 10),
            ],
          );
        },
        footer: (pw.Context context) {
          return pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('BuildWise AI Civil Platform', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey500)),
              pw.Text('Page ${context.pageNumber} of ${context.pagesCount}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey500)),
            ],
          );
        },
        build: (pw.Context context) => [
          // Executive Summary Block
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              color: lightGray,
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
              border: pw.Border.all(color: PdfColors.grey300),
            ),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('EXECUTIVE PROJECT SUMMARY', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: darkGray)),
                pw.SizedBox(height: 6),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Building Type: ${report.estimation.userInputs.buildingType.toUpperCase()}', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text('Total Floors: ${report.estimation.userInputs.numFloors}', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text('Floor Height: ${report.estimation.userInputs.floorHeight}m', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text('Total Area: ${report.estimation.materials.netWallAreaM2.toStringAsFixed(1)} m²', style: const pw.TextStyle(fontSize: 8)),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 14),

          // BOQ Table
          pw.Text('BILL OF QUANTITIES (BOQ SCHEDULE)', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: primaryColor)),
          pw.SizedBox(height: 6),

          pw.TableHelper.fromTextArray(
            headers: ['Sr', 'Category', 'Description', 'IS Code', 'Qty', 'Unit', 'Rate (Rs.)', 'Amount (Rs.)'],
            data: report.boqItems.map((i) => [
              i.srNo.toString(),
              i.category,
              i.description,
              i.isCode,
              i.quantity.toStringAsFixed(2),
              i.unit,
              i.rate.toStringAsFixed(0),
              i.amount.toStringAsFixed(0),
            ]).toList(),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 7),
            headerDecoration: const pw.BoxDecoration(color: primaryColor),
            cellStyle: const pw.TextStyle(fontSize: 7),
            cellAlignment: pw.Alignment.centerLeft,
            columnWidths: {
              0: const pw.FixedColumnWidth(16),
              1: const pw.FixedColumnWidth(60),
              2: const pw.FixedColumnWidth(110),
              3: const pw.FixedColumnWidth(70),
              4: const pw.FixedColumnWidth(35),
              5: const pw.FixedColumnWidth(30),
              6: const pw.FixedColumnWidth(40),
              7: const pw.FixedColumnWidth(55),
            },
          ),
          pw.SizedBox(height: 14),

          // Cost Breakdown Summary
          pw.Text('COST BREAKDOWN SUMMARY', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: darkGray)),
          pw.SizedBox(height: 6),

          pw.Container(
            padding: const pw.EdgeInsets.all(10),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.grey300),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
            ),
            child: pw.Column(
              children: [
                _pdfSummaryRow('Direct Material Cost:', c.totalMaterialCost),
                _pdfSummaryRow('Direct Craft Labour Wages:', c.labourCost),
                _pdfSummaryRow('Equipment & Machinery Rentals:', c.equipmentCost),
                _pdfSummaryRow('Transportation & Logistics:', c.transportCost),
                _pdfSummaryRow('Contractor Overheads & Margin:', c.contractorMargin),
                _pdfSummaryRow('Contingency Buffer:', c.contingency),
                pw.Divider(),
                _pdfSummaryRow('GST Tax Amount (18%):', c.gstAmount),
                pw.Divider(thickness: 1.5, color: primaryColor),
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('GRAND TOTAL CONTRACT AMOUNT:', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                    pw.Text('Rs. ${c.grandTotal.toStringAsFixed(0)}', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: primaryColor)),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 16),

          // Calculation Audit Trail
          pw.Text('CALCULATION AUDIT TRAIL (IS 1200 / IS 456)', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: primaryColor)),
          pw.SizedBox(height: 6),
          pw.TableHelper.fromTextArray(
            headers: ['Item', 'Formula', 'IS Code Reference', 'Final Result'],
            data: report.estimation.calculationAudits.map((a) => [
              a.itemName,
              a.formula,
              a.isCodeReference,
              '${a.finalValue.toStringAsFixed(2)} ${a.unit}',
            ]).toList(),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 7),
            headerDecoration: const pw.BoxDecoration(color: PdfColors.grey800),
            cellStyle: const pw.TextStyle(fontSize: 7),
          ),
          pw.SizedBox(height: 14),

          // Validation & Health Status
          if (val != null) ...[
            pw.Text('SEVEN-LAYER VALIDATION AUDIT STATUS', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: darkGray)),
            pw.SizedBox(height: 4),
            pw.Text('Overall Health Score: ${val.overallHealthScore}% | Status: ${val.severity.toUpperCase()} | Export Ready: ${val.isExportReady ? 'YES' : 'NO'}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: val.isExportReady ? PdfColors.green700 : PdfColors.red700)),
            pw.SizedBox(height: 14),
          ],

          // Digital Signatures Stamp Block
          pw.Text('DIGITAL SIGN-OFF & VERIFICATION STAMP', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
          pw.SizedBox(height: 24),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                  pw.SizedBox(height: 4),
                  pw.Text('Prepared By: Quantity Surveyor', style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600)),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                  pw.SizedBox(height: 4),
                  pw.Text('Checked By: Structural Engineer', style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600)),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(width: 120, height: 1, color: PdfColors.grey400),
                  pw.SizedBox(height: 4),
                  pw.Text('Approved By: Client / Contractor', style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600)),
                ],
              ),
            ],
          ),
        ],
      ),
    );

    return await pdf.save();
  }

  static Future<File> generateAndSavePdf(BOQReportModel report, [Directory? outputDir]) async {
    final pdfBytes = await generatePdfBytes(report);
    final sanitizedProjectName = report.projectName.replaceAll(RegExp(r'[^\w\.-]'), '_');
    final fileName = 'BuildWise_${sanitizedProjectName}_Report.pdf';

    final dir = outputDir ?? await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$fileName');
    await file.writeAsBytes(pdfBytes);
    return file;
  }

  static pw.Widget _pdfSummaryRow(String title, double amount) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(title, style: const pw.TextStyle(fontSize: 8)),
          pw.Text('Rs. ${amount.toStringAsFixed(0)}', style: const pw.TextStyle(fontSize: 8)),
        ],
      ),
    );
  }
}
