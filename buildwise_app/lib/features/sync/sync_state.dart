enum SyncStatus {
  online,
  offline,
  syncing,
  error,
}

enum SyncOperationType {
  projectUpdate,
  geometryChange,
  boqUpdate,
  reportGeneration,
  metadataChange,
}

class SyncOperation {
  final String id;
  final String entityId;
  final SyncOperationType type;
  final Map<String, dynamic> payload;
  final String timestamp;
  final int retryCount;
  final String status; // 'pending' | 'in_progress' | 'failed' | 'completed'
  final String? lastError;

  const SyncOperation({
    required this.id,
    required this.entityId,
    required this.type,
    required this.payload,
    required this.timestamp,
    this.retryCount = 0,
    this.status = 'pending',
    this.lastError,
  });

  SyncOperation copyWith({
    int? retryCount,
    String? status,
    String? lastError,
  }) {
    return SyncOperation(
      id: id,
      entityId: entityId,
      type: type,
      payload: payload,
      timestamp: timestamp,
      retryCount: retryCount ?? this.retryCount,
      status: status ?? this.status,
      lastError: lastError ?? this.lastError,
    );
  }

  factory SyncOperation.fromJson(Map<String, dynamic> json) {
    return SyncOperation(
      id: json['id'] as String? ?? '',
      entityId: json['entity_id'] as String? ?? '',
      type: SyncOperationType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => SyncOperationType.projectUpdate,
      ),
      payload: Map<String, dynamic>.from(json['payload'] as Map? ?? {}),
      timestamp: json['timestamp'] as String? ?? DateTime.now().toIso8601String(),
      retryCount: (json['retry_count'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'pending',
      lastError: json['last_error'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'entity_id': entityId,
        'type': type.name,
        'payload': payload,
        'timestamp': timestamp,
        'retry_count': retryCount,
        'status': status,
        if (lastError != null) 'last_error': lastError,
      };
}

class SyncState {
  final SyncStatus status;
  final int pendingCount;
  final String? lastSyncedAt;
  final SyncOperation? currentOperation;
  final String? errorMessage;

  const SyncState({
    this.status = SyncStatus.online,
    this.pendingCount = 0,
    this.lastSyncedAt,
    this.currentOperation,
    this.errorMessage,
  });

  SyncState copyWith({
    SyncStatus? status,
    int? pendingCount,
    String? lastSyncedAt,
    bool clearLastSyncedAt = false,
    SyncOperation? currentOperation,
    bool clearCurrentOperation = false,
    String? errorMessage,
    bool clearErrorMessage = false,
  }) {
    return SyncState(
      status: status ?? this.status,
      pendingCount: pendingCount ?? this.pendingCount,
      lastSyncedAt: clearLastSyncedAt ? null : (lastSyncedAt ?? this.lastSyncedAt),
      currentOperation: clearCurrentOperation ? null : (currentOperation ?? this.currentOperation),
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
