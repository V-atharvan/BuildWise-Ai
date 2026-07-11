import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../providers/dashboard_notifier.dart';
import '../../projects/presentation/providers/projects_notifier.dart';
import '../widgets/greeting_header.dart';
import '../widgets/stats_card.dart';
import '../widgets/quick_actions_grid.dart';
import '../widgets/recent_projects_list.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(dashboardNotifierProvider.notifier).loadDashboardData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(dashboardNotifierProvider);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(dashboardNotifierProvider.notifier).loadDashboardData(),
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimensions.pagePaddingHorizontal,
              vertical: AppDimensions.pagePaddingVertical,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const GreetingHeader(),
                const SizedBox(height: 24),
                if (state.isLoading) ...[
                  const BuildWiseLoading(size: 32),
                ] else ...[
                  StatsCard(
                    totalProjects: state.stats['total_projects'] as int? ?? 0,
                    activeEstimates: state.stats['active_estimates'] as int? ?? 0,
                    reportsGenerated: state.stats['reports_generated'] as int? ?? 0,
                  ),
                ],
                const SizedBox(height: 28),
                Text(
                  'Quick Estimates',
                  style: AppTypography.titleLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                const QuickActionsGrid(),
                const SizedBox(height: 28),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recent Projects',
                      style: AppTypography.titleLarge.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.go('/projects'),
                      child: Text(
                        'See All',
                        style: AppTypography.buttonMedium.copyWith(color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                RecentProjectsList(
                  projects: state.recentProjects,
                  onFavoriteToggle: (id, fav) {
                    ref.read(projectsNotifierProvider.notifier).toggleFavorite(id, fav);
                    // Reload dashboard statistics
                    ref.read(dashboardNotifierProvider.notifier).loadDashboardData();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
