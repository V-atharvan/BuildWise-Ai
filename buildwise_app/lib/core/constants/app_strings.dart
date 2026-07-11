/// BuildWise AI — String Constants
///
/// All user-facing strings in one place for easy localization.
class AppStrings {
  AppStrings._();

  // ─── App ────────────────────────────────────────────────
  static const String appName = 'BuildWise AI';
  static const String appTagline = 'AI-Powered Construction Estimation';
  static const String appVersion = '1.0.0';

  // ─── Auth ───────────────────────────────────────────────
  static const String login = 'Log In';
  static const String register = 'Create Account';
  static const String email = 'Email';
  static const String password = 'Password';
  static const String confirmPassword = 'Confirm Password';
  static const String fullName = 'Full Name';
  static const String phone = 'Phone Number';
  static const String forgotPassword = 'Forgot Password?';
  static const String resetPassword = 'Reset Password';
  static const String sendResetLink = 'Send Reset Link';
  static const String verifyOtp = 'Verify OTP';
  static const String resendOtp = 'Resend OTP';
  static const String continueWithGoogle = 'Continue with Google';
  static const String continueWithPhone = 'Continue with Phone';
  static const String dontHaveAccount = "Don't have an account? ";
  static const String alreadyHaveAccount = 'Already have an account? ';
  static const String signUp = 'Sign Up';
  static const String logout = 'Log Out';
  static const String agreeToTerms = 'I agree to the Terms of Service and Privacy Policy';

  // ─── Onboarding ─────────────────────────────────────────
  static const String onboardingTitle1 = 'Upload Your Plans';
  static const String onboardingDesc1 = 'Simply upload your building drawings in PDF, DWG, DXF, or image format.';
  static const String onboardingTitle2 = 'AI Analyzes Everything';
  static const String onboardingDesc2 = 'Our AI detects walls, rooms, dimensions, doors, windows, and more.';
  static const String onboardingTitle3 = 'Get Precise Estimates';
  static const String onboardingDesc3 = 'Receive detailed material quantities, cost breakdowns, and professional reports.';
  static const String skip = 'Skip';
  static const String next = 'Next';
  static const String getStarted = 'Get Started';

  // ─── Dashboard ──────────────────────────────────────────
  static const String home = 'Home';
  static const String projects = 'Projects';
  static const String estimate = 'Estimate';
  static const String aiAssistant = 'AI';
  static const String profile = 'Profile';
  static const String goodMorning = 'Good Morning';
  static const String goodAfternoon = 'Good Afternoon';
  static const String goodEvening = 'Good Evening';
  static const String recentProjects = 'Recent Projects';
  static const String quickActions = 'Quick Actions';
  static const String newEstimate = 'New Estimate';
  static const String uploadPlan = 'Upload Plan';
  static const String viewReports = 'View Reports';
  static const String seeAll = 'See All';

  // ─── Upload ─────────────────────────────────────────────
  static const String uploadTitle = 'Upload Building Plan';
  static const String uploadSubtitle = 'PDF, DWG, DXF, PNG, or JPEG';
  static const String dragDropHere = 'Drag & drop your file here';
  static const String orBrowseFiles = 'or browse files';
  static const String takePhoto = 'Take Photo';
  static const String cropRotate = 'Crop & Rotate';
  static const String uploading = 'Uploading...';

  // ─── Analysis ───────────────────────────────────────────
  static const String analyzing = 'Analyzing Your Plan';
  static const String detectingWalls = 'Detecting walls...';
  static const String detectingRooms = 'Detecting rooms...';
  static const String readingDimensions = 'Reading dimensions...';
  static const String detectingElements = 'Detecting structural elements...';
  static const String analysisComplete = 'Analysis Complete';
  static const String proceedToInputs = 'Proceed to Inputs';

  // ─── Building Types ─────────────────────────────────────
  static const String selectBuildingType = 'Select Building Type';
  static const String house = 'House';
  static const String villa = 'Villa';
  static const String apartment = 'Apartment';
  static const String commercial = 'Commercial';
  static const String industrial = 'Industrial';
  static const String hospital = 'Hospital';
  static const String school = 'School';
  static const String mall = 'Mall';
  static const String hotel = 'Hotel';
  static const String warehouse = 'Warehouse';

  // ─── Inputs ─────────────────────────────────────────────
  static const String structuralInputs = 'Structural Details';
  static const String finishingInputs = 'Finishing Details';
  static const String reviewInputs = 'Review Details';
  static const String generateEstimation = 'Generate Estimation';
  static const String numberOfFloors = 'Number of Floors';
  static const String wallThickness = 'Wall Thickness (mm)';
  static const String floorHeight = 'Floor Height (m)';
  static const String concreteGrade = 'Concrete Grade';
  static const String steelGrade = 'Steel Grade';
  static const String foundationType = 'Foundation Type';
  static const String roofType = 'Roof Type';

  // ─── Estimation ─────────────────────────────────────────
  static const String materialEstimation = 'Material Estimation';
  static const String costEstimation = 'Cost Estimation';
  static const String concrete = 'Concrete';
  static const String steel = 'Steel';
  static const String bricks = 'Bricks';
  static const String cement = 'Cement';
  static const String sand = 'Sand';
  static const String aggregate = 'Aggregate';
  static const String plaster = 'Plaster';
  static const String paint = 'Paint';
  static const String tiles = 'Tiles';
  static const String waterproofing = 'Waterproofing';
  static const String electrical = 'Electrical';
  static const String plumbing = 'Plumbing';

  // ─── Reports ────────────────────────────────────────────
  static const String generateReport = 'Generate Report';
  static const String downloadPdf = 'Download PDF';
  static const String shareReport = 'Share Report';
  static const String printReport = 'Print Report';
  static const String boq = 'Bill of Quantities';

  // ─── Settings ───────────────────────────────────────────
  static const String settings = 'Settings';
  static const String darkMode = 'Dark Mode';
  static const String lightMode = 'Light Mode';
  static const String systemTheme = 'System';
  static const String metric = 'Metric';
  static const String imperial = 'Imperial';
  static const String currency = 'Currency';
  static const String notifications = 'Notifications';
  static const String privacy = 'Privacy Policy';
  static const String terms = 'Terms of Service';
  static const String about = 'About';

  // ─── Errors ─────────────────────────────────────────────
  static const String errorGeneral = 'Something went wrong. Please try again.';
  static const String errorNetwork = 'No internet connection.';
  static const String errorServer = 'Server error. Please try again later.';
  static const String errorAuth = 'Authentication failed.';
  static const String errorUpload = 'Upload failed. Please try again.';
  static const String errorRequired = 'This field is required';
  static const String errorInvalidEmail = 'Please enter a valid email';
  static const String errorPasswordLength = 'Password must be at least 8 characters';
  static const String errorPasswordMatch = 'Passwords do not match';

  // ─── Empty States ───────────────────────────────────────
  static const String noProjects = 'No projects yet';
  static const String noProjectsDesc = 'Create your first project to get started';
  static const String noEstimates = 'No estimates yet';
  static const String noNotifications = 'No notifications';

  // ─── Actions ────────────────────────────────────────────
  static const String save = 'Save';
  static const String cancel = 'Cancel';
  static const String delete = 'Delete';
  static const String edit = 'Edit';
  static const String duplicate = 'Duplicate';
  static const String archive = 'Archive';
  static const String favorite = 'Favorite';
  static const String search = 'Search';
  static const String filter = 'Filter';
  static const String sort = 'Sort';
  static const String retry = 'Retry';
  static const String confirm = 'Confirm';
}
