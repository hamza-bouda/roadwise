import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/user/detection_service.dart';
import '../../services/user/report_service.dart';
import 'report_form_screen.dart';
import 'package:flutter/services.dart';

class DetectionScreen extends StatefulWidget {
  final String userId;
  const DetectionScreen({Key? key, required this.userId}) : super(key: key);

  @override
  State<DetectionScreen> createState() => _DetectionScreenState();
}

class _DetectionScreenState extends State<DetectionScreen> with SingleTickerProviderStateMixin {
  File? _image;
  bool _isAnalyzing = false;
  bool? _hasPothole;
  Position? _position;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  final _detectSvc = DetectionService();
  final _reportSvc = ReportService();

  // Couleurs personnalisées
  static const Color primaryColor = Color(0xFF000000);
  static const Color secondaryColor = Color(0xFF32CD32);
  static const Color accentColor = Color(0xFFFF6B6B);
  static const Color backgroundColor = Color(0xFFF8F9FF);

  @override
  void initState() {
    super.initState();
    _locate();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeIn),
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _locate() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      await Geolocator.openLocationSettings();
      return;
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied) return;
    }
    if (perm == LocationPermission.deniedForever) return;

    _position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
    setState(() {});
  }

  Future<void> _pick() async {
    HapticFeedback.mediumImpact();
    final pic = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 90,
    );
    if (pic == null) return;
    setState(() {
      _image = File(pic.path);
      _hasPothole = null;
    });
    _animationController.reset();
    _animationController.forward();
  }

  Future<void> _analyze() async {
    if (_image == null) return;
    HapticFeedback.selectionClick();
    setState(() => _isAnalyzing = true);
    try {
      final ok = await _detectSvc.detectPothole(_image!);
      setState(() => _hasPothole = ok);
      HapticFeedback.heavyImpact();
    } catch (e) {
      _showErrorSnackBar('Erreur d\'analyse : $e');
    } finally {
      setState(() => _isAnalyzing = false);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        margin: const EdgeInsets.all(8),
      ),
    );
  }

  Future<void> _report() async {
    if (_image == null || _position == null) return;

    final description = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => const ReportFormScreen(),
      ),
    );
    if (description == null || description.isEmpty) return;

    setState(() => _isAnalyzing = true);
    try {
      await _reportSvc.createReport(
        imageFile: _image!,
        latitude: _position!.latitude,
        longitude: _position!.longitude,
        description: description,
        uid: widget.userId,
      );
      _showDialog('Merci', 'Signalement transmis !');
      setState(() {
        _image = null;
        _hasPothole = null;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Échec envoi : $e')),
      );
    } finally {
      setState(() => _isAnalyzing = false);
    }
  }

  void _showDialog(String title, String msg) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        content: Text(msg),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              backgroundColor,
              Colors.white,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              children: [
                Expanded(
                  child: Hero(
                    tag: 'camera_preview',
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(25),
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withOpacity(0.2),
                            blurRadius: 20,
                            spreadRadius: 5,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(25),
                        child: FadeTransition(
                          opacity: _fadeAnimation,
                          child: _image != null
                              ? Image.file(_image!, fit: BoxFit.cover)
                              : Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  primaryColor.withOpacity(0.1),
                                  primaryColor.withOpacity(0.05),
                                ],
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(20),
                                  decoration: BoxDecoration(
                                    color: primaryColor.withOpacity(0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.camera_alt_rounded,
                                    size: 80,
                                    color: primaryColor.withOpacity(.7),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                Text(
                                  'Prenez une photo',
                                  style: GoogleFonts.poppins(
                                    textStyle: TextStyle(
                                      color: primaryColor,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Capturez le nid-de-poule à signaler',
                                  style: GoogleFonts.poppins(
                                    textStyle: TextStyle(
                                      color: primaryColor.withOpacity(0.7),
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 30),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Column(
                    children: [
                      ElevatedButton.icon(
                        onPressed: _pick,
                        icon: const Icon(Icons.camera_alt_rounded, size: 28),
                        label: Text(
                          'Prendre une Photo',
                          style: GoogleFonts.poppins(
                            textStyle: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(60),
                          backgroundColor: primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          elevation: 5,
                          shadowColor: primaryColor.withOpacity(0.5),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: (_image != null && !_isAnalyzing) ? _analyze : null,
                        icon: _isAnalyzing
                            ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                            : const Icon(Icons.search_rounded, size: 28),
                        label: Text(
                          _isAnalyzing ? 'Analyse en cours...' : 'Analyser l\'image',
                          style: GoogleFonts.poppins(
                            textStyle: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(60),
                          backgroundColor: secondaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          elevation: 5,
                          shadowColor: secondaryColor.withOpacity(0.5),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _hasPothole == false
                      ? Container(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          secondaryColor.withOpacity(0.2),
                          secondaryColor.withOpacity(0.1),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: secondaryColor.withOpacity(0.1),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: secondaryColor.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_circle_rounded,
                            color: secondaryColor,
                            size: 30,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Aucun nid-de-poule détecté',
                          style: GoogleFonts.poppins(
                            textStyle: const TextStyle(
                              color: secondaryColor,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                      : _hasPothole == true
                      ? ElevatedButton.icon(
                    onPressed: _report,
                    icon: const Icon(Icons.report_problem_rounded, size: 28),
                    label: Text(
                      'Signaler le Nid-de-poule',
                      style: GoogleFonts.poppins(
                        textStyle: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(60),
                      backgroundColor: accentColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      elevation: 5,
                      shadowColor: accentColor.withOpacity(0.5),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                    ),
                  )
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
