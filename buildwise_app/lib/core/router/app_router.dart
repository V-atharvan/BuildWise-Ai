import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

// Screens
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/onboarding_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/otp_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/projects/presentation/screens/projects_screen.dart';
import '../../features/upload/presentation/screens/upload_screen.dart';
import '../../features/ai_assistant/presentation/screens/ai_chat_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/analysis/presentation/screens/cv_analysis_screen.dart';
import '../../features/estimation/presentation/screens/boq_materials_screen.dart';
import '../widgets/buildwise_bottom_nav.dart';

// Key for navigation
final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

final appRouterProvider = Provider<GoRouter>((ref) {
  // We can watch auth state here for redirect logic if needed
  
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    routes: [
      // Splash
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      // Onboarding
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      // Auth routes
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/otp',
        builder: (context, state) => const OtpScreen(),
      ),

      // Analysis (full-screen, no bottom nav)
      GoRoute(
        path: '/cv-analysis/:planId',
        builder: (context, state) {
          final planId = state.pathParameters['planId'] ?? '';
          return CvAnalysisScreen(planId: planId);
        },
      ),

      // BOQ Materials (full-screen, no bottom nav)
      GoRoute(
        path: '/boq',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return BoqMaterialsScreen(
            projectName: extra['projectName'] as String? ?? 'Project',
            totalCost: (extra['totalCost'] as num?)?.toDouble() ?? 0.0,
          );
        },
      ),


      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return _ScaffoldWithNavBar(child: child);
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/projects',
            builder: (context, state) => const ProjectsScreen(),
          ),
          GoRoute(
            path: '/estimate',
            builder: (context, state) => const UploadScreen(),
          ),
          GoRoute(
            path: '/ai',
            builder: (context, state) => const AiChatScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});

class _ScaffoldWithNavBar extends StatelessWidget {
  final Widget child;

  const _ScaffoldWithNavBar({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BuildWiseBottomNav(
        currentIndex: _calculateSelectedIndex(context),
        onTap: (index) => _onItemTapped(index, context),
      ),
    );
  }

  static int _calculateSelectedIndex(BuildContext context) {
    final String location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/projects')) {
      return 1;
    }
    if (location.startsWith('/estimate')) {
      return 2;
    }
    if (location.startsWith('/ai')) {
      return 3;
    }
    if (location.startsWith('/profile')) {
      return 4;
    }
    return 0; // Home / Dashboard
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/');
        break;
      case 1:
        context.go('/projects');
        break;
      case 2:
        context.go('/estimate');
        break;
      case 3:
        context.go('/ai');
        break;
      case 4:
        context.go('/profile');
        break;
    }
  }
}
