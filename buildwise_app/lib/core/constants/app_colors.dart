import 'package:flutter/material.dart';

/// BuildWise AI Design System — Color Palette
///
/// Premium, minimal, futuristic color system.
/// Primary: Violet (#7C3AED) — Secondary: Lavender (#A78BFA)
/// No blue. No bright colors. No colorful gradients.
class AppColors {
  AppColors._();

  // ─── Brand Colors ───────────────────────────────────────
  static const Color primary = Color(0xFF7C3AED);
  static const Color primaryLight = Color(0xFF8B5CF6);
  static const Color primaryDark = Color(0xFF6D28D9);
  static const Color primarySubtle = Color(0xFF2D1B69);

  static const Color secondary = Color(0xFFA78BFA);
  static const Color secondaryLight = Color(0xFFC4B5FD);
  static const Color secondaryDark = Color(0xFF7C3AED);

  static const Color accent = Color(0xFFDDD6FE);

  // ─── Light Mode ─────────────────────────────────────────
  static const Color lightBackground = Color(0xFFFAFAFA);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceVariant = Color(0xFFF5F3FF);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightDivider = Color(0xFFE5E7EB);
  static const Color lightBorder = Color(0xFFE5E7EB);
  static const Color lightScaffold = Color(0xFFF9FAFB);

  // ─── Dark Mode ──────────────────────────────────────────
  static const Color darkBackground = Color(0xFF0A0A0F);
  static const Color darkSurface = Color(0xFF141419);
  static const Color darkSurfaceVariant = Color(0xFF1A1A24);
  static const Color darkCard = Color(0xFF18181F);
  static const Color darkDivider = Color(0xFF2A2A35);
  static const Color darkBorder = Color(0xFF2A2A35);
  static const Color darkScaffold = Color(0xFF0A0A0F);
  static const Color darkElevated = Color(0xFF1F1F2A);

  // ─── Text Colors ────────────────────────────────────────
  static const Color lightTextPrimary = Color(0xFF111827);
  static const Color lightTextSecondary = Color(0xFF6B7280);
  static const Color lightTextTertiary = Color(0xFF9CA3AF);
  static const Color lightTextDisabled = Color(0xFFD1D5DB);

  static const Color darkTextPrimary = Color(0xFFF9FAFB);
  static const Color darkTextSecondary = Color(0xFF9CA3AF);
  static const Color darkTextTertiary = Color(0xFF6B7280);
  static const Color darkTextDisabled = Color(0xFF4B5563);

  // ─── Semantic Colors ────────────────────────────────────
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF34D399);
  static const Color successSubtle = Color(0xFF064E3B);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color warningSubtle = Color(0xFF78350F);

  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFF87171);
  static const Color errorSubtle = Color(0xFF7F1D1D);

  static const Color info = Color(0xFF8B5CF6);
  static const Color infoLight = Color(0xFFA78BFA);
  static const Color infoSubtle = Color(0xFF2D1B69);

  // ─── Neutral Grays ──────────────────────────────────────
  static const Color gray50 = Color(0xFFF9FAFB);
  static const Color gray100 = Color(0xFFF3F4F6);
  static const Color gray200 = Color(0xFFE5E7EB);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color gray400 = Color(0xFF9CA3AF);
  static const Color gray500 = Color(0xFF6B7280);
  static const Color gray600 = Color(0xFF4B5563);
  static const Color gray700 = Color(0xFF374151);
  static const Color gray800 = Color(0xFF1F2937);
  static const Color gray900 = Color(0xFF111827);
  static const Color gray950 = Color(0xFF030712);

  // ─── Glassmorphism ──────────────────────────────────────
  static Color glassLight = Colors.white.withOpacity(0.08);
  static Color glassDark = Colors.white.withOpacity(0.04);
  static Color glassBorder = Colors.white.withOpacity(0.12);

  // ─── Shadows ────────────────────────────────────────────
  static const Color shadowLight = Color(0x0A000000);
  static const Color shadowMedium = Color(0x14000000);
  static const Color shadowDark = Color(0x1F000000);

  // ─── Overlays ───────────────────────────────────────────
  static Color overlay = Colors.black.withOpacity(0.5);
  static Color overlayLight = Colors.black.withOpacity(0.3);
}
