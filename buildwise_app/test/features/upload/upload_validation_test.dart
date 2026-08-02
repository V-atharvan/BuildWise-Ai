import 'package:flutter_test/flutter_test.dart';

import 'package:buildwise_app/features/upload/presentation/providers/upload_notifier.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 8F: Upload Parity & File Validation Tests', () {
    late UploadNotifier uploadNotifier;

    setUp(() {
      uploadNotifier = UploadNotifier();
    });

    test('Initial Upload State is default', () {
      expect(uploadNotifier.state.isUploading, isFalse);
      expect(uploadNotifier.state.plan, isNull);
      expect(uploadNotifier.state.errorMessage, isNull);
      expect(uploadNotifier.state.uploadProgress, equals(0.0));
    });

    test('Valid blueprint extensions PNG, JPG, PDF, DWG, DXF are accepted', () {
      final validExtensions = ['blueprint.png', 'floorplan.jpg', 'architecture.pdf', 'drawing.dwg', 'cad_plan.dxf'];

      for (final filename in validExtensions) {
        final isValid = uploadNotifier.validateFileExtension(filename);
        expect(isValid, isTrue, reason: 'File $filename should be accepted.');
      }
    });

    test('Invalid extensions EXE, TXT, ZIP are rejected with validation error', () {
      final invalidExtensions = ['malware.exe', 'notes.txt', 'archive.zip', 'script.sh'];

      for (final filename in invalidExtensions) {
        final isValid = uploadNotifier.validateFileExtension(filename);
        expect(isValid, isFalse, reason: 'File $filename should be rejected.');
      }
    });

    test('File size within 50MB limit is accepted', () {
      const validSizeBytes = 15 * 1024 * 1024; // 15 MB
      expect(uploadNotifier.validateFileSize(validSizeBytes), isTrue);
    });

    test('File size exceeding 50MB limit is rejected', () {
      const oversizedBytes = 60 * 1024 * 1024; // 60 MB
      expect(uploadNotifier.validateFileSize(oversizedBytes), isFalse);
    });

    test('Upload simulation sets plan and upload progress correctly', () async {
      await uploadNotifier.simulateUpload('sample_floor_plan.png', 5 * 1024 * 1024);

      expect(uploadNotifier.state.isUploading, isFalse);
      expect(uploadNotifier.state.uploadProgress, equals(1.0));
      expect(uploadNotifier.state.plan, isNotNull);
      expect(uploadNotifier.state.plan!.filename, equals('sample_floor_plan.png'));
      expect(uploadNotifier.state.errorMessage, isNull);
    });
  });
}
