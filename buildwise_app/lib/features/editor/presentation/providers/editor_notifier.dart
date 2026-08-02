import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../models/ai_room.dart';
import '../../../../models/ai_wall.dart';
import '../../../../models/ai_door.dart';
import '../../../../models/ai_window.dart';
import '../../../../models/ai_column.dart';
import '../../../../models/estimation_result.dart';
import '../../domain/editor_integration_service.dart';
import 'editor_state.dart';

import '../../domain/editor_auto_save_service.dart';

class EditorNotifier extends StateNotifier<EditorState> {
  Timer? _autoSaveTimer;
  final EditorAutoSaveService? _autoSaveService;

  EditorNotifier([
    FloorPlanAnalysisResult? initialPlan,
    EditorAutoSaveService? autoSaveService,
  ])  : _autoSaveService = autoSaveService,
        super(EditorState(
          plan: initialPlan ?? const FloorPlanAnalysisResult(id: 'demo_plan', planId: 'demo_plan', projectId: 'demo_proj'),
        )) {
    if (initialPlan != null) {
      _recalculateAndPublish(initialPlan);
    }
  }

  void restoreState(EditorState restoredState) {
    state = restoredState;
    _triggerDebouncedAutoSave();
  }

  void _recalculateAndPublish(FloorPlanAnalysisResult plan) {
    final integrationResult = EditorIntegrationService.recalculateProject(
      plan,
      state.takeoffParams,
    );

    state = state.copyWith(
      plan: integrationResult.updatedPlan,
      estimation: integrationResult.estimation,
      validation: integrationResult.validation,
      confidence: integrationResult.confidence,
    );

    _triggerDebouncedAutoSave();
  }

  void _triggerDebouncedAutoSave() {
    _autoSaveTimer?.cancel();
    state = state.copyWith(isAutoSaving: true);

    _autoSaveService?.triggerAutoSave(state);

    _autoSaveTimer = Timer(const Duration(milliseconds: 750), () {
      if (mounted) {
        state = state.copyWith(isAutoSaving: false);
      }
    });
  }

  void setPlan(FloorPlanAnalysisResult plan) {
    state = state.copyWith(
      plan: plan,
      undoStack: [],
      redoStack: [],
      clearSelectedId: true,
      clearSelectedType: true,
    );
    _recalculateAndPublish(plan);
  }

  void selectElement(String? id, String? type) {
    if (id == null) {
      state = state.copyWith(clearSelectedId: true, clearSelectedType: true);
    } else {
      state = state.copyWith(selectedId: id, selectedType: type);
    }
  }

  void setTool(String tool) {
    state = state.copyWith(activeTool: tool);
  }

  void updateViewport(double zoom, List<double> panOffset) {
    state = state.copyWith(zoom: zoom, panOffset: panOffset);
  }

  void resetView() {
    state = state.copyWith(zoom: 1.0, panOffset: [0.0, 0.0]);
  }

