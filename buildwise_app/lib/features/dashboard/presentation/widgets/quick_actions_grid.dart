import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_card.dart';

class QuickActionsGrid extends StatelessWidget {
  const QuickActionsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final List<_ActionItem> actions = [
      _ActionItem(
        title: 'New Estimate',
        subtitle: 'Upload building drawing',
        icon: Icons.add_circle_outline_rounded,
        onTap: () => context.go('/estimate'),
      ),
      _ActionItem(
        title: 'AI Assistant',
        subtitle: 'Chat about calculations',
        icon: Icons.auto_awesome_outlined,
        onTap: () => context.go('/ai'),
      ),
      _ActionItem(
        title: 'Project List',
        subtitle: 'View active estimations',
        icon: Icons.folder_open_rounded,
        onTap: () => context.go('/projects'),
      ),
      _ActionItem(
        title: 'Preferences',
        subtitle: 'Units, themes, settings',
        icon: Icons.settings_outlined,
        onTap: () => context.go('/profile'),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppDimensions.space12,
        mainAxisSpacing: AppDimensions.space12,
        childAspectRatio: 1.4,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return BuildWiseCard(
          onTap: action.onTap,
          padding: const EdgeInsets.all(AppDimensions.space16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppDimensions.space8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  action.icon,
                  color: AppColors.primary,
                  size: AppDimensions.iconLg,
                ),
              ),
              const SizedBox(height: AppDimensions.space12),
              Text(
                action.title,
                style: AppTypography.titleSmall.copyWith(
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                action.subtitle,
                style: AppTypography.caption.copyWith(
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ActionItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _ActionItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });
}
