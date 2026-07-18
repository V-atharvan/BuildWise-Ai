import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';

class BoqMaterialsScreen extends StatefulWidget {
  final String projectName;
  final double totalCost;

  const BoqMaterialsScreen({
    super.key,
    required this.projectName,
    required this.totalCost,
  });

  @override
  State<BoqMaterialsScreen> createState() => _BoqMaterialsScreenState();
}

class _BoqMaterialsScreenState extends State<BoqMaterialsScreen>
    with SingleTickerProviderStateMixin {
  int _selectedTab = 0;
  late TabController _tabController;

  final List<_MaterialItem> _materials = const [
    _MaterialItem(
      code: 'M01',
      name: 'Concrete',
      subtitle: 'Grade M25 Foundation Mix',
      quantityLabel: '42.5 m³',
      totalCost: 6375.00,
      unitRate: '\$150.00/m³',
      isHighValue: false,
      icon: Icons.water_drop_rounded,
      iconColor: Color(0xFF60A5FA),
    ),
    _MaterialItem(
      code: 'M02',
      name: 'Masonry (Bricks)',
      subtitle: 'Standard Clay Bricks 230x110x75',
      quantityLabel: '21,250 bricks',
      totalCost: 4250.00,
      unitRate: '\$0.20/brick',
      isHighValue: false,
      icon: Icons.view_module_rounded,
      iconColor: Color(0xFFF97316),
    ),
    _MaterialItem(
      code: 'M03',
      name: 'Mortar',
      subtitle: '1:4 Cement Sand Ratio',
      quantityLabel: '6.2 m³',
      totalCost: 1240.00,
      unitRate: '\$200.00/m³',
      isHighValue: false,
      icon: Icons.science_rounded,
      iconColor: Color(0xFF34D399),
    ),
    _MaterialItem(
      code: 'M04',
      name: 'Steel Rebar',
      subtitle: 'High-Tensile TMT Bars (12mm)',
      quantityLabel: '3,400 kg',
      totalCost: 5100.00,
      unitRate: '\$1.50/kg',
      isHighValue: true,
      icon: Icons.linear_scale_rounded,
      iconColor: AppColors.secondary,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _selectedTab = _tabController.index);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFF09090B);
    const primary = AppColors.primary;
    const textPrimary = Color(0xFFE5E1E4);
    const textSecondary = Color(0xFFCCC3D8);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          // Background glow
          Positioned(
            top: -120,
            left: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [primary.withOpacity(0.07), Colors.transparent],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // ── Top App Bar ──
                _buildTopBar(textPrimary, primary),

                // ── Hero Cost Header ──
                _buildCostHero(primary, textPrimary, textSecondary),

                // ── Tab Switcher ──
                _buildTabBar(primary, textSecondary),

                // ── Content ──
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildBoqTable(primary, textPrimary, textSecondary),
                      _buildCalculationsBreakdown(primary, textPrimary, textSecondary),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Fixed Action Footer ──
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildActionFooter(primary, bg),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(Color textPrimary, Color primary) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0x0DFFFFFF))),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.architecture_rounded, color: AppColors.primary, size: 18),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'BuildWise AI',
            style: AppTypography.titleMedium.copyWith(
              color: primary,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const Spacer(),
          Icon(Icons.dark_mode_rounded, color: textPrimary.withOpacity(0.4), size: 22),
          const SizedBox(width: 12),
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF2A2A2C),
            child: Icon(Icons.person_rounded, size: 18, color: textPrimary.withOpacity(0.7)),
          ),
        ],
      ),
    );
  }

  Widget _buildCostHero(Color primary, Color textPrimary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0x08FFFFFF))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CURRENT PROJECT',
            style: AppTypography.labelSmall.copyWith(
              color: primary,
              letterSpacing: 2.0,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            widget.projectName,
            style: AppTypography.headlineSmall.copyWith(
              color: textPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1B1D),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Column(
              children: [
                Text(
                  'Grand Total Estimated Cost',
                  style: AppTypography.labelSmall.copyWith(
                    color: textSecondary,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '\$${widget.totalCost.toStringAsFixed(2)}',
                  style: AppTypography.numericLarge.copyWith(
                    color: primary,
                    letterSpacing: -1.5,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.trending_down_rounded, color: Color(0xFF34D399), size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '-4.2% optimized',
                        style: AppTypography.labelSmall.copyWith(
                          color: const Color(0xFF34D399),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar(Color primary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: const Color(0xFF2A2A2C),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(child: _buildTab(0, 'BOQ TABLE', primary, textSecondary)),
            Expanded(child: _buildTab(1, 'CALCULATIONS', primary, textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(int index, String label, Color primary, Color textSecondary) {
    final isSelected = _selectedTab == index;
    return GestureDetector(
      onTap: () {
        _tabController.animateTo(index);
        setState(() => _selectedTab = index);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: AppTypography.labelSmall.copyWith(
            color: isSelected ? Colors.white : textSecondary,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }

  Widget _buildBoqTable(Color primary, Color textPrimary, Color textSecondary) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
      itemCount: _materials.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = _materials[index];
        return _buildMaterialCard(item, primary, textPrimary, textSecondary);
      },
    );
  }

  Widget _buildMaterialCard(
    _MaterialItem item,
    Color primary,
    Color textPrimary,
    Color textSecondary,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF111115),
        borderRadius: BorderRadius.circular(16),
        border: Border(
          left: BorderSide(
            color: item.isHighValue ? primary.withOpacity(0.5) : Colors.transparent,
            width: 3,
          ),
          top: BorderSide(color: Colors.white.withOpacity(0.07)),
          right: BorderSide(color: Colors.white.withOpacity(0.07)),
          bottom: BorderSide(color: Colors.white.withOpacity(0.07)),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {},
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: item.iconColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(item.icon, color: item.iconColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.name,
                            style: AppTypography.titleSmall.copyWith(
                              color: textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            item.subtitle,
                            style: AppTypography.labelSmall.copyWith(color: textSecondary),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item.code,
                        style: AppTypography.labelSmall.copyWith(
                          color: primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'QUANTITY',
                            style: AppTypography.labelSmall.copyWith(
                              color: textSecondary,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            item.quantityLabel,
                            style: AppTypography.bodyLarge.copyWith(
                              color: textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'TOTAL COST',
                          style: AppTypography.labelSmall.copyWith(
                            color: textSecondary,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '\$${item.totalCost.toStringAsFixed(2)}',
                          style: AppTypography.numericSmall.copyWith(
                            color: primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Divider(color: Colors.white.withOpacity(0.05), height: 1),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Unit Rate: ${item.unitRate}',
                      style: AppTypography.labelSmall.copyWith(color: textSecondary),
                    ),
                    if (item.isHighValue)
                      Row(
                        children: [
                          Text(
                            'High Value Item',
                            style: AppTypography.labelSmall.copyWith(color: primary),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.priority_high_rounded, color: primary, size: 14),
                        ],
                      )
                    else
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFFCCC3D8), size: 18),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCalculationsBreakdown(
      Color primary, Color textPrimary, Color textSecondary) {
    final calcs = [
      ('Wet-to-Dry Expansion', 'Concrete', '1.54×', 'Standard multiplier'),
      ('Mix Ratio', 'M25 Concrete', '1:1:2', 'Cement:Sand:Aggregate'),
      ('Brick Density', 'Masonry', '500 bricks/m³', 'Standard clay brick'),
      ('Mortar Expansion', 'Mortar Volume', '1.33×', 'Wet-to-dry mortar factor'),
      ('Rebar Index', 'Structural Steel', '80 kg/m³', 'Per m³ of concrete'),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
      children: calcs.map((c) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF111115),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.07)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c.$1, style: AppTypography.labelSmall.copyWith(color: textSecondary, letterSpacing: 0.5)),
                    const SizedBox(height: 2),
                    Text(c.$2, style: AppTypography.bodyMedium.copyWith(color: textPrimary, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(c.$4, style: AppTypography.labelSmall.copyWith(color: textSecondary.withOpacity(0.6))),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: primary.withOpacity(0.15)),
                ),
                child: Text(
                  c.$3,
                  style: AppTypography.labelMedium.copyWith(
                    color: primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActionFooter(Color primary, Color bg) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, bg.withOpacity(0.97), bg],
          stops: const [0, 0.3, 1],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Primary CTA
          GestureDetector(
            onTap: () {},
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                color: primary,
                borderRadius: BorderRadius.circular(99),
                boxShadow: [
                  BoxShadow(
                    color: primary.withOpacity(0.35),
                    blurRadius: 25,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Text(
                    'Share BOQ with Contractor',
                    style: AppTypography.titleSmall.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Secondary CTA
          GestureDetector(
            onTap: () {},
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.picture_as_pdf_rounded, color: Colors.white.withOpacity(0.7), size: 20),
                  const SizedBox(width: 10),
                  Text(
                    'Export PDF',
                    style: AppTypography.titleSmall.copyWith(
                      color: Colors.white.withOpacity(0.7),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MaterialItem {
  final String code;
  final String name;
  final String subtitle;
  final String quantityLabel;
  final double totalCost;
  final String unitRate;
  final bool isHighValue;
  final IconData icon;
  final Color iconColor;

  const _MaterialItem({
    required this.code,
    required this.name,
    required this.subtitle,
    required this.quantityLabel,
    required this.totalCost,
    required this.unitRate,
    required this.isHighValue,
    required this.icon,
    required this.iconColor,
  });
}
