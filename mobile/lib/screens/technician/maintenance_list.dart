import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/technician/maintenance.dart';
import '../../providers/technician/technician_provider.dart';
import 'maintenance_detail.dart';

class MaintenanceList extends StatefulWidget {
  const MaintenanceList({super.key});

  @override
  State<MaintenanceList> createState() => _MaintenanceListState();
}

class _MaintenanceListState extends State<MaintenanceList> {
  bool _loading = true;
  bool _showOnlyPlanned = false;
  String _searchQuery = '';
  String _sortBy = 'date'; // 'date' ou 'status'
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final provider = context.read<TechnicianProvider>();
      provider.startListening();
      await Future.delayed(const Duration(milliseconds: 1200));
      setState(() => _loading = false);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  List<Maintenance> _filterAndSortMaintenances(List<Maintenance> maintenances) {
    var filteredList = maintenances;

    // Filtre planifié
    if (_showOnlyPlanned) {
      filteredList = filteredList.where((m) => m.status == MaintenanceStatus.planned).toList();
    }

    // Filtre recherche
    if (_searchQuery.isNotEmpty) {
      filteredList = filteredList
          .where((m) => m.title.toLowerCase().contains(_searchQuery.toLowerCase()))
          .toList();
    }

    // Tri
    switch (_sortBy) {
      case 'date':
        filteredList.sort((a, b) => b.plannedDate.compareTo(a.plannedDate));
        break;
      case 'status':
        filteredList.sort((a, b) => a.status.index.compareTo(b.status.index));
        break;
    }

    return filteredList;
  }

  Widget _buildStatisticsCard(List<Maintenance> maintenances) {
    final total = maintenances.length;
    final planned = maintenances.where((m) => m.status == MaintenanceStatus.planned).length;
    final inProgress = maintenances.where((m) => m.status == MaintenanceStatus.inProgress).length;
    final completed = maintenances.where((m) => m.status == MaintenanceStatus.completed).length;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Aperçu des tâches',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem('Total', total, Colors.blue),
                _buildStatItem('Planifiées', planned, Colors.orange),
                _buildStatItem('En cours', inProgress, Colors.purple),
                _buildStatItem('Terminées', completed, Colors.green),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn().slideY(begin: -0.2);
  }

  Widget _buildStatItem(String label, int value, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            value.toString(),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<TechnicianProvider>();
    final maints = _filterAndSortMaintenances(prov.maintList);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Mes Tâches"),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Rechercher une tâche...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
                    : null,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Trier par',
            icon: const Icon(Icons.sort),
            onSelected: (value) => setState(() => _sortBy = value),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'date',
                child: Row(
                  children: [
                    Icon(Icons.calendar_today, size: 20),
                    SizedBox(width: 8),
                    Text('Trier par date'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'status',
                child: Row(
                  children: [
                    Icon(Icons.flag, size: 20),
                    SizedBox(width: 8),
                    Text('Trier par statut'),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            tooltip: "Afficher uniquement planifiées",
            icon: Icon(
              _showOnlyPlanned ? Icons.filter_alt : Icons.filter_alt_outlined,
            ),
            onPressed: () => setState(() => _showOnlyPlanned = !_showOnlyPlanned),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : maints.isEmpty
          ? Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 72, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? "Aucun résultat pour '$_searchQuery'"
                  : "Aucune intervention trouvée.",
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            )
          ],
        ).animate().fade().scale(),
      )
          : RefreshIndicator(
        onRefresh: () async {
          setState(() => _loading = true);
          await prov.refreshMaintenances();
          setState(() => _loading = false);
        },
        child: ListView(
          controller: _scrollController,
          padding: const EdgeInsets.only(bottom: 16),
          children: [
            _buildStatisticsCard(prov.maintList),
            ...maints.map((m) => _buildMaintenanceCard(context, m)
                .animate()
                .fadeIn()
                .slideY(begin: 0.2)),
          ],
        ),
      ),
      floatingActionButton: _scrollController.hasClients &&
          _scrollController.offset > 100
          ? FloatingActionButton(
        mini: true,
        child: const Icon(Icons.arrow_upward),
        onPressed: () {
          _scrollController.animateTo(
            0,
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeInOut,
          );
        },
      ).animate().fade()
          : null,
    );
  }

  Widget _buildMaintenanceCard(BuildContext context, Maintenance m) {
    final dateStr = DateFormat("EEEE d MMMM yyyy 'à' HH:mm", 'fr_FR').format(m.plannedDate.toLocal());
    final now = DateTime.now();
    final isLate = m.status == MaintenanceStatus.planned && m.plannedDate.isBefore(now);

    Color chipColor;
    IconData icon;
    switch (m.status) {
      case MaintenanceStatus.inProgress:
        chipColor = Colors.orange.shade700;
        icon = Icons.play_arrow;
        break;
      case MaintenanceStatus.completed:
        chipColor = Colors.green.shade700;
        icon = Icons.check_circle;
        break;
      case MaintenanceStatus.planned:
        chipColor = isLate ? Colors.red : Colors.blue;
        icon = isLate ? Icons.warning : Icons.schedule;
        break;
      case MaintenanceStatus.cancelled:
        chipColor = Colors.red;
        icon = Icons.cancel;
        break;
    }

    return Card(
      elevation: 3,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          final prov = context.read<TechnicianProvider>();
          await prov.selectMaintenance(m);
          if (prov.currentMaintenance != null && mounted) {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const MaintenanceDetail()),
            );
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: chipColor.withOpacity(0.15),
                    child: Icon(icon, size: 30, color: chipColor),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(
                              Icons.calendar_today,
                              size: 16,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              dateStr,
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (isLate) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.warning, size: 16, color: Colors.red.shade700),
                      const SizedBox(width: 8),
                      Text(
                        'Intervention en retard',
                        style: TextStyle(
                          color: Colors.red.shade700,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Chip(
                label: Text(
                  m.status.displayName.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                backgroundColor: chipColor,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