  void fitToScreen(Size viewportSize) {
    final rooms = state.plan.rooms;
    if (rooms.isEmpty) {
      resetView();
      return;
    }

    var minX = double.infinity, minY = double.infinity;
    var maxX = -double.infinity, maxY = -double.infinity;

    for (final r in rooms) {
      for (final pt in r.polygon) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] > maxY) maxY = pt[1];
      }
    }

    if (minX == double.infinity) {
      resetView();
      return;
    }

    final planW = maxX - minX;
    final planH = maxY - minY;

    if (planW <= 0 || planH <= 0) {
      resetView();
      return;
    }

    final scaleX = (viewportSize.width * 0.8) / planW;
    final scaleY = (viewportSize.height * 0.8) / planH;
    final fittedZoom = (scaleX < scaleY ? scaleX : scaleY).clamp(0.2, 5.0);

    final centerX = (minX + maxX) / 2.0;
    final centerY = (minY + maxY) / 2.0;

    final panX = (viewportSize.width / 2.0) - (centerX * fittedZoom);
    final panY = (viewportSize.height / 2.0) - (centerY * fittedZoom);

    state = state.copyWith(
      zoom: fittedZoom,
      panOffset: [panX, panY],
    );
  }

  void pushSnapshot() {
    final newUndo = [...state.undoStack, state.plan];
    state = state.copyWith(
      undoStack: newUndo,
      redoStack: [],
    );
  }

  void undo() {
    if (state.undoStack.isEmpty) return;

    final previousPlan = state.undoStack.last;
    final newUndo = state.undoStack.sublist(0, state.undoStack.length - 1);
    final newRedo = [...state.redoStack, state.plan];

    state = state.copyWith(
      undoStack: newUndo,
      redoStack: newRedo,
    );
    _recalculateAndPublish(previousPlan);
  }

  void redo() {
    if (state.redoStack.isEmpty) return;

    final nextPlan = state.redoStack.last;
    final newRedo = state.redoStack.sublist(0, state.redoStack.length - 1);
    final newUndo = [...state.undoStack, state.plan];

    state = state.copyWith(
      undoStack: newUndo,
      redoStack: newRedo,
    );
    _recalculateAndPublish(nextPlan);
  }

  void runAutoAlign() {
    pushSnapshot();
    _recalculateAndPublish(state.plan);
  }

  // ── Inspector Property Mutations ──

  void updateRoomLabel(String roomId, String newLabel) {
    pushSnapshot();
    final updatedRooms = state.plan.rooms.map((r) {
      if (r.id == roomId) {
        return AIRoom(
          id: r.id,
          label: newLabel,
          roomType: r.roomType,
          polygon: r.polygon,
          centroid: r.centroid,
          boundingBox: r.boundingBox,
          areaM2: r.areaM2,
          areaSqft: r.areaSqft,
          perimeterM: r.perimeterM,
          lengthM: r.lengthM,
          widthM: r.widthM,
          aspectRatio: r.aspectRatio,
          floorHeightM: r.floorHeightM,
          classification: r.classification,
          adjacentRoomIds: r.adjacentRoomIds,
          doorIds: r.doorIds,
          windowIds: r.windowIds,
          wallIds: r.wallIds,
        );
      }
      return r;
    }).toList();

    _recalculateAndPublish(_copyWithRooms(state.plan, updatedRooms));
  }

  void updateRoomType(String roomId, String newType) {
    pushSnapshot();
    final updatedRooms = state.plan.rooms.map((r) {
      if (r.id == roomId) {
        return AIRoom(
          id: r.id,
          label: r.label,
          roomType: newType,
          polygon: r.polygon,
          centroid: r.centroid,
          boundingBox: r.boundingBox,
          areaM2: r.areaM2,
          areaSqft: r.areaSqft,
          perimeterM: r.perimeterM,
          lengthM: r.lengthM,
          widthM: r.widthM,
          aspectRatio: r.aspectRatio,
          floorHeightM: r.floorHeightM,
          classification: r.classification,
          adjacentRoomIds: r.adjacentRoomIds,
          doorIds: r.doorIds,
          windowIds: r.windowIds,
          wallIds: r.wallIds,
        );
      }
      return r;
    }).toList();

    _recalculateAndPublish(_copyWithRooms(state.plan, updatedRooms));
  }

  void updateWallThickness(String wallId, double thicknessM) {
    pushSnapshot();
    final updatedWalls = state.plan.walls.map((w) {
      if (w.id == wallId) {
        return AIWall(
          id: w.id,
          start: w.start,
          end: w.end,
          lengthPx: w.lengthPx,
          lengthM: w.lengthM,
          thicknessPx: w.thicknessPx,
          thicknessM: thicknessM,
          wallType: w.wallType,
          roomIds: w.roomIds,
          doorIds: w.doorIds,
          windowIds: w.windowIds,
          isStructural: w.isStructural,
          confidence: w.confidence,
        );
      }
      return w;
    }).toList();

    _recalculateAndPublish(_copyWithWalls(state.plan, updatedWalls));
  }

  void updateWallType(String wallId, String wallType) {
    pushSnapshot();
    final updatedWalls = state.plan.walls.map((w) {
      if (w.id == wallId) {
        return AIWall(
          id: w.id,
          start: w.start,
          end: w.end,
          lengthPx: w.lengthPx,
          lengthM: w.lengthM,
          thicknessPx: w.thicknessPx,
          thicknessM: w.thicknessM,
          wallType: wallType,
          roomIds: w.roomIds,
          doorIds: w.doorIds,
          windowIds: w.windowIds,
          isStructural: w.isStructural,
          confidence: w.confidence,
        );
      }
      return w;
    }).toList();

    _recalculateAndPublish(_copyWithWalls(state.plan, updatedWalls));
  }

  void updateDoorWidth(String doorId, double widthM) {
    pushSnapshot();
    final updatedDoors = state.plan.doors.map((d) {
      if (d.id == doorId) {
        return AIDoor(
          id: d.id,
          wallId: d.wallId,
          roomId: d.roomId,
          adjacentRoomId: d.adjacentRoomId,
          center: d.center,
          widthM: widthM,
          heightM: d.heightM,
          type: d.type,
          swingDirection: d.swingDirection,
          swingAngle: d.swingAngle,
          confidence: d.confidence,
        );
      }
      return d;
    }).toList();

    _recalculateAndPublish(_copyWithDoors(state.plan, updatedDoors));
  }

  void updateWindowWidth(String windowId, double widthM) {
    pushSnapshot();
    final updatedWindows = state.plan.windows.map((w) {
      if (w.id == windowId) {
        return AIWindow(
          id: w.id,
          wallId: w.wallId,
          roomId: w.roomId,
          center: w.center,
          widthM: widthM,
          heightM: w.heightM,
          sillHeightM: w.sillHeightM,
          confidence: w.confidence,
        );
      }
      return w;
    }).toList();

    _recalculateAndPublish(_copyWithWindows(state.plan, updatedWindows));
  }

  void deleteSelectedElement() {
    if (state.selectedId == null) return;
    pushSnapshot();

    final id = state.selectedId!;
    final type = state.selectedType;

    var rooms = state.plan.rooms;
    var walls = state.plan.walls;
    var doors = state.plan.doors;
    var windows = state.plan.windows;
    var columns = state.plan.columns;

    if (type == 'room') {
      rooms = rooms.where((r) => r.id != id).toList();
    } else if (type == 'wall') {
      walls = walls.where((w) => w.id != id).toList();
    } else if (type == 'door') {
      doors = doors.where((d) => d.id != id).toList();
    } else if (type == 'window') {
      windows = windows.where((w) => w.id != id).toList();
    } else if (type == 'column') {
      columns = columns.where((c) => c.id != id).toList();
    }

    final newPlan = FloorPlanAnalysisResult(
      id: state.plan.id,
      planId: state.plan.planId,
      projectId: state.plan.projectId,
      rooms: rooms,
      walls: walls,
      doors: doors,
      windows: windows,
      columns: columns,
      totalAreaM2: rooms.fold(0.0, (s, r) => s + r.areaM2),
      totalAreaSqft: rooms.fold(0.0, (s, r) => s + r.areaSqft),
      roomCount: rooms.length,
      doorCount: doors.length,
      windowCount: windows.length,
      wallCount: walls.length,
      columnCount: columns.length,
      floorHeightM: state.plan.floorHeightM,
      wallThicknessM: state.plan.wallThicknessM,
      overallConfidence: state.plan.overallConfidence,
    );

    state = state.copyWith(clearSelectedId: true, clearSelectedType: true);
    _recalculateAndPublish(newPlan);
  }

  void updateHoverPoint(List<double>? pt) {
    if (pt == null) {
      state = state.copyWith(clearHoverPoint: true);
    } else {
      state = state.copyWith(hoverPoint: pt);
    }
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    super.dispose();
  }
}

