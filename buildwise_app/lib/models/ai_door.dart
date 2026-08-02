class AIDoor {
  final String id;
  final String? wallId;
  final String? roomId;
  final String? adjacentRoomId;
  final List<double> center; // [x, y]
  final double widthM;
  final double heightM;
  final String type; // 'single' | 'double' | 'sliding' | 'folding'
  final String swingDirection; // 'inward' | 'outward' | 'unknown'
  final double swingAngle;
  final double confidence;

  const AIDoor({
    required this.id,
    this.wallId,
    this.roomId,
    this.adjacentRoomId,
    required this.center,
    required this.widthM,
    required this.heightM,
    this.type = 'single',
    this.swingDirection = 'inward',
    this.swingAngle = 90.0,
    this.confidence = 0.90,
  });

  factory AIDoor.fromJson(Map<String, dynamic> json) {
    final centerRaw = json['center'] as List? ?? [0.0, 0.0];
    final center = centerRaw.map((e) => (e as num).toDouble()).toList();

    return AIDoor(
      id: json['id'] as String? ?? '',
      wallId: json['wall_id'] as String?,
      roomId: json['room_id'] as String?,
      adjacentRoomId: json['adjacent_room_id'] as String?,
      center: center,
      widthM: (json['width_m'] as num?)?.toDouble() ?? 0.9,
      heightM: (json['height_m'] as num?)?.toDouble() ?? 2.1,
      type: json['type'] as String? ?? 'single',
      swingDirection: json['swing_direction'] as String? ?? 'inward',
      swingAngle: (json['swing_angle'] as num?)?.toDouble() ?? 90.0,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.90,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (wallId != null) 'wall_id': wallId,
        if (roomId != null) 'room_id': roomId,
        if (adjacentRoomId != null) 'adjacent_room_id': adjacentRoomId,
        'center': center,
        'width_m': widthM,
        'height_m': heightM,
        'type': type,
        'swing_direction': swingDirection,
        'swing_angle': swingAngle,
        'confidence': confidence,
      };
}
