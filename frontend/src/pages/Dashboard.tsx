import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats, fetchSignalements, fetchMaintenances } from '@/services/dataService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Clock, Wrench, Search, TrendingUp, AlertCircle, BarChart3, UserCheck, RefreshCw } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';
import { parseISO, format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signalementFilter, setSignalementFilter] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    error: statsError, 
    refetch: refetchStats 
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 300000,
  });

  const { 
    data: signalements, 
    isLoading: isLoadingSignalements, 
    error: signalementsError, 
    refetch: refetchSignalements 
  } = useQuery({
    queryKey: ['signalements'],
    queryFn: fetchSignalements,
  });

  const { 
    data: maintenances, 
    isLoading: isLoadingMaintenances, 
    error: maintenancesError, 
    refetch: refetchMaintenances 
  } = useQuery({
    queryKey: ['maintenances'],
    queryFn: fetchMaintenances,
  });

  const isLoading = isLoadingStats || isLoadingSignalements || isLoadingMaintenances;
  const hasError = statsError || signalementsError || maintenancesError;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Use the refetch functions from each query for immediate refresh
      await Promise.all([
        refetchStats(),
        refetchSignalements(),
        refetchMaintenances()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const STATUS_COLORS = {
    EN_VALIDATION: '#a521d9',
    NOUVEAU: '#FF8042',
    EN_COURS: '#FFBB28',
    REPARE: '#00C49F',
    PLANIFIE: '#0088FE',
    TERMINE: '#00C49F',
    PENDING: '#9ca3af',
  };

  const getSignalementStatusData = () => {
    if (!stats?.signalementsByStatus) return [];
    return [
      { name: 'À valider', value: stats.signalementsByStatus.validationCount || 0, color: STATUS_COLORS.EN_VALIDATION },
      { name: 'Nouveau', value: stats.signalementsByStatus.newCount || 0, color: STATUS_COLORS.NOUVEAU },
      { name: 'En cours', value: stats.signalementsByStatus.inProgress || 0, color: STATUS_COLORS.EN_COURS },
      { name: 'Réparé', value: stats.signalementsByStatus.repaired || 0, color: STATUS_COLORS.REPARE },
    ].filter(entry => entry.value > 0);
  };

  const getMaintenanceStatusData = () => {
    if (!stats?.maintenancesByStatus) return [];
    return [
      { name: 'En attente', value: stats.maintenancesByStatus.validationCount || 0, color: STATUS_COLORS.PENDING },
      { name: 'En cours', value: stats.maintenancesByStatus.inProgress || 0, color: STATUS_COLORS.PLANIFIE },
      { name: 'Terminé', value: stats.maintenancesByStatus.completed || 0, color: STATUS_COLORS.TERMINE },
    ].filter(entry => entry.value > 0);
  };

  const getSignalementsOverTime = () => {
    if (!signalements) return [];
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => subDays(today, i)).reverse();
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = signalements.filter(s => {
        try {
          return format(parseISO(s.reportedAt), 'yyyy-MM-dd') === dateStr;
        } catch (e) {
          return false;
        }
      }).length;
      return { name: format(date, 'd MMM', { locale: fr }), value: count };
    });
  };

  const getRecentSignalements = () => {
    if (!signalements) return [];
    return [...signalements]
      .filter(s => 
        s.description?.toLowerCase().includes(signalementFilter.toLowerCase()) ||
        s.detectedByName?.toLowerCase().includes(signalementFilter.toLowerCase()) ||
        s.id?.toLowerCase().includes(signalementFilter.toLowerCase())
      )
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
      .slice(0, 5);
  };

  const getRecentMaintenances = () => {
    if (!maintenances) return [];
    return [...maintenances]
      .filter(m => m.status === "PLANIFIE")
      .sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime())
      .slice(0, 5);
  };

  const formatDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'd MMMM yyyy, HH:mm', { locale: fr });
    } catch (error) {
      console.error('Invalid date:', dateString, error);
      return 'Date invalide';
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      EN_VALIDATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      NOUVEAU: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      EN_COURS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      REPARE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      PLANIFIE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      TERMINE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return (
      <Badge variant="outline" className={`${styles[status] || 'bg-gray-100 text-gray-800'} text-xs`}>
        {status === 'NOUVEAU' ? 'Nouveau' :
         status === 'EN_VALIDATION' ? 'En validation' :
         status === 'EN_COURS' ? 'En cours' :
         status === 'REPARE' ? 'Réparé' :
         status === 'PLANIFIE' ? 'Planifié' :
         status === 'TERMINE' ? 'Terminé' :
         status === 'PENDING' ? 'En attente' : status}
      </Badge>
    );
  };

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

    const repairRate = stats.totalSignalements > 0
      ? Math.round((stats.signalementsByStatus.repaired / stats.totalSignalements) * 100)
      : 0;

    const statCards = [
      {
        title: "Signalements ce mois",
        value: stats.signalementsThisMonth,
        subtitle: `Total signalements: ${stats.totalSignalements}`,
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        trend: stats.signalementsThisMonth > 0 ? 'up' : 'neutral'
      },
      {
        title: "Signalements à valider",
        value: stats.signalementsByStatus.validationCount || 0,
        subtitle: "En attente de validation",
        icon: <UserCheck className="h-5 w-5 text-purple-500" />,
        trend: 'neutral'
      },
      {
        title: "Nids-de-poule réparés",
        value: stats.signalementsByStatus.repaired || 0,
        subtitle: `${repairRate}% du total`,
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        trend: 'up'
      },
      {
        title: "Maintenances planifiées",
        value: stats.maintenancesByStatus.inProgress || 0,
        subtitle: "En cours de traitement",
        icon: <Clock className="h-5 w-5 text-blue-500" />,
        trend: stats.maintenancesByStatus.inProgress > 0 ? 'up' : 'neutral'
      },
      {
        title: "Maintenances terminées",
        value: stats.maintenancesByStatus.completed || 0,
        subtitle: `Ce mois: ${stats.maintenancesCompletedThisMonth}`,
        icon: <Wrench className="h-5 w-5 text-green-500" />,
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

  const renderLoadingState = () => (
    <div className="space-y-6">
      <Skeleton className="h-[400px] w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );

  const renderErrorState = () => (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">Erreur de chargement</h3>
          <p className="text-muted-foreground mb-4">
            Impossible de charger les données du tableau de bord. Veuillez réessayer.
          </p>
          <Button 
            onClick={handleRefresh} 
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="label text-gray-700 dark:text-gray-300">{`${label} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Tableau de bord</h2>
          <p className="text-muted-foreground mt-2">
            Vue d'ensemble des signalements et maintenances
          </p>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualisation...' : 'Actualiser les données'}
        </Button>
      </div>
      
      {hasError ? (
        renderErrorState()
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {renderStatCards()}
          </div>
          
          {isLoading ? (
            renderLoadingState()
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="shadow-sm lg:col-span-2 border-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Signalements par jour (7 derniers jours)
                    </CardTitle>
                    <CardDescription>
                      Évolution du nombre de signalements sur la semaine
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getSignalementsOverTime()}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                          <Area type="monotone" dataKey="value" fill="#0088FE" fillOpacity={0.3} stroke="#0088FE" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Statut des signalements
                    </CardTitle>
                    <CardDescription>
                      Répartition des signalements par statut
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getSignalementStatusData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            label={({ value }) => value > 0 ? `${value}` : null}
                          >
                            {getSignalementStatusData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="shadow-sm border-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Statut des maintenances
                    </CardTitle>
                    <CardDescription>
                      Répartition des maintenances par statut
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getMaintenanceStatusData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            label={({ value }) => value > 0 ? value : null}
                          >
                            {getMaintenanceStatusData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value}`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm lg:col-span-2 border-0">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Signalements récents
                      </CardTitle>
                      <CardDescription>
                        Les 5 signalements les plus récents
                      </CardDescription>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filtrer..."
                        value={signalementFilter}
                        onChange={(e) => setSignalementFilter(e.target.value)}
                        className="w-64 pl-8"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Détecté par</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getRecentSignalements().map((signalement) => (
                          <TableRow 
                            key={signalement.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors" 
                            onClick={() => navigate(`/reports/${signalement.id}`)}
                          >
                            <TableCell className="font-medium max-w-xs truncate">
                              {signalement.description || 'Sans description'}
                            </TableCell>
                            <TableCell>{signalement.detectedByName || 'Inconnu'}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(signalement.reportedAt)}
                            </TableCell>
                            <TableCell>{getStatusBadge(signalement.status)}</TableCell>
                          </TableRow>
                        ))}
                        {getRecentSignalements().length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                              Aucun signalement trouvé
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Maintenances récentes
                    </CardTitle>
                    <CardDescription>
                      Les 5 dernières maintenances planifiées
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrer..."
                      value={maintenanceFilter}
                      onChange={(e) => setMaintenanceFilter(e.target.value)}
                      className="w-64 pl-8"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Équipe</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getRecentMaintenances().map((maintenance) => (
                        <TableRow 
                          key={maintenance.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors" 
                          onClick={() => maintenance.id && navigate(`/maintenance/${maintenance.id}`)}
                        >
                          <TableCell className="font-medium">{maintenance.title}</TableCell>
                          <TableCell>{maintenance.teamDetails?.name || 'Non assignée'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(maintenance.plannedDate)}
                          </TableCell>
                          <TableCell>{getStatusBadge(maintenance.status)}</TableCell>
                        </TableRow>
                      ))}
                      {getRecentMaintenances().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            Aucune maintenance planifiée
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;