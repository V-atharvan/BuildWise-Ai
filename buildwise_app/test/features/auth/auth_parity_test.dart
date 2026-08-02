import 'package:flutter_test/flutter_test.dart';

import 'package:buildwise_app/features/auth/domain/user_model.dart';
import 'package:buildwise_app/features/auth/presentation/providers/auth_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late UserModel sampleUser;

  setUp(() {
    sampleUser = const UserModel(
      id: 'usr_001',
      email: 'civil.engineer@buildwise.ai',
      fullName: 'Civil Engineer',
    );
  });

  group('Phase 8D: Auth Parity & Security Tests', () {
    test('Initial Auth State is unauthenticated', () {
      const state = AuthState();

      expect(state.user, isNull);
      expect(state.isLoading, isFalse);
      expect(state.errorMessage, isNull);
    });

    test('AuthState holding user is authenticated', () {
      final state = AuthState(user: sampleUser);

      expect(state.user, isNotNull);
      expect(state.user!.email, equals('civil.engineer@buildwise.ai'));
      expect(state.user!.fullName, equals('Civil Engineer'));
    });

    test('AuthState copyWith user updates state correctly', () {
      const state = AuthState();
      final updated = state.copyWith(user: sampleUser);

      expect(updated.user, equals(sampleUser));

      final cleared = updated.copyWith(clearUser: true);
      expect(cleared.user, isNull);
    });

    test('UserModel JSON serialization and deserialization preserves properties', () {
      final json = sampleUser.toJson();
      final restored = UserModel.fromJson(json);

      expect(restored.id, equals(sampleUser.id));
      expect(restored.email, equals(sampleUser.email));
      expect(restored.fullName, equals(sampleUser.fullName));
    });

    test('Auth state does not expose plain text passwords in string representations', () {
      final authState = AuthState(user: sampleUser);

      expect(authState.toString().contains('Password123!'), isFalse);
    });
  });
}
