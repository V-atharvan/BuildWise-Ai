import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../dashboard/domain/project_model.dart';
import '../data/projects_repository.dart';

final projectsRepositoryProvider = Provider<ProjectsRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  return ProjectsRepository(client);
});

class ProjectsState {
  final List<ProjectModel> projects;
  final bool isLoading;
  final String? errorMessage;
  final String searchQuery;
  final String? filterType;

  const ProjectsState({
    this.projects = const [],
    this.isLoading = false,
    this.errorMessage,
    this.searchQuery = '',
    this.filterType,
  });

  ProjectsState copyWith({
    List<ProjectModel>? projects,
    bool? isLoading,
    String? errorMessage,
    String? searchQuery,
    String? filterType,
    bool clearFilterType = false,
  }) {
    return ProjectsState(
      projects: projects ?? this.projects,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      searchQuery: searchQuery ?? this.searchQuery,
      filterType: clearFilterType ? null : (filterType ?? this.filterType),
    );
  }
}

class ProjectsNotifier extends StateNotifier<ProjectsState> {
  final ProjectsRepository _repository;

  ProjectsNotifier(this._repository) : super(const ProjectsState()) {
    loadProjects();
  }

  Future<void> loadProjects() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final list = await _repository.listProjects(
        search: state.searchQuery.isNotEmpty ? state.searchQuery : null,
        buildingType: state.filterType,
      );
      state = state.copyWith(projects: list, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
        // Offline mocks fallback
        projects: [
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
      );
    }
  }

  void updateSearch(String query) {
    state = state.copyWith(searchQuery: query);
    loadProjects();
  }

  void updateFilter(String? type) {
    if (type == null) {
      state = state.copyWith(clearFilterType: true);
    } else {
      state = state.copyWith(filterType: type);
    }
    loadProjects();
  }

  Future<void> createProject(String name, String type) async {
    state = state.copyWith(isLoading: true);
    try {
      final p = await _repository.createProject(name, type);
      state = state.copyWith(projects: [p, ...state.projects], isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> toggleFavorite(String id, bool currentStatus) async {
    try {
      final updated = await _repository.updateProject(id, isFavorite: !currentStatus);
      state = state.copyWith(
        projects: state.projects.map((p) => p.id == id ? updated : p).toList(),
      );
    } catch (e) {
      // Offline fallback toggle
      state = state.copyWith(
        projects: state.projects.map((p) => p.id == id ? p.copyWith(isFavorite: !currentStatus) : p).toList(),
      );
    }
  }

  Future<void> duplicateProject(String id) async {
    try {
      final p = await _repository.duplicateProject(id);
      state = state.copyWith(projects: [p, ...state.projects]);
    } catch (e) {
      // Offline mock copy
      final original = state.projects.firstWhere((p) => p.id == id);
      final duplicated = original.copyWith(name: 'Copy of ${original.name}');
      state = state.copyWith(projects: [duplicated, ...state.projects]);
    }
  }

  Future<void> deleteProject(String id) async {
    try {
      await _repository.deleteProject(id);
      state = state.copyWith(projects: state.projects.where((p) => p.id != id).toList());
    } catch (e) {
      state = state.copyWith(projects: state.projects.where((p) => p.id != id).toList());
    }
  }
}

final projectsNotifierProvider = StateNotifierProvider<ProjectsNotifier, ProjectsState>((ref) {
  final repo = ref.watch(projectsRepositoryProvider);
  return ProjectsNotifier(repo);
});
