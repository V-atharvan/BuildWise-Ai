import 'package:dio/dio';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../domain/user_model.dart';

class AuthRemoteSource {
  final ApiClient _client;

  AuthRemoteSource(this._client);

  Future<Map<String, dynamic>> login(String email, String password) async {
    final formData = FormData.fromMap({
      'username': email,
      'password': password,
    });
    final response = await _client.post(
      ApiEndpoints.login,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return response.data as Map<String, dynamic>;
  }

  Future<UserModel> register({
    required String email,
    required String password,
    required String fullName,
    String? phoneNumber,
    String? companyName,
  }) async {
    final response = await _client.post(
      ApiEndpoints.register,
      data: {
        'email': email,
        'password': password,
        'full_name': fullName,
        'phone_number': phoneNumber,
        'company_name': companyName,
      },
    );
    return UserModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> verifyFirebaseUser({
    required String uid,
    required String email,
    required String fullName,
    String? phoneNumber,
    String? companyName,
    String? profilePictureUrl,
  }) async {
    final response = await _client.post(
      ApiEndpoints.firebaseVerify,
      data: {
        'firebase_uid': uid,
        'email': email,
        'full_name': fullName,
        'phone_number': phoneNumber,
        'company_name': companyName,
        'profile_picture_url': profilePictureUrl,
      },
    );
    return response.data as Map<String, dynamic>;
  }
}
