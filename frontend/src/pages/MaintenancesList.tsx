import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaintenances, fetchTeams, updateMaintenanceStatus, deleteMaintenance } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileDown, Plus, Calendar, Wrench, Clock, Trash2, ArrowUpDown, X, Filter, Search, BarChart3, RefreshCw, Download } from 'lucide-react';
import type { MaintenanceStatus, Maintenance, Team } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CreateMaintenanceForm from '@/components/CreateMaintenanceForm';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { utils, writeFileXLSX } from 'xlsx';
import { DialogDescription } from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';

const getStatusBadge = (status?: MaintenanceStatus) => {
  const styles: { [key: string]: string } = {
    PLANIFIE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300',
    TERMINE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300',
  };
  return (
    <Badge 
      variant="outline" 
      className={`${styles[status || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300'} px-3 py-1 font-medium text-xs`}
    >
      {status === 'PLANIFIE' ? 'Planifié' :
       status === 'TERMINE' ? 'Terminé' :
       status === 'PENDING' ? 'En Attente' : 'Inconnu'}
    </Badge>
  );
};

const enrichMaintenanceWithTeamDetails = (maintenance: Maintenance, teams: Team[]): Maintenance => {
  if (!maintenance.teamId || !teams) return maintenance;
  const team = teams.find(t => t.id === maintenance.teamId);
  return {
    ...maintenance,
    teamDetails: team ? { id: team.id, name: team.name, createdAt: team.createdAt } : undefined,
  };
};

