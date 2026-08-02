import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/storage/hive_storage_service.dart';
import 'sync_state.dart';

class SyncQueue {
  final HiveStorageService _storageService;
  static const int maxRetryLimit = 5;

  SyncQueue(this._storageService);

  Future<SyncOperation> enqueue({
    required String entityId,
    required SyncOperationType type,
    required Map<String, dynamic> payload,
  }) async {
    final box = _storageService.syncQueueBox;
    final timestamp = DateTime.now().toIso8601String();

    // Check for existing pending duplicate operation to prevent duplicate uploads
    final keys = box.keys.toList();
    for (final key in keys) {
      final raw = box.get(key);
      if (raw != null) {
        final op = _parseOperation(raw);
        if (op != null &&
            op.entityId == entityId &&
            op.type == type &&
            op.status != 'completed') {
          // Update duplicate pending operation payload
          final updatedOp = SyncOperation(
            id: op.id,
            entityId: entityId,
            type: type,
            payload: payload,
            timestamp: op.timestamp,
            retryCount: op.retryCount,
            status: 'pending',
          );
          await box.put(key, jsonEncode(updatedOp.toJson()));
          return updatedOp;
        }
      }
    }

    final newId = const Uuid().v4();
    final newOp = SyncOperation(
      id: newId,
      entityId: entityId,
      type: type,
      payload: payload,
      timestamp: timestamp,
      status: 'pending',
    );

    await box.put(newId, jsonEncode(newOp.toJson()));
    return newOp;
  }

  List<SyncOperation> getPendingOperations() {
    final box = _storageService.syncQueueBox;
    final ops = <SyncOperation>[];

    for (final key in box.keys) {
      final raw = box.get(key);
      if (raw != null) {
        final op = _parseOperation(raw);
        if (op != null && op.status != 'completed') {
          ops.add(op);
        }
      }
    }

    // Sort by timestamp for strict FIFO order
    ops.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    return ops;
  }

  int getPendingCount() {
    return getPendingOperations().length;
  }

  Future<void> markCompleted(String id) async {
    final box = _storageService.syncQueueBox;
    await box.delete(id);
  }

  Future<void> markFailed(String id, String error) async {
    final box = _storageService.syncQueueBox;
    final raw = box.get(id);
    if (raw != null) {
      final op = _parseOperation(raw);
      if (op != null) {
        final newRetryCount = op.retryCount + 1;
        final newStatus = newRetryCount >= maxRetryLimit ? 'failed' : 'pending';
        final updatedOp = op.copyWith(
          retryCount: newRetryCount,
          status: newStatus,
          lastError: error,
        );
        await box.put(id, jsonEncode(updatedOp.toJson()));
      }
    }
  }

  Future<void> clearQueue() async {
    await _storageService.syncQueueBox.clear();
  }

  SyncOperation? _parseOperation(dynamic raw) {
    try {
      if (raw is String) {
        return SyncOperation.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } else if (raw is Map) {
        return SyncOperation.fromJson(Map<String, dynamic>.from(raw));
      }
    } catch (_) {}
    return null;
  }
}

final syncQueueProvider = Provider<SyncQueue>((ref) {
  final storage = ref.watch(hiveStorageServiceProvider);
  return SyncQueue(storage);
});
