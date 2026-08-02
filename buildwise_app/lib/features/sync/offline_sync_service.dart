import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/hive_storage_service.dart';
import 'sync_queue.dart';
import 'sync_state.dart';

class OfflineSyncNotifier extends StateNotifier<SyncState> {
  final SyncQueue _syncQueue;
  final HiveStorageService _storageService;
  final Connectivity _connectivity;
  StreamSubscription? _connectivitySubscription;
  bool _isProcessingQueue = false;

  OfflineSyncNotifier({
    required SyncQueue syncQueue,
    required HiveStorageService storageService,
    Connectivity? connectivity,
  })  : _syncQueue = syncQueue,
        _storageService = storageService,
        _connectivity = connectivity ?? Connectivity(),
        super(const SyncState()) {
    _initConnectivityListener();
  }

  Future<void> _initConnectivityListener() async {
    final pendingCount = _syncQueue.getPendingCount();
    state = state.copyWith(pendingCount: pendingCount);

    try {
      final initialResults = await _connectivity.checkConnectivity();
      _handleConnectivityChange(initialResults);
    } catch (_) {}

    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(_handleConnectivityChange);
  }

  void setSyncStatus(SyncStatus newStatus) {
    state = state.copyWith(status: newStatus);
    if (newStatus == SyncStatus.online) {
      triggerSync();
    }
  }

  void _handleConnectivityChange(dynamic result) {
    final isOnline = _isConnectivityOnline(result);

    if (isOnline) {
      setSyncStatus(SyncStatus.online);
    } else {
      setSyncStatus(SyncStatus.offline);
    }
  }

  bool _isConnectivityOnline(dynamic result) {
    if (result is List<ConnectivityResult>) {
      return result.any((r) => r != ConnectivityResult.none);
    } else if (result is ConnectivityResult) {
      return result != ConnectivityResult.none;
    }
    return true;
  }

  Future<void> queueOperation({
    required String entityId,
    required SyncOperationType type,
    required Map<String, dynamic> payload,
  }) async {
    await _syncQueue.enqueue(
      entityId: entityId,
      type: type,
      payload: payload,
    );

    final pendingCount = _syncQueue.getPendingCount();
    state = state.copyWith(pendingCount: pendingCount);

    if (state.status == SyncStatus.online) {
      triggerSync();
    }
  }

  Future<void> triggerSync() async {
    if (_isProcessingQueue || state.status == SyncStatus.offline) return;

    final pendingOperations = _syncQueue.getPendingOperations();
    if (pendingOperations.isEmpty) {
      state = state.copyWith(
        status: SyncStatus.online,
        pendingCount: 0,
      );
      return;
    }

    _isProcessingQueue = true;
    state = state.copyWith(status: SyncStatus.syncing);

    for (final op in pendingOperations) {
      if (state.status == SyncStatus.offline) break;

      state = state.copyWith(currentOperation: op);

      try {
        // Process sync operation
        await _processOperation(op);
        await _syncQueue.markCompleted(op.id);

        // Update project lastSyncedTimestamp in Hive
        await _storageService.updateProjectVersions(
          projectId: op.entityId,
          lastSyncedTimestamp: DateTime.now().toIso8601String(),
        );
      } catch (e) {
        await _syncQueue.markFailed(op.id, e.toString());
      }
    }

    _isProcessingQueue = false;
    final remainingCount = _syncQueue.getPendingCount();
    final nowStr = DateTime.now().toIso8601String();

    state = state.copyWith(
      status: SyncStatus.online,
      pendingCount: remainingCount,
      lastSyncedAt: nowStr,
      clearCurrentOperation: true,
    );
  }

  Future<void> _processOperation(SyncOperation op) async {
    // Simulated remote sync processing
    await Future.delayed(const Duration(milliseconds: 100));
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}

final offlineSyncServiceProvider = StateNotifierProvider<OfflineSyncNotifier, SyncState>((ref) {
  final storage = ref.watch(hiveStorageServiceProvider);
  final syncQueue = ref.watch(syncQueueProvider);
  return OfflineSyncNotifier(
    syncQueue: syncQueue,
    storageService: storage,
  );
});
