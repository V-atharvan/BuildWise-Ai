import 'dart:math' as math;
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum CameraPreset { perspective, top, front, side, walkthrough }
enum ExploreMode { normal, wireframe, transparent, structural, masonry }

class SelectedWallInfo {
  final String wallId;
  final String wallType;
  final double length;
  final double thickness;
  final double height;
  final double netVolume;
  final int brickCount;

  const SelectedWallInfo({
    required this.wallId,
    required this.wallType,
    required this.length,
    required this.thickness,
    required this.height,
    required this.netVolume,
    required this.brickCount,
  });
}

class SelectedRoomInfo {
  final String roomId;
  final String label;
  final double areaM2;
  final double perimeterM;

  const SelectedRoomInfo({
    required this.roomId,
    required this.label,
    required this.areaM2,
    required this.perimeterM,
  });
}

class ThreeDViewerState {
  final String? selectedObjectType; // 'wall' | 'room' | 'door' | 'window' | 'column'
  final String? selectedObjectId;
  final CameraPreset cameraPreset;
  final ExploreMode exploreMode;

  final bool showWalls;
  final bool showLabels;
  final bool showDoors;
  final bool showWindows;
  final bool showColumns;
  final bool walkthroughMode;

  final SelectedWallInfo? selectedWallInfo;
  final SelectedRoomInfo? selectedRoomInfo;

  const ThreeDViewerState({
    this.selectedObjectType,
    this.selectedObjectId,
    this.cameraPreset = CameraPreset.perspective,
    this.exploreMode = ExploreMode.normal,
    this.showWalls = true,
    this.showLabels = true,
    this.showDoors = true,
    this.showWindows = true,
    this.showColumns = false,
    this.walkthroughMode = false,
    this.selectedWallInfo,
    this.selectedRoomInfo,
  });

  ThreeDViewerState copyWith({
    String? selectedObjectType,
    String? selectedObjectId,
    CameraPreset? cameraPreset,
    ExploreMode? exploreMode,
    bool? showWalls,
    bool? showLabels,
    bool? showDoors,
    bool? showWindows,
    bool? showColumns,
    bool? walkthroughMode,
    SelectedWallInfo? selectedWallInfo,
    SelectedRoomInfo? selectedRoomInfo,
    bool clearSelection = false,
  }) {
    return ThreeDViewerState(
      selectedObjectType: clearSelection ? null : (selectedObjectType ?? this.selectedObjectType),
      selectedObjectId: clearSelection ? null : (selectedObjectId ?? this.selectedObjectId),
      cameraPreset: cameraPreset ?? this.cameraPreset,
      exploreMode: exploreMode ?? this.exploreMode,
      showWalls: showWalls ?? this.showWalls,
      showLabels: showLabels ?? this.showLabels,
      showDoors: showDoors ?? this.showDoors,
      showWindows: showWindows ?? this.showWindows,
      showColumns: showColumns ?? this.showColumns,
      walkthroughMode: walkthroughMode ?? this.walkthroughMode,
      selectedWallInfo: clearSelection ? null : (selectedWallInfo ?? this.selectedWallInfo),
      selectedRoomInfo: clearSelection ? null : (selectedRoomInfo ?? this.selectedRoomInfo),
    );
  }
}

class ThreeDViewerNotifier extends StateNotifier<ThreeDViewerState> {
  ThreeDViewerNotifier() : super(const ThreeDViewerState());

  void setCameraPreset(CameraPreset preset) {
    state = state.copyWith(
      cameraPreset: preset,
      walkthroughMode: preset == CameraPreset.walkthrough,
    );
  }

  void setExploreMode(ExploreMode mode) {
    state = state.copyWith(exploreMode: mode);
  }

  void toggleWalkthroughMode() {
    final next = !state.walkthroughMode;
    state = state.copyWith(
      walkthroughMode: next,
      cameraPreset: next ? CameraPreset.walkthrough : CameraPreset.perspective,
    );
  }

  void toggleWalls() => state = state.copyWith(showWalls: !state.showWalls);
  void toggleLabels() => state = state.copyWith(showLabels: !state.showLabels);
  void toggleDoors() => state = state.copyWith(showDoors: !state.showDoors);
  void toggleWindows() => state = state.copyWith(showWindows: !state.showWindows);
  void toggleColumns() => state = state.copyWith(showColumns: !state.showColumns);

  void selectWall({
    required String wallId,
    required String wallType,
    required double length,
    required double thickness,
    double floorHeight = 3.0,
  }) {
    final netHeight = math.max(0.1, floorHeight - 0.12);
    final volume = length * netHeight * thickness;
    final brickCount = ((volume / 0.002448) * 1.05).round();

    state = state.copyWith(
      selectedObjectType: 'wall',
      selectedObjectId: wallId,
      selectedWallInfo: SelectedWallInfo(
        wallId: wallId,
        wallType: wallType,
        length: length,
        thickness: thickness,
        height: floorHeight,
        netVolume: volume,
        brickCount: brickCount,
      ),
      selectedRoomInfo: null,
    );
  }

  void selectRoom({
    required String roomId,
    required String label,
    required double areaM2,
    required double perimeterM,
  }) {
    state = state.copyWith(
      selectedObjectType: 'room',
      selectedObjectId: roomId,
      selectedRoomInfo: SelectedRoomInfo(
        roomId: roomId,
        label: label,
        areaM2: areaM2,
        perimeterM: perimeterM,
      ),
      selectedWallInfo: null,
    );
  }

  void clearSelection() {
    state = state.copyWith(clearSelection: true);
  }
}

final threeDViewerProvider = StateNotifierProvider<ThreeDViewerNotifier, ThreeDViewerState>((ref) {
  return ThreeDViewerNotifier();
});
