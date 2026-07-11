import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import 'buildwise_button.dart';

/// BuildWise AI — Custom Animated Dialog
///
/// Features premium blur backdrop, smooth fade+scale entry,
/// custom icons, and primary/secondary button configurations.
class BuildWiseDialog extends StatelessWidget {
  final String title;
  final String content;
  final String? primaryLabel;
  final VoidCallback? onPrimaryPressed;
  final String? secondaryLabel;
  final VoidCallback? onSecondaryPressed;
  final IconData? icon;
  final Color? iconColor;
  final bool isDanger;

  const BuildWiseDialog({
    super.key,
    required this.title,
    required this.content,
    this.primaryLabel,
    this.onPrimaryPressed,
    this.secondaryLabel,
    this.onSecondaryPressed,
    this.icon,
    this.iconColor,
    this.isDanger = false,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required String content,
    String? primaryLabel,
    VoidCallback? onPrimaryPressed,
    String? secondaryLabel,
    VoidCallback? onSecondaryPressed,
    IconData? icon,
    Color? iconColor,
    bool isDanger = false,
    bool barrierDismissible = true,
  }) {
    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierLabel: '',
      barrierColor: AppColors.overlay,
      transitionDuration: const Duration(milliseconds: AppDimensions.animNormal),
      pageBuilder: (context, anim1, anim2) => const SizedBox.shrink(),
      transitionBuilder: (context, anim, secondaryAnim, child) {
        final scale = Tween<double>(begin: 0.9, end: 1.0).animate(
          CurvedAnimation(parent: anim, curve: Curves.easeOutBack),
        );
        final opacity = Tween<double>(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: anim, curve: Curves.easeIn),
        );

        return ScaleTransition(
          scale: scale,
          child: FadeTransition(
            opacity: opacity,
            child: AlertDialog(
              backgroundColor: Theme.of(context).brightness == Brightness.dark
                  ? AppColors.darkElevated
                  : AppColors.lightSurface,
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppDimensions.radiusCard),
              ),
              contentPadding: const EdgeInsets.fromLTRB(
                AppDimensions.space24,
                AppDimensions.space24,
                AppDimensions.space24,
                AppDimensions.space20,
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Container(
                      padding: const EdgeInsets.all(AppDimensions.space16),
                      decoration: BoxDecoration(
                        color: (iconColor ?? (isDanger ? AppColors.error : AppColors.primary))
                            .withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        icon,
                        size: AppDimensions.iconXxl,
                        color: iconColor ?? (isDanger ? AppColors.error : AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: AppDimensions.space20),
                  ],
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppDimensions.space12),
                  Text(
                    content,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppDimensions.space24),
                  Row(
                    children: [
                      if (secondaryLabel != null) ...[
                        Expanded(
                          child: BuildWiseButton.secondary(
                            label: secondaryLabel!,
                            size: BuildWiseButtonSize.medium,
                            onPressed: onSecondaryPressed ?? () => Navigator.pop(context),
                          ),
                        ),
                        const SizedBox(width: AppDimensions.space12),
                      ],
                      if (primaryLabel != null)
                        Expanded(
                          child: BuildWiseButton(
                            label: primaryLabel!,
                            size: BuildWiseButtonSize.medium,
                            variant: isDanger
                                ? BuildWiseButtonVariant.danger
                                : BuildWiseButtonVariant.primary,
                            onPressed: onPrimaryPressed,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink(); // Used via static show method
  }
}
