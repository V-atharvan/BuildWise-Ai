import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/utils/validators.dart';
import '../providers/auth_notifier.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _companyController = TextEditingController();
  bool _agreeToTerms = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _phoneController.dispose();
    _companyController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreeToTerms) {
      BuildWiseSnackBar.showWarning(context, 'You must agree to the terms');
      return;
    }

    final success = await ref.read(appAuthNotifierProvider.notifier).register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          fullName: _nameController.text.trim(),
          phoneNumber: _phoneController.text.isNotEmpty ? _phoneController.text.trim() : null,
          companyName: _companyController.text.isNotEmpty ? _companyController.text.trim() : null,
        );

    if (mounted) {
      if (success) {
        BuildWiseSnackBar.showSuccess(context, 'Account created! Please log in.');
        context.go('/login');
      } else {
        final err = ref.read(appAuthNotifierProvider).errorMessage ?? 'Registration failed';
        BuildWiseSnackBar.showError(context, err);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authState = ref.watch(appAuthNotifierProvider);

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
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppDimensions.pagePaddingHorizontal),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppStrings.register,
                  style: AppTypography.displaySmall.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Join BuildWise to start estimating materials with AI.',
                  style: AppTypography.bodyLarge.copyWith(
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                BuildWiseTextField(
                  label: AppStrings.fullName,
                  hint: 'John Doe',
                  controller: _nameController,
                  prefixIcon: Icons.person_outline_rounded,
                  validator: Validators.validateFullName,
                  enabled: !authState.isLoading,
                ),
                const SizedBox(height: 16),
                BuildWiseTextField(
                  label: AppStrings.email,
                  hint: 'name@company.com',
                  controller: _emailController,
                  prefixIcon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                  validator: Validators.validateEmail,
                  enabled: !authState.isLoading,
                ),
                const SizedBox(height: 16),
                BuildWiseTextField(
                  label: AppStrings.phone,
                  hint: '+1234567890',
                  controller: _phoneController,
                  prefixIcon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  enabled: !authState.isLoading,
                ),
                const SizedBox(height: 16),
                BuildWiseTextField(
                  label: 'Company Name',
                  hint: 'ACME Construction Corp',
                  controller: _companyController,
                  prefixIcon: Icons.business_outlined,
                  enabled: !authState.isLoading,
                ),
                const SizedBox(height: 16),
                BuildWiseTextField(
                  label: AppStrings.password,
                  hint: '••••••••',
                  controller: _passwordController,
                  prefixIcon: Icons.lock_outline_rounded,
                  obscureText: true,
                  validator: Validators.validatePassword,
                  enabled: !authState.isLoading,
                ),
                const SizedBox(height: 16),
                BuildWiseTextField(
                  label: AppStrings.confirmPassword,
                  hint: '••••••••',
                  controller: _confirmPasswordController,
                  prefixIcon: Icons.lock_reset_rounded,
                  obscureText: true,
                  validator: (val) => Validators.validateConfirmPassword(val, _passwordController.text),
                  enabled: !authState.isLoading,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Checkbox(
                      value: _agreeToTerms,
                      activeColor: AppColors.primary,
                      onChanged: (val) {
                        setState(() {
                          _agreeToTerms = val ?? false;
                        });
                      },
                    ),
                    Expanded(
                      child: Text(
                        AppStrings.agreeToTerms,
                        style: AppTypography.bodyMedium.copyWith(
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                BuildWiseButton.primary(
                  label: AppStrings.signUp,
                  isLoading: authState.isLoading,
                  onPressed: _handleRegister,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
