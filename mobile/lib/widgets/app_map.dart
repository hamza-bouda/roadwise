import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';

/// Widget de carte générique.
/// - [centerOnUser] : centre sur la position actuelle quand possible
/// - [routeTo] : si non-null, dessine la polyline entre l'utilisateur et ce point
/// - [extraMarkers] : marqueurs additionnels à afficher
class AppMap extends StatefulWidget {
  final LatLng? routeTo;
  final String? routeToTitle;
  final Set<Marker> extraMarkers;
  final bool centerOnUser;

  const AppMap({
    this.routeTo,
    this.routeToTitle,
    this.extraMarkers = const {},
    this.centerOnUser = false,
    Key? key, LatLng? destination,
  }) : super(key: key);

  @override
  _AppMapState createState() => _AppMapState();
}

class _AppMapState extends State<AppMap> {
  final Completer<GoogleMapController> _ctrl = Completer();
  Position? _pos;
  late Set<Marker> _markers;
  late Set<Polyline> _polylines;
  static const _apiKey = 'TA_CLE_DIRECTIONS_ICI';

  @override
  void initState() {
    super.initState();
    _initMap();
    // Réinitialise la carte lorsque les propriétés du widget changent
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _initMap();
      }
    });
  }

  Future<void> _initMap() async {
    _markers = {};
    _polylines = {};

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    try {
      _pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);
      _markers.add(Marker(
        markerId: MarkerId('me'),
        position: LatLng(_pos!.latitude, _pos!.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: InfoWindow(title: 'Ma position'),
      ));
    } catch (e) {
      print("Erreur de géolocalisation: $e");
      // Gérer l'erreur, par exemple, afficher un message à l'utilisateur
    }

    _markers.addAll(widget.extraMarkers);
    if (widget.routeTo != null && _pos != null) {
      _markers.add(Marker(
        markerId: MarkerId('dest'),
        position: widget.routeTo!,
        infoWindow: InfoWindow(title: widget.routeToTitle),
      ));
      try { // Ajout d'un bloc try-catch pour la gestion des erreurs
        // récupérer la polyline
        final result = await PolylinePoints().getRouteBetweenCoordinates(
          _apiKey,
          PointLatLng(_pos!.latitude, _pos!.longitude),
          PointLatLng(
            widget.routeTo!.latitude,
            widget.routeTo!.longitude,
          ),
          travelMode: TravelMode.driving,
        );
        if (result.points.isNotEmpty) {
          final pts = result.points
              .map((p) => LatLng(p.latitude, p.longitude))
              .toList();
          _polylines.add(Polyline(
            polylineId: PolylineId('route'),
            points: pts,
            width: 5,
            color: Colors.deepOrange,
          ));
        }
      } catch (e) {
        print("Erreur lors de la récupération de la polyline : $e");
        // Gérer l'erreur, par exemple, afficher un message à l'utilisateur
      }
    }
    setState(() {});

    final controller = await _ctrl.future;
    LatLng target;
    double zoomLevel = 13; // Niveau de zoom par défaut

    if (widget.centerOnUser && _pos != null) {
      target = LatLng(_pos!.latitude, _pos!.longitude);
    } else if (widget.routeTo != null) {
      target = widget.routeTo!;
      // Ajuster le zoom pour afficher l'itinéraire complet si possible
      // zoomLevel = _calculateZoomLevelForRoute();
    } else if (_markers.isNotEmpty) {
      target = _markers.first.position;
    } else {
      target = LatLng(0, 0);
    }
    controller.animateCamera(CameraUpdate.newLatLngZoom(target, zoomLevel));
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      // Callback appelé lorsque la carte est créée
      // "c" est le contrôleur de la carte
      onMapCreated: (c) => _ctrl.complete(c),
      initialCameraPosition:
      CameraPosition(target: LatLng(0, 0), zoom: 1),
      markers: _markers, // Utilise les marqueurs initialisés
      polylines: _polylines, // Utilise les polylignes initialisées
      myLocationEnabled: widget.centerOnUser, // Active la localisation de l'utilisateur
      myLocationButtonEnabled: widget.centerOnUser, // Affiche le bouton de localisation
      zoomControlsEnabled: true, // Active les contrôles de zoom
    );
  }
}
