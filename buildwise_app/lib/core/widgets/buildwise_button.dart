import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Premium Button Widget
///
/// Variants: primary, secondary, outline, ghost, icon, danger
/// Features: press animation, loading state, haptic feedback
enum BuildWiseButtonVariant { primary, secondary, outline, ghost, danger }
enum BuildWiseButtonSize { small, medium, large }

class BuildWiseButton extends StatefulWidget {
  final String? label;
  final VoidCallback? onPressed;
  final BuildWiseButtonVariant variant;
  final BuildWiseButtonSize size;
  final IconData? icon;
  final IconData? suffixIcon;
  final bool isLoading;
  final bool isExpanded;
  final bool hapticFeedback;

  const BuildWiseButton({
    super.key,
    this.label,
    this.onPressed,
    this.variant = BuildWiseButtonVariant.primary,
    this.size = BuildWiseButtonSize.large,
    this.icon,
    this.suffixIcon,
    this.isLoading = false,
    this.isExpanded = true,
    this.hapticFeedback = true,
  });

  /// Primary filled button
  const BuildWiseButton.primary({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.suffixIcon,
    this.isLoading = false,
    this.isExpanded = true,
    this.hapticFeedback = true,
    this.size = BuildWiseButtonSize.large,
  }) : variant = BuildWiseButtonVariant.primary;

  /// Secondary filled button
  const BuildWiseButton.secondary({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.suffixIcon,
    this.isLoading = false,
    this.isExpanded = true,
    this.hapticFeedback = true,
    this.size = BuildWiseButtonSize.large,
  }) : variant = BuildWiseButtonVariant.secondary;

  /// Outline button
  const BuildWiseButton.outline({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.suffixIcon,
    this.isLoading = false,
    this.isExpanded = true,
    this.hapticFeedback = true,
    this.size = BuildWiseButtonSize.large,
  }) : variant = BuildWiseButtonVariant.outline;

  /// Ghost button (text-only)
  const BuildWiseButton.ghost({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.suffixIcon,
    this.isLoading = false,
    this.isExpanded = false,
    this.hapticFeedback = true,
    this.size = BuildWiseButtonSize.medium,
  }) : variant = BuildWiseButtonVariant.ghost;

  @override
  State<BuildWiseButton> createState() => _BuildWiseButtonState();
}

class _BuildWiseButtonState extends State<BuildWiseButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 100),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _height {
    switch (widget.size) {
      case BuildWiseButtonSize.small:
        return AppDimensions.buttonHeightSm;
      case BuildWiseButtonSize.medium:
        return AppDimensions.buttonHeightMd;
      case BuildWiseButtonSize.large:
        return AppDimensions.buttonHeightLg;
    }
  }

  TextStyle get _textStyle {
    switch (widget.size) {
      case BuildWiseButtonSize.small:
        return AppTypography.buttonSmall;
      case BuildWiseButtonSize.medium:
        return AppTypography.buttonMedium;
      case BuildWiseButtonSize.large:
        return AppTypography.buttonLarge;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDisabled = widget.onPressed == null || widget.isLoading;

    Color backgroundColor;
    Color foregroundColor;
    Color? borderColor;

    switch (widget.variant) {
      case BuildWiseButtonVariant.primary:
        backgroundColor = AppColors.primary;
        foregroundColor = Colors.white;
        break;
      case BuildWiseButtonVariant.secondary:
        backgroundColor = isDark
            ? AppColors.darkSurfaceVariant
            : AppColors.lightSurfaceVariant;
        foregroundColor = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
        break;
      case BuildWiseButtonVariant.outline:
        backgroundColor = Colors.transparent;
        foregroundColor = AppColors.primary;
        borderColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
        break;
      case BuildWiseButtonVariant.ghost:
        backgroundColor = Colors.transparent;
        foregroundColor = AppColors.primary;
        break;
      case BuildWiseButtonVariant.danger:
        backgroundColor = AppColors.error;
        foregroundColor = Colors.white;
        break;
    }

    if (isDisabled) {
      backgroundColor = backgroundColor.withOpacity(0.5);
      foregroundColor = foregroundColor.withOpacity(0.5);
    }

    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        );
      },
      child: GestureDetector(
        onTapDown: isDisabled ? null : (_) => _controller.forward(),
        onTapUp: isDisabled ? null : (_) => _controller.reverse(),
        onTapCancel: isDisabled ? null : () => _controller.reverse(),
        child: SizedBox(
          width: widget.isExpanded ? double.infinity : null,
          height: _height,
          child: MaterialButton(
            onPressed: isDisabled
                ? null
                : () {
                    if (widget.hapticFeedback) {
                      HapticFeedback.lightImpact();
                    }
                    widget.onPressed?.call();
                  },
            color: backgroundColor,
            elevation: 0,
            highlightElevation: 0,
            hoverElevation: 0,
            focusElevation: 0,
            disabledColor: backgroundColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
              side: borderColor != null
                  ? BorderSide(color: borderColor, width: 1.5)
                  : BorderSide.none,
            ),
            padding: EdgeInsets.symmetric(
              horizontal: widget.size == BuildWiseButtonSize.small
                  ? AppDimensions.space16
                  : AppDimensions.space24,
            ),
            child: widget.isLoading
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: foregroundColor,
                    ),
                  )
                : Row(
                    mainAxisSize: widget.isExpanded
                        ? MainAxisSize.max
                        : MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (widget.icon != null) ...[
                        Icon(widget.icon, size: 18, color: foregroundColor),
                        if (widget.label != null)
                          const SizedBox(width: AppDimensions.space8),
                      ],
                      if (widget.label != null)
                        Text(
                          widget.label!,
                          style: _textStyle.copyWith(color: foregroundColor),
                        ),
                      if (widget.suffixIcon != null) ...[
                        const SizedBox(width: AppDimensions.space8),
                        Icon(widget.suffixIcon, size: 18, color: foregroundColor),
                      ],
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
