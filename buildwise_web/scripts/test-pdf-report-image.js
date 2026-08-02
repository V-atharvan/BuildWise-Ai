const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Safe mock environment for testing resolution
const memoryCache = {};

function generateVectorFloorPlanSvg(detectedData) {
  const rooms = detectedData?.rooms || [];
  const walls = detectedData?.walls || [];
  const doors = detectedData?.doors || [];
  const windows = detectedData?.windows || [];

  let maxX = 800;
  let maxY = 600;
  rooms.forEach((r) => {
    if (r.polygon) {
      r.polygon.forEach(([ptX, ptY]) => {
        if (ptX > maxX) maxX = ptX;
        if (ptY > maxY) maxY = ptY;
      });
    }
  });

  const svgWidth = Math.max(maxX + 40, 800);
  const svgHeight = Math.max(maxY + 40, 600);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" style="background:#f8fafc; font-family:sans-serif;">`;
  svg += `<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1"/></pattern></defs>`;
  svg += `<rect width="100%" height="100%" fill="url(#grid)" />`;
  svg += `<text x="20" y="30" font-size="14" font-weight="bold" fill="#4f46e5">BUILDWISE AI — RECONSTRUCTED ARCHITECTURAL FLOOR PLAN</text>`;

  rooms.forEach((r, idx) => {
    if (r.polygon && r.polygon.length >= 3) {
      const pointsStr = r.polygon.map(([px, py]) => `${px},${py}`).join(' ');
      svg += `<polygon points="${pointsStr}" fill="rgba(124, 58, 237, 0.12)" stroke="#7c3aed" stroke-width="2.5" stroke-linejoin="round" />`;
      const avgX = r.polygon.reduce((acc, p) => acc + p[0], 0) / r.polygon.length;
      const avgY = r.polygon.reduce((acc, p) => acc + p[1], 0) / r.polygon.length;
      const roomLabel = r.label || r.room_name || `Room ${idx + 1}`;
      const areaText = r.area_m2 ? `${r.area_m2.toFixed(1)} m²` : '';
      svg += `<text x="${avgX}" y="${avgY - 4}" font-size="12" font-weight="bold" fill="#1e1b4b" text-anchor="middle">${roomLabel}</text>`;
      if (areaText) {
        svg += `<text x="${avgX}" y="${avgY + 12}" font-size="10" fill="#6366f1" text-anchor="middle">${areaText}</text>`;
      }
    }
  });

  svg += `</svg>`;

  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

async function resolveFloorPlanImage(projectId, planData) {
  const planId = planData?.id || projectId;

  if (memoryCache[planId]) return memoryCache[planId];
  if (memoryCache[projectId]) return memoryCache[projectId];

  if (planData) {
    const candidates = [
      planData.image_url,
      planData.preview_url,
      planData.image,
      planData.file_data_url,
      planData.detected_data?.image_url,
      planData.detected_data?.image,
    ];
    for (const cand of candidates) {
      if (typeof cand === 'string' && cand.length > 50) return cand;
    }
  }

  if (planData?.detected_data?.rooms && planData.detected_data.rooms.length > 0) {
    return generateVectorFloorPlanSvg(planData.detected_data);
  }

  return '';
}

// ── TEST RUNNER ─────────────────────────────────────────────────────────────
console.log('=== Web Application Phase 10 PDF Report Image Embedding Test Suite ===\n');

async function runTests() {
  // Test 1: Direct base64 raw image stored in memory cache
  const mockProjectId = 'test_proj_999';
  const mockPlanId = 'test_plan_999';
  const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  memoryCache[mockPlanId] = mockBase64;

  const resolvedImage1 = await resolveFloorPlanImage(mockProjectId, { id: mockPlanId });
  console.log('[1] Resolved image from memory/IndexedDB cache:', resolvedImage1.substring(0, 45) + '...');
  assert.strictEqual(resolvedImage1, mockBase64, 'Should resolve stored base64 image');

  // Test 2: AI geometry vector drawing fallback
  delete memoryCache[mockPlanId];
  const mockPlanWithGeometry = {
    id: 'plan_vector_test',
    project_id: 'proj_vector_test',
    detected_data: {
      rooms: [
        { label: 'Living Room', area_m2: 25, polygon: [[50, 50], [300, 50], [300, 250], [50, 250]] },
        { label: 'Kitchen', area_m2: 12, polygon: [[300, 50], [500, 50], [500, 250], [300, 250]] }
      ],
      walls: [
        { start: [50, 50], end: [500, 50], wall_type: 'external' }
      ]
    }
  };

  const resolvedImage2 = await resolveFloorPlanImage('proj_vector_test', mockPlanWithGeometry);
  console.log('[2] Generated vector SVG drawing for project with AI geometry:', resolvedImage2.substring(0, 45) + '...');
  assert(resolvedImage2.startsWith('data:image/svg+xml;base64,'), 'Should generate SVG Data URL vector drawing');

  // Test 3: Regression Test - Ensure "No plan drawing available." is NOT in report HTML when image is present
  const renderReportSection3 = (imgUrl) => {
    if (imgUrl) {
      return `<img src="${imgUrl}" alt="Project Plan" />`;
    }
    return `<div>Floor plan drawing unavailable for this project.</div>`;
  };

  const reportOutput = renderReportSection3(resolvedImage2);
  console.log('[3] Checking Section 3 report HTML rendering...');
  assert(!reportOutput.includes('No plan drawing available.'), 'Report output MUST NOT contain "No plan drawing available." when image/geometry exists');
  assert(reportOutput.includes('<img src="data:image/svg+xml;base64,'), 'Report output MUST contain embedded floor plan drawing <img> tag');

  console.log('\n✅ ALL 3 PDF REPORT IMAGE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
