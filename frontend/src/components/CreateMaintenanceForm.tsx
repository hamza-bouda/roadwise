import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSignalements, fetchTeams, createMaintenance, updateMaintenance } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Maintenance, MaintenanceStatus } from '@/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Validation schema
const formSchema = z.object({
  title: z.string().min(5, { message: 'Le titre doit contenir au moins 5 caractères.' }),
  plannedDate: z.string().min(1, { message: 'La date de planification est requise.' }),
  teamId: z.string().min(1, { message: 'Une équipe doit être sélectionnée.' }),
  signalementId: z.string().min(1, { message: 'Un signalement doit être sélectionné.' }),
  type: z.string().min(1, { message: 'Le type de réparation est requis.' }),
  estimatedDurationHours: z.coerce.number().positive({ message: 'La durée estimée doit être un nombre positif.' }),
});

interface CreateMaintenanceFormProps {
  signalementId?: string;
  initialData?: Maintenance;
  onSuccess?: () => void;
}

const CreateMaintenanceForm: React.FC<CreateMaintenanceFormProps> = ({ signalementId, initialData, onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch signalements
  const { data: signalements, isLoading: isLoadingSignalements, error: signalementsError } = useQuery({
    queryKey: ['signalements'],
    queryFn: fetchSignalements,
  });

  // Fetch teams
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });

  // Mutations
  const createMaintenanceMutation = useMutation({
    mutationFn: createMaintenance,
    onSuccess: () => {
      toast({
        title: 'Maintenance créée',
        description: 'La tâche de maintenance a été créée avec succès.',
      });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['signalements'] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la maintenance.',
        variant: 'destructive',
      });
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: updateMaintenance,
    onSuccess: () => {
      toast({
        title: 'Maintenance mise à jour',
        description: 'La tâche de maintenance a été mise à jour avec succès.',
      });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['signalements'] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la maintenance.',
        variant: 'destructive',
      });
    },
  });

// Initialize form
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: initialData
    ? {
        title: initialData.title || '',
        plannedDate: initialData.plannedDate
          ? format(parseISO(initialData.plannedDate), 'yyyy-MM-dd')
          : new Date().toISOString().split('T')[0],
        teamId: initialData.teamId || '', // Changed from initialData.teamDetails?.id
        signalementId: initialData.signalementId || signalementId || '',
        type: initialData.type || 'Enrobé à chaud',
        estimatedDurationHours: initialData.estimatedDurationHours || 2,
      }
    : {
        title: '',
        plannedDate: new Date().toISOString().split('T')[0],
        teamId: '',
        signalementId: signalementId || '',
        type: 'Enrobé à chaud',
        estimatedDurationHours: 2,
      },
    });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || '',
        plannedDate: initialData.plannedDate
          ? format(parseISO(initialData.plannedDate), 'yyyy-MM-dd')
          : new Date().toISOString().split('T')[0],
        teamId: initialData.teamId || '', // Changed from initialData.teamDetails?.id
        signalementId: initialData.signalementId || signalementId || '',
        type: initialData.type || 'Enrobé à chaud',
        estimatedDurationHours: initialData.estimatedDurationHours || 2,
      });
    }
  }, [initialData, signalementId, form]);

  const selectedSignalement = signalements?.find(s => s.id === form.watch('signalementId'));

  // Submit handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      id: initialData?.id,
      title: values.title,
      plannedDate: new Date(values.plannedDate).toISOString(),
      status: initialData?.status || ('PLANIFIE' as MaintenanceStatus),
      teamId: values.teamId,
      signalementId: values.signalementId,
      type: values.type,
      estimatedDurationHours: Number(values.estimatedDurationHours),
    };

    if (initialData?.id) {
      updateMaintenanceMutation.mutate(payload as Maintenance & { id: string });
    } else {
      createMaintenanceMutation.mutate(payload);
    }
  };

  const isLoading = isLoadingSignalements || isLoadingTeams || createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending;

  // Filter available signalements
  const availableSignalements = signalements?.filter(s => !s.maintenanceId || s.id === signalementId || s.id === initialData?.signalementId) || [];

  // Error handling
  useEffect(() => {
    if (signalementsError) {
      console.error('Error fetching signalements:', signalementsError);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les signalements.',
        variant: 'destructive',
      });
    }
    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les équipes.',
        variant: 'destructive',
      });
    }
  }, [signalementsError, teamsError, toast]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Date inconnue';
    try {
      const date = parseISO(dateString);
      return format(date, 'd MMMM yyyy, HH:mm', { locale: fr });
    } catch (error) {
      console.error('Invalid date:', dateString, error);
      return 'Date invalide';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                {initialData ? 'Modifier la maintenance' : 'Créer une maintenance'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input placeholder="Titre de la maintenance" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plannedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date planifiée</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FormField
  control={form.control}
  name="teamId"
  render={({ field }) => (
    <FormItem>
        <FormLabel>Équipe</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isLoading}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une équipe" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {teams?.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                    {team.specialization ? ` (${team.specialization})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de réparation</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Enrobé à chaud">Enrobé à chaud</SelectItem>
                          <SelectItem value="Découpage et reconstruction">Découpage et reconstruction</SelectItem>
                          <SelectItem value="Rebouchage simple">Rebouchage simple</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedDurationHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée estimée (heures)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0.5" step="0.5" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="signalementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signalement</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading || availableSignalements.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un signalement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSignalements.map(signalement => (
                          <SelectItem key={signalement.id} value={signalement.id}>
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-md overflow-hidden mr-3">
                                <img
                                  src={signalement.imageUrl || '/placeholder.png'}
                                  alt="Nid-de-poule"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{signalement.description || 'Sans description'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {signalement.detectedByName || 'Inconnu'} - {formatDate(signalement.reportedAt)}
                                </p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedSignalement && (
                <Card className="mt-6 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" /> Signalement sélectionné
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedSignalement.imageUrl || '/placeholder.png'}
                        alt="Signalement"
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Adresse :</span>
                        <span>{selectedSignalement.latitude.toFixed(4)}, {selectedSignalement.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">Date :</span>
                        <span>{formatDate(selectedSignalement.reportedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Statut :</span>
                        <Badge
                          variant="outline"
                          className={
                            selectedSignalement.status === 'NOUVEAU'
                              ? 'bg-blue-100 text-blue-800'
                              : selectedSignalement.status === 'EN_COURS'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {selectedSignalement.status === 'NOUVEAU' ? 'Nouveau' :
                           selectedSignalement.status === 'EN_COURS' ? 'En cours' :
                           selectedSignalement.status === 'REPARE' ? 'Réparé' : 'Inconnu'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Détecté par :</span>
                        <span>{selectedSignalement.detectedByName || 'Inconnu'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onSuccess && onSuccess()}
                  disabled={isLoading}
                  className="h-10 gap-2"
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading} className="h-10">
                  {isLoading ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </div>
  );
};

export default CreateMaintenanceForm;