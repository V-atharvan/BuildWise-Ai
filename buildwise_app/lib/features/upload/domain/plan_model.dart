import 'package:equatable/equatable.dart';

class PlanModel extends Equatable {
  final String id;
  final String filename;
  final String fileUrl;
  final String fileType;
  final String status;
  final String projectId;
  final Map<String, dynamic>? detectedData;
  final DateTime createdAt;

  const PlanModel({
    required this.id,
    required this.filename,
    required this.fileUrl,
    required this.fileType,
    required this.status,
    required this.projectId,
    this.detectedData,
    required this.createdAt,
  });

  factory PlanModel.fromJson(Map<String, dynamic> json) {
    return PlanModel(
      id: json['id'] as String,
      filename: json['filename'] as String,
      fileUrl: json['file_url'] as String,
      fileType: json['file_type'] as String,
      status: json['status'] as String,
      projectId: json['project_id'] as String,
      detectedData: json['detected_data'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'filename': filename,
      'file_url': fileUrl,
      'file_type': fileType,
      'status': status,
      'project_id': projectId,
      'detected_data': detectedData,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, filename, fileUrl, fileType, status, projectId, detectedData, createdAt];
}