FloorPlanAnalysisResult _copyWithRooms(FloorPlanAnalysisResult plan, List<AIRoom> rooms) {
  return FloorPlanAnalysisResult(
    id: plan.id,
    planId: plan.planId,
    projectId: plan.projectId,
    rooms: rooms,
    walls: plan.walls,
    doors: plan.doors,
    windows: plan.windows,
    columns: plan.columns,
    totalAreaM2: rooms.fold(0.0, (s, r) => s + r.areaM2),
    totalAreaSqft: rooms.fold(0.0, (s, r) => s + r.areaSqft),
    roomCount: rooms.length,
    doorCount: plan.doorCount,
    windowCount: plan.windowCount,
    wallCount: plan.wallCount,
    columnCount: plan.columnCount,
    floorHeightM: plan.floorHeightM,
    wallThicknessM: plan.wallThicknessM,
    overallConfidence: plan.overallConfidence,
  );
}

FloorPlanAnalysisResult _copyWithWalls(FloorPlanAnalysisResult plan, List<AIWall> walls) {
  return FloorPlanAnalysisResult(
    id: plan.id,
    planId: plan.planId,
    projectId: plan.projectId,
    rooms: plan.rooms,
    walls: walls,
    doors: plan.doors,
    windows: plan.windows,
    columns: plan.columns,
    totalAreaM2: plan.totalAreaM2,
    totalAreaSqft: plan.totalAreaSqft,
    roomCount: plan.roomCount,
    doorCount: plan.doorCount,
    windowCount: plan.windowCount,
    wallCount: walls.length,
    columnCount: plan.columnCount,
    floorHeightM: plan.floorHeightM,
    wallThicknessM: plan.wallThicknessM,
    overallConfidence: plan.overallConfidence,
  );
}

