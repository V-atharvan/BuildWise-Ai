import 'dart:io';
import 'package:dio/dio.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../domain/plan_model.dart';

class UploadState {
  final PlanModel? plan;
  final bool isUploading;
  final double uploadProgress;
  final bool isAnalyzing;
  final String? errorMessage;

  const UploadState({
    this.plan,
    this.isUploading = false,
    this.uploadProgress = 0.0,
    this.isAnalyzing = false,
    this.errorMessage,
  });

  UploadState copyWith({
    PlanModel? plan,
    bool? isUploading,
    double? uploadProgress,
    bool? isAnalyzing,
    String? errorMessage,
  }) {
    return UploadState(
      plan: plan ?? this.plan,
      isUploading: isUploading ?? this.isUploading,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      isAnalyzing: isAnalyzing ?? this.isAnalyzing,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class UploadNotifier extends StateNotifier<UploadState> {
  final ApiClient? _client;

  UploadNotifier([this._client]) : super(const UploadState());

  Future<PlanModel?> uploadPlanFile(File file, String projectId) async {
    state = UploadState(isUploading: true, uploadProgress: 0.0);
    try {
      final String filename = file.path.split('/').last;
      final formData = FormData.fromMap({
        'project_id': projectId,
        'file': await MultipartFile.fromFile(file.path, filename: filename),
      });

      final response = await _client?.post(
        ApiEndpoints.uploadPlan,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      if (response == null) return null;

      final plan = PlanModel.fromJson(response.data as Map<String, dynamic>);
      state = UploadState(plan: plan, isUploading: false);
      return plan;
    } catch (e) {
      state = UploadState(errorMessage: e.toString(), isUploading: false);
      return null;
    }
  }

  Future<PlanModel?> startPlanAnalysis(String planId) async {
    state = state.copyWith(isAnalyzing: true);
    try {
      final response = await _client?.post(ApiEndpoints.analyzePlan(planId));
      if (response == null) return null;
      final plan = PlanModel.fromJson(response.data as Map<String, dynamic>);
      state = state.copyWith(plan: plan, isAnalyzing: false);
      return plan;
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString(), isAnalyzing: false);
      return null;
    }
  }

  Future<PlanModel?> pollAnalysisStatus(String planId) async {
    try {
      final response = await _client?.get(ApiEndpoints.analysisStatus(planId));
      if (response == null) return null;
      final plan = PlanModel.fromJson(response.data as Map<String, dynamic>);
      state = state.copyWith(plan: plan);
      return plan;
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
      return null;
    }
  }
  bool validateFileExtension(String filename) {
    final ext = filename.split('.').last.toLowerCase();
    const allowed = ['png', 'jpg', 'jpeg', 'pdf', 'dwg', 'dxf'];
    return allowed.contains(ext);
  }

  bool validateFileSize(int sizeBytes) {
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    return sizeBytes > 0 && sizeBytes <= maxSizeBytes;
  }

  Future<void> simulateUpload(String filename, int sizeBytes) async {
    if (!validateFileExtension(filename)) {
      state = state.copyWith(errorMessage: 'Unsupported file format: $filename');
      return;
    }
    if (!validateFileSize(sizeBytes)) {
      state = state.copyWith(errorMessage: 'File size exceeds 50MB limit');
      return;
    }
    state = state.copyWith(isUploading: true, uploadProgress: 0.5);
    await Future.delayed(const Duration(milliseconds: 10));
    state = state.copyWith(
      isUploading: false,
      uploadProgress: 1.0,
      plan: PlanModel(
        id: 'plan_simulated',
        projectId: 'proj_simulated',
        filename: filename,
        fileUrl: 'https://storage.buildwise.ai/$filename',
        fileType: filename.split('.').last,
        status: 'uploaded',
        createdAt: DateTime.now(),
      ),
    );
  }
}

final uploadNotifierProvider = StateNotifierProvider<UploadNotifier, UploadState>((ref) {
  final client = ref.watch(apiClientProvider);
  return UploadNotifier(client);
});
