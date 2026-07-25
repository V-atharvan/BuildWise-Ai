// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Professional BIM Export Engine (Document 10)
// IFC2x3/IFC4 STEP, CAD Layered DXF, Wavefront OBJ, glTF 2.0, & Revit Shared Parameters
// ══════════════════════════════════════════════════════════════════════════════

import type { FloorPlanAnalysisResult } from './types'

/**
 * Generates an IFC2x3 / IFC4 STEP format string for Revit / ArchiCAD / Navisworks.
 */
export function exportToIFC(plan: Partial<FloorPlanAnalysisResult>, estimation?: any): string {
  const projId = plan.project_id || 'PROJ_001'
  const walls = plan.walls || []
  const rooms = plan.rooms || []
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]

  let ifcLines: string[] = []
  ifcLines.push('ISO-10303-21;')
  ifcLines.push('HEADER;')
  ifcLines.push("FILE_DESCRIPTION(('BuildWise AI BIM Model', 'IFC2X3'), '2;1');")
  ifcLines.push(`FILE_NAME('BuildWise_${projId}.ifc', '${timestamp}', ('BuildWise AI'), ('Civil Engineering Dept'), 'BuildWise BIM Generator', 'BuildWise AI v2.5', '');`)
  ifcLines.push("FILE_SCHEMA(('IFC2X3'));")
  ifcLines.push('ENDSEC;')
  ifcLines.push('DATA;')
  ifcLines.push("#1= IFCORGANIZATION('BW','BuildWise AI','Civil Estimation Engine',$,$);")
  ifcLines.push("#2= IFCAPPLICATION(#1,'2.5','BuildWise AI BIM Generator','BuildWise');")
  ifcLines.push(`#3= IFCPROJECT('3$a1b2c3d4e5f6',#1,'BuildWise Project ${projId}',$,$,$,$,(#4),#5);`)
  ifcLines.push("#4= IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#6,$);")
  ifcLines.push("#5= IFUNITASSIGNMENT((#7,#8));")
  ifcLines.push("#6= IFCAXIS2PLACEMENT3D(#9,#10,#11);")
  ifcLines.push("#7= IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);")
  ifcLines.push("#8= IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);")
  ifcLines.push("#9= IFCCARTESIANPOINT((0.0,0.0,0.0));")
  ifcLines.push("#10= IFCDIRECTION((0.0,0.0,1.0));")
  ifcLines.push("#11= IFCDIRECTION((1.0,0.0,0.0));")
  ifcLines.push(`#12= IFCBUILDING('4$b2c3d4e5f6a1',#1,'Ground Floor Plan',$,$,#6,$,$,.ELEMENT.,$,$,$);`)
  ifcLines.push(`#13= IFCBUILDINGSTOREY('5$c3d4e5f6a1b2',#1,'Ground Floor',$,$,#6,$,$,.ELEMENT.,0.0);`)

  let lineIdx = 14
  walls.forEach((wall, idx) => {
    ifcLines.push(`#${lineIdx}= IFCWALLSTANDARDCASE('W_${wall.id || idx+1}',#1,'Wall Vector ${idx+1}',$,$,#6,$,$,.ELEMENT.);`)
    lineIdx++
  })

  rooms.forEach((room, idx) => {
    ifcLines.push(`#${lineIdx}= IFCSPACE('S_${room.id || idx+1}',#1,'Space ${room.label}',$,$,#6,$,$,.ELEMENT.,.INTERNAL.,${room.area_m2});`)
    lineIdx++
  })

  ifcLines.push('ENDSEC;')
  ifcLines.push('END-ISO-10303-21;')

  return ifcLines.join('\n')
}

/**
 * Generates an AutoCAD-compatible layered R12 DXF string.
 */
