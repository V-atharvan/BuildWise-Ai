import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/utils/formatters.dart';
import '../../domain/project_model.dart';

class RecentProjectsList extends StatelessWidget {
  final List<ProjectModel> projects;
  final Function(String, bool) onFavoriteToggle;

  const RecentProjectsList({
    super.key,
    required this.projects,
    required this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (projects.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Text(
            'No recent projects found.',
            style: AppTypography.bodyMedium.copyWith(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: projects.length,
      itemBuilder: (context, index) {
        final project = projects[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppDimensions.space12),
          child: BuildWiseCard(
            hasBorder: true,
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimensions.space16,
              vertical: AppDimensions.space14,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppDimensions.space10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.architecture_rounded,
                    color: AppColors.primary,
                    size: AppDimensions.iconLg,
                  ),
                ),
                const SizedBox(width: AppDimensions.space16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        project.name,
                        style: AppTypography.titleMedium.copyWith(
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            project.buildingType,
                            style: AppTypography.bodySmall.copyWith(
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            AppFormatters.formatDate(project.createdAt),
                            style: AppTypography.bodySmall.copyWith(
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(
                    project.isFavorite ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: project.isFavorite ? AppColors.warning : AppColors.gray400,
                  ),
                  onPressed: () => onFavoriteToggle(project.id, project.isFavorite),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
