import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart' as fp;
import 'package:google_maps_webservice/directions.dart' as gmw;
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/user/report.dart';
import '../../providers/technician/technician_provider.dart';
import '../../src/keys.dart';

class TechnicianMap extends StatefulWidget {
  final Report? destinationSignalement;
  const TechnicianMap({Key? key, this.destinationSignalement}) : super(key: key);

  @override
  State<TechnicianMap> createState() => _TechnicianMapState();
}

class _TechnicianMapState extends State<TechnicianMap> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  List<LatLng> _polylineCoordinates = [];
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  bool _isLoading = true;
  String? _distance;
  String? _duration;
  List<gmw.Step> _steps = [];
  MapType _currentMapType = MapType.normal;
  bool _trafficEnabled = false;
  double _currentZoom = 14.0;
  bool _isNavigationPanelExpanded = true;

  @override
  void initState() {
    super.initState();
    _initMap();
    _startLocationUpdates();
  }

  void _startLocationUpdates() {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    );
    Geolocator.getPositionStream(locationSettings: locationSettings)
        .listen((Position position) {
      setState(() {
        _currentPosition = position;
        _updateTechnicianMarker();
      });
    });
  }

  void _updateTechnicianMarker() {
    if (_currentPosition == null) return;

    _markers.removeWhere((m) => m.markerId.value == 'technicien');
    _markers.add(Marker(
      markerId: const MarkerId('technicien'),
      position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
      infoWindow: const InfoWindow(title: 'Votre position'),
      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
    ));
  }

  Future<void> _initMap() async {
    try {
      await _determinePosition();
      await _loadAllMaintenanceMarkers();
      if (widget.destinationSignalement != null) {
        await _getRouteToReport();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _determinePosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw Exception('Service de localisation désactivé');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Permission de localisation refusée');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception('Permission de localisation refusée définitivement');
    }

    _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high
    );
  }

  Future<void> _loadAllMaintenanceMarkers() async {
    final provider = Provider.of<TechnicianProvider>(context, listen: false);
    await provider.fetchCurrentTechnicianId();
    await provider.debugFetchAllMaintenances();

    for (final m in provider.maintList) {
      final report = provider.userReports.firstWhere(
            (r) => r.maintenance?.id == m.id,
        orElse: () => Report(
          id: '',
          latitude: 0.0,
          longitude: 0.0,
          description: '',
          imageUrl: '',
          maintenance: null,
          reportedAt: DateTime.now(),
          status: '',
          detectedBy: FirebaseFirestore.instance.doc('users/null'),
        ),
      );

      if (report.id != '') {
        final BitmapDescriptor markerIcon;
        switch (report.status.toUpperCase()) {
          case 'NOUVEAU':
            markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
            break;
          case 'EN_COURS':
            markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
            break;
          case 'REPARE':
            markerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
            break;
          default:
            markerIcon = BitmapDescriptor.defaultMarker;
        }

        _markers.add(Marker(
          markerId: MarkerId('m_${m.id}'),
          position: LatLng(report.latitude, report.longitude),
          infoWindow: InfoWindow(
            title: m.title,
            snippet: "Statut: ${report.status}",
          ),
          icon: markerIcon,
        ));
      }
    }

    _updateTechnicianMarker();

    if (widget.destinationSignalement != null) {
      _markers.add(Marker(
        markerId: const MarkerId('destination'),
        position: LatLng(
            widget.destinationSignalement!.latitude,
            widget.destinationSignalement!.longitude
        ),
        infoWindow: const InfoWindow(
            title: 'Destination à traiter',
            snippet: 'Cliquez pour plus d\'options'
        ),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
        onTap: _showDestinationOptions,
      ));
    }
  }

  void _showDestinationOptions() {
    if (widget.destinationSignalement == null) return;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Options de navigation",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.navigation),
              title: const Text("Ouvrir dans Google Maps"),
              onTap: () => _openInGoogleMaps(),
            ),
            ListTile(
              leading: const Icon(Icons.share),
              title: const Text("Partager la position"),
              onTap: () => _shareLocation(),
            ),
            ListTile(
              leading: const Icon(Icons.refresh),
              title: const Text("Recalculer l'itinéraire"),
              onTap: () {
                Navigator.pop(context);
                _getRouteToReport();
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openInGoogleMaps() async {
    if (widget.destinationSignalement == null) return;

    final url = 'https://www.google.com/maps/dir/?api=1&destination=${widget.destinationSignalement!.latitude},${widget.destinationSignalement!.longitude}&travelmode=driving';

    if (await canLaunch(url)) {
      await launch(url);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Impossible d'ouvrir Google Maps")),
        );
      }
    }
  }

  void _shareLocation() {
    if (widget.destinationSignalement == null) return;

    final lat = widget.destinationSignalement!.latitude;
    final lng = widget.destinationSignalement!.longitude;
    Share.share(
      'Position du signalement à traiter: https://www.google.com/maps/search/?api=1&query=$lat,$lng',
    );
  }

  Future<void> _getRouteToReport() async {
    const apiKey = kGoogleMapsApiKey; // défini dans lib/src/keys.dart
    if (_currentPosition == null || widget.destinationSignalement == null) return;

    setState(() => _isLoading = true);

    try {
      final directions = gmw.GoogleMapsDirections(apiKey: apiKey);
      final response = await directions.directionsWithLocation(
        gmw.Location(lat: _currentPosition!.latitude, lng: _currentPosition!.longitude),
        gmw.Location(lat: widget.destinationSignalement!.latitude, lng: widget.destinationSignalement!.longitude),
        travelMode: gmw.TravelMode.driving,
      );

      if (response.isOkay && response.routes.isNotEmpty) {
        final route = response.routes.first;
        final leg = route.legs.first;

        _polylineCoordinates = fp.PolylinePoints()
            .decodePolyline(route.overviewPolyline.points)
            .map((p) => LatLng(p.latitude, p.longitude))
            .toList();

        _polylines.clear();
        _polylines.add(Polyline(
          polylineId: const PolylineId('itineraire'),
          color: Colors.blue,
          width: 6,
          points: _polylineCoordinates,
          patterns: [
            PatternItem.dash(20),
            PatternItem.gap(10),
          ],
        ));

        setState(() {
          _distance = leg.distance?.text;
          _duration = leg.duration?.text;
          _steps = leg.steps;
        });

        WidgetsBinding.instance.addPostFrameCallback((_) => _centerMapOnRoute());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du calcul de l\'itinéraire: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _centerMapOnRoute() {
    if (_polylineCoordinates.isEmpty || _mapController == null) return;

    final lats = _polylineCoordinates.map((p) => p.latitude);
    final lngs = _polylineCoordinates.map((p) => p.longitude);
    final bounds = LatLngBounds(
      southwest: LatLng(lats.reduce(min), lngs.reduce(min)),
      northeast: LatLng(lats.reduce(max), lngs.reduce(max)),
    );
    _mapController!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 100));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Carte des maintenances"),
        actions: [
          IconButton(
            icon: Icon(_trafficEnabled ? Icons.traffic : Icons.traffic_outlined),
            tooltip: "Afficher le trafic",
            onPressed: () {
              setState(() => _trafficEnabled = !_trafficEnabled);
            },
          ),
          IconButton(
            icon: Icon(_currentMapType == MapType.normal ? Icons.satellite : Icons.map),
            tooltip: "Changer le type de carte",
            onPressed: () {
              setState(() {
                _currentMapType = _currentMapType == MapType.normal
                    ? MapType.hybrid
                    : MapType.normal;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: "Actualiser la carte",
            onPressed: () {
              setState(() {
                _isLoading = true;
                _markers.clear();
                _polylines.clear();
              });
              _initMap();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text("Chargement de la carte..."),
          ],
        ),
      )
          : Stack(
        children: [
          GoogleMap(
            onMapCreated: (controller) => _mapController = controller,
            initialCameraPosition: CameraPosition(
              target: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
              zoom: _currentZoom,
            ),
            markers: _markers,
            polylines: _polylines,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            mapType: _currentMapType,
            trafficEnabled: _trafficEnabled,
            onCameraMove: (position) {
              _currentZoom = position.zoom;
            },
          ),
          if (_distance != null && _duration != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        FloatingActionButton.small(
                          heroTag: "zoom_in",
                          onPressed: () {
                            _currentZoom = min(_currentZoom + 1, 20);
                            _mapController?.animateCamera(
                              CameraUpdate.newCameraPosition(
                                CameraPosition(
                                  target: LatLng(
                                    _currentPosition!.latitude,
                                    _currentPosition!.longitude,
                                  ),
                                  zoom: _currentZoom,
                                ),
                              ),
                            );
                          },
                          child: const Icon(Icons.add),
                        ),
                        const SizedBox(width: 8),
                        FloatingActionButton.small(
                          heroTag: "zoom_out",
                          onPressed: () {
                            _currentZoom = max(_currentZoom - 1, 1);
                            _mapController?.animateCamera(
                              CameraUpdate.newCameraPosition(
                                CameraPosition(
                                  target: LatLng(
                                    _currentPosition!.latitude,
                                    _currentPosition!.longitude,
                                  ),
                                  zoom: _currentZoom,
                                ),
                              ),
                            );
                          },
                          child: const Icon(Icons.remove),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _isNavigationPanelExpanded = !_isNavigationPanelExpanded;
                      });
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 10,
                            offset: const Offset(0, -5),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 40,
                            height: 4,
                            margin: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade300,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            const Icon(Icons.route, color: Colors.blue),
                                            const SizedBox(width: 8),
                                            Text(
                                              _distance ?? '',
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(Icons.access_time, color: Colors.orange),
                                            const SizedBox(width: 8),
                                            Text(
                                              _duration ?? '',
                                              style: const TextStyle(fontSize: 16),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    IconButton(
                                      icon: Icon(_isNavigationPanelExpanded
                                          ? Icons.keyboard_arrow_down
                                          : Icons.keyboard_arrow_up),
                                      onPressed: () {
                                        setState(() {
                                          _isNavigationPanelExpanded = !_isNavigationPanelExpanded;
                                        });
                                      },
                                    ),
                                  ],
                                ),
                                if (_isNavigationPanelExpanded && _steps.isNotEmpty) ...[
                                  const Divider(height: 24),
                                  const Text(
                                    "Instructions de navigation",
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  ListView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: _steps.length,
                                    itemBuilder: (context, index) {
                                      final step = _steps[index];
                                      return Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        child: Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.all(8),
                                              decoration: BoxDecoration(
                                                color: Colors.blue.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(
                                                '${index + 1}',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.blue,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    step.htmlInstructions.replaceAll(RegExp(r'<[^>]*>'), ''),
                                                    style: const TextStyle(fontSize: 14),
                                                  ),
                                                  if (step.distance != null)
                                                    Text(
                                                      step.distance!.text,
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        color: Colors.grey.shade600,
                                                      ),
                                                    ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            heroTag: "location",
            onPressed: () {
              if (_currentPosition != null) {
                _mapController?.animateCamera(
                  CameraUpdate.newLatLngZoom(
                    LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                    15,
                  ),
                );
              }
            },
            child: const Icon(Icons.my_location),
          ),
          if (widget.destinationSignalement != null) ...[
            const SizedBox(height: 16),
            FloatingActionButton(
              heroTag: "route",
              onPressed: _getRouteToReport,
              backgroundColor: Colors.green,
              child: const Icon(Icons.refresh),
            ),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.d