import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/technician/maintenance.dart';

class MaintenanceService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Écoute les maintenances assignées à l'équipe du technicien connecté.
  /// Si aucun utilisateur ou aucune team, retourne un stream vide.
  Stream<List<Maintenance>> listenAssignedMaintenances() async* {
    final user = _auth.currentUser;
    if (user == null) {
      yield [];
      return;
    }

    try {
      final userDoc = await _db.collection('users').doc(user.uid).get();
      final teamRef = userDoc.data()?['teamId'] as DocumentReference?;

      if (teamRef == null) {
        yield [];
        return;
      }

      yield* _db
          .collection('maintenances')
          .where('team', isEqualTo: teamRef)
          .orderBy('plannedDate')
          .snapshots()
          .map((snapshot) =>
          snapshot.docs.map((doc) => Maintenance.fromDoc(doc)).toList());
    } catch (e) {
      print("Erreur lors de l'écoute des maintenances: $e");
      yield [];
    }
  }

  /// Met à jour le statut d'une maintenance spécifique.
  Future<void> updateStatus(String maintenanceId, String newStatus) async {
    await _db
        .collection('maintenances')
        .doc(maintenanceId)
        .update({'status': newStatus});
  }

  /// Ajoute une note à une maintenance spécifique.
  Future<void> addNote(String maintenanceId, String note) async {
    await _db
        .collection('maintenances')
        .doc(maintenanceId)
        .collection('notes')
        .add({
      'text': note,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
}
