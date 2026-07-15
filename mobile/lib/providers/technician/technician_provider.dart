import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';

import '../../models/technician/maintenance.dart';
import '../../models/user/report.dart';
import '../../services/technician/maintenance_service.dart';
import '../../services/technician/signalement_service.dart';

class TechnicianProvider extends ChangeNotifier {
  final MaintenanceService _maintenanceService = MaintenanceService();
  final SignalementService _signalementService = SignalementService();
  final _db = FirebaseFirestore.instance;
  final _auth = FirebaseAuth.instance;

  StreamSubscription? _maintenanceSubscription;

  List<Maintenance> _maintList = [];
  Maintenance? _currentMaintenance;
  List<Report> _userReports = [];
  String? _currentTechnicianId;

  // Getters publics
  List<Maintenance> get maintList => _maintList;
  Maintenance? get currentMaintenance => _currentMaintenance;
  List<Report> get userReports => _userReports;
  String? get currentTechnicianId => _currentTechnicianId;

  /// Charge l’ID de l’utilisateur connecté s’il est technicien
  Future<void> fetchCurrentTechnicianId() async {
    final user = _auth.currentUser;
    if (user == null) {
      debugPrint("Utilisateur non connecté.");
      return;
    }

    try {
      final userDoc = await _db.collection('users').doc(user.uid).get();
      final role = userDoc.data()?['role'];
      if (role == 'technician') {
        _currentTechnicianId = user.uid;
        notifyListeners();
      } else {
        debugPrint("⚠️ L'utilisateur n'est pas un technicien.");
      }
    } catch (e) {
      debugPrint("Erreur lors de la récupération du rôle utilisateur : $e");
    }
  }

  /// Écoute les maintenances attribuées
  void startListening() {
    _maintenanceSubscription?.cancel();
    _maintenanceSubscription =
        _maintenanceService.listenAssignedMaintenances().listen((list) {
          _maintList = list;
          notifyListeners();
        }, onError: (error) {
          debugPrint("Erreur lors de l'écoute des maintenances: $error");
        });
  }

  Future<void> refreshMaintenances() async {
    try {
      final user = _auth.currentUser;
      if (user == null) return;

      final userDoc = await _db.collection('users').doc(user.uid).get();
      final teamRef = userDoc.data()?['teamId'] as DocumentReference?;

      if (teamRef == null) {
        _maintList = [];
        notifyListeners();
        return;
      }

      final snapshot = await _db
          .collection('maintenances')
          .where('team', isEqualTo: teamRef)
          .orderBy('plannedDate')
          .get();

      _maintList = snapshot.docs
          .map((doc) => Maintenance.fromDoc(doc))
          .toList();

      notifyListeners();
    } catch (e) {
      debugPrint("Erreur lors du rafraîchissement des maintenances: $e");
      rethrow; // Pour permettre la gestion de l'erreur dans l'UI
    }
  }



  /// Sélectionne une maintenance et charge ses reports associés
  Future<void> selectMaintenance(Maintenance m) async {
    _currentMaintenance = m;
    await fetchReportsLinkedToCurrentMaintenance();
    notifyListeners();
  }

  /// Met à jour le statut de la maintenance sélectionnée
  Future<void> updateMaintenanceStatus(MaintenanceStatus status) async {
    if (_currentMaintenance != null) {
      try {
        await _maintenanceService.updateStatus(
            _currentMaintenance!.id, status.name);
        _currentMaintenance =
            _currentMaintenance!.copyWith(status: status);
        final index =
        _maintList.indexWhere((m) => m.id == _currentMaintenance!.id);
        if (index != -1) _maintList[index] = _currentMaintenance!;
        notifyListeners();
      } catch (e) {
        debugPrint(
            "Erreur lors de la mise à jour du statut de la maintenance: $e");
      }
    }
  }

  /// Met à jour le statut d'un report spécifique
  Future<void> updateReportStatus(String reportId, String status) async {
    await _signalementService.updateSignalementStatus(reportId, status);
    final index = _userReports.indexWhere((r) => r.id == reportId);
    if (index != -1) {
      final updated = _userReports[index];
      _userReports[index] = Report(
        id: updated.id,
        description: updated.description,
        imageUrl: updated.imageUrl,
        latitude: updated.latitude,
        longitude: updated.longitude,
        maintenance: updated.maintenance,
        reportedAt: updated.reportedAt,
        status: status,
        detectedBy: updated.detectedBy,
      );
      notifyListeners();
    }
  }

  /// Récupère les reports liés à la maintenance sélectionnée
  Future<void> fetchReportsLinkedToCurrentMaintenance() async {
    if (_currentMaintenance == null) return;

    final maintenanceRef = _db.doc('maintenances/${_currentMaintenance!.id}');
    final snapshot = await _db
        .collection('reports')
        .where('maintenance', isEqualTo: maintenanceRef)
        .get();

    _userReports = snapshot.docs
        .map((doc) => Report.fromSnapshot(doc))
        .toList();
    notifyListeners();
  }

  /// DEBUG : Affiche toutes les maintenances
  Future<void> debugFetchAllMaintenances() async {
    final snap = await _db.collection('maintenances').get();
    debugPrint('🔍 maintenances total docs: ${snap.docs.length}');
    for (var d in snap.docs) {
      debugPrint(' • ${d.id} → ${d.data()}');
    }
  }

  @override
  void dispose() {
    _maintenanceSubscription?.cancel();
    super.dispose();
  }
}
