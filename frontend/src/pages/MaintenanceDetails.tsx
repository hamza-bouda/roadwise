import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaintenanceById, deleteMaintenance, fetchSignalement, updateMaintenanceStatus } from '@/services/dataService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Wrench, 
  Trash2, 
  Edit2, 
  MapPin, 
  User, 
  AlertTriangle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import type { MaintenanceStatus } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateMaintenanceForm from '@/components/CreateMaintenanceForm';
import { motion, AnimatePresence } from 'framer-motion';

const MaintenanceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: maintenance, isLoading, error } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => fetchMaintenanceById(id!),
    enabled: !!id,
  });

  const { data: signalement, isLoading: isLoadingSignalement } = useQuery({
    queryKey: ['signalement', maintenance?.signalementId],
    queryFn: () => fetchSignalement(maintenance!.signalementId!),
    enabled: !!maintenance?.signalementId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMaintenance(id!),
    onSuccess: () => {
      toast({ 
        title: 'Maintenance supprimée', 
        description: 'La maintenance a été supprimée avec succès.',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      navigate('/maintenances');
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur de suppression', 
        description: error.message || 'Impossible de supprimer la maintenance.', 
        variant: 'destructive' 
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: Exclude<MaintenanceStatus, 'PENDING'>) => updateMaintenanceStatus(id!, status),
    onSuccess: () => {
      toast({ 
        title: 'Statut mis à jour', 
        description: 'Le statut de la maintenance a été mis à jour.',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Impossible de mettre à jour le statut.', 
        variant: 'destructive' 
      });
    },
  });

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'd MMMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  const getStatusBadge = (status?: MaintenanceStatus) => {
    const styles: Record<string, string> = {
      PLANIFIE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      TERMINE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    };
    const labelMap: Record<string, string> = {
      PLANIFIE: 'Planifié',
      TERMINE: 'Terminé',
    };
    
    // Handle PENDING status by converting to PLANIFIE for display
    const displayStatus = status === 'PENDING' ? 'PLANIFIE' : status;
    
    return (
      <Badge variant="outline" className={`${styles[displayStatus || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'} hover:bg-opacity-80`}>
        {labelMap[displayStatus || ''] || 'Inconnu'}
      </Badge>
    );
  };

  const handleSignalementClick = () => {
    if (maintenance?.signalementId) navigate(`/reports/${maintenance.signalementId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 minh-screen">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-10 rounded-full mr-3" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex items-center">
                  <Skeleton className="h-5 w-5 mr-3" />
                  <Skeleton className="h-4 w-32 mr-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !maintenance) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 minh-screen flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Erreur</h1>
        <p className="text-gray-600 dark:text-gray-200 mb-6">Impossible de charger les détails de la maintenance.</p>
        <Button onClick={() => navigate('/maintenances')} className="h-10 gap-2">
          <ArrowLeft className="h-5 w-5" /> Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 minh-screen">
      <AnimatePresence mode="wait">
        <motion.div 
          key="details-view" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }} 
          transition={{ duration: 0.3 }} 
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate('/maintenances')}
                className="mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                  Détails de la Maintenance
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  ID: {maintenance.id}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Edit2 className="h-4 w-4" /> Modifier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Modifier la maintenance</DialogTitle>
                    <DialogDescription>
                      Modifiez les détails de cette maintenance planifiée.
                    </DialogDescription>
                  </DialogHeader>
                 <CreateMaintenanceForm
                    initialData={{
                      ...maintenance,
                      // Convert PENDING status to PLANIFIE for editing
                      status: maintenance.status === 'PENDING' ? 'PLANIFIE' : maintenance.status
                    }}
                    onSuccess={() => {
                      setIsEditDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
                      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
                      toast({
                        title: "Maintenance mise à jour",
                        description: "La maintenance a été modifiée avec succès.",
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer cette maintenance? Cette action ne peut pas être annulée.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => deleteMutation.mutate()} 
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Suppression...
                        </>
                      ) : (
                        'Supprimer définitivement'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Status Update Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Statut de la maintenance
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Modifiez le statut actuel de cette maintenance
                  </p>
                </div>
                <Select
                  value={maintenance.status === 'PENDING' ? 'PLANIFIE' : maintenance.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value as Exclude<MaintenanceStatus, 'PENDING'>)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Changer statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Remove PENDING option */}
                    <SelectItem value="PLANIFIE">Planifié</SelectItem>
                    <SelectItem value="TERMINE">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Maintenance Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Informations de maintenance
                </CardTitle>
                <CardDescription>
                  Détails concernant la maintenance planifiée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Statut
                  </span>
                  {getStatusBadge(maintenance.status)}
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Date Planifiée
                  </span>
                  <span>{formatDate(maintenance.plannedDate)}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Durée estimée
                  </span>
                  <span>{maintenance.estimatedDurationHours} h</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Type
                  </span>
                  <span>{maintenance.type || 'Non spécifié'}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" /> Équipe
                  </span>
                  <span>{maintenance.teamDetails?.name || 'Non assignée'}</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Créée le
                  </span>
                  <span>{formatDate(maintenance.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Associated Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Signalement Associé
                </CardTitle>
                <CardDescription>
                  {maintenance.signalementId ? 
                    "Détails du signalement à l'origine de cette maintenance" : 
                    "Aucun signalement associé à cette maintenance"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {maintenance.signalementId && signalement ? (
                  <div 
                    className="group cursor-pointer p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={handleSignalementClick}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="mb-2">
                        {signalement.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                    
                    {signalement.imageUrl && (
                      <div className="mb-4">
                        <img 
                          src={signalement.imageUrl} 
                          alt="Signalement" 
                          className="w-full h-40 object-cover rounded-md"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {signalement.latitude.toFixed(4)}, {signalement.longitude.toFixed(4)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{formatDate(signalement.reportedAt)}</span>
                      </div>
                      
                      {signalement.detectedByName && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Détecté par: {signalement.detectedByName}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Cliquer pour voir les détails du signalement
                      </p>
                    </div>
                  </div>
                ) : isLoadingSignalement ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun signalement associé</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MaintenanceDetails;