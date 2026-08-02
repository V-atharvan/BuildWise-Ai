const XLSX = require('xlsx');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function safeNum(v, fallback = 0) {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n) || !isFinite(n)) return fallback;
  return n;
}

function generateBOQItems(estimation) {
  const m = estimation.materials || {};
  const c = estimation.cost_breakdown || estimation.cost || {};
  const p = estimation.user_inputs || {};
  const rooms = estimation.room_takeoffs || [];

  const items = [];
  let index = 1;

  const add = (category, desc, isCode, formula, qtyVal, unit, defaultRate, costVal) => {
    const qty = safeNum(qtyVal);
    let amount = safeNum(costVal);
    let rate = (qty > 0 && amount > 0) ? Math.round((amount / qty) * 100) / 100 : defaultRate;

    if (rate <= 0 || !isFinite(rate) || isNaN(rate) || (qty > 0 && rate < defaultRate * 0.3)) {
      rate = defaultRate;
      amount = Math.round(qty * defaultRate);
    }

    if (qty > 0 || amount > 0) {
      items.push({
        srNo: index++,
        category,
        description: desc,
        isCode,
        formula,
        quantity: Math.round(qty * 100) / 100,
        unit,
        rate: Math.round(rate * 100) / 100,
        amount: Math.round(amount)
      });
    }
  };

  const excVol = safeNum(m.excavation_volume, 45);
  add('1. EARTHWORK & FOUNDATIONS', 'Earthwork Excavation for columns & foundation pits', 'IS 1200 (Part 1)', 'V = Envelope Area × Plinth Height', excVol, 'm³', 200, c.excavation_cost);
  add('1. EARTHWORK & FOUNDATIONS', 'Backfilling and soil compaction with selected earth', 'IS 1200 (Part 1)', 'V_backfill = V_excavation × 0.85', excVol * 0.85, 'm³', 120, Math.round(excVol * 0.85 * 120));

  const concVol = safeNum(m.concrete_volume, 38.5);
  const steelW = safeNum(m.steel_weight, 3270);
  add('2. STRUCTURAL RCC (REINFORCED CONCRETE)', `RCC frame structures - Concrete (${p.concrete_grade || 'M20'} Grade)`, 'IS 1200 (Part 2) / IS 456', 'V_RCC = V_slabs + V_columns + V_beams + V_footings', concVol, 'm³', 5500, c.concrete_cost);
  add('2. STRUCTURAL RCC (REINFORCED CONCRETE)', `TMT steel reinforcement bars (${p.steel_grade || 'Fe500'} Grade)`, 'IS 1786 / IS 2502', 'W_steel = ∑(V_member × Rebar Density kg/m³)', steelW, 'kg', 75, c.steel_cost);
  add('2. STRUCTURAL RCC (REINFORCED CONCRETE)', 'Centering and shuttering (Formwork for slabs, columns & beams)', 'IS 1200 (Part 5)', 'Area = Formwork Surface Area = V_RCC × 4.5', concVol * 4.5, 'm²', 380, c.shuttering_cost || Math.round(concVol * 4.5 * 380));

  const brickQty = safeNum(m.bricks_count || m.blocks_count, 14500);
  const brickUnit = m.bricks_count ? 'nos' : 'nos (AAC)';
  const isAAC = p.brick_type === 'aac_block';
  const brickCost = isAAC ? safeNum(c.block_cost) : safeNum(c.brick_cost);
  add('3. MASONRY & WALL CONSTRUCTION', isAAC ? 'AAC Light Wall Blocks (600×200×200mm)' : 'Clay brick masonry in CM 1:6 wall structures', 'IS 1200 (Part 3) / IS 2212', 'Count = Net Wall Vol ÷ Unit Vol', brickQty, brickUnit, 10, brickCost);
  add('3. MASONRY & WALL CONSTRUCTION', 'Cement (OPC 53 Grade) for mortar mix', 'IS 456 / IS 10262', 'Bags = Mortar Vol + RCC Vol', safeNum(m.cement_bags, 340), 'bags', 430, c.cement_cost);
  add('3. MASONRY & WALL CONSTRUCTION', 'River sand / Manufactured sand (M-Sand)', 'IS 383', 'Vol = Mortar Vol × Sand Ratio', safeNum(m.sand_volume, 24.5), 'm³', 1400, c.sand_cost);
  add('3. MASONRY & WALL CONSTRUCTION', 'Crushed stone aggregate 20mm', 'IS 383', 'Vol = RCC Concrete Vol × Agg Ratio', safeNum(m.aggregate_volume, 32), 'm³', 1600, c.aggregate_cost);

  add('4. FINISHING & PLASTERING WORKS', 'Cement plastering 12mm thick CM 1:4 internal walls', 'IS 1200 (Part 12) / IS 1661', 'Area = Wall Surface Faces', safeNum(m.plaster_area, 480), 'm²', 280, c.plaster_cost);
  add('4. FINISHING & PLASTERING WORKS', 'Emulsion interior wall painting (2 coats over 1 coat primer)', 'IS 1200 (Part 13)', 'Area = Plastered Surface Area', safeNum(m.paint_area, 580), 'm²', 120, c.paint_cost);
  add('4. FINISHING & PLASTERING WORKS', 'Vitrified floor tiles (600mm × 600mm) including base mortar', 'IS 1200 (Part 11) / IS 15622', 'Boxes = Carpet Area ÷ Coverage', safeNum(m.tiles_area, 61), 'm²', 650, c.tiles_cost);
  add('4. FINISHING & PLASTERING WORKS', 'Liquid membrane waterproofing for bathrooms & roof slabs', 'IS 1200 (Part 11)', 'Area = Roof Surface Area', safeNum(m.waterproofing_area, 75), 'm²', 380, c.waterproofing_cost);

  const doorsCount = safeNum(m.doors_count, 4);
  const windowsCount = safeNum(m.windows_count, 6);
  add('5. DOORS, WINDOWS & OPENINGS', 'Wooden flush doors with frames and standard hardware fittings', 'IS 1200 (Part 8)', 'Count = Detected Door Openings', doorsCount, 'nos', 8500, c.door_cost || (doorsCount * 8500));
  add('5. DOORS, WINDOWS & OPENINGS', 'UPVC sliding window frames with 5mm clear float glass', 'IS 1200 (Part 8)', 'Count = Detected Window Openings', windowsCount, 'nos', 6200, c.window_cost || (windowsCount * 6200));

  const roomPoints = rooms.length || 4;
  const wetRooms = rooms.filter((r) => r.room_type === 'bathroom' || r.room_type === 'kitchen').length || 2;
  add('6. ELECTRICAL & PLUMBING LINES', 'Concealed PVC conduit wiring with modular switches & MCBs', 'IS 1200 (Part 14)', 'Points = Total Detected Rooms', roomPoints, 'point', 3200, c.electrical_cost || (roomPoints * 3200));
  add('6. ELECTRICAL & PLUMBING LINES', 'Internal plumbing lines (CPVC water inlet & PVC drainage pipes)', 'IS 1200 (Part 16)', 'Jobs = Kitchen + Bathroom count', wetRooms, 'job', 24000, c.plumbing_cost || (wetRooms * 24000));

  return items;
}

