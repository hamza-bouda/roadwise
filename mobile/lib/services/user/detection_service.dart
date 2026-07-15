import 'dart:convert';
import 'dart:io';

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:pothole_detection_app/services/user/report_service.dart';

class DetectionService {
  static const String _apiUrl = 'http://192.168.11.149:8000/detect';

  /// Appelle l'API pour analyser l'image et renvoie true si un nid-de-poule est détecté
  Future<bool> detectPothole(File image) async {
    final bytes = await image.readAsBytes();
    final base64Image = base64Encode(bytes);
    final response = await http.post(
      Uri.parse(_apiUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'image': base64Image}),
    );
    if (response.statusCode == 200) {
      final result = jsonDecode(response.body);
      return result['potholeDetected'] == true;
    } else {
      throw Exception('Échec de l\'analyse (code: ${response.statusCode})');
    }
  }

  /// Upload l'image et les données du signalement via ReportService
  Future<void> uploadSignalReport({
    required File   image,
    required String uid,
    required String description,
  }) async {
    // 1. On récupère la position
    final pos = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
    // 2. On délègue la création du report
    await ReportService().createReport(
      imageFile  : image,
      latitude   : pos.latitude,
      longitude  : pos.longitude,
      description: description,
      uid        : uid,
    );
  }
}
