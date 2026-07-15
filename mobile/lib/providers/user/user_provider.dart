import 'package:flutter/material.dart';
import '../../models/user/report.dart';
import '../../services/user/report_service.dart';

class UserProvider extends ChangeNotifier {
  final _reportService = ReportService();
  List<Report> _signalements = [];

  List<Report> get signalements => _signalements;

  Future<void> loadReports() async {
    _signalements = await _reportService.fetchReports();
    notifyListeners();
  }
}