function buildBOQWorksheet(projectName, sections, summaryCosts = {}) {
  const ws = {};
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
  ];

  ws['A1'] = { t: 's', v: 'BuildWise AI — Construction BOQ Report' };
  ws['A2'] = { t: 's', v: `Project: ${projectName} | Date: ${new Date().toLocaleDateString()}` };

  const headers = ['Sl No', 'Item Description', 'Unit', 'Quantity', 'Rate (₹)', 'Amount (₹)'];
  headers.forEach((h, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 3, c: colIdx });
    ws[cellRef] = { t: 's', v: h };
  });

  let currentRow = 4;
  const amountCellRefs = [];
  let globalSlNo = 1;

  sections.forEach(sec => {
    if (!sec.items || sec.items.length === 0) return;

    ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } });
    ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: sec.name.toUpperCase() };
    currentRow++;

    sec.items.forEach(item => {
      const rIdx = currentRow + 1;
      const safeQty = safeNum(item.qty);
      const safeRate = safeNum(item.rate);
      const slNum = typeof item.sl === 'number' ? item.sl : globalSlNo++;

      ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 'n', v: slNum };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })] = { t: 's', v: String(item.desc || '') };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })] = { t: 's', v: String(item.unit || '') };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 3 })] = { t: 'n', v: safeQty, z: '#,##0.##' };
      ws[XLSX.utils.encode_cell({ r: currentRow, c: 4 })] = { t: 'n', v: safeRate, z: '"₹"#,##0.00' };

      const amtCell = XLSX.utils.encode_cell({ r: currentRow, c: 5 });
      ws[amtCell] = { t: 'n', f: `D${rIdx}*E${rIdx}`, z: '"₹"#,##0.00' };
      amountCellRefs.push(amtCell);
      currentRow++;
    });
  });

  currentRow++;
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'BOQ SUMMARY BREAKDOWN' };
  currentRow++;

  const firstAmtRef = amountCellRefs[0] || 'F5';
  const lastAmtRef = amountCellRefs[amountCellRefs.length - 1] || 'F5';

  const matRow = currentRow + 1;
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Material Takeoff Cost' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', f: `SUM(${firstAmtRef}:${lastAmtRef})`, z: '"₹"#,##0.00' };
  currentRow++;

  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Labour Takeoff Cost' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: safeNum(summaryCosts.labour, 330000), z: '"₹"#,##0.00' };
  currentRow++;

  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Machinery & Rental Equipment' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: safeNum(summaryCosts.equipment, 55000), z: '"₹"#,##0.00' };
  currentRow++;

  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Overhead & Contractor Margin' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: safeNum(summaryCosts.margin, 155000), z: '"₹"#,##0.00' };
  currentRow++;

  const contRow = currentRow + 1;
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'Contingency Buffer' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', v: safeNum(summaryCosts.contingency, 77000), z: '"₹"#,##0.00' };
  currentRow++;

  const subtotalStart = matRow;
  const subtotalEnd = contRow;

  const gstRow = currentRow + 1;
  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'GST (18% applied)' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', f: `SUM(F${subtotalStart}:F${subtotalEnd})*0.18`, z: '"₹"#,##0.00' };
  currentRow++;

  ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })] = { t: 's', v: 'GRAND TOTAL CONTRACT AMOUNT' };
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 5 })] = { t: 'n', f: `SUM(F${subtotalStart}:F${gstRow})`, z: '"₹"#,##0.00' };
  currentRow++;

  ws['!cols'] = [{ wch: 8 }, { wch: 48 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 22 }];
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: 5 } });

  return ws;
}

