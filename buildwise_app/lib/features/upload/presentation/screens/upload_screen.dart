import 'dart:io';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../../projects/presentation/providers/projects_notifier.dart';
import '../providers/upload_notifier.dart';

class UploadScreen extends ConsumerStatefulWidget {
  const UploadScreen({super.key});

  @override
  ConsumerState<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends ConsumerState<UploadScreen> {
  File? _selectedFile;
  String? _selectedProjectId;

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'dwg', 'dxf'],
      );
      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFile = File(result.files.single.path!);
        });
      }
    } catch (e) {
      BuildWiseSnackBar.showError(context, 'Error picking file: $e');
    }
  }

  Future<void> _captureImage() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.camera);
      if (image != null) {
        setState(() {
          _selectedFile = File(image.path);
        });
      }
    } catch (e) {
      BuildWiseSnackBar.showError(context, 'Camera access failed: $e');
    }
  }

  Future<void> _handleUpload() async {
    if (_selectedFile == null) {
      BuildWiseSnackBar.showWarning(context, 'Please select a drawing file first.');
      return;
    }

    // Resolve or fallback to active project ID
    String targetProjectId = _selectedProjectId ?? '';
    if (targetProjectId.isEmpty) {
      final projectsState = ref.read(projectsNotifierProvider);
      if (projectsState.projects.isNotEmpty) {
        targetProjectId = projectsState.projects.first.id;
      } else {
        // Create an on-the-fly default mock project
        await ref.read(projectsNotifierProvider.notifier).createProject('Quick Estimate Project', 'House');
        final updatedState = ref.read(projectsNotifierProvider);
        targetProjectId = updatedState.projects.first.id;
      }
    }

    final plan = await ref.read(uploadNotifierProvider.notifier).uploadPlanFile(
          _selectedFile!,
          targetProjectId,
        );

    if (plan != null && mounted) {
      BuildWiseSnackBar.showSuccess(context, 'Drawing uploaded successfully');
      // Navigate to AI Analysis Screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => AnalysisScreen(planId: plan.id),
        ),
      );
    } else {
      final error = ref.read(uploadNotifierProvider).errorMessage ?? 'Upload failed';
      BuildWiseSnackBar.showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = ref.watch(uploadNotifierProvider);
    final projectsState = ref.watch(projectsNotifierProvider);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          AppStrings.uploadTitle,
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Select Project Context',
                style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              if (projectsState.projects.isNotEmpty)
                DropdownButtonFormField<String>(
                  value: _selectedProjectId ?? projectsState.projects.first.id,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    fillColor: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                  ),
                  items: projectsState.projects.map((p) {
                    return DropdownMenuItem<String>(
                      value: p.id,
                      child: Text(p.name),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => _selectedProjectId = val),
                )
              else
                Text(
                  'A new project context will be created automatically.',
                  style: AppTypography.bodyMedium.copyWith(color: AppColors.gray500),
                ),
              const SizedBox(height: 28),
              GestureDetector(
                onTap: _pickFile,
                child: Container(
                  width: double.infinity,
                  height: 200,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusCard),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.3),
                      style: BorderStyle.values[1], // Dashed representation in style
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.cloud_upload_outlined,
                        size: 48,
                        color: AppColors.primary,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _selectedFile != null
                            ? _selectedFile!.path.split('/').last
                            : AppStrings.dragDropHere,
                        style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        AppStrings.uploadSubtitle,
                        style: AppTypography.caption.copyWith(color: AppColors.gray500),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: BuildWiseButton.secondary(
                      label: 'Browse Files',
                      icon: Icons.folder_open_rounded,
                      onPressed: _pickFile,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: BuildWiseButton.secondary(
                      label: 'Scan Camera',
                      icon: Icons.camera_alt_outlined,
                      onPressed: _captureImage,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              if (state.isUploading)
                const Center(child: BuildWiseLoading(message: 'Uploading plan drawing...'))
              else
                BuildWiseButton.primary(
                  label: 'Proceed to Analysis',
                  onPressed: _handleUpload,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
class AnalysisScreen extends StatelessWidget {
  final String planId;
  const AnalysisScreen({super.key, required this.planId});
  @override
  Widget build(BuildContext context) {
    return _RealAnalysisScreen(planId: planId);
  }
}
