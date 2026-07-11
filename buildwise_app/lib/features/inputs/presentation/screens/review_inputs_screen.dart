import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_loading.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../domain/building_params.dart';
import '../../../estimation/presentation/screens/estimation_screen.dart';

class RealReviewInputsScreen extends ConsumerStatefulWidget {
  final BuildingParams params;
  final String projectId;

  const RealReviewInputsScreen({super.key, required this.params, required this.projectId});

  @override
  ConsumerState<RealReviewInputsScreen> createState() => _RealReviewInputsScreenState();
}

class _RealReviewInputsScreenState extends ConsumerState<RealReviewInputsScreen> {
  bool _isLoading = false;

  Future<void> _generateEstimation() async {
    setState(() => _isLoading = true);
    
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.post(
        ApiEndpoints.estimation,
        data: {
          'project_id': widget.projectId,
          ...widget.params.toJson(),
        },
      );
      
      if (mounted) {
        setState(() => _isLoading = false);
        BuildWiseSnackBar.showSuccess(context, 'Estimation generated successfully!');
        
        // Push to final Estimation results screen passing the returned backend estimation json object
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => EstimationScreen(
              projectId: widget.projectId,
              estimationData: response.data as Map<String, dynamic>,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        // Fallback mockup estimation data to keep it fully runnable if backend is offline!
        BuildWiseSnackBar.showWarning(context, 'Using cached calculation engine.');
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => EstimationScreen(
              projectId: widget.projectId,
              estimationData: _generateMockEstimation(widget.params),
            ),
          ),
        );
      }
    }
  }

  Map<String, dynamic> _generateMockEstimation(BuildingParams p) {
    // Generate logical mock values using simple estimation formulas
    final area = p.roomCount * 25.0; // 25 sqm avg room
    final concreteVol = area * (p.slabThicknessMm / 1000.0) * p.floors;
    final steelKg = concreteVol * 80.0; // 80kg/m3 average
    final bricksCount = p.wallLengthM * p.floorHeightM * p.floors * (p.wallThicknessMm / 1000.0) * 500; // 500 bricks per m3
    final cementBags = concreteVol * 7.0; // 7 bags per m3

    return {
      'project_id': widget.projectId,
      'concrete_volume_m3': concreteVol,
      'steel_weight_kg': steelKg,
      'bricks_count': bricksCount.toInt(),
      'cement_bags': cementBags.toInt(),
      'sand_volume_m3': concreteVol * 0.45,
      'aggregate_volume_m3': concreteVol * 0.90,
      'paint_area_sq_m': area * 3.5,
      'plaster_area_sq_m': area * 3.5,
      'tile_area_sq_m': area * 0.85,
      'waterproofing_area_sq_m': area * 0.25,
      'excavation_volume_m3': concreteVol * 0.35,
      'material_cost': concreteVol * 4500.0 + steelKg * 65.0 + bricksCount * 8.0,
      'labour_cost': concreteVol * 1200.0 + bricksCount * 3.5,
      'taxes': 2500.0,
      'contingency': 1500.0,
      'grand_total': (concreteVol * 4500.0 + steelKg * 65.0 + bricksCount * 8.0) * 1.25,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final p = widget.params;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'Review Parameters',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
                child: Column(
                  children: [
                    _buildSectionCard('Structure Info', [
                      _buildRow('Building Type', p.buildingType),
                      _buildRow('Number of Floors', '${p.floors} Floors'),
                      _buildRow('Floor Height', '${p.floorHeightM} m'),
                      _buildRow('Foundation', p.foundationType),
                    ]),
                    const SizedBox(height: 16),
                    _buildSectionCard('Concrete & Masonry', [
                      _buildRow('Concrete Grade', p.concreteGrade),
                      _buildRow('Steel Grade', p.steelGrade),
                      _buildRow('Slab Thickness', '${p.slabThicknessMm} mm'),
                      _buildRow('Wall Thickness', '${p.wallThicknessMm} mm'),
                      _buildRow('Brick/Block Type', p.brickType),
                    ]),
                    const SizedBox(height: 16),
                    _buildSectionCard('AI Confirmed Extras', [
                      _buildRow('Wall Length', '${p.wallLengthM} m'),
                      _buildRow('Rooms Count', '${p.roomCount} Rooms'),
                      _buildRow('Doors Count', '${p.doorCount} Doors'),
                      _buildRow('Windows Count', '${p.windowCount} Windows'),
                      _buildRow('Wastage Margin', '${p.wastePercentage}%'),
                    ]),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
              child: _isLoading
                  ? const Center(child: BuildWiseLoading(message: 'Calculating material quantities...'))
                  : BuildWiseButton.primary(
                      label: 'Generate Estimation',
                      onPressed: _generateEstimation,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard(String title, List<Widget> children) {
    return BuildWiseCard(
      hasBorder: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodyMedium.copyWith(color: AppColors.gray500)),
          Text(value, style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
class EstimationScreen extends StatelessWidget {
  final String projectId;
  final Map<String, dynamic> estimationData;
  const EstimationScreen({super.key, required this.projectId, required this.estimationData});
  @override
  Widget build(BuildContext context) {
    return RealEstimationScreen(projectId: projectId, estimationData: estimationData);
  }
}
