import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_remote_source.dart';
import '../domain/user_model.dart';

class AuthRepository {
  final AuthRemoteSource _remoteSource;

  AuthRepository(this._remoteSource);

  Future<UserModel> login(String email, String password) async {
    final data = await _remoteSource.login(email, password);
    final token = data['access_token'] as String;
    final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
    
    await _saveSession(token, user);
    return user;
  }

  Future<UserModel> register({
    required String email,
    required String password,
    required String fullName,
    String? phoneNumber,
    String? companyName,
  }) async {
    return await _remoteSource.register(
      email: email,
      password: password,
      fullName: fullName,
      phoneNumber: phoneNumber,
      companyName: companyName,
    );
  }

  Future<UserModel> verifyFirebaseUser({
    required String uid,
    required String email,
    required String fullName,
    String? phoneNumber,
    String? companyName,
    String? profilePictureUrl,
  }) async {
    final data = await _remoteSource.verifyFirebaseUser(
      uid: uid,
      email: email,
      fullName: fullName,
      phoneNumber: phoneNumber,
      companyName: companyName,
      profilePictureUrl: profilePictureUrl,
    );
    final token = data['access_token'] as String;
    final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
    
    await _saveSession(token, user);
    return user;
  }

  Future<void> _saveSession(String token, UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', token);
    await prefs.setString('user_data', jsonEncode(user.toJson()));
  }

  Future<UserModel?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('user_data');
    if (data != null) {
      return UserModel.fromJson(jsonDecode(data) as Map<String, dynamic>);
    }
    return null;
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('user_data');
  }
}
