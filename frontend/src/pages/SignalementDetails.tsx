import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSignalement, fetchMaintenanceById } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Wrench,
  X,
  CheckCircle,
  Clock,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Signalement, Maintenance, SignalementStatus } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import CreateMaintenanceForm from '@/components/CreateMaintenanceForm';
import { motion, AnimatePresence } from 'framer-motion';

const SignalementDetails = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);

  const { data: signalement, isLoading, error } = useQuery<Signalement>({
    queryKey: ['signalement', id],
    queryFn: () => fetchSignalement(id || ''),
    enabled: !!id,
  });

  const { data: maintenance, isLoading: isLoadingMaintenance } = useQuery<Maintenance>({
    queryKey: ['maintenance', signalement?.maintenanceId],
    queryFn: () => fetchMaintenanceById(signalement?.maintenanceId || ''),
    enabled: !!signalement?.maintenanceId,
  });

  useEffect(() => {
    document.body.style.overflow = isImageOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isImageOpen]);

  const getStatusBadge = (status?: SignalementStatus) => {
    switch (status) {
      case 'NOUVEAU':
        return <Badge className="bg-orange-500 text-white">Nouveau</Badge>;
      case 'EN_COURS':
        return <Badge className="bg-blue-500 text-white">En cours</Badge>;
      case 'REPARE':
        return <Badge className="bg-green-500 text-white">Réparé</Badge>;
      case 'EN_VALIDATION':
        return <Badge className="bg-purple-500 text-white">En validation</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Inconnu</Badge>;
    }
  };

  const getMaintenanceStatusBadge = (status?: string) => {
    switch (status) {
      case 'PLANIFIE':
        return <Badge className="bg-orange-500 text-white">Planifié</Badge>;
      case 'EN_COURS':
        return <Badge className="bg-blue-500 text-white">En cours</Badge>;
      case 'TERMINE':
        return <Badge className="bg-green-500 text-white">Terminé</Badge>;
      case 'ANNULE':
        return <Badge className="bg-red-500 text-white">Annulé</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Inconnu</Badge>;
    }
  };

  const formatDate = (dateInput?: string | number, withTime: boolean = true): string => {
    if (!dateInput) return 'Non spécifiée';

    let date: Date;
    if (typeof dateInput === 'string') {
      const cleanedDateString = dateInput.replace(/\[UTC\]$/, '');
      date = new Date(cleanedDateString);
    } else {
      date = new Date(dateInput * 1000);
    }

    try {
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...(withTime && { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      return 'Date invalide';
    }
  };

  const handleCreateMaintenanceSuccess = () => {
    setIsMaintenanceDialogOpen(false);
    toast({
      title: "Maintenance créée",
      description: "La tâche de maintenance a été créée avec succès.",
    });
  };

  const handleViewMaintenance = () => {
    if (maintenance?.id) {
      navigate(`/maintenance/${maintenance.id}`);
    }
  };

  if (error || !signalement) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-100">Signalement introuvable</h3>
              <p className="text-muted-foreground mb-4">
                Le signalement demandé n'existe pas ou a été supprimé.
              </p>
              <Button onClick={() => navigate('/reports')}>
                Retour à la liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-700 dark:text-gray-300">
                <ArrowLeft className="h-4 w-4 mr-2" /> Retour
              </Button>
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-64" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-700 dark:text-gray-300">
                <ArrowLeft className="h-4 w-4 mr-2" /> Retour
              </Button>
              {getStatusBadge(signalement.status)}
            </div>

            <div className="space-y-6">
              {/* Details Card with Image */}
              <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    Détails du signalement
                  </CardTitle>
                  <CardDescription>Informations complètes concernant ce nid-de-poule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Image Section */}
                  <div
                    className="relative h-60 w-full overflow-hidden rounded-lg cursor-pointer group"
                    onClick={() => setIsImageOpen(true)}
                  >
                    <img
                      src={signalement.imageUrl || '/placeholder.png'}
                      alt="Nid-de-poule"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span>{signalement.latitude?.toFixed(6)}, {signalement.longitude?.toFixed(6)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1 bg-white/20 rounded-full text-xs backdrop-blur-sm">
                          <span>Cliquer pour agrandir</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <p className="text-sm font-medium text-muted-foreground">Signalé le</p>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{formatDate(signalement.reportedAt)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-500" />
                        <p className="text-sm font-medium text-muted-foreground">Détecté par</p>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{signalement.detectedByName || 'Inconnu'}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <p className="text-sm font-medium text-muted-foreground">Latitude</p>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{signalement.latitude?.toFixed(6)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <p className="text-sm font-medium text-muted-foreground">Longitude</p>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{signalement.longitude?.toFixed(6)}</p>
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">Statut</p>
                      </div>
                      <div>{getStatusBadge(signalement.status)}</div>
                    </div>
                  </div>
                  
                  {signalement.description && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                          {signalement.description}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {!signalement.maintenanceId && signalement.status !== 'REPARE' && (
                    <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                      <DialogTrigger asChild>
                        {/* <Button className="bg-blue-500 hover:bg-blue-600 px-6 py-3">
                          <Wrench className="h-5 w-5 mr-2" />
                          Planifier une maintenance
                        </Button> */}
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0">
                        <DialogHeader>
                          <DialogTitle className="text-xl text-gray-800 dark:text-gray-100">Créer une tâche de maintenance</DialogTitle>
                          <DialogDescription>
                            Planifiez une intervention pour ce signalement
                          </DialogDescription>
                        </DialogHeader>
                        <CreateMaintenanceForm
                          signalementId={signalement.id}
                          onSuccess={handleCreateMaintenanceSuccess}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                  {signalement.status === 'REPARE' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg w-full">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">Signalement réparé</p>
                        <p className="text-xs text-green-600 dark:text-green-300">Ce nid-de-poule a été complètement réparé</p>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>

              {/* Maintenance Card - Only show if maintenance exists and is not in pending status */}
              {maintenance && !isLoadingMaintenance && maintenance.status !== 'PENDING' && (
                <Card 
                  className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={handleViewMaintenance}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg text-gray-800 dark:text-gray-100 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-orange-500" />
                        Maintenance
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </CardTitle>
                    <CardDescription>Intervention associée à ce signalement</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Statut</p>
                        <div>{getMaintenanceStatusBadge(maintenance.status)}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Type</p>
                        <p className="text-sm text-gray-800 dark:text-gray-100">{maintenance.type || 'Non spécifié'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Date prévue</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <p className="text-sm text-gray-800 dark:text-gray-100">{formatDate(maintenance.plannedDate, false)}</p>
                      </div>
                    </div>
                    
                    {maintenance.estimatedDurationHours && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Durée estimée</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <p className="text-sm text-gray-800 dark:text-gray-100">{maintenance.estimatedDurationHours} heures</p>
                        </div>
                      </div>
                    )}
                    
                    {maintenance.teamDetails?.name && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Équipe assignée</p>
                        <p className="text-sm text-gray-800 dark:text-gray-100">{maintenance.teamDetails.name}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={handleViewMaintenance}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir les détails
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Show empty maintenance card only if no maintenance exists or if it's pending */}
              {(!maintenance || (maintenance && maintenance.status === 'PENDING')) && (
                <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-gray-400" />
                      Maintenance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6 text-muted-foreground">
                      <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="mb-2">
                        {maintenance?.status === 'PENDING' 
                          ? 'Maintenance en attente de validation' 
                          : 'Aucune maintenance planifiée'
                        }
                      </p>
                      <p className="text-xs">
                        {maintenance?.status === 'PENDING' 
                          ? 'Cette intervention est en cours de validation' 
                          : 'Créez une intervention pour ce signalement'
                        }
                      </p>
                      {!maintenance && signalement.status !== 'REPARE' && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="mt-4 bg-blue-500 hover:bg-blue-600"
                          onClick={() => setIsMaintenanceDialogOpen(true)}
                        >
                          Créer une maintenance
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Image Modal */}
            {isImageOpen && (
              <div
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                onClick={() => setIsImageOpen(false)}
              >
                <div
                  className="relative max-w-6xl w-full max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={signalement.imageUrl || '/placeholder.png'}
                    alt="Nid-de-poule"
                    className="w-full h-auto rounded-lg object-contain max-h-[90vh]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                    onClick={() => setIsImageOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignalementDetails;