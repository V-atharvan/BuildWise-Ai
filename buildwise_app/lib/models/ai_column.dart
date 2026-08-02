class AIColumn {
  final String id;
  final String shape; // 'square' | 'rectangular' | 'circular' | 'unknown'
  final List<double> center; // [x, y]
  final double widthPx;
  final double heightPx;
  final List<double> sizeM; // [width_m, height_m]
  final List<String> connectedBeamIds;
  final double confidence;

  const AIColumn({
    required this.id,
    this.shape = 'square',
    required this.center,
    this.widthPx = 30.0,
    this.heightPx = 30.0,
    this.sizeM = const [0.23, 0.23],
    this.connectedBeamIds = const [],
    this.confidence = 0.95,
  });

  factory AIColumn.fromJson(Map<String, dynamic> json) {
    final centerRaw = json['center'] as List? ?? [0.0, 0.0];
    final center = centerRaw.map((e) => (e as num).toDouble()).toList();

    final sizeRaw = json['size_m'] as List? ?? [0.23, 0.23];
    final sizeM = sizeRaw.map((e) => (e as num).toDouble()).toList();

    return AIColumn(
      id: json['id'] as String? ?? '',
      shape: json['shape'] as String? ?? 'square',
      center: center,
      widthPx: (json['width_px'] as num?)?.toDouble() ?? 30.0,
      heightPx: (json['height_px'] as num?)?.toDouble() ?? 30.0,
      sizeM: sizeM,
      connectedBeamIds: (json['connected_beam_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.95,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'shape': shape,
        'center': center,
        'width_px': widthPx,
        'height_px': heightPx,
        'size_m': sizeM,
        'connected_beam_ids': connectedBeamIds,
        'confidence': confidence,
      };
}
