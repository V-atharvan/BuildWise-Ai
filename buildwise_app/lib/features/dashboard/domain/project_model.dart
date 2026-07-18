import 'package:equatable/equatable.dart';

class ProjectModel extends Equatable {
  final String id;
  final String name;
  final String buildingType;
  final String status;
  final bool isFavorite;
  final String ownerId;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const ProjectModel({
    required this.id,
    required this.name,
    required this.buildingType,
    required this.status,
    required this.isFavorite,
    required this.ownerId,
    required this.createdAt,
    this.updatedAt,
  });

  factory ProjectModel.fromJson(Map<String, dynamic> json) {
    return ProjectModel(
      id: json['id'] as String,
      name: json['name'] as String,
      buildingType: json['building_type'] as String,
      status: json['status'] as String,
      isFavorite: json['is_favorite'] as bool? ?? false,
      ownerId: json['owner_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'building_type': buildingType,
      'status': status,
      'is_favorite': isFavorite,
      'owner_id': ownerId,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  ProjectModel copyWith({
    String? name,
    String? buildingType,
    String? status,
    bool? isFavorite,
  }) {
    return ProjectModel(
      id: id,
      name: name ?? this.name,
      buildingType: buildingType ?? this.buildingType,
      status: status ?? this.status,
      isFavorite: isFavorite ?? this.isFavorite,
      ownerId: ownerId,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [id, name, buildingType, status, isFavorite, ownerId, createdAt, updatedAt];
}
