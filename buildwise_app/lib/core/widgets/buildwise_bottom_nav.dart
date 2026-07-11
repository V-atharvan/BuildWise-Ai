import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Premium Bottom Navigation Bar
///
/// 5-tab navigation: Home, Projects, Estimate, AI, Profile
/// Animated indicator, haptic feedback, floating upload FAB center.
class BuildWiseBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BuildWiseBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  static const List<_NavItem> _items = [
    _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Home'),
    _NavItem(icon: Icons.folder_outlined, activeIcon: Icons.folder_rounded, label: 'Projects'),
    _NavItem(icon: Icons.calculate_outlined, activeIcon: Icons.calculate_rounded, label: 'Estimate'),
    _NavItem(icon: Icons.auto_awesome_outlined, activeIcon: Icons.auto_awesome, label: 'AI'),
    _NavItem(icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
            width: 0.5,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: AppDimensions.bottomNavHeight,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_items.length, (index) {
              final item = _items[index];
              final isSelected = index == currentIndex;

              return Expanded(
                child: _NavBarItem(
                  icon: isSelected ? item.activeIcon : item.icon,
                  label: item.label,
                  isSelected: isSelected,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    onTap(index);
                  },
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

class _NavBarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavBarItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final activeColor = isDark ? AppColors.secondary : AppColors.primary;
    final inactiveColor = isDark
        ? AppColors.darkTextTertiary
        : AppColors.lightTextTertiary;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: AppDimensions.animFast),
        padding: const EdgeInsets.symmetric(vertical: AppDimensions.space8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: AppDimensions.animNormal),
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: isSelected
                    ? activeColor.withOpacity(0.12)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                icon,
                size: AppDimensions.bottomNavIconSize,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
            const SizedBox(height: AppDimensions.space4),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: AppDimensions.animFast),
              style: AppTypography.labelSmall.copyWith(
                color: isSelected ? activeColor : inactiveColor,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}
