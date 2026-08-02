import '../../../models/estimation_result.dart';
import '../../analysis/domain/confidence_engine.dart';
import '../../analysis/domain/validation_engine.dart';

class BOQItem {
  final int srNo;
  final String category;
  final String description;
  final String isCode;
  final String formula;
  final double quantity;
  final String unit;
  final double rate;
  final double amount;
  final double wastePct;
  final double gstPct;

  const BOQItem({
    required this.srNo,
    required this.category,
    required this.description,
    required this.isCode,
    required this.formula,
    required this.quantity,
    required this.unit,
    required this.rate,
    required this.amount,
    this.wastePct = 5.0,
    this.gstPct = 18.0,
  });

  factory BOQItem.fromJson(Map<String, dynamic> json) {
    return BOQItem(
      srNo: (json['sr_no'] as num?)?.toInt() ?? 1,
      category: json['category'] as String? ?? 'General Works',
      description: json['description'] as String? ?? '',
      isCode: json['is_code'] as String? ?? '',
      formula: json['formula'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? '',
      rate: (json['rate'] as num?)?.toDouble() ?? 0.0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      wastePct: (json['waste_pct'] as num?)?.toDouble() ?? 5.0,
      gstPct: (json['gst_pct'] as num?)?.toDouble() ?? 18.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'sr_no': srNo,
        'category': category,
        'description': description,
        'is_code': isCode,
        'formula': formula,
        'quantity': quantity,
        'unit': unit,
        'rate': rate,
        'amount': amount,
        'waste_pct': wastePct,
        'gst_pct': gstPct,
      };
}

class BOQReportModel {
  final String projectId;
  final String projectName;
  final String clientName;
  final String engineerName;
  final String generatedDate;
  final String currency;

  final EstimationResult estimation;
  final SevenLayerValidationReport? validation;
  final ProjectConfidenceReport? confidence;
  final List<BOQItem> boqItems;

  const BOQReportModel({
    required this.projectId,
    required this.projectName,
    this.clientName = 'Valued Client',
    this.engineerName = 'Senior Quantity Surveyor',
    required this.generatedDate,
    this.currency = 'INR',
    required this.estimation,
    this.validation,
    this.confidence,
    required this.boqItems,
  });

  factory BOQReportModel.fromEstimation({
    required String projectName,
    required EstimationResult estimation,
    SevenLayerValidationReport? validation,
    ProjectConfidenceReport? confidence,
    String clientName = 'Valued Client',
    String engineerName = 'Senior Quantity Surveyor',
  }) {
    final items = generateBOQItemsFromEstimation(estimation);

    return BOQReportModel(
      projectId: estimation.projectId.isNotEmpty ? estimation.projectId : estimation.id,
      projectName: projectName,
      clientName: clientName,
      engineerName: engineerName,
      generatedDate: DateTime.now().toIso8601String(),
      currency: estimation.currency,
      estimation: estimation,
      validation: validation,
      confidence: confidence,
      boqItems: items,
    );
  }
}

/// Generate standardized BOQ Items from EstimationResult (identical to Web boq-generator.ts)
List<BOQItem> generateBOQItemsFromEstimation(EstimationResult estimation) {
  final m = estimation.materials;
  final c = estimation.costBreakdown;
  final p = estimation.userInputs;

  final items = <BOQItem>[];
  var index = 1;

  void add({
    required String category,
    required String desc,
    required String isCode,
    required String formula,
    required double qty,
    required String unit,
    required double rate,
    required double amount,
    double wastePct = 5.0,
    double gstPct = 18.0,
  }) {
    if (qty > 0 || amount > 0) {
      items.add(BOQItem(
        srNo: index++,
        category: category,
        description: desc,
        isCode: isCode,
        formula: formula,
        quantity: (qty * 100).round() / 100.0,
        unit: unit,
        rate: (rate * 100).round() / 100.0,
        amount: amount.roundToDouble(),
        wastePct: wastePct,
        gstPct: gstPct,
      ));
    }
  }

  // 1. Civil & Earthwork
  final excVol = m.excavationVolume;
  final excCost = c.excavationCost;
  add(
    category: 'Civil & Earthwork',
    desc: 'Earthwork Excavation for foundations and trenches',
    isCode: 'IS 1200 (Part 1)',
    formula: 'V = Envelope Area × Plinth Height',
    qty: excVol,
    unit: 'm³',
    rate: excVol > 0 ? excCost / excVol : 200.0,
    amount: excCost,
    wastePct: 0.0,
  );

  // 2. Structural RCC
  final rccVol = m.concreteVolume;
  final rccCost = c.cementCost + c.sandCost + c.aggregateCost;
  add(
    category: 'Structural RCC',
    desc: 'Concrete RCC Mix (Slabs, Beams, Columns, Footings, Stairs)',
    isCode: 'IS 1200 (Part 2) / IS 456',
    formula: 'V_RCC = V_slabs + V_columns + V_beams + V_footings',
    qty: rccVol,
    unit: 'm³',
    rate: rccVol > 0 ? rccCost / rccVol : 6500.0,
    amount: rccCost,
    wastePct: p.wasteConcrete ?? 2.0,
  );

  final steelWt = m.steelWeight;
  final steelCost = c.steelCost;
  add(
    category: 'Structural RCC',
    desc: 'TMT Steel Reinforcement Bars (Fe500/Fe550 Rebar)',
    isCode: 'IS 1786 / IS 2502',
    formula: 'W_steel = Sum(V_member * Rebar Density kg/m3) * (1 + Waste %)',
    qty: steelWt,
    unit: 'kg',
    rate: steelWt > 0 ? steelCost / steelWt : 75.0,
    amount: steelCost,
    wastePct: p.wasteSteel ?? 3.0,
  );

  final cementBags = m.cementBags.toDouble();
  final cementCost = c.cementCost;
  add(
    category: 'Structural RCC',
    desc: 'OPC / PPC 53 Grade Cement Bags (50kg units)',
    isCode: 'IS 456 / IS 10262',
    formula: 'Bags = (Dry Mortar Vol / 0.0347) + (Dry RCC Vol * Mix Ratio / 0.0347)',
    qty: cementBags,
    unit: 'bags',
    rate: cementBags > 0 ? cementCost / cementBags : 430.0,
    amount: cementCost,
    wastePct: 5.0,
  );

  final sandVol = m.sandVolume;
  final sandCost = c.sandCost;
  add(
    category: 'Structural RCC',
    desc: 'Coarse River Sand / M-Sand Aggregate',
    isCode: 'IS 383',
    formula: 'Vol = Mortar Vol × Sand Ratio × 1.20 Bulking Factor',
    qty: sandVol,
    unit: 'm³',
    rate: sandVol > 0 ? sandCost / sandVol : 1400.0,
    amount: sandCost,
    wastePct: 5.0,
  );

  final aggVol = m.aggregateVolume;
  final aggCost = c.aggregateCost;
  add(
    category: 'Structural RCC',
    desc: 'Graded Stone Aggregate (10mm / 20mm)',
    isCode: 'IS 383',
    formula: 'Vol = RCC Concrete Vol × Agg Mix Fraction',
    qty: aggVol,
    unit: 'm³',
    rate: aggVol > 0 ? aggCost / aggVol : 1600.0,
    amount: aggCost,
    wastePct: 5.0,
  );

  // 3. Masonry
  final isAAC = p.brickType == 'aac_block';
  final brickQty = isAAC ? m.blocksCount.toDouble() : m.bricksCount.toDouble();
  final brickUnit = isAAC ? 'nos (AAC)' : 'nos';
  final brickCost = isAAC ? c.blockCost : c.brickCost;
  add(
    category: 'Masonry & Partition',
    desc: isAAC
        ? 'AAC Light Wall Blocks (600×200×200mm)'
        : 'Burnt Red Clay Brickwork (230×110×75mm)',
    isCode: 'IS 1200 (Part 3) / IS 2212',
    formula: 'Count = Net Wall Vol (m³) ÷ Unit Volume with Mortar Joint',
    qty: brickQty,
    unit: brickUnit,
    rate: brickQty > 0 ? brickCost / brickQty : (isAAC ? 55.0 : 10.0),
    amount: brickCost,
    wastePct: p.wasteBrick ?? 5.0,
  );

  // 4. Finishes
  final plasterArea = m.plasterArea;
  final plasterCost = c.plasterCost;
  add(
    category: 'Finishes & Plaster',
    desc: 'Internal (12mm) & External (20mm) Cement Plaster',
    isCode: 'IS 1200 (Part 12) / IS 1661',
    formula: 'Area = Wall Surface Faces - Opening Deductions',
    qty: plasterArea,
    unit: 'm²',
    rate: plasterArea > 0 ? plasterCost / plasterArea : 280.0,
    amount: plasterCost,
    wastePct: p.wastePlaster ?? 5.0,
  );

  final paintArea = m.paintArea;
  final paintCost = c.paintCost;
  add(
    category: 'Finishes & Plaster',
    desc: 'Double Coat Decorative Paint (Primer + Emulsion)',
    isCode: 'IS 1200 (Part 13)',
    formula: 'Area = Plastered Wall Surface Area',
    qty: paintArea,
    unit: 'm²',
    rate: paintArea > 0 ? paintCost / paintArea : 120.0,
    amount: paintCost,
    wastePct: p.wastePaint ?? 10.0,
  );

  final tilesArea = m.tilesArea;
  final tilesCost = c.tilesCost;
  add(
    category: 'Finishes & Plaster',
    desc: 'Vitrified Flooring Tiles (600×600mm / 2×2 ft)',
    isCode: 'IS 1200 (Part 11) / IS 15622',
    formula: 'Boxes = ⌈(Carpet Area ÷ Box Coverage) × (1 + Waste %)⌉',
    qty: tilesArea,
    unit: 'm²',
    rate: tilesArea > 0 ? tilesCost / tilesArea : 650.0,
    amount: tilesCost,
    wastePct: p.wasteTiles ?? 8.0,
  );

  // 5. Openings
  final doorsCount = m.doorsCount.toDouble();
  add(
    category: 'Openings',
    desc: 'Wooden Flush Doors with Frame & Fittings',
    isCode: 'IS 1200 (Part 8)',
    formula: 'Count = Detected Door Openings',
    qty: doorsCount,
    unit: 'nos',
    rate: 4500.0,
    amount: doorsCount * 4500.0,
    wastePct: 0.0,
  );

  final windowsCount = m.windowsCount.toDouble();
  add(
    category: 'Openings',
    desc: 'Aluminium / UPVC Glazed Sliding Windows',
    isCode: 'IS 1200 (Part 8)',
    formula: 'Count = Detected Window Openings',
    qty: windowsCount,
    unit: 'nos',
    rate: 3500.0,
    amount: windowsCount * 3500.0,
    wastePct: 0.0,
  );

  return items;
}
