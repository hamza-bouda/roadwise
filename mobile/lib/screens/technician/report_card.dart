import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:maps_launcher/maps_launcher.dart';
import 'package:intl/intl.dart';
import '../../models/user/report.dart';
import '../../providers/technician/technician_provider.dart';

class ReportCard extends StatefulWidget {
  final Report report;
  const ReportCard({super.key, required this.report});

  @override
  State<ReportCard> createState() => _ReportCardState();
}

class _ReportCardState extends State<ReportCard> with SingleTickerProviderStateMixin {
  late String _currentStatus;
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.report.status;
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'NOUVEAU':
        return Colors.blue;
      case 'EN_COURS':
        return Colors.orange;
      case 'RÉSOLU':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Future<void> _updateStatus(String? newStatus) async {
    if (newStatus == null) return;
    await Provider.of<TechnicianProvider>(context, listen: false)
        .updateReportStatus(widget.report.id, newStatus);
    setState(() => _currentStatus = newStatus);
  }

  @override
  Widget build(BuildContext context) {
    final dateStr =
    DateFormat.yMMMd('fr_FR').add_Hm().format(widget.report.reportedAt);

    return MouseRegion(
      onEnter: (_) => _controller.forward(),
      onExit: (_) => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
            elevation: 4,
            margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.report.description,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          color: _getStatusColor(_currentStatus).withOpacity(0.1),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _currentStatus,
                            items: ['NOUVEAU', 'EN_COURS', 'RÉSOLU']
                                .map((st) => DropdownMenuItem(
                              value: st,
                              child: Text(
                                st,
                                style: TextStyle(
                                  color: _getStatusColor(st),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ))
                                .toList(),
                            onChanged: _updateStatus,
                            icon: Icon(
                              Icons.arrow_drop_down,
                              color: _getStatusColor(_currentStatus),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Icon(Icons.access_time, size: 18, color: Colors.grey[700]),
                            const SizedBox(width: 8),
                            Text(
                              'Signalé le $dateStr',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.grey[700],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.location_on, size: 18, color: Colors.red.shade400),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${widget.report.latitude.toStringAsFixed(5)}, ${widget.report.longitude.toStringAsFixed(5)}',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Colors.grey[700],
                                ),
                              ),
                            ),
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(20),
                                onTap: () {
                                  MapsLauncher.launchCoordinates(
                                    widget.report.latitude,
                                    widget.report.longitude,
                                    'Signalement: ${widget.report.description}',
                                  );
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(8.0),
                                  child: Row(
                                    children: [
                                      Icon(Icons.map, color: Theme.of(context).primaryColor),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Voir sur la carte',
                                        style: TextStyle(
                                          color: Theme.of(context).primaryColor,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  if (widget.report.imageUrl.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Hero(
                      tag: 'report_image_${widget.report.id}',
                      child: Material(
                        elevation: 2,
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () {
                            // Ouvrir l'image en plein écran
                            showDialog(
                              context: context,
                              builder: (context) => Dialog(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    widget.report.imageUrl,
                                    fit: BoxFit.contain,
                                  ),
                                ),
                              ),
                            );
                          },
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              widget.report.imageUrl,
                              width: double.infinity,
                              height: 200,
                              fit: BoxFit.cover,
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Container(
                                  height: 200,
                                  width: double.infinity,
                                  color: Colors.grey[200],
                                  child: Center(
                                    child: CircularProgressIndicator(
                                      value: loadingProgress.expectedTotalBytes != null
                                          ? loadingProgress.cumulativeBytesLoaded /
                                          loadingProgress.expectedTotalBytes!
                                          : null,
                                    ),
                                  ),
                                );
                              },
                              errorBuilder: (context, error, stackTrace) => Container(
                                height: 200,
                                width: double.infinity,
                                color: Colors.grey[200],
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.broken_image, size: 50, color: Colors.grey[400]),
                                    const SizedBox(height: 8),
                                    Text(
                                      "Impossible de charger l'image",
                                      style: TextStyle(color: Colors.grey[600]),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
