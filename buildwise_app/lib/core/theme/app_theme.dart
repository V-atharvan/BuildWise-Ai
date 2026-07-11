import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';
import '../constants/app_dimensions.dart';
import 'light_theme.dart';
import 'dark_theme.dart';

/// BuildWise AI — Theme System
///
/// Material 3 based theme with premium design language.
/// Violet primary, Lavender secondary.
/// Apple × Notion × Linear × Tesla inspired.
class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme => LightTheme.theme;
  static ThemeData get darkTheme => DarkTheme.theme;

  // ─── Shared Component Themes ────────────────────────────

  static TextTheme get _textTheme => TextTheme(
        displayLarge: AppTypography.displayLarge,
        displayMedium: AppTypography.displayMedium,
        displaySmall: AppTypography.displaySmall,
        headlineLarge: AppTypography.headlineLarge,
        headlineMedium: AppTypography.headlineMedium,
        headlineSmall: AppTypography.headlineSmall,
        titleLarge: AppTypography.titleLarge,
        titleMedium: AppTypography.titleMedium,
        titleSmall: AppTypography.titleSmall,
        bodyLarge: AppTypography.bodyLarge,
        bodyMedium: AppTypography.bodyMedium,
        bodySmall: AppTypography.bodySmall,
        labelLarge: AppTypography.labelLarge,
        labelMedium: AppTypography.labelMedium,
        labelSmall: AppTypography.labelSmall,
      );

  static TextTheme get textThemeLight =>
      _textTheme.apply(
        bodyColor: AppColors.lightTextPrimary,
        displayColor: AppColors.lightTextPrimary,
      );

  static TextTheme get textThemeDark =>
      _textTheme.apply(
        bodyColor: AppColors.darkTextPrimary,
        displayColor: AppColors.darkTextPrimary,
      );

  // ─── Card Theme ─────────────────────────────────────────

  static CardTheme cardThemeLight = CardTheme(
    color: AppColors.lightCard,
    elevation: AppDimensions.elevationSm,
    shadowColor: AppColors.shadowLight,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusCard),
    ),
    margin: EdgeInsets.zero,
  );

  static CardTheme cardThemeDark = CardTheme(
    color: AppColors.darkCard,
    elevation: AppDimensions.elevationXs,
    shadowColor: Colors.black26,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusCard),
    ),
    margin: EdgeInsets.zero,
  );

  // ─── Elevated Button Theme ──────────────────────────────

  static ElevatedButtonThemeData elevatedButtonTheme = ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      minimumSize: const Size(double.infinity, AppDimensions.buttonHeightLg),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      ),
      textStyle: AppTypography.buttonLarge,
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.space24,
        vertical: AppDimensions.space14,
      ),
    ),
  );

  // ─── Outlined Button Theme ──────────────────────────────

  static OutlinedButtonThemeData outlinedButtonThemeLight =
      OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.primary,
      elevation: 0,
      minimumSize: const Size(double.infinity, AppDimensions.buttonHeightLg),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      ),
      side: const BorderSide(color: AppColors.lightBorder, width: 1.5),
      textStyle: AppTypography.buttonLarge,
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.space24,
        vertical: AppDimensions.space14,
      ),
    ),
  );

  static OutlinedButtonThemeData outlinedButtonThemeDark =
      OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.secondary,
      elevation: 0,
      minimumSize: const Size(double.infinity, AppDimensions.buttonHeightLg),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      ),
      side: const BorderSide(color: AppColors.darkBorder, width: 1.5),
      textStyle: AppTypography.buttonLarge,
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.space24,
        vertical: AppDimensions.space14,
      ),
    ),
  );

  // ─── Text Button Theme ─────────────────────────────────

  static TextButtonThemeData textButtonTheme = TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: AppColors.primary,
      textStyle: AppTypography.buttonMedium,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.space16,
        vertical: AppDimensions.space8,
      ),
    ),
  );

  // ─── Input Decoration Theme ─────────────────────────────

  static InputDecorationTheme inputDecorationThemeLight = InputDecorationTheme(
    filled: true,
    fillColor: AppColors.lightSurfaceVariant,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.lightBorder, width: 1),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.primary, width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.error, width: 1.5),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.error, width: 2),
    ),
    contentPadding: const EdgeInsets.symmetric(
      horizontal: AppDimensions.space20,
      vertical: AppDimensions.space16,
    ),
    hintStyle: AppTypography.bodyMedium.copyWith(
      color: AppColors.lightTextTertiary,
    ),
    labelStyle: AppTypography.labelLarge.copyWith(
      color: AppColors.lightTextSecondary,
    ),
    floatingLabelStyle: AppTypography.labelMedium.copyWith(
      color: AppColors.primary,
    ),
    errorStyle: AppTypography.bodySmall.copyWith(
      color: AppColors.error,
    ),
  );

  static InputDecorationTheme inputDecorationThemeDark = InputDecorationTheme(
    filled: true,
    fillColor: AppColors.darkSurfaceVariant,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.darkBorder, width: 1),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.primary, width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.error, width: 1.5),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
      borderSide: const BorderSide(color: AppColors.error, width: 2),
    ),
    contentPadding: const EdgeInsets.symmetric(
      horizontal: AppDimensions.space20,
      vertical: AppDimensions.space16,
    ),
    hintStyle: AppTypography.bodyMedium.copyWith(
      color: AppColors.darkTextTertiary,
    ),
    labelStyle: AppTypography.labelLarge.copyWith(
      color: AppColors.darkTextSecondary,
    ),
    floatingLabelStyle: AppTypography.labelMedium.copyWith(
      color: AppColors.secondary,
    ),
    errorStyle: AppTypography.bodySmall.copyWith(
      color: AppColors.errorLight,
    ),
  );

  // ─── Bottom Nav Theme ───────────────────────────────────

  static BottomNavigationBarThemeData bottomNavThemeLight =
      BottomNavigationBarThemeData(
    backgroundColor: AppColors.lightSurface,
    selectedItemColor: AppColors.primary,
    unselectedItemColor: AppColors.lightTextTertiary,
    type: BottomNavigationBarType.fixed,
    elevation: 0,
    selectedLabelStyle: AppTypography.labelSmall.copyWith(fontWeight: FontWeight.w600),
    unselectedLabelStyle: AppTypography.labelSmall,
  );

  static BottomNavigationBarThemeData bottomNavThemeDark =
      BottomNavigationBarThemeData(
    backgroundColor: AppColors.darkSurface,
    selectedItemColor: AppColors.secondary,
    unselectedItemColor: AppColors.darkTextTertiary,
    type: BottomNavigationBarType.fixed,
    elevation: 0,
    selectedLabelStyle: AppTypography.labelSmall.copyWith(fontWeight: FontWeight.w600),
    unselectedLabelStyle: AppTypography.labelSmall,
  );

  // ─── Divider Theme ──────────────────────────────────────

  static const DividerThemeData dividerThemeLight = DividerThemeData(
    color: AppColors.lightDivider,
    thickness: 1,
    space: 0,
  );

  static const DividerThemeData dividerThemeDark = DividerThemeData(
    color: AppColors.darkDivider,
    thickness: 1,
    space: 0,
  );

  // ─── System UI ──────────────────────────────────────────

  static const SystemUiOverlayStyle systemUiLight = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.lightSurface,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  static const SystemUiOverlayStyle systemUiDark = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: AppColors.darkBackground,
    systemNavigationBarIconBrightness: Brightness.light,
  );
}
