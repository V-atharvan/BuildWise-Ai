import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../dashboard/domain/project_model.dart';

class ProjectsRepository {
  final ApiClient _client;

  ProjectsRepository(this._client);

  Future<List<ProjectModel>> listProjects({
    int skip = 0,
    int limit = 20,
    String? search,
    String? buildingType,
    String? status,
    bool? isFavorite,
  }) async {
    final Map<String, dynamic> params = {
      'skip': skip,
      'limit': limit,
    };
    if (search != null) params['search'] = search;
    if (buildingType != null) params['building_type'] = buildingType;
    if (status != null) params['status'] = status;
    if (isFavorite != null) params['is_favorite'] = isFavorite;

    final response = await _client.get(
      ApiEndpoints.projects,
      queryParameters: params,
    );
    final items = response.data['items'] as List<dynamic>;
    return items.map((item) => ProjectModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<ProjectModel> createProject(String name, String buildingType) async {
    final response = await _client.post(
      ApiEndpoints.projects,
      data: {
        'name': name,
        'building_type': buildingType,
      },
    );
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ProjectModel> updateProject(String id, {bool? isFavorite, String? name, String? status}) async {
    final Map<String, dynamic> data = {};
    if (isFavorite != null) data['is_favorite'] = isFavorite;
    if (name != null) data['name'] = name;
    if (status != null) data['status'] = status;

    final response = await _client.put(
      '${ApiEndpoints.projects}/$id',
      data: data,
    );
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteProject(String id) async {
    await _client.delete('${ApiEndpoints.projects}/$id');
  }

  Future<ProjectModel> duplicateProject(String id) async {
    final response = await _client.post('${ApiEndpoints.projects}/$id/duplicate');
    return ProjectModel.fromJson(response.data as Map<String, dynamic>);
  }
}