// ── TEST RUNNER ─────────────────────────────────────────────────────────────
console.log('=== Web Application Unified Report Exporter Test Suite ===\n');

const sampleEstimation = {
  project_id: 'test_web_proj_101',
  materials: {
    concrete_volume: 38.5,
    steel_weight: 3270,
    cement_bags: 340,
    sand_volume: 24.5,
    aggregate_volume: 32.0,
    bricks_count: 14500,
    plaster_area: 480,
    paint_area: 580,
    tiles_area: 61,
    waterproofing_area: 75,
    excavation_volume: 45.0
  },
  cost_breakdown: {
    concrete_cost: 211750,
    steel_cost: 245250,
    cement_cost: 146200,
    sand_cost: 34300,
    aggregate_cost: 51200,
    brick_cost: 145000,
    plaster_cost: 134400,
    paint_cost: 69600,
    tiles_cost: 39650,
    waterproofing_cost: 28500,
    excavation_cost: 9000,
    labour_cost: 316050,
    equipment_cost: 14200,
    contractor_margin: 151428,
    contingency: 77345,
  }
};

const edgeCaseProj44 = {
  project_id: 'demo_proj_1785666848315',
  materials: { concrete_volume: 6.66, steel_weight: 644.37, excavation_volume: 18.22 },
  cost_breakdown: { concrete_cost: 1, steel_cost: 48328, contingency: undefined }
};

const proj44Items = generateBOQItems(edgeCaseProj44);
const proj44Concrete = proj44Items.find(i => i.description.includes('Concrete'));
assert(proj44Concrete && proj44Concrete.rate === 5500, `Concrete rate MUST fallback to 5500 for Project 44, got: ${proj44Concrete?.rate}`);
console.log(`[Project 44 Edge Case] Concrete Rate: ₹${proj44Concrete.rate} / m³, Amount: ₹${proj44Concrete.amount.toLocaleString()} (Rate threshold safeguard verified!)`);

const items = generateBOQItems(sampleEstimation);
console.log(`[1] Generated ${items.length} BOQ items cleanly.`);
assert.strictEqual(items.length, 17, 'Should produce 17 canonical BOQ items');

// Verify concrete mix item amount is non-zero
const concreteItem = items.find(i => i.description.includes('Concrete'));
assert(concreteItem && concreteItem.amount > 0, 'Concrete RCC Mix amount MUST be greater than 0');
console.log(`[2] Concrete RCC Mix Item Amount: ₹${concreteItem.amount.toLocaleString()} (Non-zero verified!)`);

// Group sections
const categoriesMap = new Map();
items.forEach(item => {
  if (!categoriesMap.has(item.category)) categoriesMap.set(item.category, []);
  categoriesMap.get(item.category).push({ sl: item.srNo, desc: item.description, unit: item.unit, qty: item.quantity, rate: item.rate });
});

const sections = Array.from(categoriesMap.entries()).map(([name, items]) => ({ name, items }));
const boqSheet = buildBOQWorksheet('Villa Horizon Test', sections, {
  labour: sampleEstimation.cost_breakdown.labour_cost,
  equipment: sampleEstimation.cost_breakdown.equipment_cost,
  margin: sampleEstimation.cost_breakdown.contractor_margin,
  contingency: sampleEstimation.cost_breakdown.contingency
});

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, boqSheet, 'BOQ Report');

const testOutFile = path.join(__dirname, '..', 'BuildWise_BOQ_Report.xlsx');
XLSX.writeFile(workbook, testOutFile);
console.log(`[3] Wrote workbook to ${testOutFile}`);

// Scan generated file for zero invalid values
const readWb = XLSX.readFile(testOutFile);
let cellCount = 0;
let invalidCount = 0;

for (const sheetName of readWb.SheetNames) {
  const sheet = readWb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellRef];
      if (!cell) continue;
      cellCount++;
      const valStr = String(cell.v || cell.w || '');
      if (valStr.includes('NaN') || valStr.includes('#VALUE!') || valStr.includes('#DIV/0!') || valStr.includes('Infinity')) {
        console.error(`[ERROR] Cell ${cellRef} contains invalid value: "${valStr}"`);
        invalidCount++;
      }
    }
  }
}

console.log(`[4] Scanned ${cellCount} cells. Invalid cells found: ${invalidCount}`);
assert.strictEqual(invalidCount, 0, 'No cells should contain NaN, #VALUE!, #DIV/0!, or Infinity');

console.log('\n✅ ALL UNIFIED BOQ EXPORTER ASSERTIONS PASSED SUCCESSFULLY!');
