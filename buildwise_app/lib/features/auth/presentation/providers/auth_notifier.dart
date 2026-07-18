import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../data/auth_remote_source.dart';
import '../../data/auth_repository.dart';
import '../../domain/user_model.dart';

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


final authRemoteSourceProvider = Provider<AuthRemoteSource>((ref) {
  final client = ref.watch(apiClientProvider);
  return AuthRemoteSource(client);
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remote = ref.watch(authRemoteSourceProvider);
  return AuthRepository(remote);
});

// We override the previously defined notifier or use a custom extended one.
// Let's implement full capabilities inside AuthNotifier here
class AppAuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AppAuthNotifier(this._repository) : super(const AuthState()) {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    state = state.copyWith(isLoading: true);
    try {
      final cachedUser = await _repository.getCachedUser();
      if (cachedUser != null) {
        state = AuthState(user: cachedUser, isLoading: false);
      } else {
        state = const AuthState(isLoading: false);
      }
    } catch (e) {
      state = AuthState(errorMessage: e.toString(), isLoading: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final user = await _repository.login(email, password);
      state = AuthState(user: user, isLoading: false);
      return true;
    } catch (e) {
      state = AuthState(errorMessage: e.toString(), isLoading: false);
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    String? phoneNumber,
    String? companyName,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.register(
        email: email,
        password: password,
        fullName: fullName,
        phoneNumber: phoneNumber,
        companyName: companyName,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString(), isLoading: false);
      return false;
    }
  }

  void setUser(UserModel user) async {
    state = state.copyWith(user: user);
    await _repository.saveSession('mock-token-123', user);
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await _repository.clearSession();
    state = const AuthState();
  }
}

final appAuthNotifierProvider = StateNotifierProvider<AppAuthNotifier, AuthState>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return AppAuthNotifier(repo);
});
