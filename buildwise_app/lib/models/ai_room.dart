import 'dart:convert';

typedef PixelPoint = List<double>;

class ConfidenceSubScore {
  final double value;
  final String source;

  const ConfidenceSubScore({
    required this.value,
    required this.source,
  });

  factory ConfidenceSubScore.fromJson(Map<String, dynamic> json) {
    return ConfidenceSubScore(
      value: (json['value'] as num?)?.toDouble() ?? 0.0,
      source: json['source'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'value': value,
        'source': source,
      };
}

class RoomConfidenceScore {
  final double overall;
  final ConfidenceSubScore? ocr;
  final ConfidenceSubScore? geometry;
  final ConfidenceSubScore? adjacency;
  final ConfidenceSubScore? fixture;
  final ConfidenceSubScore? symbol;

  const RoomConfidenceScore({
    required this.overall,
    this.ocr,
    this.geometry,
    this.adjacency,
    this.fixture,
    this.symbol,
  });

  factory RoomConfidenceScore.fromJson(Map<String, dynamic> json) {
    return RoomConfidenceScore(
      overall: (json['overall'] as num?)?.toDouble() ?? 0.0,
      ocr: json['ocr'] != null ? ConfidenceSubScore.fromJson(json['ocr'] as Map<String, dynamic>) : null,
      geometry: json['geometry'] != null ? ConfidenceSubScore.fromJson(json['geometry'] as Map<String, dynamic>) : null,
      adjacency: json['adjacency'] != null ? ConfidenceSubScore.fromJson(json['adjacency'] as Map<String, dynamic>) : null,
      fixture: json['fixture'] != null ? ConfidenceSubScore.fromJson(json['fixture'] as Map<String, dynamic>) : null,
      symbol: json['symbol'] != null ? ConfidenceSubScore.fromJson(json['symbol'] as Map<String, dynamic>) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'overall': overall,
        if (ocr != null) 'ocr': ocr!.toJson(),
        if (geometry != null) 'geometry': geometry!.toJson(),
        if (adjacency != null) 'adjacency': adjacency!.toJson(),
        if (fixture != null) 'fixture': fixture!.toJson(),
        if (symbol != null) 'symbol': symbol!.toJson(),
      };
}

class RoomClassification {
  final String classifiedLabel;
  final String roomType;
  final RoomConfidenceScore confidence;
  final bool lowConfidenceFlag;
  final String flagLevel; // 'ok' | 'review' | 'critical'
  final String reason;
  final Map<String, double> allCandidates;
  final bool needsUserConfirmation;

  const RoomClassification({
    required this.classifiedLabel,
    required this.roomType,
    required this.confidence,
    this.lowConfidenceFlag = false,
    this.flagLevel = 'ok',
    this.reason = '',
    this.allCandidates = const {},
    this.needsUserConfirmation = false,
  });

  factory RoomClassification.fromJson(Map<String, dynamic> json) {
    final rawCandidates = json['all_candidates'] as Map<String, dynamic>? ?? {};
    final candidates = rawCandidates.map(
      (key, val) => MapEntry(key, (val as num).toDouble()),
    );

    return RoomClassification(
      classifiedLabel: json['classified_label'] as String? ?? 'Room',
      roomType: json['room_type'] as String? ?? 'living_room',
      confidence: json['confidence'] is Map<String, dynamic>
          ? RoomConfidenceScore.fromJson(json['confidence'] as Map<String, dynamic>)
          : RoomConfidenceScore(overall: (json['confidence'] as num?)?.toDouble() ?? 0.8),
      lowConfidenceFlag: json['low_confidence_flag'] as bool? ?? false,
      flagLevel: json['flag_level'] as String? ?? 'ok',
      reason: json['reason'] as String? ?? '',
      allCandidates: candidates,
      needsUserConfirmation: json['needs_user_confirmation'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'classified_label': classifiedLabel,
        'room_type': roomType,
        'confidence': confidence.toJson(),
        'low_confidence_flag': lowConfidenceFlag,
        'flag_level': flagLevel,
        'reason': reason,
        'all_candidates': allCandidates,
        'needs_user_confirmation': needsUserConfirmation,
      };
}

class AIRoom {
  final String id;
  final String label;
  final String roomType;
  final List<List<double>> polygon;
  final List<double> centroid;
  final List<double> boundingBox;
  final double areaM2;
  final double areaSqft;
  final double perimeterM;
  final double lengthM;
  final double widthM;
  final double aspectRatio;
  final double floorHeightM;
  final RoomClassification classification;
  final List<String> adjacentRoomIds;
  final List<String> doorIds;
  final List<String> windowIds;
  final List<String> wallIds;

  const AIRoom({
    required this.id,
    required this.label,
    required this.roomType,
    required this.polygon,
    required this.centroid,
    required this.boundingBox,
    required this.areaM2,
    required this.areaSqft,
    required this.perimeterM,
    required this.lengthM,
    required this.widthM,
    required this.aspectRatio,
    this.floorHeightM = 3.0,
    required this.classification,
    this.adjacentRoomIds = const [],
    this.doorIds = const [],
    this.windowIds = const [],
    this.wallIds = const [],
  });

  factory AIRoom.fromJson(Map<String, dynamic> json) {
    final polyRaw = json['polygon'] as List? ?? [];
    final poly = polyRaw
        .map((pt) => (pt as List).map((c) => (c as num).toDouble()).toList())
        .toList();

    final centroidRaw = json['centroid'] as List? ?? [0.0, 0.0];
    final centroid = centroidRaw.map((c) => (c as num).toDouble()).toList();

    final bboxRaw = json['bounding_box'] as List? ?? [0.0, 0.0, 0.0, 0.0];
    final bbox = bboxRaw.map((c) => (c as num).toDouble()).toList();

    final areaM2 = (json['area_m2'] as num?)?.toDouble() ?? 0.0;
    final areaSqft = (json['area_sqft'] as num?)?.toDouble() ?? (areaM2 * 10.7639);

    final classObj = json['classification'] != null
        ? RoomClassification.fromJson(json['classification'] as Map<String, dynamic>)
        : RoomClassification(
            classifiedLabel: json['label'] as String? ?? 'Room',
            roomType: json['room_type'] as String? ?? 'living_room',
            confidence: const RoomConfidenceScore(overall: 0.9),
          );

    return AIRoom(
      id: json['id'] as String? ?? '',
      label: json['label'] as String? ?? 'Room',
      roomType: json['room_type'] as String? ?? 'living_room',
      polygon: poly,
      centroid: centroid,
      boundingBox: bbox,
      areaM2: areaM2,
      areaSqft: areaSqft,
      perimeterM: (json['perimeter_m'] as num?)?.toDouble() ?? 0.0,
      lengthM: (json['length_m'] as num?)?.toDouble() ?? 0.0,
      widthM: (json['width_m'] as num?)?.toDouble() ?? 0.0,
      aspectRatio: (json['aspect_ratio'] as num?)?.toDouble() ?? 1.0,
      floorHeightM: (json['floor_height_m'] as num?)?.toDouble() ?? 3.0,
      classification: classObj,
      adjacentRoomIds: (json['adjacent_room_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      doorIds: (json['door_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      windowIds: (json['window_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
      wallIds: (json['wall_ids'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'room_type': roomType,
        'polygon': polygon,
        'centroid': centroid,
        'bounding_box': boundingBox,
        'area_m2': areaM2,
        'area_sqft': areaSqft,
        'perimeter_m': perimeterM,
        'length_m': lengthM,
        'width_m': widthM,
        'aspect_ratio': aspectRatio,
        'floor_height_m': floorHeightM,
        'classification': classification.toJson(),
        'adjacent_room_ids': adjacentRoomIds,
        'door_ids': doorIds,
        'window_ids': windowIds,
        'wall_ids': wallIds,
      };
}
