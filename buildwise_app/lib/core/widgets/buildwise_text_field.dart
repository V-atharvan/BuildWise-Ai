import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';
import '../constants/app_dimensions.dart';

/// BuildWise AI — Premium Text Field
///
/// Features: floating label, prefix/suffix icons, validation,
/// character counter, helper text, password toggle
class BuildWiseTextField extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? helperText;
  final String? errorText;
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final bool readOnly;
  final bool enabled;
  final int? maxLines;
  final int? maxLength;
  final IconData? prefixIcon;
  final Widget? suffix;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String)? onSubmitted;
  final VoidCallback? onTap;
  final List<TextInputFormatter>? inputFormatters;
  final bool showPasswordToggle;
  final String? initialValue;

  const BuildWiseTextField({
    super.key,
    this.label,
    this.hint,
    this.helperText,
    this.errorText,
    this.controller,
    this.focusNode,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.readOnly = false,
    this.enabled = true,
    this.maxLines = 1,
    this.maxLength,
    this.prefixIcon,
    this.suffix,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.inputFormatters,
    this.showPasswordToggle = false,
    this.initialValue,
  });

  @override
  State<BuildWiseTextField> createState() => _BuildWiseTextFieldState();
}

class _BuildWiseTextFieldState extends State<BuildWiseTextField> {
  bool _obscureText = true;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextFormField(
          controller: widget.controller,
          focusNode: widget.focusNode,
          initialValue: widget.initialValue,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          obscureText: widget.showPasswordToggle ? _obscureText : widget.obscureText,
          readOnly: widget.readOnly,
          enabled: widget.enabled,
          maxLines: widget.obscureText || widget.showPasswordToggle ? 1 : widget.maxLines,
          maxLength: widget.maxLength,
          validator: widget.validator,
          onChanged: widget.onChanged,
          onFieldSubmitted: widget.onSubmitted,
          onTap: widget.onTap,
          inputFormatters: widget.inputFormatters,
          style: AppTypography.bodyLarge.copyWith(
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
          ),
          cursorColor: AppColors.primary,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint,
            errorText: widget.errorText,
            helperText: widget.helperText,
            counterText: '',
            prefixIcon: widget.prefixIcon != null
                ? Icon(
                    widget.prefixIcon,
                    size: AppDimensions.iconMd,
                    color: isDark
                        ? AppColors.darkTextTertiary
                        : AppColors.lightTextTertiary,
                  )
                : null,
            suffixIcon: widget.showPasswordToggle
                ? IconButton(
                    icon: Icon(
                      _obscureText
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: AppDimensions.iconMd,
                      color: isDark
                          ? AppColors.darkTextTertiary
                          : AppColors.lightTextTertiary,
                    ),
                    onPressed: () {
                      setState(() => _obscureText = !_obscureText);
                      HapticFeedback.selectionClick();
                    },
                  )
                : widget.suffix != null
                    ? Padding(
                        padding: const EdgeInsets.only(
                          right: AppDimensions.space12,
                        ),
                        child: widget.suffix,
                      )
                    : null,
          ),
        ),
      ],
    );
  }
}

/// Numeric input specifically for construction values
class BuildWiseNumericField extends StatelessWidget {
  final String label;
  final String? hint;
  final String? unit;
  final TextEditingController? controller;
  final double? min;
  final double? max;
  final void Function(String)? onChanged;
  final String? Function(String?)? validator;

  const BuildWiseNumericField({
    super.key,
    required this.label,
    this.hint,
    this.unit,
    this.controller,
    this.min,
    this.max,
    this.onChanged,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return BuildWiseTextField(
      label: label,
      hint: hint,
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
      ],
      onChanged: onChanged,
      validator: validator ??
          (value) {
            if (value == null || value.isEmpty) return null;
            final num = double.tryParse(value);
            if (num == null) return 'Invalid number';
            if (min != null && num < min!) return 'Minimum value is $min';
            if (max != null && num > max!) return 'Maximum value is $max';
            return null;
          },
      suffix: unit != null
          ? Text(
              unit!,
              style: AppTypography.labelMedium.copyWith(
                color: AppColors.gray500,
              ),
            )
          : null,
    );
  }
}
