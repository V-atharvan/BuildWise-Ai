import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/providers/theme_provider.dart';
import '../../../auth/presentation/providers/auth_notifier.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _useMetric = true;
  String _currency = 'INR (₹)';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authState = ref.watch(appAuthNotifierProvider);
    final user = authState.user;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'My Profile',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User summary header card
              BuildWiseCard(
                hasBorder: true,
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.primary.withOpacity(0.12),
                      child: const Icon(Icons.person_rounded, size: 36, color: AppColors.primary),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'Engineer Profile',
                            style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user?.email ?? 'engineer@buildwise.com',
                            style: AppTypography.bodyMedium.copyWith(color: AppColors.gray500),
                          ),
                          if (user?.companyName != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              user!.companyName!,
                              style: AppTypography.bodySmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Application Settings',
                style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              BuildWiseCard(
                hasBorder: true,
                child: Column(
                  children: [
                    // Theme toggles
                    ListTile(
                      leading: const Icon(Icons.palette_outlined, color: AppColors.primary),
                      title: const Text('Dark Theme'),
                      trailing: Switch(
                        value: isDark,
                        onChanged: (val) {
                          ref.read(themeModeProvider.notifier).setThemeMode(
                                val ? ThemeMode.dark : ThemeMode.light,
                              );
                        },
                      ),
                    ),
                    const Divider(),
                    // Units
                    ListTile(
                      leading: const Icon(Icons.straighten_rounded, color: AppColors.primary),
                      title: const Text('Measurement Units'),
                      trailing: DropdownButton<String>(
                        value: _useMetric ? 'Metric (m, kg)' : 'Imperial (ft, lbs)',
                        items: ['Metric (m, kg)', 'Imperial (ft, lbs)'].map((u) {
                          return DropdownMenuItem(value: u, child: Text(u));
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _useMetric = val == 'Metric (m, kg)';
                          });
                          BuildWiseSnackBar.showSuccess(context, 'Measurement units updated');
                        },
                      ),
                    ),
                    const Divider(),
                    // Currency
                    ListTile(
                      leading: const Icon(Icons.payments_outlined, color: AppColors.primary),
                      title: const Text('Preferred Currency'),
                      trailing: DropdownButton<String>(
                        value: _currency,
                        items: ['INR (₹)', 'USD (\$)', 'EUR (€)'].map((c) {
                          return DropdownMenuItem(value: c, child: Text(c));
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _currency = val!;
                          });
                          BuildWiseSnackBar.showSuccess(context, 'Currency preferences saved');
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              BuildWiseButton.secondary(
                label: 'Log Out',
                icon: Icons.logout_rounded,
                onPressed: () {
                  ref.read(appAuthNotifierProvider.notifier).logout();
                  BuildWiseSnackBar.showSuccess(context, 'Logged out successfully');
                  context.go('/login');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
