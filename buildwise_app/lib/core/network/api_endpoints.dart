/// BuildWise AI — API Endpoints
class ApiEndpoints {
  ApiEndpoints._();

  static const String baseUrl = 'http://10.0.2.2:8000/api/v1'; // Localhost emulator gateway
  // If deploying or running on real device, replace with host ip or domain:
  // static const String baseUrl = 'https://buildwise-api.railway.app/api/v1';

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String firebaseVerify = '/auth/firebase-verify';
  static const String forgotPassword = '/auth/forgot-password';
  static const String otpVerify = '/auth/verify-otp';
  static const String refreshToken = '/auth/refresh';

  // Projects
  static const String projects = '/projects';
  static String projectDetail(String id) => '/projects/$id';
  static String duplicateProject(String id) => '/projects/$id/duplicate';
  static String archiveProject(String id) => '/projects/$id/archive';

  // Plans & Upload
  static const String uploadPlan = '/upload/plan';
  static String planDetail(String id) => '/plans/$id';

  // AI & Analysis
  static String analyzePlan(String planId) => '/ai/analyze/$planId';
  static String analysisStatus(String taskId) => '/ai/status/$taskId';

  // Estimation
  static const String estimation = '/estimation';
  static String estimationDetail(String projectId) => '/estimation/$projectId';

  // Cost
  static String costDetail(String projectId) => '/cost/$projectId';

  // Reports
  static const String reports = '/reports';
  static String downloadReport(String reportId) => '/reports/$reportId/download';

  // Profile & Settings
  static const String profile = '/users/profile';
  static const String updateProfile = '/users/profile';
  static const String settings = '/users/settings';
}
