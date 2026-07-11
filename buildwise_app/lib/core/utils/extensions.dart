import 'package:flutter/material.dart';

/// BuildWise AI — Extensions
extension BuildWiseContext on BuildContext {
  ThemeData get theme => Theme.of(context);
  ColorScheme get colors => theme.colorScheme;
  TextTheme get textTheme => theme.textTheme;
  bool get isDarkMode => theme.brightness == Brightness.dark;

  void showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : colors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

extension BuildWiseString on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
