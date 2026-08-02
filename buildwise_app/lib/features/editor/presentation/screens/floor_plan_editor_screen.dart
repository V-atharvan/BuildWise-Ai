import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../models/ai_room.dart';
import '../../../../models/ai_wall.dart';
import '../../../../models/ai_door.dart';
import '../../../../models/ai_window.dart';
import '../../../../models/ai_column.dart';
import '../../../../models/estimation_result.dart';
import '../providers/editor_notifier.dart';
import '../widgets/floor_plan_canvas.dart';
import '../widgets/editor_toolbar.dart';
import '../widgets/editor_status_bar.dart';
import '../widgets/editor_properties_panel.dart';

class FloorPlanEditorScreen extends ConsumerStatefulWidget {
  final String? planId;

  const FloorPlanEditorScreen({
    super.key,
    this.planId,
  });

  @override
  ConsumerState<FloorPlanEditorScreen> createState() => _FloorPlanEditorScreenState();
}

class _FloorPlanEditorScreenState extends ConsumerState<FloorPlanEditorScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSampleFloorPlan();
    });
  }

  void _loadSampleFloorPlan() {
    const rooms = [
      AIRoom(
        id: 'r1',
        label: 'Living Room',
        roomType: 'living_room',
        polygon: [
          [0.0, 0.0],
          [6.0, 0.0],
          [6.0, 5.0],
          [0.0, 5.0]
        ],
        centroid: [3.0, 2.5],
        boundingBox: [0.0, 0.0, 6.0, 5.0],
        areaM2: 30.0,
        areaSqft: 322.9,
        perimeterM: 22.0,
        lengthM: 6.0,
        widthM: 5.0,
        aspectRatio: 1.2,
        classification: RoomClassification(
          classifiedLabel: 'Living Room',
          roomType: 'living_room',
          confidence: RoomConfidenceScore(overall: 0.96),
        ),
      ),
      AIRoom(
        id: 'r2',
        label: 'Master Bedroom',
        roomType: 'master_bedroom',
        polygon: [
          [6.0, 0.0],
          [11.0, 0.0],
          [11.0, 5.0],
          [6.0, 5.0]
        ],
        centroid: [8.5, 2.5],
        boundingBox: [6.0, 0.0, 5.0, 5.0],
        areaM2: 25.0,
        areaSqft: 269.1,
        perimeterM: 20.0,
        lengthM: 5.0,
        widthM: 5.0,
        aspectRatio: 1.0,
        classification: RoomClassification(
          classifiedLabel: 'Master Bedroom',
          roomType: 'master_bedroom',
          confidence: RoomConfidenceScore(overall: 0.94),
        ),
      ),
      AIRoom(
        id: 'r3',
        label: 'Kitchen',
        roomType: 'kitchen',
        polygon: [
          [0.0, 5.0],
          [6.0, 5.0],
          [6.0, 9.0],
          [0.0, 9.0]
        ],
        centroid: [3.0, 7.0],
        boundingBox: [0.0, 5.0, 6.0, 4.0],
        areaM2: 24.0,
        areaSqft: 258.3,
        perimeterM: 20.0,
        lengthM: 6.0,
        widthM: 4.0,
        aspectRatio: 1.5,
        classification: RoomClassification(
          classifiedLabel: 'Kitchen',
          roomType: 'kitchen',
          confidence: RoomConfidenceScore(overall: 0.92),
        ),
      ),
    ];

    const walls = [
      AIWall(
        id: 'w1',
        start: [0.0, 0.0],
        end: [11.0, 0.0],
        lengthPx: 440.0,
        lengthM: 11.0,
        thicknessPx: 15.0,
        thicknessM: 0.23,
        wallType: 'external',
        roomIds: ['r1', 'r2'],
      ),
      AIWall(
        id: 'w2',
        start: [6.0, 0.0],
        end: [6.0, 5.0],
        lengthPx: 200.0,
        lengthM: 5.0,
        thicknessPx: 12.0,
        thicknessM: 0.115,
        wallType: 'internal',
        roomIds: ['r1', 'r2'],
      ),
      AIWall(
        id: 'w3',
        start: [0.0, 5.0],
        end: [11.0, 5.0],
        lengthPx: 440.0,
        lengthM: 11.0,
        thicknessPx: 15.0,
        thicknessM: 0.23,
        wallType: 'external',
        roomIds: ['r1', 'r2', 'r3'],
      ),
    ];

    const doors = [
      AIDoor(
        id: 'd1',
        wallId: 'w2',
        roomId: 'r1',
        center: [6.0, 2.5],
        widthM: 0.9,
        heightM: 2.1,
      )
    ];

    const windows = [
      AIWindow(
        id: 'win1',
        wallId: 'w1',
        roomId: 'r1',
        center: [3.0, 0.0],
        widthM: 1.5,
        heightM: 1.2,
      )
    ];

    const columns = [
      AIColumn(id: 'col1', center: [0.0, 0.0]),
      AIColumn(id: 'col2', center: [6.0, 0.0]),
      AIColumn(id: 'col3', center: [11.0, 0.0]),
      AIColumn(id: 'col4', center: [0.0, 5.0]),
      AIColumn(id: 'col5', center: [6.0, 5.0]),
      AIColumn(id: 'col6', center: [11.0, 5.0]),
    ];

    final plan = FloorPlanAnalysisResult(
      id: widget.planId ?? 'plan_demo',
      planId: widget.planId ?? 'plan_demo',
      projectId: 'proj_demo',
      rooms: rooms,
      walls: walls,
      doors: doors,
      windows: windows,
      columns: columns,
      totalAreaM2: 79.0,
      totalAreaSqft: 850.3,
    );

    ref.read(editorProvider.notifier).setPlan(plan);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(editorProvider);
    final boqCost = state.estimation?.costBreakdown.grandTotal ?? 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '2D Floor Plan Editor — ${state.plan.planId}',
                  style: const TextStyle(color: Colors.white, fontSize: 16.0, fontWeight: FontWeight.bold),
                ),
                if (state.isAutoSaving) ...[
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(
                          width: 10,
                          height: 10,
                          child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF60A5FA)),
                        ),
                        SizedBox(width: 4),
                        Text('Saving...', style: TextStyle(color: Color(0xFF93C5FD), fontSize: 10)),
                      ],
                    ),
                  ),
                ],
              ],
            ),
            Text(
              '${state.plan.roomCount} Rooms • ${state.plan.totalAreaM2.toStringAsFixed(1)} m² (${state.plan.totalAreaSqft.toStringAsFixed(0)} sqft)',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12.0),
            ),
          ],
        ),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
            margin: const EdgeInsets.symmetric(vertical: 8.0),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.15),
              borderRadius: BorderRadius.circular(8.0),
              border: Border.all(color: const Color(0xFF10B981)),
            ),
            child: Row(
              children: [
                const Icon(Icons.account_balance_wallet, color: Color(0xFF34D399), size: 16),
                const SizedBox(width: 6),
                Text(
                  'BOQ: ₹${boqCost.toStringAsFixed(0)}',
                  style: const TextStyle(color: Color(0xFF6EE7B7), fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          IconButton(
            icon: const Icon(Icons.fit_screen, color: Colors.white),
            tooltip: 'Fit to Screen',
            onPressed: () {
              final size = MediaQuery.of(context).size;
              ref.read(editorProvider.notifier).fitToScreen(size);
            },
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.save, size: 18),
              label: const Text('Save Plan'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Floor plan saved successfully!')),
                );
              },
            ),
          ),
        ],
      ),
      body: Stack(
        children: const [
          FloorPlanCanvas(),
          EditorToolbar(),
          EditorPropertiesPanel(),
          EditorStatusBar(),
        ],
      ),
    );
  }
}
