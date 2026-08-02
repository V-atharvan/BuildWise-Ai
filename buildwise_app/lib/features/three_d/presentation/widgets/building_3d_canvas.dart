import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:vector_math/vector_math_64.dart' as v64;

import '../../../../models/estimation_result.dart';
import '../../domain/mesh_builder.dart';
import '../providers/three_d_viewer_notifier.dart';

class Building3DCanvas extends ConsumerStatefulWidget {
  final FloorPlanAnalysisResult plan;

  const Building3DCanvas({
    super.key,
    required this.plan,
  });

  @override
  ConsumerState<Building3DCanvas> createState() => _Building3DCanvasState();
}

class _Building3DCanvasState extends ConsumerState<Building3DCanvas> {
  // Orbit camera state
  double _rotationX = 0.6; // pitch angle in rad
  double _rotationY = 0.75; // yaw angle in rad
  double _zoomScale = 1.0;
  v64.Vector2 _panOffset = v64.Vector2.zero();

  Offset? _lastPanDetails;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(threeDViewerProvider);
    final rooms = widget.plan.rooms;
    final walls = widget.plan.walls;
    final doors = widget.plan.doors;
    final windows = widget.plan.windows;
    final columns = widget.plan.columns;

    if (rooms.isEmpty && walls.isEmpty) {
      return Container(
        color: const Color(0xFF0A0A0F),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.crop_free_rounded, size: 64, color: Colors.white24),
              SizedBox(height: 16),
              Text(
                'No 3D Floor Plan Data',
                style: TextStyle(color: Colors.white54, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'Create or import a floor plan in the 2D Editor to view in 3D.',
                style: TextStyle(color: Colors.white30, fontSize: 12),
              ),
            ],
          ),
        ),
      );
    }

    final transform = Building3DTransform.fromRooms(rooms);
    final deduplicatedWalls = WallMesh3D.buildDeduplicatedWalls(
      rooms: rooms,
      explicitWalls: walls,
      transform: transform,
    );
    final roomMeshes = rooms.map((r) => RoomMesh3D.fromAIRoom(r, transform)).toList();
    final doorMarkers = doors.map((d) => DoorMesh3D.fromAIDoor(d, transform)).toList();
    final windowMarkers = windows.map((w) => WindowMesh3D.fromAIWindow(w, transform)).toList();
    final columnMarkers = columns.map((c) => ColumnMesh3D.fromAIColumn(c, transform)).toList();

    // Camera view parameters based on preset
    final (targetRotX, targetRotY, targetZoom) = _getCameraPresetValues(state.cameraPreset);
    final effectiveRotX = state.cameraPreset == CameraPreset.perspective ? _rotationX : targetRotX;
    final effectiveRotY = state.cameraPreset == CameraPreset.perspective ? _rotationY : targetRotY;
    final effectiveZoom = state.cameraPreset == CameraPreset.perspective ? _zoomScale : targetZoom;

    return GestureDetector(
      onScaleStart: (details) {
        _lastPanDetails = details.focalPoint;
      },
      onScaleUpdate: (details) {
        setState(() {
          if (details.pointerCount == 1 && state.cameraPreset == CameraPreset.perspective) {
            _rotationY += details.focalPointDelta.dx * 0.01;
            _rotationX = (_rotationX + details.focalPointDelta.dy * 0.01).clamp(-math.pi / 2.2, math.pi / 2.2);
          } else if (details.pointerCount >= 2) {
            _zoomScale = (_zoomScale * details.scale).clamp(0.4, 3.5);
            if (_lastPanDetails != null) {
              final delta = details.focalPoint - _lastPanDetails!;
              _panOffset.x += delta.dx;
              _panOffset.y += delta.dy;
              _lastPanDetails = details.focalPoint;
            }
          }
        });
      },
      onDoubleTapDown: (details) {
        // Double tap fly-in target selection
        final tappedRoom = roomMeshes.firstOrNull;
        if (tappedRoom != null) {
          ref.read(threeDViewerProvider.notifier).selectRoom(
                roomId: tappedRoom.id,
                label: tappedRoom.label,
                areaM2: tappedRoom.areaM2,
                perimeterM: tappedRoom.perimeterM,
              );
          ref.read(threeDViewerProvider.notifier).setCameraPreset(CameraPreset.walkthrough);
        }
      },
      child: Container(
        color: const Color(0xFF0A0A0F),
        child: ClipRect(
          child: CustomPaint(
            size: Size.infinite,
            painter: _Building3DPainter(
              transform: transform,
              walls: deduplicatedWalls,
              rooms: roomMeshes,
              doors: doorMarkers,
              windows: windowMarkers,
              columns: columnMarkers,
              rotationX: effectiveRotX,
              rotationY: effectiveRotY,
              zoom: effectiveZoom,
              panOffset: _panOffset,
              viewerState: state,
              onSelectWall: (wall) {
                ref.read(threeDViewerProvider.notifier).selectWall(
                      wallId: wall.id,
                      wallType: wall.wallType,
                      length: wall.length,
                      thickness: wall.thickness,
                    );
              },
              onSelectRoom: (room) {
                ref.read(threeDViewerProvider.notifier).selectRoom(
                      roomId: room.id,
                      label: room.label,
                      areaM2: room.areaM2,
                      perimeterM: room.perimeterM,
                    );
              },
            ),
          ),
        ),
      ),
    );
  }

  (double, double, double) _getCameraPresetValues(CameraPreset preset) {
    switch (preset) {
      case CameraPreset.top:
        return (0.0, 0.0, 1.2);
      case CameraPreset.front:
        return (1.57, 0.0, 1.0);
      case CameraPreset.side:
        return (1.57, 1.57, 1.0);
      case CameraPreset.walkthrough:
        return (0.2, 0.5, 2.2);
      case CameraPreset.perspective:
        return (0.6, 0.75, 1.0);
    }
  }
}

