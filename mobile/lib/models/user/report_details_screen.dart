import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/user/report.dart';

class ReportDetailsScreen extends StatelessWidget {
  final Report report;

  const ReportDetailsScreen({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('dd MMMM yyyy à HH:mm');
    final formattedDate = dateFmt.format(report.reportedAt);
    final statusColor = _getStatusColor(report.status);
    final statusText = _translateStatus(report.status);
    final theme = Theme.of(context);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: theme.scaffoldBackgroundColor,
            flexibleSpace: FlexibleSpaceBar(
              background: Hero(
                tag: 'report_image_${report.id}',
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    GestureDetector(
                      onTap: () => _viewFullImage(context),
                      child: CachedNetworkImage(
                        imageUrl: report.imageUrl,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: Colors.grey[300],
                          child: const Center(child: CircularProgressIndicator()),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: Colors.grey[300],
                          child: const Icon(Icons.error, size: 50),
                        ),
                      ),
                    ),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0.7),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.share),
                onPressed: () => _shareReport(context),
                tooltip: 'Partager',
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: statusColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  statusText,
                                  style: GoogleFonts.poppins(
                                    color: statusColor,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                          const SizedBox(width: 8),
                          Text(
                            formattedDate,
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        report.description,
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Localisation',
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildMapView(),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Latitude: ${report.latitude.toStringAsFixed(6)}',
                                  style: GoogleFonts.poppins(fontSize: 14),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Longitude: ${report.longitude.toStringAsFixed(6)}',
                                  style: GoogleFonts.poppins(fontSize: 14),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton.icon(
                            onPressed: _openInMaps,
                            icon: const Icon(Icons.map_outlined),
                            label: const Text('Voir sur Maps'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: theme.primaryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (report.maintenance != null)
                  FutureBuilder<DocumentSnapshot>(
                    future: report.maintenance!.get(),
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: LinearProgressIndicator(),
                        );
                      }
                      if (!snapshot.hasData || !snapshot.data!.exists) return const SizedBox();
                      
                      final data = snapshot.data!.data() as Map<String, dynamic>;
                      final plannedDate = (data['plannedDate'] as Timestamp).toDate();
                      final teamRef = data['team'] as DocumentReference;
                      final title = data['title'] ?? 'Sans titre';
                      final duration = data['estimatedDurationHours'];
                      
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(height: 1),
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Maintenance prévue',
                                  style: GoogleFonts.poppins(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                _buildMaintenanceInfo(
                                  icon: Icons.build,
                                  title: 'Intervention',
                                  value: title,
                                ),
                                const SizedBox(height: 12),
                                _buildMaintenanceInfo(
                                  icon: Icons.calendar_today,
                                  title: 'Date prévue',
                                  value: DateFormat('dd MMM yyyy à HH:mm').format(plannedDate),
                                ),
                                const SizedBox(height: 12),
                                _buildMaintenanceInfo(
                                  icon: Icons.timer,
                                  title: 'Durée estimée',
                                  value: '$duration heures',
                                ),
                                const SizedBox(height: 12),
                                _buildMaintenanceInfo(
                                  icon: Icons.group,
                                  title: 'Équipe',
                                  value: 'ID: ${teamRef.id}',
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomAppBar(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _viewFullImage(context),
                  icon: const Icon(Icons.image),
                  label: const Text('Voir l\'image'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _shareReport(context),
                  icon: const Icon(Icons.share),
                  label: const Text('Partager'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMaintenanceInfo({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              Text(
                value,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMapView() {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      clipBehavior: Clip.antiAlias,
      child: FlutterMap(
        options: MapOptions(
          center: LatLng(report.latitude, report.longitude),
          zoom: 15.0,
          interactiveFlags: InteractiveFlag.none,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.app',
          ),
          MarkerLayer(
            markers: [
              Marker(
                point: LatLng(report.latitude, report.longitude),
                width: 40,
                height: 40,
                builder: (context) => const Icon(
                  Icons.location_on,
                  color: Colors.red,
                  size: 40,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _viewFullImage(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          backgroundColor: Colors.black,
          body: Center(
            child: InteractiveViewer(
              panEnabled: true,
              minScale: 0.5,
              maxScale: 4,
              child: Hero(
                tag: 'report_image_${report.id}_full',
                child: CachedNetworkImage(
                  imageUrl: report.imageUrl,
                  fit: BoxFit.contain,
                  placeholder: (context, url) => const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                  errorWidget: (context, url, error) => const Icon(
                    Icons.error,
                    color: Colors.white,
                    size: 50,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _shareReport(BuildContext context) {
    final text = '''
🚧 Signalement de nid-de-poule

📝 ${report.description}
📊 Status: ${_translateStatus(report.status)}
📅 Date: ${DateFormat('dd/MM/yyyy HH:mm').format(report.reportedAt)}
📍 Coordonnées: ${report.latitude.toStringAsFixed(6)}, ${report.longitude.toStringAsFixed(6)}
''';

    Share.share(text);
  }

  void _openInMaps() async {
    final url = 'https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'NOUVEAU':
        return const Color(0xFFFF9800); // Orange
      case 'EN_COURS':
        return const Color(0xFF2196F3); // Bleu
      case 'TRAITÉ':
      case 'RÉSOLU':
        return const Color(0xFF4CAF50); // Vert
      case 'REJETÉ':
      case 'ANNULÉ':
        return const Color(0xFFE91E63); // Rouge
      default:
        return Colors.grey;
    }
  }

  String _translateStatus(String status) {
    switch (status.toUpperCase()) {
      case 'NOUVEAU':
        return 'Nouveau';
      case 'EN_COURS':
        return 'En cours';
      case 'TRAITÉ':
        return 'Traité';
      case 'RÉSOLU':
        return 'Résolu';
      case 'REJETÉ':
        return 'Rejeté';
      case 'ANNULÉ':
        return 'Annulé';
      default:
        return status;
    }
  }
}
