import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../constants/app_colors.dart';
import 'app_theme.dart';

/// BuildWise AI — Light Theme
class LightTheme {
  LightTheme._();

  static ThemeData get theme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        fontFamily: 'Inter',

        // Color Scheme
        colorScheme: const ColorScheme.light(
          primary: AppColors.primary,
          onPrimary: Colors.white,
          primaryContainer: AppColors.accent,
          onPrimaryContainer: AppColors.primaryDark,
          secondary: AppColors.secondary,
          onSecondary: Colors.white,
          secondaryContainer: AppColors.secondaryLight,
          onSecondaryContainer: AppColors.primaryDark,
          surface: AppColors.lightSurface,
          onSurface: AppColors.lightTextPrimary,
          surfaceContainerHighest: AppColors.lightSurfaceVariant,
          onSurfaceVariant: AppColors.lightTextSecondary,
          error: AppColors.error,
          onError: Colors.white,
          outline: AppColors.lightBorder,
          outlineVariant: AppColors.lightDivider,
        ),

        // Scaffold
        scaffoldBackgroundColor: AppColors.lightScaffold,

        // AppBar
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.lightScaffold,
          foregroundColor: AppColors.lightTextPrimary,
          elevation: 0,
          scrolledUnderElevation: 0.5,
          centerTitle: false,
          titleTextStyle: AppTheme.textThemeLight.titleLarge,
          systemOverlayStyle: AppTheme.systemUiLight,
        ),

        // Text
        textTheme: AppTheme.textThemeLight,

        // Cards
        cardTheme: AppTheme.cardThemeLight,

        // Buttons
        elevatedButtonTheme: AppTheme.elevatedButtonTheme,
        outlinedButtonTheme: AppTheme.outlinedButtonThemeLight,
        textButtonTheme: AppTheme.textButtonTheme,

        // Input
        inputDecorationTheme: AppTheme.inputDecorationThemeLight,

        // Bottom Nav
        bottomNavigationBarTheme: AppTheme.bottomNavThemeLight,

        // Divider
        dividerTheme: AppTheme.dividerThemeLight,

        // Dialog
        dialogTheme: DialogThemeData(
          backgroundColor: AppColors.lightSurface,
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          titleTextStyle: AppTheme.textThemeLight.titleLarge,
          contentTextStyle: AppTheme.textThemeLight.bodyMedium,
        ),

        // BottomSheet
        bottomSheetTheme: BottomSheetThemeData(
          backgroundColor: AppColors.lightSurface,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          dragHandleColor: AppColors.gray300,
          dragHandleSize: const Size(36, 4),
          showDragHandle: true,
        ),

        // Chip
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.lightSurfaceVariant,
          selectedColor: AppColors.primary.withOpacity(0.12),
          labelStyle: AppTheme.textThemeLight.labelLarge!,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          side: const BorderSide(color: AppColors.lightBorder),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        ),

        // Floating Action Button
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 4,
          shape: CircleBorder(),
        ),

        // Switch
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.primary;
            }
            return AppColors.gray400;
          }),
          trackColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.primary.withOpacity(0.3);
            }
            return AppColors.gray200;
          }),
        ),

        // Snack Bar
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.gray900,
          contentTextStyle: AppTheme.textThemeLight.bodyMedium?.copyWith(
            color: Colors.white,
          ),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),

        // Tab Bar
        tabBarTheme: TabBarThemeData(
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.lightTextTertiary,
          labelStyle: AppTheme.textThemeLight.labelLarge,
          unselectedLabelStyle: AppTheme.textThemeLight.labelLarge,
          indicator: UnderlineTabIndicator(
            borderSide: const BorderSide(
              color: AppColors.primary,
              width: 2.5,
            ),
            borderRadius: BorderRadius.circular(2),
          ),
        ),

        // Page transitions
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: CupertinoPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          },
        ),

        // Splash
        splashFactory: InkSparkle.splashFactory,
      );
}