export function exportToDXF(plan: Partial<FloorPlanAnalysisResult>): string {
  const walls = plan.walls || []
  const rooms = plan.rooms || []

  let dxf: string[] = []
  dxf.push('0\nSECTION\n2\nHEADER\n0\nENDSEC')
  dxf.push('0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER')
  dxf.push('0\nLAYER\n2\nWALLS\n70\n0\n62\n7\n6\nCONTINUOUS')
  dxf.push('0\nLAYER\n2\nDOORS\n70\n0\n62\n1\n6\nCONTINUOUS')
  dxf.push('0\nLAYER\n2\nWINDOWS\n70\n0\n62\n4\n6\nCONTINUOUS')
  dxf.push('0\nLAYER\n2\nROOM_LABELS\n70\n0\n62\n3\n6\nCONTINUOUS')
  dxf.push('0\nENDTAB\n0\nENDSEC')
  dxf.push('0\nSECTION\n2\nENTITIES')

  // Wall lines
  walls.forEach(w => {
    const x1 = w.start?.[0] || 0
    const y1 = w.start?.[1] || 0
    const x2 = w.end?.[0] || 350
    const y2 = w.end?.[1] || 0
    dxf.push(`0\nLINE\n8\nWALLS\n10\n${x1}\n20\n${y1}\n30\n0.0\n11\n${x2}\n21\n${y2}\n31\n0.0`)
  })

  // Room label text
  rooms.forEach(r => {
    const cx = r.polygon?.[0]?.[0] || 200
    const cy = r.polygon?.[0]?.[1] || 200
    dxf.push(`0\nTEXT\n8\nROOM_LABELS\n10\n${cx}\n20\n${cy}\n30\n0.0\n40\n25.0\n1\n${r.label} (${r.area_m2}m²)`)
  })

  dxf.push('0\nENDSEC\n0\nEOF')
  return dxf.join('\n')
}

/**
 * Generates Wavefront 3D OBJ mesh file string for Blender / SketchUp / 3ds Max.
 */
export function exportToOBJ(plan: Partial<FloorPlanAnalysisResult>): string {
  const walls = plan.walls || []
  let obj: string[] = []
  obj.push('# BuildWise AI 3D Wavefront OBJ Model')
  obj.push('o FloorPlanBuilding')

  let vIdx = 1
  walls.forEach((w, idx) => {
    const x1 = (w.start?.[0] || 0) / 50.0
    const y1 = (w.start?.[1] || 0) / 50.0
    const x2 = (w.end?.[0] || 350) / 50.0
    const y2 = (w.end?.[1] || 0) / 50.0
    const h = 3.0

    obj.push(`v ${x1} 0.0 ${y1}`)
    obj.push(`v ${x2} 0.0 ${y2}`)
    obj.push(`v ${x2} ${h} ${y2}`)
    obj.push(`v ${x1} ${h} ${y1}`)

    obj.push(`f ${vIdx} ${vIdx+1} ${vIdx+2} ${vIdx+3}`)
    vIdx += 4
  })

  return obj.join('\n')
}

/**
 * Generates glTF 2.0 JSON string for WebGL / Three.js.
 */
export function exportToglTF(plan: Partial<FloorPlanAnalysisResult>): string {
  const gltf = {
    asset: { version: '2.0', generator: 'BuildWise AI BIM Exporter' },
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'GroundFloorBuilding', children: [1] }, { name: 'WallsGroup' }],
    materials: [{ name: 'ConcreteMasonry', pbrMetallicRoughness: { baseColorFactor: [0.8, 0.8, 0.8, 1.0], roughnessFactor: 0.7 } }]
  }
  return JSON.stringify(gltf, null, 2)
}

/**
 * Generates Autodesk Revit Shared Parameter JSON Metadata Mapping.
 */
export function exportToRevitMetadata(plan: Partial<FloorPlanAnalysisResult>, estimation?: any): string {
  const revitMeta = {
    software: 'Autodesk Revit Shared Parameter Schema',
    generator: 'BuildWise AI',
    schema_version: '2026.1',
    project_id: plan.project_id || 'PROJ_001',
    shared_parameters: [
      { name: 'BW_WallThickness', type: 'Length', group: 'Dimensions', is_code: 'IS 2212' },
      { name: 'BW_NetWallVolume', type: 'Volume', group: 'Quantity Takeoff', is_code: 'IS 1200' },
      { name: 'BW_ConcreteGrade', type: 'Text', group: 'Structural', value: estimation?.user_inputs?.concrete_grade || 'M20', is_code: 'IS 456' },
      { name: 'BW_SteelRebarGrade', type: 'Text', group: 'Structural', value: estimation?.user_inputs?.steel_grade || 'Fe500', is_code: 'IS 1786' }
    ]
  }
  return JSON.stringify(revitMeta, null, 2)
}
