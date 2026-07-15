import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:animations/animations.dart';
import '../../models/user/report.dart';
import '../../services/user/report_service.dart';
import '../../models/user/report_details_screen.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  static const Color primaryColor = Color(0xFF000000);
  static const Color backgroundColor = Color(0xFFF8F9FF);
  static const Color cardColor = Colors.white;

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm');

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        title: Text(
          'Historique',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        elevation: 0,
        backgroundColor: backgroundColor,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          return Future.delayed(const Duration(milliseconds: 500));
        },
        color: primaryColor,
        backgroundColor: Colors.white,
        child: StreamBuilder<List<Report>>(
          stream: ReportService().streamUserReports(uid),
          builder: (ctx, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return _buildLoadingShimmer();
            }

            final reports = snap.data ?? [];

            if (reports.isEmpty) {
              return _buildEmptyState(context);
            }

            return ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              itemCount: reports.length,
              itemBuilder: (_, i) {
                final report = reports[i];
                final formattedDate = dateFmt.format(report.reportedAt);
                final status = _translateStatus(report.status);
                final statusColor = _getStatusColor(report.status);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: OpenContainer(
                    transitionType: ContainerTransitionType.fadeThrough,
                    openBuilder: (context, _) => ReportDetailsScreen(report: report),
                    closedShape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    closedElevation: 0,
                    closedColor: cardColor,
                    middleColor: backgroundColor,
                    closedBuilder: (context, openContainer) => InkWell(
                      onTap: openContainer,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(16),
                              ),
                              child: AspectRatio(
                                aspectRatio: 16 / 9,
                                child: Hero(
                                  tag: 'report_image_${report.id}',
                                  child: CachedNetworkImage(
                                    imageUrl: report.imageUrl,
                                    fit: BoxFit.cover,
                                    placeholder: (context, url) => Shimmer.fromColors(
                                      baseColor: Colors.grey[300]!,
                                      highlightColor: Colors.grey[100]!,
                                      child: Container(color: Colors.white),
                                    ),
                                    errorWidget: (context, url, error) => Container(
                                      color: Colors.grey[200],
                                      child: Icon(
                                        Icons.error_outline_rounded,
                                        size: 32,
                                        color: Colors.grey[400],
                                      ),
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
                                      Expanded(
                                        child: Text(
                                          report.description,
                                          style: GoogleFonts.poppins(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: const Color(0xFF2D3142),
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          status,
                                          style: GoogleFonts.poppins(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: statusColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.calendar_today_rounded,
                                        size: 14,
                                        color: Colors.grey[600],
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        formattedDate,
                                        style: GoogleFonts.poppins(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                      if (report.latitude != 0 && report.longitude != 0) ...[
                                        const SizedBox(width: 16),
                                        Icon(
                                          Icons.location_on_rounded,
                                          size: 14,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            '${report.latitude.toStringAsFixed(4)}, ${report.longitude.toStringAsFixed(4)}',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              color: Colors.grey[600],
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildLoadingShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 3,
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Container(
            height: 240,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.history_rounded, size: 64, color: primaryColor),
            ),
            const SizedBox(height: 24),
            Text(
              'Aucun signalement',
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF2D3142),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Commencez à signaler des nids-de-poule',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              icon: const Icon(Icons.add_rounded),
              label: Text(
                'Nouveau signalement',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => Navigator.of(context).pushNamed('/new-report'),
            ),
          ],
        ),
      ),
    );
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
