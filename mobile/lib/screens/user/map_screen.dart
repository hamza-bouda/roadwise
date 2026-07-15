import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'dart:async';
import 'package:shimmer/shimmer.dart';

import '../../models/user/report.dart';

class MapScreen extends StatefulWidget {
  final CameraPosition initialCamera;
  final void Function(GoogleMapController)? onMapCreated;
  final List<Report>? initialReports;

  const MapScreen({
    Key? key,
    required this.initialCamera,
    this.onMapCreated,
    this.initialReports, required List<Report> reports,
  }) : super(key: key);

  @override
  _MapScreenState createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with TickerProviderStateMixin {
  GoogleMapController? _controller;
  Set<Marker> _markers = {};
  bool _isLoading = true;
  bool _isLocationPermissionGranted = false;
  Position? _currentPosition;
  Timer? _refreshTimer;
  String _selectedFilter = 'TOUS';
  final List<String> _filterOptions = ['TOUS', 'NOUVEAU', 'EN_COURS', 'RÉSOLU'];
  late AnimationController _pulseController;
  late AnimationController _scaleController;
  bool _isFilterExpanded = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _checkLocationPermission();

    if (widget.initialReports != null && widget.initialReports!.isNotEmpty) {
      _createMarkersFromReports(widget.initialReports!);
      _isLoading = false;
    } else {
      _fetchReportsFromFirestore();
    }

    // Rafraîchir les données toutes les 60 secondes
    _refreshTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      _fetchReportsFromFirestore();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _scaleController.dispose();
    _refreshTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _checkLocationPermission() async {
    final status = await Permission.location.request();
    setState(() {
      _isLocationPermissionGranted = status.isGranted;
    });

    if (status.isGranted) {
      _getCurrentLocation();
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high
      );

      setState(() {
        _currentPosition = position;
      });

      if (_controller != null) {
        _animateToCurrentLocation();
      }
    } catch (e) {
      debugPrint('Erreur lors de la récupération de la position: $e');
    }
  }

