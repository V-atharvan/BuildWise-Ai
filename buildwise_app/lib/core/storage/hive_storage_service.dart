import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:path_provider/path_provider.dart';

import '../../models/ai_column.dart';
import '../../models/ai_door.dart';
import '../../models/ai_room.dart';
import '../../models/ai_wall.dart';
import '../../models/ai_window.dart';
import '../../models/estimation_result.dart';
import '../../features/analysis/domain/confidence_engine.dart';
import '../../features/analysis/domain/validation_engine.dart';
import '../../features/editor/presentation/providers/editor_state.dart';
import 'storage_keys.dart';

// ── Hive TypeAdapters ──

class AIRoomAdapter extends TypeAdapter<AIRoom> {
  @override
  final int typeId = 0;

  @override
  AIRoom read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return AIRoom.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, AIRoom obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class AIWallAdapter extends TypeAdapter<AIWall> {
  @override
  final int typeId = 1;

  @override
  AIWall read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return AIWall.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, AIWall obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class AIDoorAdapter extends TypeAdapter<AIDoor> {
  @override
  final int typeId = 2;

  @override
  AIDoor read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return AIDoor.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, AIDoor obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class AIWindowAdapter extends TypeAdapter<AIWindow> {
  @override
  final int typeId = 3;

  @override
  AIWindow read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return AIWindow.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, AIWindow obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class AIColumnAdapter extends TypeAdapter<AIColumn> {
  @override
  final int typeId = 4;

  @override
  AIColumn read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return AIColumn.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, AIColumn obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class EstimationResultAdapter extends TypeAdapter<EstimationResult> {
  @override
  final int typeId = 5;

  @override
  EstimationResult read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return EstimationResult.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, EstimationResult obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class ValidationResultAdapter extends TypeAdapter<SevenLayerValidationReport> {
  @override
  final int typeId = 6;

  @override
  SevenLayerValidationReport read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return SevenLayerValidationReport.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, SevenLayerValidationReport obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class ConfidenceResultAdapter extends TypeAdapter<ProjectConfidenceReport> {
  @override
  final int typeId = 7;

  @override
  ProjectConfidenceReport read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return ProjectConfidenceReport.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, ProjectConfidenceReport obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class EditorStateAdapter extends TypeAdapter<EditorState> {
  @override
  final int typeId = 8;

  @override
  EditorState read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return EditorState.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, EditorState obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

class FloorPlanAnalysisResultAdapter extends TypeAdapter<FloorPlanAnalysisResult> {
  @override
  final int typeId = 9;

  @override
  FloorPlanAnalysisResult read(BinaryReader reader) {
    final jsonStr = reader.readString();
    return FloorPlanAnalysisResult.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
  }

  @override
  void write(BinaryWriter writer, FloorPlanAnalysisResult obj) {
    writer.writeString(jsonEncode(obj.toJson()));
  }
}

// ── Hive Storage Service ──

class HiveStorageService {
  bool _isInitialized = false;
  late Directory _appDocDir;

  // Boxes
  late Box _projectsBox;
  late Box _plansBox;
  late Box _editorStateBox;
  late Box _geometryBox;
  late Box _boqBox;
  late Box _validationBox;
  late Box _reportsBox;
  late Box _imagesBox;
  late Box _detectionResultsBox;
  late Box _syncQueueBox;

  Box get projectsBox => _projectsBox;
  Box get plansBox => _plansBox;
  Box get editorStateBox => _editorStateBox;
  Box get geometryBox => _geometryBox;
  Box get boqBox => _boqBox;
  Box get validationBox => _validationBox;
  Box get reportsBox => _reportsBox;
  Box get imagesBox => _imagesBox;
  Box get detectionResultsBox => _detectionResultsBox;
  Box get syncQueueBox => _syncQueueBox;

  Future<void> init([Directory? customDir]) async {
    if (_isInitialized) return;

    if (customDir != null) {
      _appDocDir = customDir;
    } else {
      await Hive.initFlutter();
      _appDocDir = await getApplicationDocumentsDirectory();
    }

    _registerAdapters();

    _projectsBox = await Hive.openBox(StorageKeys.projectsBox);
    _plansBox = await Hive.openBox(StorageKeys.plansBox);
    _editorStateBox = await Hive.openBox(StorageKeys.editorStateBox);
    _geometryBox = await Hive.openBox(StorageKeys.geometryBox);
    _boqBox = await Hive.openBox(StorageKeys.boqBox);
    _validationBox = await Hive.openBox(StorageKeys.validationBox);
    _reportsBox = await Hive.openBox(StorageKeys.reportsBox);
    _imagesBox = await Hive.openBox(StorageKeys.imagesBox);
    _detectionResultsBox = await Hive.openBox(StorageKeys.detectionResultsBox);
    _syncQueueBox = await Hive.openBox(StorageKeys.syncQueueBox);

    _isInitialized = true;
  }

  void _registerAdapters() {
    _registerAdapter(AIRoomAdapter());
    _registerAdapter(AIWallAdapter());
    _registerAdapter(AIDoorAdapter());
    _registerAdapter(AIWindowAdapter());
    _registerAdapter(AIColumnAdapter());
    _registerAdapter(EstimationResultAdapter());
    _registerAdapter(ValidationResultAdapter());
    _registerAdapter(ConfidenceResultAdapter());
    _registerAdapter(EditorStateAdapter());
    _registerAdapter(FloorPlanAnalysisResultAdapter());
  }

  void _registerAdapter<T>(TypeAdapter<T> adapter) {
    if (!Hive.isAdapterRegistered(adapter.typeId)) {
      Hive.registerAdapter(adapter);
    }
  }

  // ── Versioning & Metadata ──

  Map<String, dynamic> getProjectVersions(String projectId) {
    final meta = _projectsBox.get('meta_$projectId') as Map?;
    if (meta == null) {
      return {
        StorageKeys.projectVersionKey: 1,
        StorageKeys.geometryVersionKey: 1,
        StorageKeys.boqVersionKey: 1,
        StorageKeys.lastSavedTimestampKey: DateTime.now().toIso8601String(),
        StorageKeys.lastSyncedTimestampKey: null,
      };
    }
    return Map<String, dynamic>.from(meta);
  }

  Future<void> updateProjectVersions({
    required String projectId,
    int? projectVersion,
    int? geometryVersion,
    int? boqVersion,
    String? lastSyncedTimestamp,
  }) async {
    final current = getProjectVersions(projectId);
    final updated = {
      StorageKeys.projectVersionKey: projectVersion ?? ((current[StorageKeys.projectVersionKey] as int? ?? 0) + 1),
      StorageKeys.geometryVersionKey: geometryVersion ?? ((current[StorageKeys.geometryVersionKey] as int? ?? 0) + 1),
      StorageKeys.boqVersionKey: boqVersion ?? ((current[StorageKeys.boqVersionKey] as int? ?? 0) + 1),
      StorageKeys.lastSavedTimestampKey: DateTime.now().toIso8601String(),
      StorageKeys.lastSyncedTimestampKey: lastSyncedTimestamp ?? current[StorageKeys.lastSyncedTimestampKey],
    };
    await _projectsBox.put('meta_$projectId', updated);
  }

  // ── Binary & Large File Storage (Images, OCR, Detection, Reports) ──

  Future<String> saveBinaryFile({
    required String subDirName,
    required String fileName,
    required List<int> bytes,
  }) async {
    final dir = Directory('${_appDocDir.path}/buildwise_storage/$subDirName');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    final file = File('${dir.path}/$fileName');
    await file.writeAsBytes(bytes);
    return file.path;
  }

  Future<List<int>?> readBinaryFile(String filePath) async {
    final file = File(filePath);
    if (await file.exists()) {
      return await file.readAsBytes();
    }
    return null;
  }

  Future<bool> deleteBinaryFile(String filePath) async {
    final file = File(filePath);
    if (await file.exists()) {
      await file.delete();
      return true;
    }
    return false;
  }

  Future<void> saveLargeJson({
    required Box targetBox,
    required String key,
    required Map<String, dynamic> data,
  }) async {
    await targetBox.put(key, jsonEncode(data));
  }

  Map<String, dynamic>? getLargeJson({
    required Box targetBox,
    required String key,
  }) {
    final raw = targetBox.get(key);
    if (raw == null) return null;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    if (raw is String) return jsonDecode(raw) as Map<String, dynamic>;
    return null;
  }
}

final hiveStorageServiceProvider = Provider<HiveStorageService>((ref) {
  return HiveStorageService();
});
