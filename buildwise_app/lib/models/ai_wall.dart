class AIWall {
  final String id;
  final List<double> start; // [x, y]
  final List<double> end;   // [x, y]
  final double lengthPx;
  final double lengthM;
  final double thicknessPx;
  final double thicknessM;
  final String wallType;   // 'external' | 'internal' | 'partition'
  final List<String> roomIds;
  final List<String> doorIds;
  final List<String> windowIds;
  final bool isStructural;
  final double confidence;

  const AIWall({
    required this.id,
    required this.start,
    required this.end,
    required this.lengthPx,
    required this.lengthM,
    required this.thicknessPx,
    required this.thicknessM,
    this.wallType = 'external',
    this.roomIds = const [],
    this.doorIds = const [],
    this.windowIds = const [],
    this.isStructural = true,
    this.confidence = 0.95,
  });

  factory AIWall.fromJson(Map<String, dynamic> json) {
    final startRaw = json['start'] as List? ?? [0.0, 0.0];
    final start = startRaw.map((e) => (e as num).toDouble()).toList();

    final endRaw = json['end'] as List? ?? [0.0, 0.0];
    final end = endRaw.map((e) => (e as num).toDouble()).toList();

    return AIWall(
      id: json['id'] as String? ?? '',
      start: start,
      end: end,
      lengthPx: (json['length_px'] as num?)?.toDouble() ?? 0.0,
      lengthM: (json['length_m'] as num?)?.toDouble() ?? 0.0,
      thicknessPx: (json['thickness_px'] as num?)?.toDouble() ?? 15.0,
      thicknessM: (json['thickness_m'] as num?)?.toDouble() ?? 0.23,
      wallType: json['wall_type'] as String? ?? 'external',
      roomIds: (json['room_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      doorIds: (json['door_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      windowIds: (json['window_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      isStructural: json['is_structural'] as bool? ?? true,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.95,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'start': start,
        'end': end,
        'length_px': lengthPx,
        'length_m': lengthM,
        'thickness_px': thicknessPx,
        'thickness_m': thicknessM,
        'wall_type': wallType,
        'room_ids': roomIds,
        'door_ids': doorIds,
        'window_ids': windowIds,
        'is_structural': isStructural,
        'confidence': confidence,
      };
}
