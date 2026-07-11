import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/providers/auth_provider.dart';

class GreetingHeader extends ConsumerWidget {
  const GreetingHeader({super.key});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final user = authState.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _getGreeting(),
              style: AppTypography.bodyLarge.copyWith(
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              user?.fullName ?? 'Engineer',
              style: AppTypography.headlineLarge.copyWith(
                fontWeight: FontWeight.w800,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
        Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  Icons.notifications_none_rounded,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  size: AppDimensions.iconLg,
                ),
                onPressed: () {},
              ),
            ),
            Positioned(
              right: 4,
              top: 4,
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
