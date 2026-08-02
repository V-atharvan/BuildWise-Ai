import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/editor_notifier.dart';

class EditorPropertiesPanel extends ConsumerWidget {
  const EditorPropertiesPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(editorProvider);
    final notifier = ref.read(editorProvider.notifier);

    if (state.selectedId == null) {
      return const SizedBox.shrink();
    }

    final id = state.selectedId!;
    final type = state.selectedType ?? 'element';

    Widget buildHeader() {
      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.tune, color: Color(0xFF38BDF8), size: 18),
              const SizedBox(width: 8),
              Text(
                'Properties: ${type.toUpperCase()}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Color(0xFF94A3B8), size: 18),
            onPressed: () => notifier.selectElement(null, null),
            splashRadius: 16,
          ),
        ],
      );
    }

    Widget buildRoomInspector() {
      final room = state.plan.rooms.firstWhere((r) => r.id == id, orElse: () => state.plan.rooms.first);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Room Name', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          const SizedBox(height: 4),
          TextFormField(
            initialValue: room.label,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
            ),
            onFieldSubmitted: (val) {
              if (val.trim().isNotEmpty) {
                notifier.updateRoomLabel(room.id, val.trim());
              }
            },
          ),
          const SizedBox(height: 12),
          const Text('Room Type', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          const SizedBox(height: 4),
          DropdownButtonFormField<String>(
            value: room.roomType,
            dropdownColor: const Color(0xFF0F172A),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
            ),
            items: const [
              DropdownMenuItem(value: 'living_room', child: Text('Living Room')),
              DropdownMenuItem(value: 'master_bedroom', child: Text('Master Bedroom')),
              DropdownMenuItem(value: 'bedroom', child: Text('Bedroom')),
              DropdownMenuItem(value: 'kitchen', child: Text('Kitchen')),
              DropdownMenuItem(value: 'bathroom', child: Text('Bathroom')),
              DropdownMenuItem(value: 'dining_room', child: Text('Dining Room')),
              DropdownMenuItem(value: 'balcony', child: Text('Balcony')),
            ],
            onChanged: (val) {
              if (val != null) {
                notifier.updateRoomType(room.id, val);
              }
            },
          ),
          const SizedBox(height: 12),
          Text('Carpet Area: ${room.areaM2.toStringAsFixed(2)} m² (${room.areaSqft.toStringAsFixed(0)} sqft)',
              style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      );
    }

    Widget buildWallInspector() {
      final wall = state.plan.walls.firstWhere((w) => w.id == id, orElse: () => state.plan.walls.first);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Wall Thickness', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          const SizedBox(height: 4),
          DropdownButtonFormField<double>(
            value: wall.thicknessM > 0 ? wall.thicknessM : 0.23,
            dropdownColor: const Color(0xFF0F172A),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
            ),
            items: const [
              DropdownMenuItem(value: 0.23, child: Text('9" Outer Wall (230 mm)')),
              DropdownMenuItem(value: 0.115, child: Text('4.5" Partition (115 mm)')),
              DropdownMenuItem(value: 0.15, child: Text('6" AAC Block (150 mm)')),
            ],
            onChanged: (val) {
              if (val != null) {
                notifier.updateWallThickness(wall.id, val);
              }
            },
          ),
          const SizedBox(height: 12),
          const Text('Wall Type', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          const SizedBox(height: 4),
          DropdownButtonFormField<String>(
            value: wall.wallType,
            dropdownColor: const Color(0xFF0F172A),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
            ),
            items: const [
              DropdownMenuItem(value: 'external', child: Text('External Boundary Wall')),
              DropdownMenuItem(value: 'internal', child: Text('Internal Shared Wall')),
              DropdownMenuItem(value: 'partition', child: Text('Partition Wall')),
            ],
            onChanged: (val) {
              if (val != null) {
                notifier.updateWallType(wall.id, val);
              }
            },
          ),
          const SizedBox(height: 12),
          Text('Wall Length: ${wall.lengthM.toStringAsFixed(2)} m',
              style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      );
    }

    Widget buildDoorInspector() {
      final door = state.plan.doors.firstWhere((d) => d.id == id, orElse: () => state.plan.doors.first);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Door Width', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          const SizedBox(height: 4),
          DropdownButtonFormField<double>(
            value: door.widthM,
            dropdownColor: const Color(0xFF0F172A),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
            ),
            items: const [
              DropdownMenuItem(value: 0.9, child: Text('3.0 ft (900 mm) Standard')),
              DropdownMenuItem(value: 1.0, child: Text('3.3 ft (1000 mm) Main Entrance')),
              DropdownMenuItem(value: 0.75, child: Text('2.5 ft (750 mm) Toilet Door')),
            ],
            onChanged: (val) {
              if (val != null) {
                notifier.updateDoorWidth(door.id, val);
              }
            },
          ),
        ],
      );
    }

    Widget buildWindowInspector() {
      final window = state.plan.windows.firstWhere((w) => w.id == id, orElse: () => state.plan.windows.first);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Window Width', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
          const SizedBox(height: 4),
          DropdownButtonFormField<double>(
            value: window.widthM,
            dropdownColor: const Color(0xFF0F172A),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide.none),
            ),
            items: const [
              DropdownMenuItem(value: 1.2, child: Text('4.0 ft (1200 mm)')),
              DropdownMenuItem(value: 1.5, child: Text('5.0 ft (1500 mm)')),
              DropdownMenuItem(value: 1.8, child: Text('6.0 ft (1800 mm)')),
            ],
            onChanged: (val) {
              if (val != null) {
                notifier.updateWindowWidth(window.id, val);
              }
            },
          ),
        ],
      );
    }

    return Positioned(
      top: 16.0,
      right: 16.0,
      child: Container(
        width: 280,
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B).withOpacity(0.95),
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(color: const Color(0xFF334155)),
          boxShadow: const [
            BoxShadow(color: Colors.black45, blurRadius: 12, offset: Offset(0, 4))
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            buildHeader(),
            const Divider(color: Color(0xFF334155), height: 20),
            if (type == 'room') buildRoomInspector(),
            if (type == 'wall') buildWallInspector(),
            if (type == 'door') buildDoorInspector(),
            if (type == 'window') buildWindowInspector(),
            if (type == 'column')
              const Text('Column Size: 230 x 230 mm (Standard RCC Pillar)',
                  style: TextStyle(color: Colors.white, fontSize: 13)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                icon: const Icon(Icons.delete_forever, size: 16),
                label: const Text('Delete Element'),
                onPressed: () => notifier.deleteSelectedElement(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
