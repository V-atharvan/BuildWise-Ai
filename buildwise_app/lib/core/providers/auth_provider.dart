import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../features/auth/domain/user_model.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
  });

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? errorMessage,
    bool clearUser = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  void setUser(UserModel user) {
    state = state.copyWith(user: user);
  }

  void logout() {
    state = state.copyWith(clearUser: true);
  }
}
