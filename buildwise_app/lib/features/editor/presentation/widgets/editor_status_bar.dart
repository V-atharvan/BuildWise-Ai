import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../analysis/domain/validation_engine.dart';
import '../providers/editor_notifier.dart';

class EditorStatusBar extends ConsumerWidget {
  const EditorStatusBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(editorProvider);

    final validationReport = state.validation ?? validateSevenLayers(state.plan, state.estimation);

    final mouseX = state.hoverPoint != null ? state.hoverPoint![0].toStringAsFixed(2) : '0.00';
    final mouseY = state.hoverPoint != null ? state.hoverPoint![1].toStringAsFixed(2) : '0.00';
    final zoomPct = (state.zoom * 100).round();

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          border: Border(top: BorderSide(color: Color(0xFF1E293B))),
        ),
        child: Row(
          children: [
            Text(
              'Scale: 1:100',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12.0),
            ),
            const SizedBox(width: 16),
            Text(
              'Zoom: $zoomPct%',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12.0),
            ),
            const SizedBox(width: 16),
            Text(
              'X: ${mouseX}m  Y: ${mouseY}m',
              style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12.0, fontFamily: 'monospace'),
            ),
            const SizedBox(width: 24),
            if (state.selectedId != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4.0),
                  border: Border.all(color: const Color(0xFF3B82F6)),
                ),
                child: Text(
                  'Selected: ${state.selectedType ?? "Element"} (${state.selectedId})',
                  style: const TextStyle(color: Color(0xFF93C5FD), fontSize: 12.0, fontWeight: FontWeight.bold),
                ),
              ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
              decoration: BoxDecoration(
                color: validationReport.isExportReady
                    ? const Color(0xFF10B981).withOpacity(0.2)
                    : const Color(0xFFEF4444).withOpacity(0.2),
                borderRadius: BorderRadius.circular(6.0),
                border: Border.all(
                  color: validationReport.isExportReady ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    validationReport.isExportReady ? Icons.check_circle : Icons.warning,
                    color: validationReport.isExportReady ? const Color(0xFF34D399) : const Color(0xFFA855F7),
                    size: 14.0,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Health: ${validationReport.overallHealthScore}% (${validationReport.isExportReady ? "Export Ready" : "Issues Found"})',
                    style: TextStyle(
                      color: validationReport.isExportReady ? const Color(0xFF6EE7B7) : const Color(0xFFFCA5A5),
                      fontSize: 12.0,
                      fontWeight: FontWeight.bold,
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
}
