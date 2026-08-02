import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/validation_engine.dart';
import '../domain/confidence_engine.dart';
import '../../../editor/presentation/providers/editor_notifier.dart';

final validationProvider = Provider<SevenLayerValidationReport?>((ref) {
  final editorState = ref.watch(editorProvider);
  return editorState.validation;
});

final confidenceProvider = Provider<ProjectConfidenceReport?>((ref) {
  final editorState = ref.watch(editorProvider);
  return editorState.confidence;
});
