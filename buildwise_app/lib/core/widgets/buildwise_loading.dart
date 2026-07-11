import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Loading States
///
/// Skeleton shimmer loading, circular progress, and full-page loader.

/// Shimmer skeleton placeholder
class BuildWiseShimmer extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const BuildWiseShimmer({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.darkSurfaceVariant : AppColors.gray200,
      highlightColor: isDark ? AppColors.darkElevated : AppColors.gray100,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurfaceVariant : AppColors.gray200,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

/// Skeleton card for project loading states
class BuildWiseCardSkeleton extends StatelessWidget {
  const BuildWiseCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppDimensions.space16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const BuildWiseShimmer(height: 140, borderRadius: 20),
          const SizedBox(height: AppDimensions.space12),
          const BuildWiseShimmer(height: 16, width: 200),
          const SizedBox(height: AppDimensions.space8),
          BuildWiseShimmer(height: 12, width: 120),
        ],
      ),
    );
  }
}

/// List skeleton for loading states
class BuildWiseListSkeleton extends StatelessWidget {
  final int itemCount;

  const BuildWiseListSkeleton({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        itemCount,
        (index) => Padding(
          padding: const EdgeInsets.only(bottom: AppDimensions.space16),
          child: Row(
            children: [
              const BuildWiseShimmer(
                width: 48,
                height: 48,
                borderRadius: 12,
              ),
              const SizedBox(width: AppDimensions.space12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    BuildWiseShimmer(
                      height: 14,
                      width: 120.0 + (index * 20),
                    ),
                    const SizedBox(height: AppDimensions.space8),
                    const BuildWiseShimmer(height: 10, width: 80),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Circular progress indicator with BuildWise styling
class BuildWiseLoading extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color? color;
  final String? message;

  const BuildWiseLoading({
    super.key,
    this.size = 32,
    this.strokeWidth = 2.5,
    this.color,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              strokeWidth: strokeWidth,
              color: color ?? AppColors.primary,
              strokeCap: StrokeCap.round,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: AppDimensions.space16),
            Text(
              message!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Full-page loading overlay
class BuildWiseFullPageLoader extends StatelessWidget {
  final String? message;

  const BuildWiseFullPageLoader({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: BuildWiseLoading(
        size: 40,
        message: message,
      ),
    );
  }
}
