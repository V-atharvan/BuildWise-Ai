import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:buildwise_app/core/storage/hive_storage_service.dart';
import 'package:buildwise_app/core/storage/storage_keys.dart';
import 'package:buildwise_app/models/ai_room.dart';
import 'package:buildwise_app/models/ai_wall.dart';
import 'package:buildwise_app/models/estimation_result.dart';
import 'package:buildwise_app/features/editor/domain/editor_auto_save_service.dart';
import 'package:buildwise_app/features/editor/domain/editor_restore_service.dart';
import 'package:buildwise_app/features/editor/presentation/providers/editor_state.dart';
import 'package:buildwise_app/features/editor/presentation/providers/editor_notifier.dart';
import 'package:buildwise_app/features/sync/sync_queue.dart';
import 'package:buildwise_app/features/sync/sync_state.dart';
import 'package:buildwise_app/features/sync/offline_sync_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Directory tempDir;
  late HiveStorageService storageService;
  late SyncQueue syncQueue;
  late EditorAutoSaveService autoSaveService;
  late EditorRestoreService restoreService;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('hive_test_');
    Hive.init(tempDir.path);

    storageService = HiveStorageService();
    await storageService.init(tempDir);

    syncQueue = SyncQueue(storageService);
    autoSaveService = EditorAutoSaveService(storageService);
    restoreService = EditorRestoreService(storageService);
  });

  tearDown(() async {
    await Hive.deleteFromDisk();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('Phase 5: Hive Storage & TypeAdapters Tests', () {
    test('HiveStorageService initializes boxes and handles metadata versioning', () async {
      expect(storageService.projectsBox.isOpen, isTrue);
      expect(storageService.plansBox.isOpen, isTrue);
      expect(storageService.editorStateBox.isOpen, isTrue);

      final versions = storageService.getProjectVersions('proj_test');
      expect(versions[StorageKeys.projectVersionKey], equals(1));

      await storageService.updateProjectVersions(projectId: 'proj_test');
      final updated = storageService.getProjectVersions('proj_test');
      expect(updated[StorageKeys.projectVersionKey], equals(2));
    });

    test('Binary file storage saves and reads files locally', () async {
      final bytes = [1, 2, 3, 4, 5, 6, 7, 8];
      final path = await storageService.saveBinaryFile(
        subDirName: 'images',
        fileName: 'test_plan.png',
        bytes: bytes,
      );

      expect(path, contains('test_plan.png'));

      final readBytes = await storageService.readBinaryFile(path);
      expect(readBytes, equals(bytes));

      final deleted = await storageService.deleteBinaryFile(path);
      expect(deleted, isTrue);
    });
  });

  group('Phase 5: Auto Save & State Recovery Tests', () {
    test('EditorAutoSaveService saves state and EditorRestoreService restores state accurately', () async {
      const room1 = AIRoom(
        id: 'r1',
        label: 'Master Suite',
        roomType: 'master_bedroom',
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
          classifiedLabel: 'Master Suite',
          roomType: 'master_bedroom',
          confidence: RoomConfidenceScore(overall: 0.98),
        ),
      );

      const wall1 = AIWall(
        id: 'w1',
        start: [0.0, 0.0],
        end: [6.0, 0.0],
        lengthPx: 240.0,
        lengthM: 6.0,
        thicknessPx: 15.0,
        thicknessM: 0.23,
      );

      const plan = FloorPlanAnalysisResult(
        id: 'plan_p5',
        planId: 'plan_p5',
        projectId: 'proj_p5',
        rooms: [room1],
        walls: [wall1],
        totalAreaM2: 30.0,
        totalAreaSqft: 322.9,
      );

      final notifier = EditorNotifier(plan, autoSaveService);
      notifier.updateViewport(1.5, [120.0, -50.0]);
      notifier.selectElement('r1', 'room');

      // Save editor state synchronously
      await autoSaveService.saveEditorState(notifier.debugState);

      // Restore project state
      final restoreResult = await restoreService.restoreProjectState('proj_p5');

      expect(restoreResult, isNotNull);
      final restoredState = restoreResult!.restoredState;

      expect(restoredState.plan.id, equals('plan_p5'));
      expect(restoredState.plan.rooms.first.label, equals('Master Suite'));
      expect(restoredState.zoom, equals(1.5));
      expect(restoredState.panOffset, equals([120.0, -50.0]));
      expect(restoredState.selectedId, equals('r1'));
      expect(restoredState.estimation, isNotNull);
    });

    test('Crash state recovery triggers recovery message', () async {
      await restoreService.markCrashState('proj_crash');

      const plan = FloorPlanAnalysisResult(
        id: 'plan_crash',
        planId: 'plan_crash',
        projectId: 'proj_crash',
      );

      final state = EditorState(plan: plan);
      await autoSaveService.saveEditorState(state);

      final restoreResult = await restoreService.restoreProjectState('proj_crash');
      expect(restoreResult, isNotNull);
      expect(restoreResult!.wasRecoveredFromCrash, isTrue);
      expect(restoreResult.recoveryMessage, contains('Interrupted session detected'));
    });
  });

  group('Phase 5: Sync Queue & Offline Mode Tests', () {
    test('SyncQueue enqueues, deduplicates, and maintains FIFO order', () async {
      final op1 = await syncQueue.enqueue(
        entityId: 'proj_sync',
        type: SyncOperationType.geometryChange,
        payload: {'v': 1},
      );

      final op2 = await syncQueue.enqueue(
        entityId: 'proj_sync',
        type: SyncOperationType.boqUpdate,
        payload: {'v': 1},
      );

      // Duplicate geometry change operation should update payload rather than creating duplicate
      final op1Updated = await syncQueue.enqueue(
        entityId: 'proj_sync',
        type: SyncOperationType.geometryChange,
        payload: {'v': 2},
      );

      expect(op1Updated.id, equals(op1.id));
      expect(syncQueue.getPendingCount(), equals(2));

      final ops = syncQueue.getPendingOperations();
      expect(ops.first.type, equals(SyncOperationType.geometryChange));
      expect(ops.first.payload['v'], equals(2));
      expect(ops.last.type, equals(SyncOperationType.boqUpdate));

      await syncQueue.markCompleted(op1.id);
      expect(syncQueue.getPendingCount(), equals(1));
    });

    test('OfflineSyncNotifier processes queue and syncs when online', () async {
      final offlineNotifier = OfflineSyncNotifier(
        syncQueue: syncQueue,
        storageService: storageService,
      );
      offlineNotifier.setSyncStatus(SyncStatus.online);

      await offlineNotifier.queueOperation(
        entityId: 'proj_queue',
        type: SyncOperationType.projectUpdate,
        payload: {'status': 'updated'},
      );

      expect(offlineNotifier.debugState.pendingCount, equals(1));

      await offlineNotifier.triggerSync();
      await Future.delayed(const Duration(milliseconds: 250));
      expect(offlineNotifier.debugState.pendingCount, equals(0));
      expect(offlineNotifier.debugState.lastSyncedAt, isNotNull);
    });
  });
}

extension _EditorNotifierDebug on EditorNotifier {
  EditorState get debugState => state;
}

extension _OfflineSyncNotifierDebug on OfflineSyncNotifier {
  SyncState get debugState => state;
}
