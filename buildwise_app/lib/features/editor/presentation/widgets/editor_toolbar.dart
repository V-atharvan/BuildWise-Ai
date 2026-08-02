import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/editor_notifier.dart';

class EditorToolbar extends ConsumerWidget {
  const EditorToolbar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(editorProvider);
    final notifier = ref.read(editorProvider.notifier);

    Widget buildToolButton({
      required String tool,
      required IconData icon,
      required String tooltip,
    }) {
      final isActive = state.activeTool == tool;
      return Tooltip(
        message: tooltip,
        child: Material(
          color: isActive ? const Color(0xFF3B82F6) : Colors.transparent,
          borderRadius: BorderRadius.circular(8.0),
          child: InkWell(
            borderRadius: BorderRadius.circular(8.0),
            onTap: () => notifier.setTool(tool),
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Icon(
                icon,
                color: isActive ? Colors.white : const Color(0xFF94A3B8),
                size: 20.0,
              ),
            ),
          ),
        ),
      );
    }

    Widget buildActionButton({
      required IconData icon,
      required String tooltip,
      required VoidCallback? onPressed,
    }) {
      return Tooltip(
        message: tooltip,
        child: IconButton(
          icon: Icon(icon, size: 20.0),
          color: onPressed != null ? const Color(0xFF94A3B8) : const Color(0xFF475569),
          onPressed: onPressed,
          splashRadius: 20.0,
        ),
      );
    }

    return Positioned(
      top: 16.0,
      left: 16.0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B).withOpacity(0.92),
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: const Color(0xFF334155)),
          boxShadow: const [
            BoxShadow(
              color: Colors.black38,
              blurRadius: 10,
              offset: Offset(0, 4),
            )
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            buildToolButton(tool: 'select', icon: Icons.near_me, tooltip: 'Select (V)'),
            buildToolButton(tool: 'room', icon: Icons.crop_square, tooltip: 'Draw Room (R)'),
            buildToolButton(tool: 'wall', icon: Icons.horizontal_rule, tooltip: 'Draw Wall (W)'),
            buildToolButton(tool: 'door', icon: Icons.sensor_door, tooltip: 'Add Door (D)'),
            buildToolButton(tool: 'window', icon: Icons.window, tooltip: 'Add Window (N)'),
            buildToolButton(tool: 'column', icon: Icons.view_column, tooltip: 'Add Column (C)'),
            const SizedBox(width: 4),
            Container(height: 24, width: 1, color: const Color(0xFF334155)),
            const SizedBox(width: 4),
            buildActionButton(
              icon: Icons.undo,
              tooltip: 'Undo (Ctrl+Z)',
              onPressed: state.undoStack.isNotEmpty ? () => notifier.undo() : null,
            ),
            buildActionButton(
              icon: Icons.redo,
              tooltip: 'Redo (Ctrl+Y)',
              onPressed: state.redoStack.isNotEmpty ? () => notifier.redo() : null,
            ),
            const SizedBox(width: 4),
            Container(height: 24, width: 1, color: const Color(0xFF334155)),
            const SizedBox(width: 4),
            buildActionButton(
              icon: Icons.zoom_in,
              tooltip: 'Zoom In',
              onPressed: () => notifier.updateViewport((state.zoom * 1.2).clamp(0.2, 5.0), state.panOffset),
            ),
            buildActionButton(
              icon: Icons.zoom_out,
              tooltip: 'Zoom Out',
              onPressed: () => notifier.updateViewport((state.zoom / 1.2).clamp(0.2, 5.0), state.panOffset),
            ),
            buildActionButton(
              icon: Icons.center_focus_strong,
              tooltip: 'Reset View',
              onPressed: () => notifier.resetView(),
            ),
            const SizedBox(width: 4),
            Container(height: 24, width: 1, color: const Color(0xFF334155)),
            const SizedBox(width: 4),
            Tooltip(
              message: 'Auto Align Topology',
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 8.0),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                ),
                icon: const Icon(Icons.auto_fix_high, size: 16),
                label: const Text('Auto Align'),
                onPressed: () => notifier.runAutoAlign(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