  void _animateToCurrentLocation() {
    if (_currentPosition != null && _controller != null) {
      _controller!.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
            zoom: 15,
          ),
        ),
      );
    }
  }

  Future<void> _fetchReportsFromFirestore() async {
    setState(() => _isLoading = true);

    try {
      final snapshot =
      await FirebaseFirestore.instance.collection('reports').get();

      final List<Report> reports = snapshot.docs
          .map((doc) => Report.fromSnapshot(doc as DocumentSnapshot<Map<String, dynamic>>))
          .toList();

      _createMarkersFromReports(reports);

      setState(() => _isLoading = false);
    } catch (e) {
      debugPrint('Erreur lors de la récupération des reports : $e');
      setState(() => _isLoading = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur de chargement des données: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _createMarkersFromReports(List<Report> reports) {
    // Filtrer les reports si nécessaire
    final filteredReports = _selectedFilter == 'TOUS'
        ? reports
        : reports.where((report) => report.status == _selectedFilter).toList();

    final markers = filteredReports.map((report) {
      return Marker(
        markerId: MarkerId(report.id),
        position: LatLng(report.latitude, report.longitude),
        infoWindow: InfoWindow(
          title: 'Signalement',
          snippet: '${report.description} - ${report.status}',
          onTap: () => _showReportDetails(report),
        ),
        icon: _getMarkerIcon(report.status),
        onTap: () {
          // Animation de zoom sur le marqueur
          _controller?.animateCamera(
            CameraUpdate.newLatLngZoom(
              LatLng(report.latitude, report.longitude),
              16,
            ),
          );
        },
      );
    }).toSet();

    setState(() {
      _markers = markers;
    });
  }

  BitmapDescriptor _getMarkerIcon(String status) {
    switch (status) {
      case 'NOUVEAU':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
      case 'EN_COURS':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
      case 'RÉSOLU':
        return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
      default:
        return BitmapDescriptor.defaultMarker;
    }
  }

  void _showReportDetails(Report report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.4,
          minChildSize: 0.2,
          maxChildSize: 0.75,
          builder: (_, controller) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.all(16),
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Signalement',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  _buildStatusChip(report.status),
                  const SizedBox(height: 16),
                  Text(
                    report.description,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      report.imageUrl,
                      fit: BoxFit.cover,
                      height: 200,
                      width: double.infinity,
                      errorBuilder: (context, error, stackTrace) =>
                      const Center(child: Text('Impossible de charger l\'image')),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Signalé le ${_formatDate(report.reportedAt)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: const Text('Fermer'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStatusChip(String status) {
    Color chipColor;
    String label;

    switch (status) {
      case 'NOUVEAU':
        chipColor = Colors.red;
        label = 'Nouveau';
        break;
      case 'EN_COURS':
        chipColor = Colors.orange;
        label = 'En cours';
        break;
      case 'RÉSOLU':
        chipColor = Colors.green;
        label = 'Résolu';
        break;
      default:
        chipColor = Colors.grey;
        label = status;
    }

    return Chip(
      label: Text(
        label,
        style: const TextStyle(color: Colors.white),
      ),
      backgroundColor: chipColor,
    );
  }

  String _formatDate(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} à ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.secondary;

    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: widget.initialCamera,
          markers: _markers,
          myLocationEnabled: _isLocationPermissionGranted,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          mapToolbarEnabled: false,
          compassEnabled: true,
          buildingsEnabled: true,
          mapType: MapType.normal,
          onMapCreated: (controller) {
            _controller = controller;
            if (widget.onMapCreated != null) {
              widget.onMapCreated!(controller);
            }

            // Appliquer le thème de la carte en fonction du thème de l'app
            _setMapStyle(theme.brightness == Brightness.dark);
          },
        ),

        // Overlay de chargement amélioré
        if (_isLoading)
          Container(
            color: Colors.black.withOpacity(0.3),
            child: Center(
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        'Chargement des signalements...',
                        style: theme.textTheme.bodyLarge,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ).animate().fadeIn(),

        // Barre supérieure avec filtres et recherche
        Positioned(
          top: 16,
          left: 16,
          right: 16,
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(32),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedFilter,
                          icon: const Icon(Icons.filter_list),
                          isExpanded: true,
                          onChanged: (String? newValue) {
                            if (newValue != null) {
                              setState(() {
                                _selectedFilter = newValue;
                              });
                              if (widget.initialReports != null) {
                                _createMarkersFromReports(widget.initialReports!);
                              } else {
                                _fetchReportsFromFirestore();
                              }
                            }
                          },
                          items: _filterOptions.map<DropdownMenuItem<String>>((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Row(
                                children: [
                                  Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: value == 'NOUVEAU' ? Colors.red :
                                      value == 'EN_COURS' ? Colors.orange :
                                      value == 'RÉSOLU' ? Colors.green :
                                      Colors.grey,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    value == 'TOUS' ? 'Tous les signalements' :
                                    value == 'NOUVEAU' ? 'Nouveaux' :
                                    value == 'EN_COURS' ? 'En cours' : 'Résolus',
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ),
                  Container(
                    height: 32,
                    width: 1,
                    color: Colors.grey.withOpacity(0.3),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: _fetchReportsFromFirestore,
                  ).animate(controller: _pulseController)
                      .scale(
                    begin: const Offset(1, 1),
                    end: const Offset(1.1, 1.1),
                  ),
                ],
              ),
            ),
          ).animate().slideY(
            begin: -1,
            end: 0,
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutBack,
          ),
        ),

        // Bouton de localisation amélioré
        Positioned(
          bottom: 16,
          right: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FloatingActionButton(
                heroTag: 'location',
                onPressed: () {
                  if (_isLocationPermissionGranted) {
                    _getCurrentLocation();
                    _animateToCurrentLocation();
                  } else {
                    _checkLocationPermission();
                  }
                },
                backgroundColor: accent,
                child: Icon(
                  Icons.my_location,
                  color: theme.colorScheme.onSecondary,
                ),
              ).animate()
                  .scale(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOut,
              ),
            ],
          ),
        ),

        // Compteur de signalements amélioré
        Positioned(
          bottom: 16,
          left: 16,
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    color: theme.colorScheme.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${_markers.length} signalement${_markers.length > 1 ? 's' : ''}',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ).animate()
              .slideX(
            begin: -1,
            end: 0,
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutBack,
          ),
        ),
      ],
    );
  }

  Future<void> _setMapStyle(bool isDarkMode) async {
    if (_controller == null) return;

    try {
      if (isDarkMode) {
        await _controller!.setMapStyle('''
        [
          {
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#212121"
              }
            ]
          },
          {
            "elementType": "labels.icon",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#757575"
              }
            ]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [
              {
                "color": "#212121"
              }
            ]
          },
          {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#757575"
              }
            ]
          },
          {
            "featureType": "administrative.country",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#9e9e9e"
              }
            ]
          },
          {
            "featureType": "administrative.land_parcel",
            "stylers": [
              {
                "visibility": "off"
              }
            ]
          },
          {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#bdbdbd"
              }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#757575"
              }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#181818"
              }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#616161"
              }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels.text.stroke",
            "stylers": [
              {
                "color": "#1b1b1b"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [
              {
                "color": "#2c2c2c"
              }
            ]
          },
          {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#8a8a8a"
              }
            ]
          },
          {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#373737"
              }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#3c3c3c"
              }
            ]
          },
          {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#4e4e4e"
              }
            ]
          },
          {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#616161"
              }
            ]
          },
          {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#757575"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
              {
                "color": "#000000"
              }
            ]
          },
          {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [
              {
                "color": "#3d3d3d"
              }
            ]
          }
        ]
        ''');
      } else {
        await _controller!.setMapStyle(null); // Reset to default style
      }
    } catch (e) {
      debugPrint('Erreur lors de l\'application du style de carte: $e');
    }
  }
}