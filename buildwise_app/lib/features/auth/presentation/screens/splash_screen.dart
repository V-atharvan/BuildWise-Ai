import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../providers/auth_notifier.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _controller.forward();
    _checkRedirect();
  }

  Future<void> _checkRedirect() async {
    // Wait for the animation and a short delay
    await Future.delayed(const Duration(milliseconds: 2000));
    if (!mounted) return;

    final authState = ref.read(appAuthNotifierProvider);
    if (authState.user != null) {
      context.go('/');
    } else {
      context.go('/onboarding');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Opacity(
              opacity: _opacityAnimation.value,
              child: Transform.scale(
                scale: _scaleAnimation.value,
                child: child,
              ),
            );
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppColors.primary.withOpacity(0.3),
                    width: 2,
                  ),
                ),
                child: const Icon(
                  Icons.architecture_rounded,
                  size: 48,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'BuildWise AI',
                style: AppTypography.displaySmall.copyWith(
                  fontWeight: FontWeight.w800,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  letterSpacing: -1.0,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'AI-Powered Materials Engine',
                style: AppTypography.bodyMedium.copyWith(
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
