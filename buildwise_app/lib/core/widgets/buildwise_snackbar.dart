import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../constants/app_typography.dart';

/// BuildWise AI — Custom Premium SnackBar/Toasts
///
/// Handles success, error, warning, and info notifications
/// with slide-in animation and floating style.
class BuildWiseSnackBar {
  BuildWiseSnackBar._();

  static void showSuccess(BuildContext context, String message) {
    _show(
      context: context,
      message: message,
      backgroundColor: AppColors.successSubtle,
      textColor: AppColors.successLight,
      icon: Icons.check_circle_outline_rounded,
      borderColor: AppColors.success.withOpacity(0.3),
    );
  }

  static void showError(BuildContext context, String message) {
    _show(
      context: context,
      message: message,
      backgroundColor: AppColors.errorSubtle,
      textColor: AppColors.errorLight,
      icon: Icons.error_outline_rounded,
      borderColor: AppColors.error.withOpacity(0.3),
    );
  }

  static void showWarning(BuildContext context, String message) {
    _show(
      context: context,
      message: message,
      backgroundColor: AppColors.warningSubtle,
      textColor: AppColors.warningLight,
      icon: Icons.warning_amber_rounded,
      borderColor: AppColors.warning.withOpacity(0.3),
    );
  }

  static void showInfo(BuildContext context, String message) {
    _show(
      context: context,
      message: message,
      backgroundColor: AppColors.primarySubtle,
      textColor: AppColors.secondaryLight,
      icon: Icons.info_outline_rounded,
      borderColor: AppColors.primary.withOpacity(0.3),
    );
  }

  static void _show({
    required BuildContext context,
    required String message,
    required Color backgroundColor,
    required Color textColor,
    required IconData icon,
    required Color borderColor,
  }) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    scaffoldMessenger.removeCurrentSnackBar();

    scaffoldMessenger.showSnackBar(
      SnackBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(
          AppDimensions.pagePaddingHorizontal,
          0,
          AppDimensions.pagePaddingHorizontal,
          AppDimensions.space16,
        ),
        duration: const Duration(seconds: 3),
        content: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.space16,
            vertical: AppDimensions.space14,
          ),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: const [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 12,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(icon, color: textColor, size: AppDimensions.iconLg),
              const SizedBox(width: AppDimensions.space12),
              Expanded(
                child: Text(
                  message,
                  style: AppTypography.bodyMedium.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
