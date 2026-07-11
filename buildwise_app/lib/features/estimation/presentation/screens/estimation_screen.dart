import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_button.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_snackbar.dart';
import '../../../../core/utils/formatters.dart';
import '../../../report/presentation/screens/report_preview_screen.dart';

class RealEstimationScreen extends ConsumerStatefulWidget {
  final String projectId;
  final Map<String, dynamic> estimationData;

  const RealEstimationScreen({
    super.key,
    required this.projectId,
    required this.estimationData,
  });

  @override
  ConsumerState<RealEstimationScreen> createState() => _RealEstimationScreenState();
}

class _RealEstimationScreenState extends ConsumerState<RealEstimationScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final data = widget.estimationData;
    final mats = data['materials'] ?? data;
    final costs = data['costs'] ?? data;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          'Estimation Summary',
          style: AppTypography.headlineMedium.copyWith(fontWeight: FontWeight.bold),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Materials'),
            Tab(text: 'Costs'),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildMaterialsTab(mats),
                  _buildCostsTab(costs),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
              child: BuildWiseButton.primary(
                label: 'Generate PDF Report',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ReportPreviewScreen(
                        projectId: widget.projectId,
                        estimationData: widget.estimationData,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMaterialsTab(Map<String, dynamic> mats) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final List<Map<String, dynamic>> items = [
      {'name': 'Concrete Volume', 'value': AppFormatters.formatVolume(mats['concrete_volume_m3'] ?? 0.0), 'icon': Icons.layers_rounded},
      {'name': 'Steel Reinforcement', 'value': AppFormatters.formatWeight(mats['steel_weight_kg'] ?? 0.0), 'icon': Icons.grid_goldenratio_rounded},
      {'name': 'Bricks Count', 'value': AppFormatters.formatCount(mats['bricks_count'] ?? 0), 'icon': Icons.dashboard_outlined},
      {'name': 'Cement Bags', 'value': '${AppFormatters.formatCount(mats['cement_bags'] ?? 0)} Bags', 'icon': Icons.business_center_outlined},
      {'name': 'Sand Volume', 'value': AppFormatters.formatVolume(mats['sand_volume_m3'] ?? 0.0), 'icon': Icons.grain_rounded},
      {'name': 'Aggregate Volume', 'value': AppFormatters.formatVolume(mats['aggregate_volume_m3'] ?? 0.0), 'icon': Icons.filter_hdr_rounded},
      {'name': 'Plaster Area', 'value': AppFormatters.formatArea(mats['plaster_area_sq_m'] ?? 0.0), 'icon': Icons.format_paint_rounded},
      {'name': 'Paint Area', 'value': AppFormatters.formatArea(mats['paint_area_sq_m'] ?? 0.0), 'icon': Icons.color_lens_outlined},
      {'name': 'Flooring Tiles', 'value': AppFormatters.formatArea(mats['tile_area_sq_m'] ?? 0.0), 'icon': Icons.grid_view_rounded},
      {'name': 'Waterproofing Area', 'value': AppFormatters.formatArea(mats['waterproofing_area_sq_m'] ?? 0.0), 'icon': Icons.water_drop_outlined},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppDimensions.space12),
          child: BuildWiseCard(
            hasBorder: true,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item['icon'] as IconData, color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['name'] as String, style: AppTypography.bodyMedium.copyWith(color: AppColors.gray500)),
                      const SizedBox(height: 4),
                      Text(
                        item['value'] as String,
                        style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCostsTab(Map<String, dynamic> costs) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final grandTotal = costs['grand_total'] ?? 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BuildWiseCard(
            backgroundColor: AppColors.primary.withOpacity(0.08),
            borderColor: AppColors.primary.withOpacity(0.3),
            hasBorder: true,
            child: Center(
              child: Column(
                children: [
                  Text('Estimated Grand Total', style: AppTypography.bodyLarge.copyWith(color: AppColors.primary)),
                  const SizedBox(height: 8),
                  Text(
                    AppFormatters.formatCurrency(grandTotal),
                    style: AppTypography.displayMedium.copyWith(fontWeight: FontWeight.w800, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Cost Breakdown',
            style: AppTypography.titleLarge.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          BuildWiseCard(
            hasBorder: true,
            child: Column(
              children: [
                _buildCostRow('Material Cost', costs['material_cost'] ?? 0.0),
                _buildCostRow('Labour Cost', costs['labour_cost'] ?? 0.0),
                _buildCostRow('Equipment Cost', costs['equipment_cost'] ?? 0.0),
                _buildCostRow('Transportation Cost', costs['transportation_cost'] ?? 0.0),
                _buildCostRow('GST / Taxes', costs['taxes'] ?? 0.0),
                _buildCostRow('Contractor Margin', costs['profit_margin'] ?? 0.0),
                _buildCostRow('Contingency Buffer', costs['contingency'] ?? 0.0),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCostRow(String label, double val) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodyMedium.copyWith(color: AppColors.gray500)),
          Text(
            AppFormatters.formatCurrency(val),
            style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
class ReportPreviewScreen extends StatelessWidget {
  final String projectId;
  final Map<String, dynamic> estimationData;
  const ReportPreviewScreen({super.key, required this.projectId, required this.estimationData});
  @override
  Widget build(BuildContext context) {
    return RealReportPreviewScreen(projectId: projectId, estimationData: estimationData);
  }
}
