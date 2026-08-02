import 'package:flutter_test/flutter_test.dart';

import 'package:buildwise_app/features/dashboard/domain/project_model.dart';
import 'package:buildwise_app/features/projects/presentation/providers/projects_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late ProjectModel sampleProject;

  setUp(() {
    sampleProject = ProjectModel(
      id: 'proj_test_001',
      name: 'Residential Villa - Sector 62',
      buildingType: 'Villa',
      status: 'draft',
      isFavorite: true,
      ownerId: 'owner_001',
      createdAt: DateTime.now(),
    );
  });

  group('Phase 8E: Project Management Parity Tests', () {
    test('ProjectsState initializes with empty list and default values', () {
      const state = ProjectsState();

      expect(state.projects, isEmpty);
      expect(state.isLoading, isFalse);
      expect(state.searchQuery, isEmpty);
      expect(state.filterType, isNull);
    });

    test('ProjectsState copyWith updates projects list and query filters', () {
      const state = ProjectsState();
      final updated = state.copyWith(
        projects: [sampleProject],
        searchQuery: 'Sector 62',
        filterType: 'Villa',
      );

      expect(updated.projects.length, equals(1));
      expect(updated.searchQuery, equals('Sector 62'));
      expect(updated.filterType, equals('Villa'));
    });

    test('ProjectsState clearFilterType clears building type filter', () {
      final state = ProjectsState(projects: [sampleProject], filterType: 'Villa');
      final cleared = state.copyWith(clearFilterType: true);

      expect(cleared.filterType, isNull);
    });

    test('ProjectModel JSON serialization and deserialization preserves all fields', () {
      final json = sampleProject.toJson();
      final restored = ProjectModel.fromJson(json);

      expect(restored.id, equals(sampleProject.id));
      expect(restored.name, equals(sampleProject.name));
      expect(restored.buildingType, equals(sampleProject.buildingType));
      expect(restored.status, equals(sampleProject.status));
      expect(restored.isFavorite, equals(sampleProject.isFavorite));
      expect(restored.ownerId, equals(sampleProject.ownerId));
    });
  });
}
