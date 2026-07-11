import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.system) {
    _loadTheme();
  }

  static const _key = 'theme_mode';

  void _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final index = prefs.getInt(_key);
    if (index != null) {
      state = ThemeMode.values[index];
    }
  }

  void setThemeMode(ThemeMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_key, mode.index);
  }

  void toggleTheme(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark);
  }
}
