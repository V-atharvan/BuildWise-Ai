import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_card.dart';
import 'structural_inputs_screen.dart';

class RealBuildingTypeScreen extends StatefulWidget {
  final Map<String, dynamic> confirmedData;

  const RealBuildingTypeScreen({super.key, required this.confirmedData});

  @override
  State<RealBuildingTypeScreen> createState() => _RealBuildingTypeScreenState();
}

class _RealBuildingTypeScreenState extends State<RealBuildingTypeScreen> {
  final List<Map<String, dynamic>> _types = [
    {'name': 'House', 'icon': Icons.home_rounded, 'desc': 'Single family residential home'},
    {'name': 'Villa', 'icon': Icons.villa_rounded, 'desc': 'Luxury multi-floor residence'},
    {'name': 'Apartment', 'icon': Icons.apartment_rounded, 'desc': 'Multi-family residential complex'},
    {'name': 'Commercial', 'icon': Icons.business_rounded, 'desc': 'Offices, retail spaces, malls'},
    {'name': 'Industrial', 'icon': Icons.factory_rounded, 'desc': 'Factories, processing facilities'},
    {'name': 'Warehouse', 'icon': Icons.warehouse_rounded, 'desc': 'Storage and logistics depots'},
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'Select Building Type',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: GridView.builder(
          padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: AppDimensions.space16,
            mainAxisSpacing: AppDimensions.space16,
            childAspectRatio: 0.9,
          ),
          itemCount: _types.length,
          itemBuilder: (context, index) {
            final t = _types[index];
            return BuildWiseCard(
              hasBorder: true,
              onTap: () {
                final updatedData = Map<String, dynamic>.from(widget.confirmedData);
                updatedData['building_type'] = t['name'];
                
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => StructuralInputsScreen(confirmedData: updatedData),
                  ),
                );
              },
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      t['icon'] as IconData,
                      color: AppColors.primary,
                      size: AppDimensions.iconXxl,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t['name'] as String,
                    style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    t['desc'] as String,
                    style: AppTypography.caption.copyWith(color: AppColors.gray500),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
class StructuralInputsScreen extends StatelessWidget {
  final Map<String, dynamic> confirmedData;
  const StructuralInputsScreen({super.key, required this.confirmedData});
  @override
  Widget build(BuildContext context) {
    return RealStructuralInputsScreen(confirmedData: confirmedData);
  }
}
