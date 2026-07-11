import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Custom App Bar with blur effect
///
/// Sliver-compatible app bar with translucent blur effect,
/// optional search bar, and action buttons.
class BuildWiseAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showBackButton;
  final bool centerTitle;
  final bool transparent;
  final double elevation;
  final Color? backgroundColor;
  final VoidCallback? onBackPressed;

  const BuildWiseAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.actions,
    this.leading,
    this.showBackButton = false,
    this.centerTitle = false,
    this.transparent = false,
    this.elevation = 0,
    this.backgroundColor,
    this.onBackPressed,
  });

  @override
  Size get preferredSize => const Size.fromHeight(AppDimensions.appBarHeight);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppBar(
      title: titleWidget ??
          (title != null
              ? Text(
                  title!,
                  style: Theme.of(context).textTheme.titleLarge,
                )
              : null),
      centerTitle: centerTitle,
      elevation: elevation,
      scrolledUnderElevation: 0.5,
      backgroundColor: transparent
          ? Colors.transparent
          : backgroundColor ??
              (isDark ? AppColors.darkScaffold : AppColors.lightScaffold),
      leading: showBackButton
          ? IconButton(
              icon: Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 20,
                color: isDark
                    ? AppColors.darkTextPrimary
                    : AppColors.lightTextPrimary,
              ),
              onPressed: () {
                HapticFeedback.lightImpact();
                if (onBackPressed != null) {
                  onBackPressed!();
                } else {
                  Navigator.of(context).maybePop();
                }
              },
            )
          : leading,
      actions: actions != null
          ? [
              ...actions!,
              const SizedBox(width: AppDimensions.space8),
            ]
          : null,
      systemOverlayStyle: isDark
          ? SystemUiOverlayStyle.light
          : SystemUiOverlayStyle.dark,
    );
  }
}

/// Sliver app bar with blur effect for scroll views
class BuildWiseSliverAppBar extends StatelessWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? flexibleSpace;
  final double expandedHeight;
  final bool pinned;
  final bool floating;

  const BuildWiseSliverAppBar({
    super.key,
    required this.title,
    this.actions,
    this.flexibleSpace,
    this.expandedHeight = 120,
    this.pinned = true,
    this.floating = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SliverAppBar(
      expandedHeight: expandedHeight,
      pinned: pinned,
      floating: floating,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: isDark ? AppColors.darkScaffold : AppColors.lightScaffold,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontSize: 20,
              ),
        ),
        titlePadding: const EdgeInsets.only(
          left: AppDimensions.pagePaddingHorizontal,
          bottom: 16,
        ),
        background: flexibleSpace,
      ),
      actions: actions,
    );
  }
}
