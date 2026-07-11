import 'package:flutter/services.dart';

/// BuildWise AI — Haptic Feedback Engine
///
/// Wraps standard system haptics for satisfying premium micro-interactions.
class HapticUtils {
  HapticUtils._();

  static Future<void> light() async {
    await HapticFeedback.lightImpact();
  }

  static Future<void> medium() async {
    await HapticFeedback.mediumImpact();
  }

  static Future<void> heavy() async {
    await HapticFeedback.heavyImpact();
  }

  static Future<void> selection() async {
    await HapticFeedback.selectionClick();
  }

  static Future<void> success() async {
    // Staggered pattern for success
    await HapticFeedback.lightImpact();
    await Future.delayed(const Duration(milliseconds: 80));
    await HapticFeedback.lightImpact();
  }

  static Future<void> failure() async {
    // Strong triplet pattern for error
    await HapticFeedback.heavyImpact();
    await Future.delayed(const Duration(milliseconds: 60));
    await HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 60));
    await HapticFeedback.mediumImpact();
  }
}
