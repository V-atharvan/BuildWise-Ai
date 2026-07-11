import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_dialog.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/utils/formatters.dart';
import '../providers/projects_notifier.dart';

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  final _searchController = TextEditingController();
  final _nameController = TextEditingController();
  String _selectedBuildingType = 'House';

  @override
  void dispose() {
    _searchController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _showNewProjectDialog() {
    _nameController.clear();
    BuildWiseDialog.show(
      context: context,
      title: 'New Project',
      content: 'Enter details to start estimation.',
      primaryLabel: 'Create',
      onPrimaryPressed: () async {
        final name = _nameController.text.trim();
        if (name.isEmpty) {
          BuildWiseSnackBar.showWarning(context, 'Project name is required');
          return;
        }
        await ref.read(projectsNotifierProvider.notifier).createProject(name, _selectedBuildingType);
        if (mounted) {
          Navigator.pop(context);
          BuildWiseSnackBar.showSuccess(context, 'Project created successfully');
        }
      },
      secondaryLabel: 'Cancel',
      barrierDismissible: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(projectsNotifierProvider);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'My Projects',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppColors.primary),
            onPressed: _showNewProjectDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
              child: BuildWiseTextField(
                hint: 'Search projects...',
                controller: _searchController,
                prefixIcon: Icons.search_rounded,
                onChanged: (val) => ref.read(projectsNotifierProvider.notifier).updateSearch(val),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppDimensions.pagePaddingHorizontal),
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    isSelected: state.filterType == null,
                    onTap: () => ref.read(projectsNotifierProvider.notifier).updateFilter(null),
                  ),
                  _FilterChip(
                    label: 'House',
                    isSelected: state.filterType == 'House',
                    onTap: () => ref.read(projectsNotifierProvider.notifier).updateFilter('House'),
                  ),
                  _FilterChip(
                    label: 'Villa',
                    isSelected: state.filterType == 'Villa',
                    onTap: () => ref.read(projectsNotifierProvider.notifier).updateFilter('Villa'),
                  ),
                  _FilterChip(
                    label: 'Commercial',
                    isSelected: state.filterType == 'Commercial',
                    onTap: () => ref.read(projectsNotifierProvider.notifier).updateFilter('Commercial'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: state.isLoading
                  ? const Center(child: BuildWiseLoading())
                  : state.projects.isEmpty
                      ? Center(
                          child: Text(
                            'No projects found.',
                            style: AppTypography.bodyLarge.copyWith(color: AppColors.gray500),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () => ref.read(projectsNotifierProvider.notifier).loadProjects(),
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: AppDimensions.pagePaddingHorizontal),
                            itemCount: state.projects.length,
                            itemBuilder: (context, index) {
                              final project = state.projects[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: AppDimensions.space12),
                                child: BuildWiseCard(
                                  hasBorder: true,
                                  onTap: () {
                                    // Go to upload/analysis or estimation results directly depending on status
                                  },
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withOpacity(0.08),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.business_outlined, color: AppColors.primary),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              project.name,
                                              style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${project.buildingType} • ${AppFormatters.formatDate(project.createdAt)}',
                                              style: AppTypography.bodySmall.copyWith(color: AppColors.gray500),
                                            ),
                                          ],
                                        ),
                                      ),
                                      PopupMenuButton<String>(
                                        onSelected: (action) {
                                          if (action == 'duplicate') {
                                            ref.read(projectsNotifierProvider.notifier).duplicateProject(project.id);
                                          } else if (action == 'delete') {
                                            ref.read(projectsNotifierProvider.notifier).deleteProject(project.id);
                                          } else if (action == 'fav') {
                                            ref.read(projectsNotifierProvider.notifier).toggleFavorite(project.id, project.isFavorite);
                                          }
                                        },
                                        itemBuilder: (context) => [
                                          PopupMenuItem(
                                            value: 'fav',
                                            child: Text(project.isFavorite ? 'Remove Favorite' : 'Mark Favorite'),
                                          ),
                                          const PopupMenuItem(
                                            value: 'duplicate',
                                            child: Text('Duplicate'),
                                          ),
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Text('Delete'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showNewProjectDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.gray300,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: AppTypography.labelLarge.copyWith(
            color: isSelected ? Colors.white : AppColors.gray500,
          ),
        ),
      ),
    );
  }
}
