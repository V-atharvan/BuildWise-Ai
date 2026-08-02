import '../../../../models/estimation_result.dart';
import '../../../analysis/domain/validation_engine.dart';
import '../../../analysis/domain/confidence_engine.dart';
import '../../domain/snap_engine.dart';
import '../../domain/editor_integration_service.dart';

class EditorState {
  final FloorPlanAnalysisResult plan;
  final double zoom;
  final List<double> panOffset; // [x, y] in screen pixels
  final String? selectedId;
  final String? selectedType; // 'room' | 'wall' | 'door' | 'window' | 'column'
  final String activeTool; // 'select' | 'room' | 'wall' | 'door' | 'window' | 'column'
  final List<FloorPlanAnalysisResult> undoStack;
  final List<FloorPlanAnalysisResult> redoStack;
  final List<double>? hoverPoint; // [x, y] in world meters
  final SnapTarget? activeSnapTarget;
  final bool showGrid;
  final SnapConfig snapConfig;

  // Integrated Engine State
  final EstimationResult? estimation;
  final SevenLayerValidationReport? validation;
  final ProjectConfidenceReport? confidence;
  final bool isAutoSaving;
  final TakeoffParams takeoffParams;

  EditorState({
    required this.plan,
    this.zoom = 1.0,
    this.panOffset = const [0.0, 0.0],
    this.selectedId,
    this.selectedType,
    this.activeTool = 'select',
    this.undoStack = const [],
    this.redoStack = const [],
    this.hoverPoint,
    this.activeSnapTarget,
    this.showGrid = true,
    this.snapConfig = DEFAULT_SNAP_CONFIG,
    this.estimation,
    this.validation,
    this.confidence,
    this.isAutoSaving = false,
    this.takeoffParams = const TakeoffParams(buildingType: 'house'),
  });

  EditorState copyWith({
    FloorPlanAnalysisResult? plan,
    double? zoom,
    List<double>? panOffset,
    String? selectedId,
    bool clearSelectedId = false,
    String? selectedType,
    bool clearSelectedType = false,
    String? activeTool,
    List<FloorPlanAnalysisResult>? undoStack,
    List<FloorPlanAnalysisResult>? redoStack,
    List<double>? hoverPoint,
    bool clearHoverPoint = false,
    SnapTarget? activeSnapTarget,
    bool clearActiveSnapTarget = false,
    bool? showGrid,
    SnapConfig? snapConfig,
    EstimationResult? estimation,
    SevenLayerValidationReport? validation,
    ProjectConfidenceReport? confidence,
    bool? isAutoSaving,
    TakeoffParams? takeoffParams,
  }) {
    return EditorState(
      plan: plan ?? this.plan,
      zoom: zoom ?? this.zoom,
      panOffset: panOffset ?? this.panOffset,
      selectedId: clearSelectedId ? null : (selectedId ?? this.selectedId),
      selectedType: clearSelectedType ? null : (selectedType ?? this.selectedType),
      activeTool: activeTool ?? this.activeTool,
      undoStack: undoStack ?? this.undoStack,
      redoStack: redoStack ?? this.redoStack,
      hoverPoint: clearHoverPoint ? null : (hoverPoint ?? this.hoverPoint),
      activeSnapTarget: clearActiveSnapTarget ? null : (activeSnapTarget ?? this.activeSnapTarget),
      showGrid: showGrid ?? this.showGrid,
      snapConfig: snapConfig ?? this.snapConfig,
      estimation: estimation ?? this.estimation,
      validation: validation ?? this.validation,
      confidence: confidence ?? this.confidence,
      isAutoSaving: isAutoSaving ?? this.isAutoSaving,
      takeoffParams: takeoffParams ?? this.takeoffParams,
    );
  }

  factory EditorState.fromJson(Map<String, dynamic> json) {
    final panRaw = json['pan_offset'] as List? ?? [0.0, 0.0];
    final panOffset = panRaw.map((e) => (e as num).toDouble()).toList();

    return EditorState(
      plan: FloorPlanAnalysisResult.fromJson(json['plan'] as Map<String, dynamic>? ?? {}),
      zoom: (json['zoom'] as num?)?.toDouble() ?? 1.0,
      panOffset: panOffset,
      selectedId: json['selected_id'] as String?,
      selectedType: json['selected_type'] as String?,
      activeTool: json['active_tool'] as String? ?? 'select',
      undoStack: (json['undo_stack'] as List?)
              ?.map((e) => FloorPlanAnalysisResult.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      redoStack: (json['redo_stack'] as List?)
              ?.map((e) => FloorPlanAnalysisResult.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      showGrid: json['show_grid'] as bool? ?? true,
      estimation: json['estimation'] != null
          ? EstimationResult.fromJson(json['estimation'] as Map<String, dynamic>)
          : null,
      validation: json['validation'] != null
          ? SevenLayerValidationReport.fromJson(json['validation'] as Map<String, dynamic>)
          : null,
      confidence: json['confidence'] != null
          ? ProjectConfidenceReport.fromJson(json['confidence'] as Map<String, dynamic>)
          : null,
      takeoffParams: json['takeoff_params'] != null
          ? TakeoffParams.fromJson(json['takeoff_params'] as Map<String, dynamic>)
          : const TakeoffParams(buildingType: 'house'),
    );
  }

  Map<String, dynamic> toJson() => {
        'plan': plan.toJson(),
        'zoom': zoom,
        'pan_offset': panOffset,
        if (selectedId != null) 'selected_id': selectedId,
        if (selectedType != null) 'selected_type': selectedType,
        'active_tool': activeTool,
        'undo_stack': undoStack.map((u) => u.toJson()).toList(),
        'redo_stack': redoStack.map((r) => r.toJson()).toList(),
        'show_grid': showGrid,
        if (estimation != null) 'estimation': estimation!.toJson(),
        if (validation != null) 'validation': validation!.toJson(),
        if (confidence != null) 'confidence': confidence!.toJson(),
        'takeoff_params': takeoffParams.toJson(),
      };
}
