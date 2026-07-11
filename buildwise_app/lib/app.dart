import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/providers/theme_provider.dart';

class BuildWiseApp extends ConsumerWidget {
  const BuildWiseApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'BuildWise AI',
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      routerConfig: router,
      builder: (context, child) {
        // Apply global text scaling limits for accessibility
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.of(context).textScaler.scale(1.0).clamp(0.8, 1.3),
            ),
          ),
          child: child!,
        );
      },
    );
  }
}
