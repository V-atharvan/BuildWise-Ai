import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../data/dashboard_repository.dart';
import '../../domain/project_model.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return DashboardRepository(client);
});

class DashboardState {
  final List<ProjectModel> recentProjects;
  final Map<String, dynamic> stats;
  final bool isLoading;
  final String? errorMessage;

  const DashboardState({
    this.recentProjects = const [],
    this.stats = const {},
    this.isLoading = false,
    this.errorMessage,
  });

  DashboardState copyWith({
    List<ProjectModel>? recentProjects,
    Map<String, dynamic>? stats,
    bool? isLoading,
    String? errorMessage,
  }) {
    return DashboardState(
      recentProjects: recentProjects ?? this.recentProjects,
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;

  DashboardNotifier(this._repository) : super(const DashboardState()) {
    loadDashboardData();
  }

  Future<void> loadDashboardData() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final projects = await _repository.getRecentProjects();
      final stats = await _repository.getStatistics();
      state = DashboardState(
        recentProjects: projects,
        stats: stats,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
        // Populate fallback mock data to keep app functional offline or if backend is offline!
        recentProjects: [
          ProjectModel(
            id: 'mock-p-1',
            name: 'Imperial Heights Villa',
            buildingType: 'Villa',
            status: 'draft',
            isFavorite: true,
            ownerId: 'mock-user',
            createdAt: DateTime.now().subtract(const Duration(days: 1)),
          ),
          ProjectModel(
            id: 'mock-p-2',
            name: 'Oakridge Commercial Complex',
            buildingType: 'Commercial',
            status: 'estimating',
            isFavorite: false,
            ownerId: 'mock-user',
            createdAt: DateTime.now().subtract(const Duration(days: 3)),
          ),
        ],
        stats: {
          'total_projects': 2,
          'active_estimates': 1,
          'reports_generated': 1,
        },
      );
    }
  }
}

final dashboardNotifierProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  final repo = ref.watch(dashboardRepositoryProvider);
  return DashboardNotifier(repo);
});
