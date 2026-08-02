class AIWindow {
  final String id;
  final String? wallId;
  final String? roomId;
  final List<double> center; // [x, y]
  final double widthM;
  final double heightM;
  final double sillHeightM;
  final double confidence;

  const AIWindow({
    required this.id,
    this.wallId,
    this.roomId,
    required this.center,
    required this.widthM,
    required this.heightM,
    this.sillHeightM = 0.9,
    this.confidence = 0.90,
  });

  factory AIWindow.fromJson(Map<String, dynamic> json) {
    final centerRaw = json['center'] as List? ?? [0.0, 0.0];
    final center = centerRaw.map((e) => (e as num).toDouble()).toList();

    return AIWindow(
      id: json['id'] as String? ?? '',
      wallId: json['wall_id'] as String?,
      roomId: json['room_id'] as String?,
      center: center,
      widthM: (json['width_m'] as num?)?.toDouble() ?? 1.2,
      heightM: (json['height_m'] as num?)?.toDouble() ?? 1.2,
      sillHeightM: (json['sill_height_m'] as num?)?.toDouble() ?? 0.9,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.90,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        if (wallId != null) 'wall_id': wallId,
        if (roomId != null) 'room_id': roomId,
        'center': center,
        'width_m': widthM,
        'height_m': heightM,
        'sill_height_m': sillHeightM,
        'confidence': confidence,
      };
}
