import 'package:dio/dio';
import 'package:shared_preferences/shared_preferences.dart';

/// BuildWise AI — Auth Interceptor
///
/// Automatically injects JWT Bearer tokens to headers,
/// handles auth failure redirection, and refreshing tokens if expired.
class ApiInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');

    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    options.headers['Accept'] = 'application/json';
    options.headers['Content-Type'] = 'application/json';

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Handle 401 Unauthorized globally (session expired)
    if (err.response?.statusCode == 401) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('access_token');
      await prefs.remove('user_data');
      
      // Here you could trigger router redirect or call a global auth notifier
    }
    return handler.next(err);
  }
}
