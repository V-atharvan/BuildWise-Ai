import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<OnboardingItem> _slides = [
    const OnboardingItem(
      title: AppStrings.onboardingTitle1,
      description: AppStrings.onboardingDesc1,
      icon: Icons.upload_file_rounded,
    ),
    const OnboardingItem(
      title: AppStrings.onboardingTitle2,
      description: AppStrings.onboardingDesc2,
      icon: Icons.auto_awesome_rounded,
    ),
    const OnboardingItem(
      title: AppStrings.onboardingTitle3,
      description: AppStrings.onboardingDesc3,
      icon: Icons.analytics_rounded,
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.pagePaddingHorizontal,
            vertical: AppDimensions.pagePaddingVertical,
          ),
          child: Column(
            children: [
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: () => context.go('/login'),
                  child: Text(
                    AppStrings.skip,
                    style: AppTypography.buttonMedium.copyWith(
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: (int page) {
                    setState(() {
                      _currentPage = page;
                    });
                  },
                  itemCount: _slides.length,
                  itemBuilder: (context, index) {
                    final slide = _slides[index];
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(32),
                            border: Border.all(
                              color: AppColors.primary.withOpacity(0.2),
                              width: 1.5,
                            ),
                          ),
                          child: Icon(
                            slide.icon,
                            size: 64,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 48),
                        Text(
                          slide.title,
                          style: AppTypography.headlineLarge.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            slide.description,
                            style: AppTypography.bodyLarge.copyWith(
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _slides.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: AppDimensions.animFast),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentPage == index
                          ? AppColors.primary
                          : (isDark ? AppColors.darkDivider : AppColors.lightDivider),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 40),
              BuildWiseButton.primary(
                label: _currentPage == _slides.length - 1
                    ? AppStrings.getStarted
                    : AppStrings.next,
                onPressed: () {
                  if (_currentPage < _slides.length - 1) {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: AppDimensions.animNormal),
                      curve: Curves.easeInOut,
                    );
                  } else {
                    context.go('/login');
                  }
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class OnboardingItem {
  final String title;
  final String description;
  final IconData icon;

  const OnboardingItem({
    required this.title,
    required this.description,
    required this.icon,
  });
}
