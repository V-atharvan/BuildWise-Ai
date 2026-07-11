import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import 'app_theme.dart';

/// BuildWise AI — Dark Theme
///
/// Deep, rich dark theme inspired by Linear and Tesla interfaces.
/// Near-black surfaces with subtle violet accents.
class DarkTheme {
  DarkTheme._();

  static ThemeData get theme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        fontFamily: 'Inter',

        // Color Scheme
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          onPrimary: Colors.white,
          primaryContainer: AppColors.primarySubtle,
          onPrimaryContainer: AppColors.secondaryLight,
          secondary: AppColors.secondary,
          onSecondary: Colors.white,
          secondaryContainer: AppColors.primarySubtle,
          onSecondaryContainer: AppColors.secondaryLight,
          surface: AppColors.darkSurface,
          onSurface: AppColors.darkTextPrimary,
          surfaceContainerHighest: AppColors.darkSurfaceVariant,
          onSurfaceVariant: AppColors.darkTextSecondary,
          error: AppColors.errorLight,
          onError: Colors.white,
          outline: AppColors.darkBorder,
          outlineVariant: AppColors.darkDivider,
        ),

        // Scaffold
        scaffoldBackgroundColor: AppColors.darkScaffold,

        // AppBar
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.darkScaffold,
          foregroundColor: AppColors.darkTextPrimary,
          elevation: 0,
          scrolledUnderElevation: 0.5,
          centerTitle: false,
          titleTextStyle: AppTheme.textThemeDark.titleLarge,
          systemOverlayStyle: AppTheme.systemUiDark,
        ),

        // Text
        textTheme: AppTheme.textThemeDark,

        // Cards
        cardTheme: AppTheme.cardThemeDark,

        // Buttons
        elevatedButtonTheme: AppTheme.elevatedButtonTheme,
        outlinedButtonTheme: AppTheme.outlinedButtonThemeDark,
        textButtonTheme: AppTheme.textButtonTheme,

        // Input
        inputDecorationTheme: AppTheme.inputDecorationThemeDark,

        // Bottom Nav
        bottomNavigationBarTheme: AppTheme.bottomNavThemeDark,

        // Divider
        dividerTheme: AppTheme.dividerThemeDark,

        // Dialog
        dialogTheme: DialogTheme(
          backgroundColor: AppColors.darkElevated,
          elevation: 16,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          titleTextStyle: AppTheme.textThemeDark.titleLarge,
          contentTextStyle: AppTheme.textThemeDark.bodyMedium,
        ),

        // BottomSheet
        bottomSheetTheme: BottomSheetThemeData(
          backgroundColor: AppColors.darkSurface,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          dragHandleColor: AppColors.gray600,
          dragHandleSize: const Size(36, 4),
          showDragHandle: true,
        ),

        // Chip
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.darkSurfaceVariant,
          selectedColor: AppColors.primary.withOpacity(0.2),
          labelStyle: AppTheme.textThemeDark.labelLarge!,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          side: const BorderSide(color: AppColors.darkBorder),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        ),

        // Floating Action Button
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 6,
          shape: CircleBorder(),
        ),

        // Switch
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.secondary;
            }
            return AppColors.gray500;
          }),
          trackColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return AppColors.primary.withOpacity(0.4);
            }
            return AppColors.gray700;
          }),
        ),

        // Snack Bar
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.darkElevated,
          contentTextStyle: AppTheme.textThemeDark.bodyMedium?.copyWith(
            color: AppColors.darkTextPrimary,
          ),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),

        // Tab Bar
        tabBarTheme: TabBarTheme(
          labelColor: AppColors.secondary,
          unselectedLabelColor: AppColors.darkTextTertiary,
          labelStyle: AppTheme.textThemeDark.labelLarge,
          unselectedLabelStyle: AppTheme.textThemeDark.labelLarge,
          indicator: UnderlineTabIndicator(
            borderSide: const BorderSide(
              color: AppColors.secondary,
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
