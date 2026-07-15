// lib/screens/technician/technician_home.dart
// lib/screens/technician/technician_home.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/technician/technician_provider.dart';
import 'maintenance_list.dart';
import 'technician_map.dart';
import 'technician_settings.dart';

/// Écran principal pour le rôle Technician : onglets Liste / Carte / Paramètres.
class TechnicianHomeScreen extends StatefulWidget {
  /// Route utilisée dans le `MaterialApp` (main.dart).
  static const String routeName = '/technician-home';

  const TechnicianHomeScreen({Key? key}) : super(key: key);

  @override
  _TechnicianHomeScreenState createState() => _TechnicianHomeScreenState();
}

class _TechnicianHomeScreenState extends State<TechnicianHomeScreen> {
  int _currentIndex = 0;
  final List<Widget> _tabs = [
     MaintenanceList(),
     TechnicianMap(),
     TechnicianSettings(),
  ];

  //TODO: améliorer ce code
  // Ce code est une solution temporaire pour le problème de l'initialisation du provider.
  @override
  void initState() {
    super.initState();
    // Utilise le provider global instancié dans main.dart
    final technicianProv = Provider.of<TechnicianProvider>(context, listen: false);
    technicianProv.startListening();
    technicianProv.debugFetchAllMaintenances(); // si vous voulez encore debuguer
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _tabs[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.list),     label: 'Tâches'),
          BottomNavigationBarItem(icon: Icon(Icons.map),      label: 'Carte'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Paramètres'),
        ],
      ),
    );
  }
}
