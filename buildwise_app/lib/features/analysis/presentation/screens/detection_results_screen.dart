import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../../upload/domain/plan_model.dart';
import '../../../inputs/presentation/screens/building_type_screen.dart';

class DetectionResultsScreen extends ConsumerStatefulWidget {
  final PlanModel plan;

  const DetectionResultsScreen({super.key, required this.plan});

  @override
  ConsumerState<DetectionResultsScreen> createState() => _DetectionResultsScreenState();
}

class _DetectionResultsScreenState extends ConsumerState<DetectionResultsScreen> {
  late TextEditingController _wallLengthController;
  late TextEditingController _roomCountController;
  late TextEditingController _doorCountController;
  late TextEditingController _windowCountController;
  late TextEditingController _scaleController;

  @override
  void initState() {
    super.initState();
    final data = widget.plan.detectedData ?? {};
    
    _wallLengthController = TextEditingController(text: (data['wall_length_m'] ?? 45.0).toString());
    _roomCountController = TextEditingController(text: (data['room_count'] ?? 4).toString());
    _doorCountController = TextEditingController(text: (data['door_count'] ?? 5).toString());
    _windowCountController = TextEditingController(text: (data['window_count'] ?? 6).toString());
    _scaleController = TextEditingController(text: (data['scale_factor_m_per_px'] ?? 0.02).toString());
  }

  @override
  void dispose() {
    _wallLengthController.dispose();
    _roomCountController.dispose();
    _doorCountController.dispose();
    _windowCountController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  void _proceedToInputs() {
    // Collect approved/confirmed AI values to pass downstream to parameters wizard
    final Map<String, dynamic> confirmedData = {
      'wall_length_m': double.tryParse(_wallLengthController.text) ?? 45.0,
      'room_count': int.tryParse(_roomCountController.text) ?? 4,
      'door_count': int.tryParse(_doorCountController.text) ?? 5,
      'window_count': int.tryParse(_windowCountController.text) ?? 6,
      'scale_factor': double.tryParse(_scaleController.text) ?? 0.02,
      'project_id': widget.plan.projectId,
    };

    // Navigate to structural inputs collection wizard starting with Building Type selection
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BuildingTypeScreen(confirmedData: confirmedData),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'Confirm AI Detections',
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
                'AI parsed the plan drawing. Review, calibrate, and adjust structural counts if necessary.',
                style: AppTypography.bodyLarge.copyWith(color: AppColors.gray500),
              ),
              const SizedBox(height: 28),
              BuildWiseCard(
                hasBorder: true,
                child: Column(
                  children: [
                    BuildWiseTextField(
                      label: 'Walls Length (meters)',
                      controller: _wallLengthController,
                      prefixIcon: Icons.straighten_rounded,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),
                    BuildWiseTextField(
                      label: 'Rooms Count',
                      controller: _roomCountController,
                      prefixIcon: Icons.meeting_room_outlined,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),
                    BuildWiseTextField(
                      label: 'Doors Count',
                      controller: _doorCountController,
                      prefixIcon: Icons.door_front_door_outlined,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),
                    BuildWiseTextField(
                      label: 'Windows Count',
                      controller: _windowCountController,
                      prefixIcon: Icons.window_outlined,
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 16),
                    BuildWiseTextField(
                      label: 'Drawing Scale Factor (m/px)',
                      controller: _scaleController,
                      prefixIcon: Icons.rule_rounded,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              BuildWiseButton.primary(
                label: 'Confirm & Collect Parameters',
                onPressed: _proceedToInputs,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
class BuildingTypeScreen extends StatelessWidget {
  final Map<String, dynamic> confirmedData;
  const BuildingTypeScreen({super.key, required this.confirmedData});
  @override
  Widget build(BuildContext context) {
    return RealBuildingTypeScreen(confirmedData: confirmedData);
  }
}
