import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../models/estimation_result.dart';
import '../../../editor/presentation/providers/editor_notifier.dart';

final boqProvider = Provider<EstimationResult?>((ref) {
  final editorState = ref.watch(editorProvider);
  return editorState.estimation;
});
