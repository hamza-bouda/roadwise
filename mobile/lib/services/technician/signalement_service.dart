import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/user/report.dart';

class SignalementService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Récupère les signalements (reports) liés à une maintenance donnée.
  Future<List<Report>> fetchByMaintenance(String maintenanceId) async {
    try {
      final maintenanceRef = _db.collection('maintenances').doc(maintenanceId);
      final snap = await _db
          .collection('reports')
          .where('maintenance', isEqualTo: maintenanceRef)
          .orderBy('reportedAt', descending: true)
          .get();
      return snap.docs.map((doc) => Report.fromSnapshot(doc)).toList();
    } catch (e) {
      print("❌ Erreur lors de la récupération des signalements : $e");
      rethrow;
    }
  }

  /// Met à jour le statut d’un signalement (report).
  Future<void> updateSignalementStatus(String reportId, String status) async {
    try {
      await _db
          .collection('reports')
          .doc(reportId)
          .update({'status': status});
    } catch (e) {
      print("❌ Erreur lors de la mise à jour du statut du report : $e");
      rethrow;
    }
  }

  /// Récupère tous les signalements (utile si besoin global).
  Future<List<Report>> fetchAllReports() async {
    try {
      final snapshot = await _db.collection('reports').get();
      return snapshot.docs.map((doc) => Report.fromSnapshot(doc)).toList();
    } catch (e) {
      print("❌ Erreur lors de la récupération de tous les reports : $e");
      rethrow;
    }
  }
}
