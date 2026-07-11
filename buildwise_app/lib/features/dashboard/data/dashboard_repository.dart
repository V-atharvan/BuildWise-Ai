import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../domain/project_model.dart';

class DashboardRepository {
  final ApiClient _client;

  DashboardRepository(this._client);

  Future<List<ProjectModel>> getRecentProjects() async {
    final response = await _client.get(
      ApiEndpoints.projects,
      queryParameters: {'limit': 5},
    );
    final items = response.data['items'] as List<dynamic>;
    return items.map((item) => ProjectModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> getStatistics() async {
    // Return mock stats summary for simplicity, or hit a dynamic endpoint
    final response = await _client.get(ApiEndpoints.projects);
    final total = response.data['total'] as int? ?? 0;
    return {
      'total_projects': total,
      'active_estimates': total > 0 ? (total - 1) : 0,
      'reports_generated': total > 0 ? (total - 1) : 0,
    };
  }
}
