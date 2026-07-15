import 'package:cloud_firestore/cloud_firestore.dart';

class Maintenance {
  final String id;
  final String title;
  final DateTime plannedDate;
  final int estimatedDurationHours;
  final MaintenanceStatus status;
  final DocumentReference teamRef;
  final String? type; // champ facultatif selon tes docs Firestore

  Maintenance({
    required this.id,
    required this.title,
    required this.plannedDate,
    required this.estimatedDurationHours,
    required this.status,
    required this.teamRef,
    this.type,
  });

  factory Maintenance.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;

    final teamField = data['team'];
    late final DocumentReference teamRef;
    if (teamField is DocumentReference) {
      teamRef = teamField;
    } else if (teamField is String) {
      teamRef = FirebaseFirestore.instance.doc(teamField);
    } else {
      throw Exception("Champ 'team' invalide dans maintenance ${doc.id}");
    }

    return Maintenance(
      id: doc.id,
      title: data['title'] ?? 'Sans titre',
      plannedDate: (data['plannedDate'] as Timestamp).toDate(),
      estimatedDurationHours: data['estimatedDurationHours'] ?? 0,
      status: MaintenanceStatusExtension.fromString(data['status'] ?? 'planned'),
      teamRef: teamRef,
      type: data['type'],
    );
  }

  Maintenance copyWith({
    String? title,
    DateTime? plannedDate,
    int? estimatedDurationHours,
    MaintenanceStatus? status,
    DocumentReference? teamRef,
    String? type,
  }) {
    return Maintenance(
      id: id,
      title: title ?? this.title,
      plannedDate: plannedDate ?? this.plannedDate,
      estimatedDurationHours: estimatedDurationHours ?? this.estimatedDurationHours,
      status: status ?? this.status,
      teamRef: teamRef ?? this.teamRef,
      type: type ?? this.type,
    );
  }

  Map<String, dynamic> toMap() => {
    'title': title,
    'plannedDate': Timestamp.fromDate(plannedDate),
    'estimatedDurationHours': estimatedDurationHours,
    'status': status.name,
    'team': teamRef,
    if (type != null) 'type': type,
  };
}

enum MaintenanceStatus { planned, inProgress, completed, cancelled }

extension MaintenanceStatusExtension on MaintenanceStatus {
  String get displayName {
    switch (this) {
      case MaintenanceStatus.planned:
        return 'Planned';
      case MaintenanceStatus.inProgress:
        return 'In Progress';
      case MaintenanceStatus.completed:
        return 'Completed';
      case MaintenanceStatus.cancelled:
        return 'Cancelled';
    }
  }

  static MaintenanceStatus fromString(String status) =>
      MaintenanceStatus.values.firstWhere(
            (e) => e.name.toLowerCase() == status.toLowerCase(),
        orElse: () => MaintenanceStatus.planned,
      );
}

