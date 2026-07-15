import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchSignalements,
  filterSignalements,
  exportSignalementsToCSV,
} from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  FileDown, 
  X, 
  ArrowUpDown, 
  Download, 
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Wrench,
  UserCheck,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { motion, AnimatePresence } from 'framer-motion';
import { utils, writeFileXLSX } from 'xlsx';
import { SignalementStatus, Signalement } from '@/types';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Filters {
  status: SignalementStatus | undefined;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const ITEMS_PER_PAGE = 10;
const MAX_PAGINATION_ITEMS = 5;

// Colors matching the dashboard
const STATUS_COLORS = {
  EN_VALIDATION: '#a521d9',
  NOUVEAU: '#FF8042',
  EN_COURS: '#FFBB28',
  REPARE: '#00C49F',
  PLANIFIE: '#0088FE',
  TERMINE: '#00C49F',
  PENDING: '#9ca3af',
};

const SignalementsList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    status: undefined,
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const [sort, setSort] = useState({
    key: 'reportedAt',
    order: 'desc' as 'asc' | 'desc',
  });

  const [page, setPage] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const { data: signalements, isLoading, isError } = useQuery({
    queryKey: ['signalements'],
    queryFn: () => fetchSignalements(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleFilterChange = useCallback((key: keyof Filters, value: any) => {
    setPage(1);
    setFilters(prev => ({
      ...prev,
      [key]: key === 'status' && value === 'all' ? undefined : value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ status: undefined, dateFrom: '', dateTo: '', search: '' });
    setPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSort(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'Non spécifiée';
    
    try {
      // Try parsing as ISO date first
      const date = parseISO(dateString.replace(/\[UTC\]$/, ''));
      
      if (isValid(date)) {
        return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
      }
      
      // Fallback to the original method if parseISO fails
      return new Date(dateString.replace(/\[UTC\]$/, '')).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date invalide';
    }
  }, []);

  const filteredAndSortedSignalements = useMemo(() => {
    if (!signalements) return [];
    
    let filtered = [...signalements];

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        s =>
          (s.description?.toLowerCase().includes(searchLower) ||
          s.detectedByName?.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    // Date filters - handle timezone issues
    if (filters.dateFrom) {
      const from = startOfDay(new Date(filters.dateFrom));
      filtered = filtered.filter(s => {
        const reportedDate = new Date(s.reportedAt);
        return reportedDate >= from;
      });
    }
    
    if (filters.dateTo) {
      const to = endOfDay(new Date(filters.dateTo));
      filtered = filtered.filter(s => {
        const reportedDate = new Date(s.reportedAt);
        return reportedDate <= to;
      });
    }

    // Sort
    return filtered.sort((a, b) => {
      const aVal = a[sort.key as keyof Signalement];
      const bVal = b[sort.key as keyof Signalement];
      
      if (aVal === undefined || aVal === null) return sort.order === 'asc' ? -1 : 1;
      if (bVal === undefined || bVal === null) return sort.order === 'asc' ? 1 : -1;
      
      if (sort.key === 'reportedAt') {
        return sort.order === 'asc'
          ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
          : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
      }
      
      return sort.order === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [signalements, filters, sort]);

  const paginatedSignalements = useMemo(() => {
    return filteredAndSortedSignalements.slice(
      (page - 1) * ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE
    );
  }, [filteredAndSortedSignalements, page]);

  const totalPages = Math.ceil(filteredAndSortedSignalements.length / ITEMS_PER_PAGE);

  // Calculate stats for the cards
  const stats = useMemo(() => {
    if (!signalements) return null;
    
    const total = signalements.length;
    const nouveauCount = signalements.filter(s => s.status === 'NOUVEAU').length;
    const enCoursCount = signalements.filter(s => s.status === 'EN_COURS').length;
    const repareCount = signalements.filter(s => s.status === 'REPARE').length;
    const enValidationCount = signalements.filter(s => s.status === 'EN_VALIDATION').length;
    
    const repairRate = total > 0 ? Math.round((repareCount / total) * 100) : 0;
    
    return {
      total,
      nouveauCount,
      enCoursCount,
      repareCount,
      enValidationCount,
      repairRate
    };
  }, [signalements]);

  const handleExportCSV = useCallback(async () => {
    try {
      const data = filteredAndSortedSignalements;
      const sheetData = data.map(s => ({
        Description: s.description,
        Statut:
          s.status === 'NOUVEAU'
            ? 'Nouveau'
            : s.status === 'EN_COURS'
            ? 'En cours'
            : s.status === 'REPARE'
            ? 'Réparé'
            : s.status === 'EN_VALIDATION'
            ? 'En validation'
            : 'Inconnu',
        'Date de signalement': formatDate(s.reportedAt),
        'Détecté par': s.detectedByName || 'Inconnu',
        Latitude: s.latitude?.toFixed(6),
        Longitude: s.longitude?.toFixed(6),
      }));

      const worksheet = utils.json_to_sheet(sheetData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Signalements');
      writeFileXLSX(workbook, `signalements_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: 'Export réussi',
        description: 'Les données ont été exportées au format Excel (.xlsx).',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données. Veuillez réessayer.",
        variant: 'destructive',
      });
    }
  }, [filteredAndSortedSignalements, formatDate, toast]);

  const getStatusBadge = useCallback((status?: SignalementStatus) => {
    const styles = {
      EN_VALIDATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      NOUVEAU: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      EN_COURS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      REPARE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    
    const label =
      status === 'NOUVEAU'
        ? 'Nouveau'
        : status === 'EN_COURS'
        ? 'En cours'
        : status === 'REPARE'
        ? 'Réparé'
        : status === 'EN_VALIDATION'
        ? 'En validation'
        : 'Inconnu';

    return (
      <Badge
        variant="outline"
        className={`${styles[status || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'} px-3 py-1 font-medium text-xs`}
      >
        {label}
      </Badge>
    );
  }, []);

  const generatePaginationItems = useCallback(() => {
    if (totalPages <= MAX_PAGINATION_ITEMS) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: (number | string)[] = [];
    const half = Math.floor(MAX_PAGINATION_ITEMS / 2);
    
    if (page <= half + 1) {
      // Near the beginning
      for (let i = 1; i <= MAX_PAGINATION_ITEMS - 1; i++) {
        items.push(i);
      }
      items.push('ellipsis');
      items.push(totalPages);
    } else if (page >= totalPages - half) {
      // Near the end
      items.push(1);
      items.push('ellipsis');
      for (let i = totalPages - (MAX_PAGINATION_ITEMS - 2); i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // In the middle
      items.push(1);
      items.push('ellipsis');
      for (let i = page - Math.floor((MAX_PAGINATION_ITEMS - 4) / 2); i <= page + Math.floor((MAX_PAGINATION_ITEMS - 4) / 2); i++) {
        items.push(i);
      }
      items.push('ellipsis');
      items.push(totalPages);
    }
    
    return items;
  }, [page, totalPages]);

  const handleRowClick = useCallback((signalementId: string) => {
    navigate(`/reports/${signalementId}`);
  }, [navigate]);

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo || filters.search;

  const renderStatCards = () => {
    if (isLoading) {
      return Array(5).fill(0).map((_, index) => (
        <Card key={index} className="shadow-sm hover:shadow-md transition-shadow border-0">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardContent>
        </Card>
      ));
    }

    if (!stats) return null;

    const statCards = [
      {
        title: "Total signalements",
        value: stats.total,
        subtitle: "Tous les signalements",
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        trend: 'neutral'
      },
      {
        title: "Signalements à valider",
        value: stats.enValidationCount,
        subtitle: "En attente de validation",
        icon: <UserCheck className="h-5 w-5 text-purple-500" />,
        trend: 'neutral'
      },
      {
        title: "Nouveaux signalements",
        value: stats.nouveauCount,
        subtitle: "Non traités",
        icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
        trend: 'neutral'
      },
      {
        title: "En cours de traitement",
        value: stats.enCoursCount,
        subtitle: "maintenance planifiée",
        icon: <Clock className="h-5 w-5 text-blue-500" />,
        trend: 'neutral'
      },
      {
        title: "Signalements réparés",
        value: stats.repareCount,
        subtitle: `${stats.repairRate}% du total`,
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        trend: 'up'
      }
    ];

    return statCards.map((card, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.value}</div>
            <div className="flex items-center mt-1">
              <p className="text-sm text-muted-foreground">{card.subtitle}</p>
              {card.trend === 'up' && (
                <TrendingUp className="h-4 w-4 text-green-500 ml-2" />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ));
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground mb-4">
                Impossible de charger les signalements. Veuillez réessayer.
              </p>
              <Button onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key="signalements-view"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Signalements</h2>
              <p className="text-muted-foreground mt-2">
                Gérez et consultez tous les signalements
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
                onClick={handleExportCSV}
                className="gap-2"
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
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {renderStatCards()}
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
                        <Label htmlFor="search" className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Recherche
                        </Label>
                        <Input
                          id="search"
                          placeholder="Description, détecteur..."
                          value={filters.search}
                          onChange={e => handleFilterChange('search', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Statut</Label>
                        <Select
                          value={filters.status || 'all'}
                          onValueChange={value => handleFilterChange('status', value)}
                        >
                          <SelectTrigger id="status">
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="NOUVEAU">Nouveau</SelectItem>
                            <SelectItem value="EN_COURS">En cours</SelectItem>
                            <SelectItem value="REPARE">Réparé</SelectItem>
                            <SelectItem value="EN_VALIDATION">En validation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateFrom" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date début
                        </Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={filters.dateFrom}
                          onChange={e => handleFilterChange('dateFrom', e.target.value)}
                          max={filters.dateTo || undefined}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateTo" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date fin
                        </Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={filters.dateTo}
                          onChange={e => handleFilterChange('dateTo', e.target.value)}
                          min={filters.dateFrom || undefined}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signalements Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Liste des signalements</CardTitle>
                  <CardDescription>
                    {isLoading
                      ? 'Chargement des signalements...'
                      : `${filteredAndSortedSignalements.length} signalement${filteredAndSortedSignalements.length !== 1 ? 's' : ''} trouvé${filteredAndSortedSignalements.length !== 1 ? 's' : ''}`}
                  </CardDescription>
                </div>
                {!isLoading && totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {page} sur {totalPages}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <Skeleton className="h-16 w-16 rounded-md" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : paginatedSignalements.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[100px] text-center">Image</TableHead>
                          <TableHead className="w-[250px]">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSort('description')} 
                              className="flex items-center gap-1 p-0 h-auto font-medium hover:bg-transparent"
                            >
                              Description 
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[200px]">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSort('reportedAt')} 
                              className="flex items-center gap-1 p-0 h-auto font-medium hover:bg-transparent"
                            >
                              Date 
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[120px] text-center">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSort('status')} 
                              className="flex items-center gap-1 p-0 h-auto mx-auto font-medium hover:bg-transparent"
                            >
                              Statut 
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[150px] text-center">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleSort('detectedByName')} 
                              className="flex items-center gap-1 p-0 h-auto mx-auto font-medium hover:bg-transparent"
                            >
                              Détecté par 
                              <ArrowUpDown className="h-4 w-4" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSignalements.map(signalement => (
                          <TableRow 
                            key={signalement.id} 
                            className="group cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => handleRowClick(signalement.id)}
                          >
                            <TableCell className="text-center">
                              <div className="h-16 w-16 rounded-md overflow-hidden mx-auto border shadow-sm group-hover:shadow-md transition-shadow">
                                <img 
                                  src={signalement.imageUrl} 
                                  alt="Signalement" 
                                  className="object-cover w-full h-full transition-transform group-hover:scale-110 duration-300" 
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {signalement.description || 'Sans description'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                📍 {signalement.latitude?.toFixed(4)}, {signalement.longitude?.toFixed(4)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{formatDate(signalement.reportedAt)}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(signalement.status)}</TableCell>
                            <TableCell className="text-center font-medium">{signalement.detectedByName || 'Inconnu'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Affichage de {(page - 1) * ITEMS_PER_PAGE + 1} à {Math.min(page * ITEMS_PER_PAGE, filteredAndSortedSignalements.length)} sur {filteredAndSortedSignalements.length} signalements
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(1)}
                              disabled={page === 1}
                              className="gap-1"
                            >
                              <ChevronsLeft className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Précédent
                            </Button>
                          </PaginationItem>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="gap-1"
                            >
                              Suivant
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                          <PaginationItem>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(totalPages)}
                              disabled={page === totalPages}
                              className="gap-1"
                            >
                              <ChevronsRight className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center p-6 bg-muted/20 rounded-lg">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Aucun signalement trouvé</h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? "Essayez de modifier vos filtres de recherche."
                      : "Aucun signalement n'a été enregistré pour le moment."}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" className="mt-2" onClick={clearFilters}>
                      Effacer les filtres
                    </Button>
                  )}
                  {!hasActiveFilters && (
                    <Button 
                      variant="default" 
                      className="mt-2 gap-2"
                      onClick={() => setIsFiltersExpanded(true)}
                    >
                      <Filter className="h-4 w-4" />
                      Ouvrir les filtres
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SignalementsList;


