import 'dart:ui';
import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Glassmorphic Container
///
/// Implements a frosted glass effect using BackdropFilter.
/// Should be used sparingly to keep visual hierarchy clean.
class GlassmorphicContainer extends StatelessWidget {
  final Widget child;
  final double? width;
  final double? height;
  final double borderRadius;
  final double blur;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;

  const GlassmorphicContainer({
    super.key,
    required this.child,
    this.width,
    this.height,
    this.borderRadius = AppDimensions.radiusCard,
    this.blur = 15.0,
    this.padding,
    this.margin,
    this.color,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBgColor = isDark ? AppColors.glassDark : AppColors.glassLight;
    final defaultBorderColor = AppColors.glassBorder;

    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.25 : 0.05),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: color ?? defaultBgColor,
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: borderColor ?? defaultBorderColor,
                width: 1.5,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