class _Building3DPainter extends CustomPainter {
  final Building3DTransform transform;
  final List<WallMesh3D> walls;
  final List<RoomMesh3D> rooms;
  final List<DoorMesh3D> doors;
  final List<WindowMesh3D> windows;
  final List<ColumnMesh3D> columns;
  final double rotationX;
  final double rotationY;
  final double zoom;
  final v64.Vector2 panOffset;
  final ThreeDViewerState viewerState;

  final Function(WallMesh3D) onSelectWall;
  final Function(RoomMesh3D) onSelectRoom;

  _Building3DPainter({
    required this.transform,
    required this.walls,
    required this.rooms,
    required this.doors,
    required this.windows,
    required this.columns,
    required this.rotationX,
    required this.rotationY,
    required this.zoom,
    required this.panOffset,
    required this.viewerState,
    required this.onSelectWall,
    required this.onSelectRoom,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2 + panOffset.x, size.height / 2 + panOffset.y);

    // 3D Perspective Projection Matrix setup
    final projectionMatrix = v64.Matrix4.identity()
      ..translate(center.dx, center.dy, 0.0)
      ..scale(zoom * 60.0, -zoom * 60.0, 1.0)
      ..rotateX(rotationX)
      ..rotateY(rotationY);

    // 1. Draw 3D Ground Grid
    _draw3DGrid(canvas, projectionMatrix);

    final isWire = viewerState.exploreMode == ExploreMode.wireframe;
    final isTrans = viewerState.exploreMode == ExploreMode.transparent;
    final isStruct = viewerState.exploreMode == ExploreMode.structural;

    // 2. Render Rooms (Floor & Ceiling Slabs)
    for (final room in rooms) {
      final isSelected = viewerState.selectedObjectId == room.id;
      _drawRoomMesh(canvas, room, projectionMatrix, isWire, isTrans, isStruct, isSelected);
    }

    // 3. Render Walls (3D Box Geometry)
    if (viewerState.showWalls && !isStruct) {
      for (final wall in walls) {
        final isSelected = viewerState.selectedObjectId == wall.id;
        _drawWallMesh(canvas, wall, projectionMatrix, isWire, isTrans, isSelected);
      }
    }

    // 4. Render Openings (Doors & Windows)
    if (viewerState.showDoors && !isStruct) {
      for (final door in doors) {
        _drawDoorMarker(canvas, door, projectionMatrix);
      }
    }

    if (viewerState.showWindows && !isStruct) {
      for (final win in windows) {
        _drawWindowMarker(canvas, win, projectionMatrix);
      }
    }

    // 5. Render Columns
    if (viewerState.showColumns) {
      for (final col in columns) {
        _drawColumnMarker(canvas, col, projectionMatrix);
      }
    }

    // 6. Render Room Labels Billboard
    if (viewerState.showLabels) {
      for (final room in rooms) {
        _drawRoomLabel(canvas, room, projectionMatrix);
      }
    }
  }

