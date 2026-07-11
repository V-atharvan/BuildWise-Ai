import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../domain/building_params.dart';
import 'review_inputs_screen.dart';

class RealStructuralInputsScreen extends StatefulWidget {
  final Map<String, dynamic> confirmedData;

  const RealStructuralInputsScreen({super.key, required this.confirmedData});

  @override
  State<RealStructuralInputsScreen> createState() => _RealStructuralInputsScreenState();
}

class _RealStructuralInputsScreenState extends State<RealStructuralInputsScreen> {
  int _currentStep = 0;
  
  // Controllers & Form variables
  final _floorsController = TextEditingController(text: '1');
  final _heightController = TextEditingController(text: '3.0');
  final _slabThicknessController = TextEditingController(text: '125');
  final _wallThicknessController = TextEditingController(text: '230');
  final _wasteController = TextEditingController(text: '5.0');
  
  String _concreteGrade = 'M20';
  String _steelGrade = 'Fe500';
  String _foundationType = 'Isolated Footing';
  String _brickType = 'Red Clay Bricks';
  String _location = 'Mumbai';

  @override
  void dispose() {
    _floorsController.dispose();
    _heightController.dispose();
    _slabThicknessController.dispose();
    _wallThicknessController.dispose();
    _wasteController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < 2) {
      setState(() => _currentStep++);
    } else {
      // Package into BuildingParams
      final params = BuildingParams(
        buildingType: widget.confirmedData['building_type'] ?? 'House',
        floors: int.tryParse(_floorsController.text) ?? 1,
        wallThicknessMm: double.tryParse(_wallThicknessController.text) ?? 230.0,
        floorHeightM: double.tryParse(_heightController.text) ?? 3.0,
        concreteGrade: _concreteGrade,
        steelGrade: _steelGrade,
        foundationType: _foundationType,
        slabThicknessMm: double.tryParse(_slabThicknessController.text) ?? 125.0,
        brickType: _brickType,
        wastePercentage: double.tryParse(_wasteController.text) ?? 5.0,
        location: _location,
        wallLengthM: widget.confirmedData['wall_length_m'] ?? 45.0,
        roomCount: widget.confirmedData['room_count'] ?? 4,
        doorCount: widget.confirmedData['door_count'] ?? 5,
        windowCount: widget.confirmedData['window_count'] ?? 6,
      );

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ReviewInputsScreen(params: params, projectId: widget.confirmedData['project_id']),
        ),
      );
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'Structural Specifications',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Custom linear progress indicators
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppDimensions.pagePaddingHorizontal, vertical: 16),
              child: Row(
                children: List.generate(3, (index) {
                  return Expanded(
                    child: Container(
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: index <= _currentStep
                            ? AppColors.primary
                            : (isDark ? AppColors.darkDivider : AppColors.lightDivider),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  );
                }),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
                child: BuildWiseCard(
                  hasBorder: true,
                  child: _buildStepContent(),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
              child: Row(
                children: [
                  Expanded(
                    child: BuildWiseButton.secondary(
                      label: 'Back',
                      onPressed: _prevStep,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: BuildWiseButton.primary(
                      label: _currentStep == 2 ? 'Review' : 'Continue',
                      onPressed: _nextStep,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    if (_currentStep == 0) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Step 1: Frame & Foundation', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          BuildWiseTextField(
            label: 'Number of Floors',
            controller: _floorsController,
            prefixIcon: Icons.layers_outlined,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 16),
          BuildWiseTextField(
            label: 'Floor Height (meters)',
            controller: _heightController,
            prefixIcon: Icons.height_rounded,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _foundationType,
            decoration: const InputDecoration(labelText: 'Foundation Type'),
            items: ['Isolated Footing', 'Raft Foundation', 'Pile Foundation', 'Strip Footing'].map((f) {
              return DropdownMenuItem(value: f, child: Text(f));
            }).toList(),
            onChanged: (val) => setState(() => _foundationType = val!),
          ),
        ],
      );
    } else if (_currentStep == 1) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Step 2: Concrete & Reinforcement', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          DropdownButtonFormField<String>(
            value: _concreteGrade,
            decoration: const InputDecoration(labelText: 'Concrete Grade'),
            items: ['M15', 'M20', 'M25', 'M30'].map((g) {
              return DropdownMenuItem(value: g, child: Text(g));
            }).toList(),
            onChanged: (val) => setState(() => _concreteGrade = val!),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _steelGrade,
            decoration: const InputDecoration(labelText: 'Steel Grade'),
            items: ['Fe415', 'Fe500', 'Fe550D'].map((g) {
              return DropdownMenuItem(value: g, child: Text(g));
            }).toList(),
            onChanged: (val) => setState(() => _steelGrade = val!),
          ),
          const SizedBox(height: 16),
          BuildWiseTextField(
            label: 'Slab Thickness (mm)',
            controller: _slabThicknessController,
            prefixIcon: Icons.grid_goldenratio_rounded,
            keyboardType: TextInputType.number,
          ),
        ],
      );
    } else {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Step 3: Masonry & Finishes', style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          BuildWiseTextField(
            label: 'Wall Thickness (mm)',
            controller: _wallThicknessController,
            prefixIcon: Icons.line_weight_rounded,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _brickType,
            decoration: const InputDecoration(labelText: 'Brick/Block Type'),
            items: ['Red Clay Bricks', 'Fly Ash Bricks', 'AAC Blocks', 'Hollow Concrete Blocks'].map((b) {
              return DropdownMenuItem(value: b, child: Text(b));
            }).toList(),
            onChanged: (val) => setState(() => _brickType = val!),
          ),
          const SizedBox(height: 16),
          BuildWiseTextField(
            label: 'Wastage Margin (%)',
            controller: _wasteController,
            prefixIcon: Icons.delete_outline_rounded,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
        ],
      );
    }
  }
}
class ReviewInputsScreen extends StatelessWidget {
  final BuildingParams params;
  final String projectId;
  const ReviewInputsScreen({super.key, required this.params, required this.projectId});
  @override
  Widget build(BuildContext context) {
    return RealReviewInputsScreen(params: params, projectId: projectId);
  }
}
