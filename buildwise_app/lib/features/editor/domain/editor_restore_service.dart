import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/hive_storage_service.dart';
import '../../../core/storage/storage_keys.dart';
import '../../../models/estimation_result.dart';
import '../presentation/providers/editor_state.dart';
import '../../analysis/domain/confidence_engine.dart';
import '../../analysis/domain/validation_engine.dart';

class EditorRestoreResult {
  final EditorState restoredState;
  final bool wasRecoveredFromCrash;
  final String? recoveryMessage;

  const EditorRestoreResult({
    required this.restoredState,
    this.wasRecoveredFromCrash = false,
    this.recoveryMessage,
  });
}

class EditorRestoreService {
  final HiveStorageService _storageService;

  EditorRestoreService(this._storageService);

  Future<EditorRestoreResult?> restoreLatestProjectState([String? projectId]) async {
    final targetProjectId = projectId ?? _storageService.projectsBox.get(StorageKeys.activeProjectIdKey) as String?;
    if (targetProjectId == null || targetProjectId.isEmpty) {
      return null;
    }

    return restoreProjectState(targetProjectId);
  }

  Future<EditorRestoreResult?> restoreProjectState(String projectId) async {
    final rawState = _storageService.editorStateBox.get('state_$projectId');
    EditorState? state;

    if (rawState is EditorState) {
      state = rawState;
    } else if (rawState != null) {
      final jsonMap = _storageService.getLargeJson(
        targetBox: _storageService.editorStateBox,
        key: 'state_$projectId',
      );
      if (jsonMap != null) {
        state = EditorState.fromJson(jsonMap);
      }
    }

    // Check for crash recovery flag
    final isCrashState = _storageService.projectsBox.get('${StorageKeys.crashStateKey}_$projectId') as bool? ?? false;

    if (state == null) {
      // Fallback to saved floor plan box if state not found
      final rawPlan = _storageService.plansBox.get(projectId);
      if (rawPlan != null) {
        final plan = rawPlan is Map ? FloorPlanAnalysisResult.fromJson(Map<String, dynamic>.from(rawPlan)) : rawPlan as FloorPlanAnalysisResult;
        state = EditorState(plan: plan);
      } else {
        return null;
      }
    }

    // Ensure BOQ, Validation, Confidence are attached from their boxes if missing
    var estimation = state.estimation;
    if (estimation == null) {
      final savedBoq = _storageService.boqBox.get('boq_$projectId');
      if (savedBoq is EstimationResult) {
        estimation = savedBoq;
      }
    }

    var validation = state.validation;
    if (validation == null) {
      final savedVal = _storageService.validationBox.get('val_$projectId');
      if (savedVal is SevenLayerValidationReport) {
        validation = savedVal;
      }
    }

    var confidence = state.confidence;
    if (confidence == null) {
      final savedConf = _storageService.reportsBox.get('conf_$projectId');
      if (savedConf is ProjectConfidenceReport) {
        confidence = savedConf;
      }
    }

    final restoredState = state.copyWith(
      estimation: estimation,
      validation: validation,
      confidence: confidence,
    );

    String? recoveryMessage;
    if (isCrashState) {
      recoveryMessage = 'Interrupted session detected for Project "$projectId". Unsaved edits and camera state were recovered.';
      // Reset crash state after recovery
      await _storageService.projectsBox.put('${StorageKeys.crashStateKey}_$projectId', false);
    }

    return EditorRestoreResult(
      restoredState: restoredState,
      wasRecoveredFromCrash: isCrashState,
      recoveryMessage: recoveryMessage,
    );
  }

  Future<void> markCrashState(String projectId) async {
    await _storageService.projectsBox.put('${StorageKeys.crashStateKey}_$projectId', true);
  }

  Future<void> clearCrashState(String projectId) async {
    await _storageService.projectsBox.put('${StorageKeys.crashStateKey}_$projectId', false);
  }
}

final editorRestoreServiceProvider = Provider<EditorRestoreService>((ref) {
  final storage = ref.watch(hiveStorageServiceProvider);
  return EditorRestoreService(storage);
});
