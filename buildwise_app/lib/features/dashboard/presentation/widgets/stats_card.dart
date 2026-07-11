import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/widgets/buildwise_card.dart';

class StatsCard extends StatelessWidget {
  final int totalProjects;
  final int activeEstimates;
  final int reportsGenerated;

  const StatsCard({
    super.key,
    required this.totalProjects,
    required this.activeEstimates,
    required this.reportsGenerated,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BuildWiseCard(
      padding: const EdgeInsets.symmetric(
        vertical: AppDimensions.space20,
        horizontal: AppDimensions.space12,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem(context, 'Projects', totalProjects.toString(), Icons.folder_open_rounded),
          _buildDivider(isDark),
          _buildStatItem(context, 'Active', activeEstimates.toString(), Icons.bolt_rounded),
          _buildDivider(isDark),
          _buildStatItem(context, 'Reports', reportsGenerated.toString(), Icons.analytics_outlined),
        ],
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(
      height: 32,
      width: 1.5,
      color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
    );
  }

  Widget _buildStatItem(BuildContext context, String label, String value, IconData icon) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        Icon(
          icon,
          size: AppDimensions.iconLg,
          color: AppColors.primary,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: AppTypography.numericMedium.copyWith(
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: AppTypography.bodySmall.copyWith(
            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
          ),
        ),
      ],
    );
  }
}
