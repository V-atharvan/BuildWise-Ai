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

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(appAuthNotifierProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (mounted) {
      if (success) {
        BuildWiseSnackBar.showSuccess(context, 'Successfully logged in');
        context.go('/');
      } else {
        final err = ref.read(appAuthNotifierProvider).errorMessage ?? 'Invalid credentials';
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(AppDimensions.space16),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.architecture_rounded,
                        size: 40,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: Text(
                      'Welcome Back',
                      style: AppTypography.displaySmall.copyWith(
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        letterSpacing: -1.0,
                      ),
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
                    enabled: !authState.isLoading,
                  ),
                  const SizedBox(height: 16),
                  BuildWiseTextField(
                    label: AppStrings.password,
                    hint: '••••••••',
                    controller: _passwordController,
                    prefixIcon: Icons.lock_outline_rounded,
                    showPasswordToggle: true,
                    validator: Validators.validatePassword,
                    enabled: !authState.isLoading,
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => context.push('/forgot-password'),
                      child: Text(
                        AppStrings.forgotPassword,
                        style: AppTypography.buttonSmall.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  BuildWiseButton.primary(
                    label: AppStrings.login,
                    isLoading: authState.isLoading,
                    onPressed: _handleLogin,
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: Divider(
                          color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'OR',
                          style: AppTypography.caption.copyWith(
                            color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Divider(
                          color: isDark ? AppColors.darkDivider : AppColors.lightDivider,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  BuildWiseButton.outline(
                    label: AppStrings.continueWithGoogle,
                    icon: Icons.g_mobiledata_rounded,
                    onPressed: () {
                      // Trigger firebase verification directly or use mock success
                      ref.read(appAuthNotifierProvider.notifier).setUser(
                            const UserModel(
                              id: 'google-uid-mock-123',
                              email: 'google.user@buildwise.com',
                              fullName: 'Google User',
                            ),
                          );
                      context.go('/');
                    },
                  ),
                  const SizedBox(height: 12),
                  BuildWiseButton.outline(
                    label: AppStrings.continueWithPhone,
                    icon: Icons.phone_android_rounded,
                    onPressed: () => context.push('/otp'),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        AppStrings.dontHaveAccount,
                        style: AppTypography.bodyMedium.copyWith(
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.push('/register'),
                        child: Text(
                          AppStrings.signUp,
                          style: AppTypography.buttonMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
