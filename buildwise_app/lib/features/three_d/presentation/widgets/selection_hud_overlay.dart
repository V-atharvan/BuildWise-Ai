import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../providers/three_d_viewer_notifier.dart';

class SelectionHudOverlay extends ConsumerWidget {
  const SelectionHudOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(threeDViewerProvider);

    if (state.selectedObjectType == null) {
      return const SizedBox.shrink();
    }

    return Positioned(
      bottom: 24,
      left: 16,
      child: Container(
        width: 280,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF18181C).withOpacity(0.95),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary.withOpacity(0.4), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (state.selectedObjectType == 'wall' && state.selectedWallInfo != null) ...[
              _buildWallHud(context, state.selectedWallInfo!, ref),
            ] else if (state.selectedObjectType == 'room' && state.selectedRoomInfo != null) ...[
              _buildRoomHud(context, state.selectedRoomInfo!, ref),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildWallHud(BuildContext context, SelectedWallInfo wall, WidgetRef ref) {
    final isInternal = wall.thickness < 0.20;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  isInternal ? 'INTERNAL PARTITION (115mm)' : 'EXTERNAL PERIMETER (230mm)',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 16, color: Colors.white54),
              onPressed: () => ref.read(threeDViewerProvider.notifier).clearSelection(),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
        const SizedBox(height: 10),
        const Divider(color: Colors.white12, height: 1),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 2.2,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
          children: [
            _hudTile('Length', '${wall.length.toStringAsFixed(2)} m', Colors.white),
            _hudTile('Thickness', '${(wall.thickness * 1000).round()} mm', Colors.white),
            _hudTile('Net Volume', '${wall.netVolume.toStringAsFixed(2)} m³', const Color(0xFF34D399)),
            _hudTile('Masonry Bricks', '${wall.brickCount} nos', const Color(0xFFFBBF24)),
          ],
        ),
      ],
    );
  }

  Widget _buildRoomHud(BuildContext context, SelectedRoomInfo room, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.room_rounded, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  room.label.toUpperCase(),
                  style: AppTypography.labelMedium.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 16, color: Colors.white54),
              onPressed: () => ref.read(threeDViewerProvider.notifier).clearSelection(),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
        const SizedBox(height: 10),
        const Divider(color: Colors.white12, height: 1),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _hudTile('Carpet Area', '${room.areaM2.toStringAsFixed(1)} m²', const Color(0xFF34D399)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _hudTile('Perimeter', '${room.perimeterM.toStringAsFixed(1)} m', Colors.white),
            ),
          ],
        ),
      ],
    );
  }

  Widget _hudTile(String label, String value, Color valueColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: Colors.white54),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: valueColor),
          ),
        ],
      ),
    );
  }
}
