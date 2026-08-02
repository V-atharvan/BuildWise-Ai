import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../models/estimation_result.dart';
import '../../../editor/presentation/providers/editor_notifier.dart';
import '../providers/three_d_viewer_notifier.dart';
import '../widgets/building_3d_canvas.dart';
import '../widgets/selection_hud_overlay.dart';

class Building3DViewerScreen extends ConsumerWidget {
  final String projectId;

  const Building3DViewerScreen({
    super.key,
    required this.projectId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final editorState = ref.watch(editorProvider);
    final viewerState = ref.watch(threeDViewerProvider);
    final viewerNotifier = ref.read(threeDViewerProvider.notifier);

    final plan = editorState.plan ??
        FloorPlanAnalysisResult(
          id: 'plan_$projectId',
          planId: 'plan_$projectId',
          projectId: projectId,
        );

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        backgroundColor: const Color(0xFF14141A),
        foregroundColor: Colors.white,
        title: Text(
          '3D Building Inspector',
          style: AppTypography.headlineMedium.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: 'Reset Camera View',
            onPressed: () {
              viewerNotifier.setCameraPreset(CameraPreset.perspective);
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // Center 3D Canvas
            Building3DCanvas(plan: plan),

            // Top Toolbar Overlay
            Positioned(
              top: 12,
              right: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E24).withOpacity(0.92),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.4),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Explore Mode Dropdown
                      DropdownButton<ExploreMode>(
                        value: viewerState.exploreMode,
                        dropdownColor: const Color(0xFF1E1E24),
                        underline: const SizedBox.shrink(),
                        icon: const Icon(Icons.tune_rounded, size: 16, color: AppColors.primary),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                        items: ExploreMode.values.map((mode) {
                          return DropdownMenuItem(
                            value: mode,
                            child: Text('${mode.name.toUpperCase()} VIEW'),
                          );
                        }).toList(),
                        onChanged: (mode) {
                          if (mode != null) viewerNotifier.setExploreMode(mode);
                        },
                      ),
                      const SizedBox(width: 8),
                      Container(width: 1, height: 20, color: Colors.white12),
                      const SizedBox(width: 8),

                      // Camera Presets Buttons
                      _presetButton(ref, 'ISO', CameraPreset.perspective, viewerState.cameraPreset),
                      _presetButton(ref, 'TOP', CameraPreset.top, viewerState.cameraPreset),
                      _presetButton(ref, 'FRONT', CameraPreset.front, viewerState.cameraPreset),
                      _presetButton(ref, 'SIDE', CameraPreset.side, viewerState.cameraPreset),

                      const SizedBox(width: 8),
                      Container(width: 1, height: 20, color: Colors.white12),
                      const SizedBox(width: 8),

                      // Walkthrough Toggle
                      IconButton(
                        icon: Icon(
                          Icons.directions_walk_rounded,
                          size: 18,
                          color: viewerState.walkthroughMode ? const Color(0xFF34D399) : Colors.white38,
                        ),
                        tooltip: 'Walkthrough Mode',
                        onPressed: () => viewerNotifier.toggleWalkthroughMode(),
                      ),

                      // Visibility Toggles
                      IconButton(
                        icon: Icon(Icons.view_in_ar_rounded, size: 18, color: viewerState.showWalls ? AppColors.primary : Colors.white38),
                        tooltip: 'Toggle Walls',
                        onPressed: () => viewerNotifier.toggleWalls(),
                      ),
                      IconButton(
                        icon: Icon(Icons.label_rounded, size: 18, color: viewerState.showLabels ? AppColors.primary : Colors.white38),
                        tooltip: 'Toggle Labels',
                        onPressed: () => viewerNotifier.toggleLabels(),
                      ),
                      IconButton(
                        icon: Icon(Icons.sensor_door_rounded, size: 18, color: viewerState.showDoors ? Colors.amber : Colors.white38),
                        tooltip: 'Toggle Doors',
                        onPressed: () => viewerNotifier.toggleDoors(),
                      ),
                      IconButton(
                        icon: Icon(Icons.window_rounded, size: 18, color: viewerState.showWindows ? Colors.lightBlue : Colors.white38),
                        tooltip: 'Toggle Windows',
                        onPressed: () => viewerNotifier.toggleWindows(),
                      ),
                      IconButton(
                        icon: Icon(Icons.view_column_rounded, size: 18, color: viewerState.showColumns ? Colors.orange : Colors.white38),
                        tooltip: 'Toggle Columns',
                        onPressed: () => viewerNotifier.toggleColumns(),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Floating Room Legend Drawer Card
            Positioned(
              top: 70,
              left: 12,
              child: Container(
                constraints: const BoxConstraints(maxHeight: 180, maxWidth: 180),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E24).withOpacity(0.90),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ROOMS (${plan.rooms.length})',
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white38, letterSpacing: 0.8),
                      ),
                      const SizedBox(height: 6),
                      ...plan.rooms.map((room) {
                        final isSelected = viewerState.selectedObjectId == room.id;
                        return InkWell(
                          onTap: () {
                            viewerNotifier.selectRoom(
                              roomId: room.id,
                              label: room.label,
                              areaM2: room.areaM2,
                              perimeterM: room.perimeterM,
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: isSelected ? AppColors.primary : Colors.purpleAccent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    room.label,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isSelected ? AppColors.primary : Colors.white70,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${room.areaM2.toStringAsFixed(1)}m²',
                                  style: const TextStyle(fontSize: 9, color: Colors.white38),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ),

            // Selected Object Inspection HUD
            const SelectionHudOverlay(),

            // Gesture Helper Hint Footer
            Positioned(
              bottom: 8,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E24).withOpacity(0.80),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: const Text(
                  'Drag to orbit · Pinch to zoom · Double-tap room to fly in',
                  style: TextStyle(fontSize: 9, color: Colors.white38),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _presetButton(WidgetRef ref, String label, CameraPreset preset, CameraPreset current) {
    final isSelected = preset == current;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: TextButton(
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          backgroundColor: isSelected ? AppColors.primary.withOpacity(0.2) : Colors.transparent,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        onPressed: () {
          ref.read(threeDViewerProvider.notifier).setCameraPreset(preset);
        },
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: isSelected ? AppColors.primary : Colors.white54,
          ),
        ),
      ),
    );
  }
}