FloorPlanAnalysisResult _copyWithDoors(FloorPlanAnalysisResult plan, List<AIDoor> doors) {
  return FloorPlanAnalysisResult(
    id: plan.id,
    planId: plan.planId,
    projectId: plan.projectId,
    rooms: plan.rooms,
    walls: plan.walls,
    doors: doors,
    windows: plan.windows,
    columns: plan.columns,
    totalAreaM2: plan.totalAreaM2,
    totalAreaSqft: plan.totalAreaSqft,
    roomCount: plan.roomCount,
    doorCount: doors.length,
    windowCount: plan.windowCount,
    wallCount: plan.wallCount,
    columnCount: plan.columnCount,
    floorHeightM: plan.floorHeightM,
    wallThicknessM: plan.wallThicknessM,
    overallConfidence: plan.overallConfidence,
  );
}

FloorPlanAnalysisResult _copyWithWindows(FloorPlanAnalysisResult plan, List<AIWindow> windows) {
  return FloorPlanAnalysisResult(
    id: plan.id,
    planId: plan.planId,
    projectId: plan.projectId,
    rooms: plan.rooms,
    walls: plan.walls,
    doors: plan.doors,
    windows: windows,
    columns: plan.columns,
    totalAreaM2: plan.totalAreaM2,
    totalAreaSqft: plan.totalAreaSqft,
    roomCount: plan.roomCount,
    doorCount: plan.doorCount,
    windowCount: windows.length,
    wallCount: plan.wallCount,
    columnCount: plan.columnCount,
    floorHeightM: plan.floorHeightM,
    wallThicknessM: plan.wallThicknessM,
    overallConfidence: plan.overallConfidence,
  );
}

final editorProvider = StateNotifierProvider<EditorNotifier, EditorState>((ref) {
  final autoSaveService = ref.watch(editorAutoSaveServiceProvider);
  return EditorNotifier(null, autoSaveService);
});
