import 'package:flutter/material.dart';

/// BuildWise AI Design System — Typography
///
/// Large, clean, premium typography using Inter font family.
/// Inspired by Apple HIG and Linear's type system.
class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';

  // ─── Display ────────────────────────────────────────────
  static const TextStyle displayLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 48,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.5,
    height: 1.1,
  );

  static const TextStyle displayMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 36,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.0,
    height: 1.15,
  );

  static const TextStyle displaySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 30,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
    height: 1.2,
  );

  // ─── Headline ───────────────────────────────────────────
  static const TextStyle headlineLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 28,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
    height: 1.25,
  );

  static const TextStyle headlineMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.3,
  );

  static const TextStyle headlineSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.3,
  );

  // ─── Title ──────────────────────────────────────────────
  static const TextStyle titleLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    height: 1.35,
  );

  static const TextStyle titleMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.4,
  );

  static const TextStyle titleSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.4,
  );

  // ─── Body ───────────────────────────────────────────────
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.5,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.5,
  );

  // ─── Label ──────────────────────────────────────────────
  static const TextStyle labelLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.4,
  );

  static const TextStyle labelMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.1,
    height: 1.4,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    height: 1.4,
  );

  // ─── Caption ────────────────────────────────────────────
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.3,
    height: 1.4,
  );

  // ─── Button ─────────────────────────────────────────────
  static const TextStyle buttonLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.0,
  );

  static const TextStyle buttonMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
    height: 1.0,
  );

  static const TextStyle buttonSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    height: 1.0,
  );

  // ─── Numeric (for estimation values) ───────────────────
  static const TextStyle numericLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 40,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.0,
    height: 1.1,
  );

  static const TextStyle numericMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.15,
  );

  static const TextStyle numericSmall = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.2,
  );
}
