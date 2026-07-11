import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Premium Card Widget
///
/// Elevated card with 20px rounded corners, subtle shadow,
/// and optional border, header, and press handler.
class BuildWiseCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final double? elevation;
  final double? borderRadius;
  final Color? backgroundColor;
  final Color? borderColor;
  final double? width;
  final double? height;
  final bool hasBorder;

  const BuildWiseCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.elevation,
    this.borderRadius,
    this.backgroundColor,
    this.borderColor,
    this.width,
    this.height,
    this.hasBorder = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = backgroundColor ??
        (isDark ? AppColors.darkCard : AppColors.lightCard);
    final radius = borderRadius ?? AppDimensions.radiusCard;

    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(radius),
        border: hasBorder
            ? Border.all(
                color: borderColor ??
                    (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                width: 1,
              )
            : null,
        boxShadow: [
          if (!isDark)
            BoxShadow(
              color: AppColors.shadowLight,
              blurRadius: elevation ?? AppDimensions.elevationMd,
              offset: const Offset(0, 2),
              spreadRadius: 0,
            ),
          if (!isDark)
            BoxShadow(
              color: AppColors.shadowLight,
              blurRadius: (elevation ?? AppDimensions.elevationMd) * 2,
              offset: const Offset(0, 4),
              spreadRadius: -2,
            ),
          if (isDark)
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: elevation ?? AppDimensions.elevationMd,
              offset: const Offset(0, 2),
              spreadRadius: 0,
            ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(radius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(radius),
          splashFactory: InkSparkle.splashFactory,
          child: Padding(
            padding: padding ??
                const EdgeInsets.all(AppDimensions.space20),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Card with header section
class BuildWiseCardWithHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;

  const BuildWiseCardWithHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    required this.child,
    this.onTap,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BuildWiseCard(
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppDimensions.space20,
              AppDimensions.space20,
              AppDimensions.space20,
              AppDimensions.space12,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: theme.textTheme.titleMedium),
                      if (subtitle != null) ...[
                        const SizedBox(height: AppDimensions.space4),
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
          ),
          Divider(
            height: 1,
            color: theme.colorScheme.outlineVariant,
          ),
          Padding(
            padding: padding ??
                const EdgeInsets.all(AppDimensions.space20),
            child: child,
          ),
        ],
      ),
    );
  }
}
