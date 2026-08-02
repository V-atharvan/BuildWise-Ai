import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/hive_storage_service.dart';
import '../../../core/storage/storage_keys.dart';
import '../../sync/offline_sync_service.dart';
import '../../sync/sync_state.dart';
import '../presentation/providers/editor_state.dart';

class EditorAutoSaveService {
  final HiveStorageService _storageService;
  final OfflineSyncNotifier? _syncNotifier;
  Timer? _debounceTimer;
  bool _isSaving = false;

  EditorAutoSaveService(
    this._storageService, [
    this._syncNotifier,
  ]);

  bool get isSaving => _isSaving;

  void triggerAutoSave(EditorState state, {Duration debounceDuration = const Duration(milliseconds: 750)}) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(debounceDuration, () {
      saveEditorState(state);
    });
  }

  Future<void> saveEditorState(EditorState state) async {
    if (_isSaving) return;
    _isSaving = true;

    try {
      final projectId = state.plan.projectId.isNotEmpty ? state.plan.projectId : 'demo_proj';
      final planId = state.plan.planId.isNotEmpty ? state.plan.planId : state.plan.id;

      // 1. Save FloorPlan (Plan & Geometry)
      await _storageService.plansBox.put(planId, state.plan);
      await _storageService.geometryBox.put('geom_$planId', state.plan.toJson());

      // 2. Save Complete EditorState
      await _storageService.editorStateBox.put('state_$projectId', state);

      // 3. Save BOQ Estimation
      if (state.estimation != null) {
        await _storageService.boqBox.put('boq_$projectId', state.estimation);
      }

      // 4. Save Validation
      if (state.validation != null) {
        await _storageService.validationBox.put('val_$projectId', state.validation);
      }

      // 5. Save Active Project ID reference
      await _storageService.projectsBox.put(StorageKeys.activeProjectIdKey, projectId);

      // 6. Update Project Versions & Last Saved Timestamp
      await _storageService.updateProjectVersions(projectId: projectId);

      // 7. Enqueue Offline Sync update
      if (_syncNotifier != null) {
        await _syncNotifier.queueOperation(
          entityId: projectId,
          type: SyncOperationType.geometryChange,
          payload: {
            'plan_id': planId,
            'project_id': projectId,
            'timestamp': DateTime.now().toIso8601String(),
          },
        );
      }
    } catch (_) {
      // Disk writes failure should never block UI
    } finally {
      _isSaving = false;
    }
  }

  void dispose() {
    _debounceTimer?.cancel();
  }
}

final editorAutoSaveServiceProvider = Provider<EditorAutoSaveService>((ref) {
  final storage = ref.watch(hiveStorageServiceProvider);
  final syncNotifier = ref.watch(offlineSyncServiceProvider.notifier);
  return EditorAutoSaveService(storage, syncNotifier);
});
