import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:share_plus/share_plus.dart';
import 'package:photo_view/photo_view.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';

import '../../models/user/report.dart';
import '../../models/technician/maintenance.dart';
import '../../providers/technician/technician_provider.dart';
import '../technician/technician_map.dart';

class MaintenanceDetail extends StatefulWidget {
  const MaintenanceDetail({super.key});

  @override
  State<MaintenanceDetail> createState() => _MaintenanceDetailState();
}

class _MaintenanceDetailState extends State<MaintenanceDetail> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    context.read<TechnicianProvider>().fetchReportsLinkedToCurrentMaintenance().then((_) {
      setState(() => _loading = false);
    });
  }

  void _showImageGallery(BuildContext context, String imageUrl) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(
            backgroundColor: Colors.black,
            leading: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          body: Container(
            color: Colors.black,
            child: PhotoView(
              imageProvider: CachedNetworkImageProvider(imageUrl),
              minScale: PhotoViewComputedScale.contained,
              maxScale: PhotoViewComputedScale.covered * 2,
              loadingBuilder: (context, event) => Center(
                child: CircularProgressIndicator(
                  value: event == null ? 0 : event.cumulativeBytesLoaded / (event.expectedTotalBytes ?? 1),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    IconData icon;
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        color = Colors.green;
        icon = Icons.check_circle;
        break;
      default:
        color = Colors.orange;
        icon = Icons.engineering;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
          Text(
            status.toUpperCase(),
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Future<void> _finishMaintenance(Maintenance m) async {
    final selected = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Terminer la maintenance ?"),
        content: const Text(
          "En marquant la maintenance comme terminée, le signalement associé sera automatiquement marqué comme réparé.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Annuler"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            child: const Text("Terminer"),
          ),
        ],
      ),
    );

    if (selected == true && m.status != MaintenanceStatus.completed) {
      try {
        // Mise à jour du statut de la maintenance
        await FirebaseFirestore.instance
            .collection('maintenances')
            .doc(m.id)
            .update({'status': MaintenanceStatus.completed.name});

        // Récupération et mise à jour du signalement associé
        final report = context.read<TechnicianProvider>().userReports.firstWhere(
              (r) => r.maintenance?.id == m.id,
          orElse: () => throw Exception('Aucun signalement trouvé pour cette maintenance'),
        );

        // Mise à jour du statut du signalement
        await FirebaseFirestore.instance
            .collection('reports')
            .doc(report.id)
            .update({
          'status': 'REPARE',
          'treatedAt': DateTime.now(),
        });

        // Rafraîchissement des données
        await context.read<TechnicianProvider>().fetchReportsLinkedToCurrentMaintenance();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Maintenance terminée et signalement marqué comme réparé"),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Erreur: $e"),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<TechnicianProvider>();
    final maintenance = prov.currentMaintenance;
    final report = prov.userReports.isNotEmpty ? prov.userReports.first : null;

    if (_loading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text("Chargement des données..."),
            ],
          ),
        ),
      );
    }

    if (maintenance == null) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red),
              SizedBox(height: 16),
              Text("Maintenance introuvable."),
            ],
          ),
        ),
      );
    }

    final dateStr = DateFormat("EEEE d MMMM yyyy 'à' HH:mm", 'fr_FR').format(maintenance.plannedDate.toLocal());

    return Scaffold(
      appBar: AppBar(
        title: const Text("Détails Maintenance"),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: "Partager",
            onPressed: () {
              Share.share(
                'Détails de la maintenance:\n${maintenance.title}\nPrévue le $dateStr\nDurée estimée: ${maintenance.estimatedDurationHours}h',
              );
            },
          ),
          if (maintenance.status != MaintenanceStatus.completed)
            IconButton(
              icon: const Icon(Icons.check_circle_outline),
              tooltip: "Terminer la maintenance",
              onPressed: () => _finishMaintenance(maintenance),
            ),
          IconButton(
            icon: const Icon(Icons.map_outlined),
            tooltip: "Voir sur la carte",
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => TechnicianMap(destinationSignalement: report)),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Carte des détails de la maintenance
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    maintenance.title,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ).animate().fadeIn(duration: 500.ms).slideX(),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 18, color: Colors.grey),
                      const SizedBox(width: 8),
                      Text(dateStr, style: const TextStyle(color: Colors.grey, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.access_time, color: Colors.grey),
                      const SizedBox(width: 8),
                      Text(
                        "Durée estimée : ${maintenance.estimatedDurationHours}h",
                        style: const TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildStatusBadge(maintenance.status.name),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Carte du signalement associé
          if (report == null)
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Center(
                  child: Text(
                    "Aucun signalement associé à cette maintenance",
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              ),
            )
          else
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (report.imageUrl.isNotEmpty)
                    GestureDetector(
                      onTap: () => _showImageGallery(context, report.imageUrl),
                      child: Hero(
                        tag: report.imageUrl,
                        child: ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                          child: CachedNetworkImage(
                            imageUrl: report.imageUrl,
                            height: 200,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Shimmer.fromColors(
                              baseColor: Colors.grey[300]!,
                              highlightColor: Colors.grey[100]!,
                              child: Container(
                                height: 200,
                                color: Colors.white,
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              height: 200,
                              color: Colors.grey.shade200,
                              child: const Center(child: Icon(Icons.broken_image, size: 40)),
                            ),
                          ),
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              "Signalement",
                              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                            const Spacer(),
                            _buildStatusBadge(report.status),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          report.description,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                            const SizedBox(width: 6),
                            Text(
                              DateFormat('dd/MM/yyyy à HH:mm').format(report.reportedAt),
                              style: const TextStyle(color: Colors.grey),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: Colors.redAccent),
                            const SizedBox(width: 6),
                            Text(
                              "${report.latitude.toStringAsFixed(4)}, ${report.longitude.toStringAsFixed(4)}",
                              style: const TextStyle(color: Colors.grey),
                            ),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(Icons.map),
                              tooltip: "Voir sur la carte",
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => TechnicianMap(destinationSignalement: report),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                        if (maintenance.status != MaintenanceStatus.completed) ...[
                          const Divider(height: 24),
                          Center(
                            child: ElevatedButton.icon(
                              icon: const Icon(Icons.check_circle),
                              label: const Text("Terminer la maintenance"),
                              onPressed: () => _finishMaintenance(maintenance),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 24,
                                  vertical: 12,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 500.ms).slideY(),
        ],
      ),
    );
  }
}
