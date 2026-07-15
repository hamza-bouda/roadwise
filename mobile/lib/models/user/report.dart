import 'package:cloud_firestore/cloud_firestore.dart';

/// Modèle “Report” partagé mobile/desktop/backend.
/// L’ID du document est l’ID Firestore auto‐généré.
class Report {
  final String id;
  final String description;
  final String imageUrl;
  final double latitude;
  final double longitude;
  final DateTime reportedAt;
  final String status;                   // ex. "NOUVEAU", "EN_COURS"
  final DocumentReference detectedBy;    // référence vers users/{uid}
  final DocumentReference? maintenance;

  Report({
    required this.id,
    required this.description,
    required this.imageUrl,
    required this.latitude,
    required this.longitude,
    required this.maintenance,
    required this.reportedAt,
    required this.status,
    required this.detectedBy,
  });

  /// Crée un Report à partir d’un snapshot Firestore typé
  factory Report.fromSnapshot(
      DocumentSnapshot<Map<String, dynamic>> snap) {
    final data = snap.data()!;
    return Report(
      id         : snap.id,
      description: data['description'] as String? ?? '',
      imageUrl   : data['imageUrl'] as String,
      latitude   : (data['latitude'] as num).toDouble(),
      longitude  : (data['longitude'] as num).toDouble(),
      maintenance: data['maintenance'] as DocumentReference?,
      reportedAt : (data['reportedAt'] as Timestamp).toDate(),
      status     : data['status'] as String? ?? 'NOUVEAU',
      detectedBy : data['detectedBy'] as DocumentReference,
    );
  }

  /// Convertit en Map pour Firestore
  Map<String, dynamic> toMap() => {
    'description': description,
    'imageUrl'   : imageUrl,
    'latitude'   : latitude,
    'longitude'  : longitude,
    'maintenance': maintenance,
    'reportedAt' : Timestamp.fromDate(reportedAt),
    'status'     : status,
    'detectedBy' : detectedBy,
  };

}
