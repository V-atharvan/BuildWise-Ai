import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../domain/user_model.dart';
import '../providers/auth_notifier.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _phoneController = TextEditingController();
  final List<TextEditingController> _otpControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _codeSent = false;
  bool _isLoading = false;
  int _countdown = 30;
  Timer? _timer;

  @override
  void dispose() {
    _phoneController.dispose();
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _countdown = 30;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 0) {
        setState(() => _countdown--);
      } else {
        _timer?.cancel();
      }
    });
  }

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone.length < 10) {
      BuildWiseSnackBar.showWarning(context, 'Please enter a valid phone number');
      return;
    }

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2)); // Mock send
    setState(() {
      _isLoading = false;
      _codeSent = true;
    });
    _startTimer();
    if (mounted) {
      BuildWiseSnackBar.showSuccess(context, 'OTP code sent successfully');
    }
  }

  Future<void> _verifyOtp() async {
    final code = _otpControllers.map((c) => c.text).join();
    if (code.length < 6) {
      BuildWiseSnackBar.showWarning(context, 'Please enter the 6-digit OTP code');
      return;
    }

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2)); // Mock verification
    setState(() => _isLoading = false);

    if (mounted) {
      BuildWiseSnackBar.showSuccess(context, 'Verification successful');
      ref.read(appAuthNotifierProvider.notifier).setUser(
            UserModel(
              id: 'phone-uid-mock-456',
              email: 'phone.user@buildwise.com',
              fullName: 'Phone User',
              phoneNumber: _phoneController.text.trim(),
            ),
          );
      context.go('/');
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
                child: Icon(
                  _codeSent ? Icons.sms_outlined : Icons.phone_android_rounded,
                  size: 40,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                _codeSent ? AppStrings.verifyOtp : AppStrings.continueWithPhone,
                style: AppTypography.displaySmall.copyWith(
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  letterSpacing: -1.0,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _codeSent
                    ? 'Enter the 6-digit verification code sent to ${_phoneController.text}'
                    : 'Enter your phone number to receive a secure login OTP code.',
                style: AppTypography.bodyLarge.copyWith(
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 32),
              if (!_codeSent) ...[
                BuildWiseTextField(
                  label: AppStrings.phone,
                  hint: '+1 555-0199',
                  controller: _phoneController,
                  prefixIcon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  enabled: !_isLoading,
                ),
                const SizedBox(height: 32),
                BuildWiseButton.primary(
                  label: 'Send Verification Code',
                  isLoading: _isLoading,
                  onPressed: _sendCode,
                ),
              ] else ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(6, (index) {
                    return SizedBox(
                      width: 48,
                      height: 56,
                      child: TextFormField(
                        controller: _otpControllers[index],
                        focusNode: _focusNodes[index],
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        style: AppTypography.titleLarge,
                        maxLength: 1,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        decoration: InputDecoration(
                          counterText: '',
                          contentPadding: EdgeInsets.zero,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.primary, width: 2),
                          ),
                        ),
                        onChanged: (value) {
                          if (value.isNotEmpty && index < 5) {
                            _focusNodes[index + 1].requestFocus();
                          }
                          if (value.isEmpty && index > 0) {
                            _focusNodes[index - 1].requestFocus();
                          }
                        },
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 32),
                BuildWiseButton.primary(
                  label: 'Verify & Login',
                  isLoading: _isLoading,
                  onPressed: _verifyOtp,
                ),
                const SizedBox(height: 24),
                Center(
                  child: _countdown > 0
                      ? Text(
                          'Resend code in ${_countdown}s',
                          style: AppTypography.bodyMedium.copyWith(
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        )
                      : TextButton(
                          onPressed: _sendCode,
                          child: Text(
                            AppStrings.resendOtp,
                            style: AppTypography.buttonMedium.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