  void _draw3DGrid(Canvas canvas, v64.Matrix4 mat) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.08)
      ..strokeWidth = 1.0;

    for (int i = -10; i <= 10; i++) {
      final p1 = _project(v64.Vector3(i.toDouble(), 0.0, -10.0), mat);
      final p2 = _project(v64.Vector3(i.toDouble(), 0.0, 10.0), mat);
      canvas.drawLine(p1, p2, paint);

      final p3 = _project(v64.Vector3(-10.0, 0.0, i.toDouble()), mat);
      final p4 = _project(v64.Vector3(10.0, 0.0, i.toDouble()), mat);
      canvas.drawLine(p3, p4, paint);
    }
  }

  void _drawRoomMesh(Canvas canvas, RoomMesh3D room, v64.Matrix4 mat, bool isWire, bool isTrans, bool isStruct, bool isSelected) {
    if (room.polygon3D.length < 3) return;

    final path = Path();
    final p0 = _project(room.polygon3D[0], mat);
    path.moveTo(p0.dx, p0.dy);

    for (int i = 1; i < room.polygon3D.length; i++) {
      final pt = _project(room.polygon3D[i], mat);
      path.lineTo(pt.dx, pt.dy);
    }
    path.close();

    final opacity = isTrans ? 0.08 : isSelected ? 0.60 : 0.35;
    final fillPaint = Paint()
      ..color = room.color.withOpacity(opacity)
      ..style = isWire ? PaintingStyle.stroke : PaintingStyle.fill
      ..strokeWidth = 1.5;

    canvas.drawPath(path, fillPaint);

    if (isSelected) {
      final outlinePaint = Paint()
        ..color = const Color(0xFFA855F7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5;
      canvas.drawPath(path, outlinePaint);
    }
  }

  void _drawWallMesh(Canvas canvas, WallMesh3D wall, v64.Matrix4 mat, bool isWire, bool isTrans, bool isSelected) {
    final h = wall.height;
    final l = wall.length / 2;
    final t = wall.thickness / 2;

    // 8 vertices of 3D Box
    final corners = [
      v64.Vector3(-l, 0.0, -t),
      v64.Vector3(l, 0.0, -t),
      v64.Vector3(l, 0.0, t),
      v64.Vector3(-l, 0.0, t),
      v64.Vector3(-l, h, -t),
      v64.Vector3(l, h, -t),
      v64.Vector3(l, h, t),
      v64.Vector3(-l, h, t),
    ];

    final rotMat = v64.Matrix4.identity()..rotateY(wall.angle);
    final transformed = corners.map((c) {
      final rotated = rotMat.transformed3(c);
      return rotated + wall.midPosition;
    }).toList();

    final projected = transformed.map((pt) => _project(pt, mat)).toList();

    final wallColor = isSelected
        ? const Color(0xFFA855F7)
        : wall.wallType == 'internal'
            ? const Color(0xFFCBD5E1)
            : const Color(0xFF94A3B8);

    final opacity = isTrans ? 0.15 : isSelected ? 0.90 : 0.70;
    final paint = Paint()
      ..color = wallColor.withOpacity(opacity)
      ..style = isWire ? PaintingStyle.stroke : PaintingStyle.fill
      ..strokeWidth = 1.5;

    // Draw top face
    final topPath = Path()
      ..moveTo(projected[4].dx, projected[4].dy)
      ..lineTo(projected[5].dx, projected[5].dy)
      ..lineTo(projected[6].dx, projected[6].dy)
      ..lineTo(projected[7].dx, projected[7].dy)
      ..close();
    canvas.drawPath(topPath, paint);

    // Draw side faces outline
    for (int i = 0; i < 4; i++) {
      canvas.drawLine(projected[i], projected[i + 4], paint);
      canvas.drawLine(projected[i], projected[(i + 1) % 4], paint);
    }
  }

  void _drawDoorMarker(Canvas canvas, DoorMesh3D door, v64.Matrix4 mat) {
    final p0 = _project(door.position, mat);
    final p1 = _project(door.position + v64.Vector3(0.0, door.height, 0.0), mat);

    final paint = Paint()
      ..color = const Color(0xFF374151)
      ..strokeWidth = 2.0;

    canvas.drawLine(p0, p1, paint);
  }

  void _drawWindowMarker(Canvas canvas, WindowMesh3D win, v64.Matrix4 mat) {
    final p0 = _project(win.position, mat);
    final p1 = _project(win.position + v64.Vector3(0.0, win.height, 0.0), mat);

    final paint = Paint()
      ..color = const Color(0xFF93C5FD)
      ..strokeWidth = 2.5;

    canvas.drawLine(p0, p1, paint);
  }

  void _drawColumnMarker(Canvas canvas, ColumnMesh3D col, v64.Matrix4 mat) {
    final p0 = _project(col.position, mat);
    final p1 = _project(col.position + v64.Vector3(0.0, col.height, 0.0), mat);

    final paint = Paint()
      ..color = const Color(0xFF4B5563)
      ..strokeWidth = 3.5;

    canvas.drawLine(p0, p1, paint);
  }

  void _drawRoomLabel(Canvas canvas, RoomMesh3D room, v64.Matrix4 mat) {
    final pt = _project(room.centroid, mat);
    final textSpan = TextSpan(
      text: '${room.label}\n${room.areaM2.toStringAsFixed(1)} m²',
      style: TextStyle(
        color: room.color,
        fontSize: 10,
        fontWeight: FontWeight.bold,
        shadows: const [Shadow(color: Colors.black, blurRadius: 4)],
      ),
    );

    final textPainter = TextPainter(
      text: textSpan,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(canvas, Offset(pt.dx - textPainter.width / 2, pt.dy - textPainter.height / 2));
  }

  Offset _project(v64.Vector3 pt, v64.Matrix4 mat) {
    final v4 = v64.Vector4(pt.x, pt.y, pt.z, 1.0);
    final transformed = mat.transformed(v4);
    return Offset(transformed.x, transformed.y);
  }

  @override
  bool shouldRepaint(covariant _Building3DPainter oldDelegate) => true;
}