const Maintenances = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('id');
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<{
    status: MaintenanceStatus | undefined;
    search: string;
    dateFrom: string;
    dateTo: string;
  }>({
    status: undefined,
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const [sort, setSort] = useState<{ key: keyof Maintenance; order: 'asc' | 'desc' }>({
    key: 'plannedDate',
    order: 'asc',
  });

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const { 
    data: maintenances = [], 
    isLoading: isLoadingMaintenances 
  } = useQuery({
    queryKey: ['maintenances'],
    queryFn: fetchMaintenances,
  });

  const { 
    data: teams = [], 
    isLoading: isLoadingTeams 
  } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) => 
      updateMaintenanceStatus(id, status),
    onSuccess: () => {
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut de la maintenance a été mis à jour avec succès.',
      });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['signalements'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaintenance(id),
    onSuccess: () => {
      toast({
        title: 'Maintenance supprimée',
        description: 'La maintenance a été supprimée avec succès.',
      });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['signalements'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la maintenance.',
        variant: 'destructive',
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setPage(1);
    if (key === 'status') {
      setFilters(prev => ({ 
        ...prev, 
        [key]: value ? value as MaintenanceStatus : undefined 
      }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({
      status: undefined,
      search: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  const handleSort = (key: keyof Maintenance) => {
    setSort(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleStatusChange = (id: string, status: MaintenanceStatus) => {
    if (!id) {
      toast({
        title: 'Erreur',
        description: 'ID de maintenance manquant.',
        variant: 'destructive',
      });
      return;
    }
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (!id) return;
    deleteMutation.mutate(id);
  };

  const getFilteredAndSortedMaintenances = (excludePending = true) => {
    if (!maintenances || !teams) return [];
    let filtered = maintenances.map(m => enrichMaintenanceWithTeamDetails(m, teams));
    
    if (excludePending) {
      filtered = filtered.filter(m => m.status !== 'PENDING');
    }

    if (filters.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchLower) ||
        m.teamDetails?.name.toLowerCase().includes(searchLower) ||
        m.type?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(m => {
        try {
          return new Date(m.plannedDate) >= new Date(filters.dateFrom);
        } catch {
          return false;
        }
      });
    }
    if (filters.dateTo) {
      filtered = filtered.filter(m => {
        try {
          return new Date(m.plannedDate) <= new Date(filters.dateTo);
        } catch {
          return false;
        }
      });
    }
    return filtered.sort((a, b) => {
      if (sort.key === 'teamDetails') {
        const aValue = a.teamDetails?.name || '';
        const bValue = b.teamDetails?.name || '';
        return sort.order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      const aValue = a[sort.key] || '';
      const bValue = b[sort.key] || '';
      if (sort.key === 'plannedDate') {
        const aDate = new Date(aValue as string).getTime();
        const bDate = new Date(bValue as string).getTime();
        return sort.order === 'asc' ? aDate - bDate : bDate - aDate;
      }
      return sort.order === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  };

  const paginatedMaintenances = getFilteredAndSortedMaintenances().slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const pendingMaintenances = getFilteredAndSortedMaintenances(false).filter(m => m.status === 'PENDING');

  const totalPages = Math.ceil(getFilteredAndSortedMaintenances().length / itemsPerPage);

  const formatDate = (dateInput?: string): string => {
    if (!dateInput) return 'Date inconnue';
    try {
      const date = parseISO(dateInput);
      return format(date, 'd MMMM yyyy', { locale: fr });
    } catch (error) {
      console.error('Invalid date:', dateInput, error);
      return 'Date invalide';
    }
  };

  const formatCalendarDate = (dateInput?: string): string => {
    if (!dateInput) return 'Date inconnue';
    try {
      const date = parseISO(dateInput);
      return format(date, 'd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const getMaintenancesByMonth = () => {
    const grouped: { [key: string]: Maintenance[] } = {};
    getFilteredAndSortedMaintenances().forEach((maintenance) => {
      try {
        const date = parseISO(maintenance.plannedDate);
        const month = format(date, 'MMMM yyyy', { locale: fr });
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(maintenance);
      } catch (error) {
        console.error(`Invalid date for maintenance ${maintenance.id || 'unknown'}:`, maintenance.plannedDate);
      }
    });
    return grouped;
  };

  const isLoading = isLoadingMaintenances || isLoadingTeams;

  // Calculate stats for cards
  const stats = {
    total: getFilteredAndSortedMaintenances().length,
    planned: getFilteredAndSortedMaintenances().filter(m => m.status === 'PLANIFIE').length,
    completed: getFilteredAndSortedMaintenances().filter(m => m.status === 'TERMINE').length,
    pending: pendingMaintenances.length,
  };

  // Export maintenances to Excel
  const handleExportExcel = () => {
    const maints = getFilteredAndSortedMaintenances(false);
    if (!maints.length) {
      toast({
        title: 'Aucune maintenance à exporter',
        description: 'Aucune donnée disponible pour l\'export.',
        variant: 'destructive',
      });
      return;
    }
    const data = maints.map(m => ({
      Titre: m.title,
      'Date planifiée': formatDate(m.plannedDate),
      Équipe: m.teamDetails?.name || 'Non assignée',
      Type: m.type || 'Inconnu',
      'Durée estimée (h)': m.estimatedDurationHours || 0,
      Statut: m.status,
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Maintenances');
    writeFileXLSX(wb, 'maintenances.xlsx');
  };

  const hasActiveFilters = filters.status || filters.search || filters.dateFrom || filters.dateTo;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key="maintenances-view"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Gestion des Maintenances</h2>
              <p className="text-muted-foreground mt-2">
                Planifiez et gérez toutes les maintenances
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleExportExcel}
                disabled={getFilteredAndSortedMaintenances(false).length === 0}
              >
                <Download className="h-4 w-4" /> Exporter
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nouveau
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer une maintenance</DialogTitle>
                    <DialogDescription>
                      Ajoutez une nouvelle maintenance planifiée pour vos équipes.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateMaintenanceForm
                    onSuccess={() => {
                      setIsCreateDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
                      queryClient.invalidateQueries({ queryKey: ['signalements'] });
                      toast({
                        title: "Maintenance créée",
                        description: "La maintenance a été créée avec succès.",
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</CardTitle>
                <Wrench className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Maintenances au total</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Planifiées</CardTitle>
                <Calendar className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.planned}</div>
                <p className="text-sm text-muted-foreground">À réaliser</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Terminées</CardTitle>
                <Clock className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.completed}</div>
                <p className="text-sm text-muted-foreground">Réalisées</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">En attente</CardTitle>
                <Clock className="h-5 w-5 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.pending}</div>
                <p className="text-sm text-muted-foreground">En validation</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Card */}
          <AnimatePresence>
            {isFiltersExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6 border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle>Filtres</CardTitle>
                          <CardDescription>Affinez votre recherche</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="gap-2"
                          >
                            <X className="h-4 w-4" /> Effacer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsFiltersExpanded(false)}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" /> Fermer
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Recherche
                        </label>
                        <Input
                          placeholder="Titre, équipe ou type..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statut</label>
                        <Select 
                          value={filters.status || "all"} 
                          onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="PLANIFIE">Planifié</SelectItem>
                            <SelectItem value="TERMINE">Terminé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date début
                        </label>
                        <Input 
                          type="date" 
                          value={filters.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date fin
                        </label>
                        <Input 
                          type="date" 
                          value={filters.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs Navigation */}
          <Tabs defaultValue="list" className="mb-6 pt-3">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <span>Liste</span>
                <Badge variant="secondary" className="ml-1">
                  {getFilteredAndSortedMaintenances().length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <span>Calendrier</span>
              </TabsTrigger>
            </TabsList>

            {/* List View */}
            <TabsContent value="list" className="mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Liste des maintenances</CardTitle>
                      <CardDescription>
                        {isLoading ? 'Chargement...' : 
                          `${getFilteredAndSortedMaintenances().length} maintenances trouvées`}
                      </CardDescription>
                    </div>
                    
                    {getFilteredAndSortedMaintenances().length > itemsPerPage && (
                      <Pagination className="m-0">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNumber = i + 1;
                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink 
                                  isActive={pageNumber === page}
                                  onClick={() => setPage(pageNumber)}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          {totalPages > 5 && (
                            <PaginationItem>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array(5).fill(0).map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : paginatedMaintenances.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>
                              <Button 
                                variant="ghost" 
                                onClick={() => handleSort('title')}
                                className="flex items-center gap-1 font-medium hover:bg-transparent"
                              >
                                Titre 
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button 
                                variant="ghost" 
                                onClick={() => handleSort('plannedDate')}
                                className="flex items-center gap-1 font-medium hover:bg-transparent"
                              >
                                Date Planifiée 
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button 
                                variant="ghost" 
                                onClick={() => handleSort('teamDetails')}
                                className="flex items-center gap-1 font-medium hover:bg-transparent"
                              >
                                Équipe 
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Durée</TableHead>
                            <TableHead>
                              <Button 
                                variant="ghost" 
                                onClick={() => handleSort('status')}
                                className="flex items-center gap-1 font-medium hover:bg-transparent"
                              >
                                Statut 
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedMaintenances.map((maintenance) => (
                            <TableRow 
                              key={maintenance.id} 
                              className={`group cursor-pointer hover:bg-muted/30 transition-colors ${maintenance.id === highlightedId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              onClick={() => maintenance.id && navigate(`/maintenance/${maintenance.id}`)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {maintenance.title || 'Sans titre'}
                                  {maintenance.id === highlightedId && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                      Nouveau
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {formatDate(maintenance.plannedDate)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {maintenance.teamDetails?.name || (
                                  <span className="text-muted-foreground">Non assignée</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {maintenance.type || (
                                  <span className="text-muted-foreground">Non spécifié</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {maintenance.estimatedDurationHours || 0}h
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(maintenance.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  <Select 
                                    value={maintenance.status}
                                    onValueChange={(value) => handleStatusChange(maintenance.id, value as MaintenanceStatus)}
                                    disabled={updateStatusMutation.isPending || !maintenance.id}
                                  >
                                    <SelectTrigger className="w-[130px]">
                                      <SelectValue placeholder="Changer statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PLANIFIE">Planifié</SelectItem>
                                      <SelectItem value="TERMINE">Terminé</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette maintenance ?')) {
                                        handleDelete(maintenance.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending || !maintenance.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Aucune maintenance trouvée</h3>
                      <p className="text-muted-foreground mb-4">
                        {hasActiveFilters 
                          ? "Essayez de modifier vos critères de recherche." 
                          : "Commencez par créer votre première maintenance."
                        }
                      </p>
                      {hasActiveFilters ? (
                        <Button variant="outline" onClick={clearFilters}>
                          Réinitialiser les filtres
                        </Button>
                      ) : (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                          Créer une maintenance
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Calendar View */}
            <TabsContent value="calendar" className="mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Calendrier des maintenances</CardTitle>
                  <CardDescription>Vue mensuelle des maintenances planifiées</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array(3).fill(0).map((_, index) => (
                        <Skeleton key={index} className="h-48 w-full" />
                      ))}
                    </div>
                  ) : Object.keys(getMaintenancesByMonth()).length > 0 ? (
                    <div className="space-y-8">
                      {Object.entries(getMaintenancesByMonth()).map(([month, monthMaintenances]) => (
                        <div key={month} className="space-y-4">
                          <h3 className="text-xl font-semibold capitalize">{month}</h3>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {monthMaintenances.map((maintenance) => (
                              <Card 
                                key={maintenance.id} 
                                className={`cursor-pointer border-l-4 ${
                                  maintenance.status === 'TERMINE' 
                                    ? 'border-l-green-500' 
                                    : maintenance.status === 'PLANIFIE'
                                    ? 'border-l-orange-500'
                                    : 'border-l-yellow-500'
                                } ${maintenance.id === highlightedId ? 'ring-2 ring-blue-500' : ''} transition-all hover:shadow-md`}
                                onClick={() => maintenance.id && navigate(`/maintenance/${maintenance.id}`)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-1 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-base line-clamp-1">{maintenance.title || 'Sans titre'}</h4>
                                        {getStatusBadge(maintenance.status)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3 w-3" />
                                          {formatCalendarDate(maintenance.plannedDate)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3" />
                                          {maintenance.estimatedDurationHours || 0} heure(s)
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">Type:</span> {maintenance.type || 'Non spécifié'}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Équipe:</span> {maintenance.teamDetails?.name || 'Non assignée'}
                                    </p>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Select 
                                      value={maintenance.status}
                                      onValueChange={(value) => handleStatusChange(maintenance.id, value as MaintenanceStatus)}
                                      disabled={updateStatusMutation.isPending || !maintenance.id}
                                    >
                                      <SelectTrigger className="w-[100px] h-8">
                                        <SelectValue placeholder="Statut" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="PLANIFIE">Planifié</SelectItem>
                                        <SelectItem value="TERMINE">Terminé</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette maintenance ?')) {
                                          handleDelete(maintenance.id);
                                        }
                                      }}
                                      disabled={deleteMutation.isPending || !maintenance.id}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Aucune maintenance trouvée</h3>
                      <p className="text-muted-foreground mb-4">
                        {hasActiveFilters 
                          ? "Essayez de modifier vos critères de recherche." 
                          : "Commencez par créer votre première maintenance."
                        }
                      </p>
                      {hasActiveFilters ? (
                        <Button variant="outline" onClick={clearFilters}>
                          Réinitialiser les filtres
                        </Button>
                      ) : (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                          Créer une maintenance
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Maintenances;