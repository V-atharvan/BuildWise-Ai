import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/utils/validators.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleReset() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2)); // Mock delay
    setState(() => _isLoading = false);

    if (mounted) {
      BuildWiseSnackBar.showSuccess(
        context,
        'A password reset link has been sent to ${_emailController.text}',
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            size: 20,
          ),
          onPressed: () => context.pop(),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppDimensions.pagePaddingHorizontal),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(AppDimensions.space16),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_reset_rounded,
                    size: 40,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  AppStrings.forgotPassword,
                  style: AppTypography.displaySmall.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Enter your email address and we will send you a link to reset your password.',
                  style: AppTypography.bodyLarge.copyWith(
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                BuildWiseTextField(
                  label: AppStrings.email,
                  hint: 'name@company.com',
                  controller: _emailController,
                  prefixIcon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                  validator: Validators.validateEmail,
                  enabled: !_isLoading,
                ),
                const SizedBox(height: 32),
                BuildWiseButton.primary(
                  label: AppStrings.sendResetLink,
                  isLoading: _isLoading,
                  onPressed: _handleReset,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
