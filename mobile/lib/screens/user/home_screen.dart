import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../models/user/report.dart';
import '../../services/user/report_service.dart';
import 'detection_screen.dart';
import 'map_screen.dart';
import 'history_screen.dart';
import 'settings_screen.dart';
import '../../widgets/app_drawer.dart';

class HomeScreen extends StatefulWidget {
  static const routeName = '/user-home';
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  final ReportService _reportService = ReportService();
  GoogleMapController? _mapController;
  Position? _pos;
  Set<Marker> _markers = {};
  List<Report> _reports = [];
  int _currentIndex = 1;
  late AnimationController _fadeController;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _locateMe();
    _reportService.streamAllReports().listen((list) {
      setState(() {
        _reports = list;
        _markers = list
            .map((r) => Marker(
          markerId: MarkerId(r.id),
          position: LatLng(r.latitude, r.longitude),
          infoWindow: InfoWindow(title: r.description),
        ))
            .toSet();
      });
    });
    _fadeController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _locateMe() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      await Geolocator.openLocationSettings();
      return;
    }
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
    if (p == LocationPermission.deniedForever) {
      await Geolocator.openAppSettings();
      return;
    }
    _pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);
    setState(() {}); // déclenche rebuild pour mettre à jour la caméra
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser!;
    final cam = _pos != null
        ? CameraPosition(
        target: LatLng(_pos!.latitude, _pos!.longitude), zoom: 14)
        : const CameraPosition(target: LatLng(0, 0), zoom: 1);

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.black,
        title: Text(
          'Roadwise',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 24,
            letterSpacing: 1,
          ),
        ),
      ),
      drawer: const AppDrawer(),
      body: FadeTransition(
        opacity: _fadeController,
        child: IndexedStack(
          index: _currentIndex,
          children: [
            DetectionScreen(userId: user.uid),
            MapScreen(
              initialCamera: cam,
              reports: _reports,
              onMapCreated: (ctrl) => _mapController = ctrl,
            ),
            const HistoryScreen(),
            SettingsScreen(),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: Colors.black,
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.gps_fixed)
                  .animate(target: _currentIndex == 0 ? 1.0 : 0.0)
                  .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2)),
              label: 'Détecter',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.map)
                  .animate(target: _currentIndex == 1 ? 1.0 : 0.0)
                  .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2)),
              label: 'Carte',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.history)
                  .animate(target: _currentIndex == 2 ? 1.0 : 0.0)
                  .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2)),
              label: 'Historique',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.settings)
                  .animate(target: _currentIndex == 3 ? 1.0 : 0.0)
                  .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2)),
              label: 'Paramètres',
            ),
          ],
        ),
      ),
    );
  }
}
