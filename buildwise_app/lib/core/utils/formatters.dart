import 'package:intl/intl.dart';

/// BuildWise AI — Formatting Helpers
///
/// Handles currency, area, volumes, and dates for estimation outputs.
class AppFormatters {
  AppFormatters._();

  static final NumberFormat _currencyFormat = NumberFormat.currency(
    symbol: '₹ ', // Default Currency symbol
    decimalDigits: 2,
  );

  static final NumberFormat _numberFormat = NumberFormat.decimalPattern();

  static String formatCurrency(double amount, {String? currencySymbol}) {
    if (currencySymbol != null) {
      return '$currencySymbol ${_numberFormat.format(amount)}';
    }
    return _currencyFormat.format(amount);
  }

  static String formatVolume(double volume, {bool metric = true}) {
    if (metric) {
      return '${_numberFormat.format(volume)} m³';
    }
    return '${_numberFormat.format(volume * 35.3147)} cft';
  }

  static String formatArea(double area, {bool metric = true}) {
    if (metric) {
      return '${_numberFormat.format(area)} m²';
    }
    return '${_numberFormat.format(area * 10.7639)} sq ft';
  }

  static String formatWeight(double weight, {bool metric = true}) {
    if (metric) {
      if (weight >= 1000) {
        return '${_numberFormat.format(weight / 1000)} tonnes';
      }
      return '${_numberFormat.format(weight)} kg';
    }
    return '${_numberFormat.format(weight * 2.20462)} lbs';
  }

  static String formatCount(num count) {
    return _numberFormat.format(count);
  }

  static String formatDate(DateTime date) {
    return DateFormat('dd MMM yyyy').format(date);
  }

  static String formatDateTime(DateTime date) {
    return DateFormat('dd MMM yyyy, hh:mm a').format(date);
  }
}
