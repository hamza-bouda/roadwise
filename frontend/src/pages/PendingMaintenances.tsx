import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Wrench, 
  Trash, 
  Calendar, 
  Clock, 
  Filter, 
  X,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ImageIcon,
  Users,
  Eye,
  FileText,
  BarChart3,
  Plus,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { fetchMaintenances, updateMaintenance, deleteMaintenance, fetchTeams, fetchSignalement } from '@/services/dataService';
import { Maintenance, Team, Signalement } from '@/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

// Validation schema for the validation form
const validationSchema = z.object({
  title: z.string().min(5, { message: 'Le titre doit contenir au moins 5 caractères.' }),
  plannedDate: z.string().min(1, { message: 'La date de planification est requise.' }),
  teamId: z.string().min(1, { message: 'Une équipe doit être sélectionnée.' }),
  type: z.string().min(1, { message: 'Le type de réparation est requise.' }),
  estimatedDurationHours: z.coerce.number().positive({ message: 'La durée estimée doit être un nombre positif.' }),
});

export default function PendingMaintenances() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [filteredMaintenances, setFilteredMaintenances] = useState<Maintenance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [signalementDialogOpen, setSignalementDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [selectedSignalement, setSelectedSignalement] = useState<Signalement | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [hasMissingFields, setHasMissingFields] = useState(false);
  const [isLoadingSignalement, setIsLoadingSignalement] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [sortField, setSortField] = useState<string>('plannedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Initialize form
  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      title: '',
      plannedDate: '',
      teamId: '',
      type: '',
      estimatedDurationHours: 0,
    }
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [maintenancesData, teamsData] = await Promise.all([
          fetchMaintenances(),
          fetchTeams()
        ]);
        
        const pendingMaintenances = maintenancesData.filter(m => m.status === 'PENDING');
        setMaintenances(pendingMaintenances);
        setFilteredMaintenances(pendingMaintenances);
        setTeams(teamsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter maintenances based on search term and team filter
  useEffect(() => {
    let results = maintenances;
    
    // Apply search filter
    if (searchTerm) {
      results = results.filter(m => 
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.teamDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply team filter
    if (teamFilter !== 'all') {
      results = results.filter(m => m.teamDetails?.id === teamFilter);
    }
    
    // Apply sorting
    results = [...results].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'plannedDate':
          aValue = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
          bValue = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;
          break;
        case 'team':
          aValue = a.teamDetails?.name || '';
          bValue = b.teamDetails?.name || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        default:
          aValue = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
          bValue = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
    
    setFilteredMaintenances(results);
  }, [searchTerm, teamFilter, maintenances, sortField, sortDirection]);

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

  const formatDateTime = (dateInput?: string): string => {
    if (!dateInput) return 'Date inconnue';
    try {
      const date = parseISO(dateInput);
      return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch (error) {
      console.error('Invalid date:', dateInput, error);
      return 'Date invalide';
    }
  };

  const checkMissingFields = (maintenance: Maintenance): boolean => {
    return !maintenance.title || !maintenance.plannedDate || !maintenance.teamId || 
           !maintenance.type || !maintenance.estimatedDurationHours;
  };

  const handleRowClick = async (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setIsLoadingSignalement(true);
    setSignalementDialogOpen(true);
    
    try {
      if (maintenance.signalementId) {
        const signalement = await fetchSignalement(maintenance.signalementId);
        setSelectedSignalement(signalement);
      }
    } catch (error) {
      console.error('Error fetching signalement:', error);
    } finally {
      setIsLoadingSignalement(false);
    }
  };

 const handleValidateClick = async (maintenance: Maintenance, e: React.MouseEvent) => {
  e.stopPropagation();
  setSelectedMaintenance(maintenance);
  
  const missingFields = checkMissingFields(maintenance);
  setHasMissingFields(missingFields);
  setIsEditing(missingFields);
  
  // Pre-fill the form with existing data
  const formValues = {
    title: maintenance.title || '',
    plannedDate: maintenance.plannedDate
      ? format(parseISO(maintenance.plannedDate), 'yyyy-MM-dd')
      : new Date().toISOString().split('T')[0],
    teamId: maintenance.teamId || '',
    type: maintenance.type || '',
    estimatedDurationHours: maintenance.estimatedDurationHours || 0,
  };
  
  form.reset(formValues);
  
  // Attendre que le formulaire soit complètement mis à jour
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Vérifier la validité du formulaire après le reset
  const isValid = await form.trigger();
  setHasMissingFields(!isValid);
  
  setValidationDialogOpen(true);
};

const handleSaveEdits = async (values: z.infer<typeof validationSchema>) => {
  if (!selectedMaintenance?.id) return;

  const updatedMaintenance: Maintenance & { id: string } = {
    ...selectedMaintenance,
    id: selectedMaintenance.id,
    title: values.title,
    plannedDate: new Date(values.plannedDate).toISOString(),
    teamId: values.teamId,
    type: values.type,
    estimatedDurationHours: values.estimatedDurationHours,
  };

  try {
    await updateMaintenance(updatedMaintenance);
    // Update local state
    setMaintenances(prev => prev.map(m => 
      m.id === selectedMaintenance.id ? {...updatedMaintenance, teamDetails: m.teamDetails} : m
    ));
    
    // Mettre à jour selectedMaintenance avec les nouvelles valeurs
    setSelectedMaintenance(updatedMaintenance);
    
    setIsEditing(false);
    setHasMissingFields(false);
    
    // Vérifier à nouveau la validité après la mise à jour
    const isValid = await form.trigger();
    setHasMissingFields(!isValid);
    
  } catch (error) {
    console.error('Failed to update maintenance:', error);
  }
};

const handleValidateMaintenance = async () => {
  if (!selectedMaintenance?.id) return;

  // S'assurer que nous avons les dernières valeurs du formulaire
  const formValues = form.getValues();
  
  // Créer la maintenance avec les valeurs actuelles du formulaire
  const updatedMaintenance: Maintenance & { id: string } = {
    ...selectedMaintenance,
    id: selectedMaintenance.id,
    title: formValues.title,
    plannedDate: new Date(formValues.plannedDate).toISOString(),
    teamId: formValues.teamId,
    type: formValues.type,
    estimatedDurationHours: formValues.estimatedDurationHours,
    status: 'PLANIFIE',
  };

  // Vérifier une dernière fois que tous les champs sont valides
  const isValid = await form.trigger();
  if (!isValid) {
    setHasMissingFields(true);
    return;
  }

  try {
    await updateMaintenance(updatedMaintenance);
    setMaintenances(prev => prev.filter(m => m.id !== selectedMaintenance.id));
    setValidationDialogOpen(false);
    setSelectedMaintenance(null);
    setIsEditing(false);
    setHasMissingFields(false);
  } catch (error) {
    console.error('Failed to validate maintenance:', error);
  }
};
  const handleDelete = async (maintenanceId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await deleteMaintenance(maintenanceId);
      setMaintenances(prev => prev.filter(m => m.id !== maintenanceId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete maintenance:', error);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate stats for header
  const stats = useMemo(() => {
    const incompleteCount = maintenances.filter(checkMissingFields).length;
    const completeCount = maintenances.length - incompleteCount;
    
    return {
      total: maintenances.length,
      incomplete: incompleteCount,
      complete: completeCount,
    };
  }, [maintenances]);

  // Get unique teams for filtering
  const uniqueTeams = useMemo(() => {
    const teams = maintenances
      .map(m => m.teamDetails)
      .filter(team => team !== undefined && team !== null)
      .map(team => ({ id: team!.id, name: team!.name }));
    
    // Remove duplicates
    return Array.from(new Map(teams.map(item => [item.id, item])).values());
  }, [maintenances]);

  // Generate maintenance title based on type and location
  const generateMaintenanceTitle = (maintenance: Maintenance): string => {
    if (maintenance.title) return maintenance.title;
    
    const type = maintenance.type || 'Réparation';
    
    // If we have coordinates, we can mention it's a geolocated repair
    const hasLocation = maintenance.signalementId ? 'géolocalisée' : '';
    
    return `${type} ${hasLocation}`.trim();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key="pending-maintenances"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                Maintenances en attente
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLoading ? 'Chargement...' : `${filteredMaintenances.length} maintenances en attente`}
              </p>
            </div>
              
          </div> 

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trier par:</span>
            <Button
              variant={sortField === 'plannedDate' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSort('plannedDate')}
              className="gap-1"
            >
              Date
              {sortField === 'plannedDate' ? (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              ) : null}
            </Button>
            <Button
              variant={sortField === 'title' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSort('title')}
              className="gap-1"
            >
              Titre
              {sortField === 'title' ? (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              ) : null}
            </Button>
            <Button
              variant={sortField === 'team' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSort('team')}
              className="gap-1"
            >
              Équipe
              {sortField === 'team' ? (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              ) : null}
            </Button>
            <Button
              variant={sortField === 'type' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleSort('type')}
              className="gap-1"
            >
              Type
              {sortField === 'type' ? (
                sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
              ) : null}
            </Button>
          </div>

          {/* Maintenances List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </div>
              ))}
            </div>
          ) : filteredMaintenances.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                {maintenances.length === 0 
                  ? "Aucune maintenance en attente" 
                  : "Aucun résultat trouvé"}
              </h3>
              <p className="text-muted-foreground">
                {maintenances.length === 0 
                  ? "Toutes les maintenances ont été traitées." 
                  : "Essayez de modifier vos critères de recherche."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMaintenances.map((maintenance) => {
                const isIncomplete = checkMissingFields(maintenance);
                const maintenanceTitle = generateMaintenanceTitle(maintenance);
                const isExpanded = expandedItems.has(maintenance.id!);
                
                return (
                  <motion.div
                    key={maintenance.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => toggleExpand(maintenance.id!)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                              {maintenanceTitle}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {maintenance.id?.slice(-6)} • {formatDate(maintenance.plannedDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isIncomplete && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Incomplet
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                          >
                            {maintenance.teamDetails?.name || 'Non assignée'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t"
                        >
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                  <Wrench className="h-4 w-4 mr-2" />
                                  <span className="font-medium">Type:</span>
                                  <span className="ml-1">{maintenance.type || 'Non spécifié'}</span>
                                </div>
                                {maintenance.estimatedDurationHours && (
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <Clock className="h-4 w-4 mr-2" />
                                    <span className="font-medium">Durée estimée:</span>
                                    <span className="ml-1">{maintenance.estimatedDurationHours}h</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span className="font-medium">Date planifiée:</span>
                                  <span className="ml-1">{formatDate(maintenance.plannedDate)}</span>
                                </div>
                                {maintenance.signalementId && (
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    <span className="font-medium">Signalement:</span>
                                    <span className="ml-1">#{maintenance.signalementId.slice(-6)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleValidateClick(maintenance, e);
                                }}
                                className="flex-1 gap-1"
                                variant={isIncomplete ? "outline" : "default"}
                              >
                                {isIncomplete ? (
                                  <AlertTriangle className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                {isIncomplete ? "Compléter" : "Valider"}
                              </Button>
                              
                              {maintenance.signalementId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(maintenance);
                                  }}
                                  className="gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  Voir détails
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMaintenance(maintenance);
                                  setShowDeleteConfirm(maintenance.id!);
                                  setTimeout(() => setShowDeleteConfirm(null), 3000);
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {showDeleteConfirm === maintenance.id && (
                              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                                  Supprimer cette maintenance?
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => handleDelete(maintenance.id!, e)}
                                    className="text-xs h-7"
                                  >
                                    Oui, supprimer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirm(null);
                                    }}
                                    className="text-xs h-7"
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Signalement Dialog */}
          <Dialog open={signalementDialogOpen} onOpenChange={setSignalementDialogOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Signalement associé
                </DialogTitle>
                <DialogDescription>
                  Détails du signalement pour la maintenance "{selectedMaintenance?.title || 'Sans titre'}"
                </DialogDescription>
              </DialogHeader>
              
              {isLoadingSignalement ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : selectedSignalement ? (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedSignalement.description || 'Aucune description'}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Localisation</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedSignalement.latitude.toFixed(6)}, {selectedSignalement.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Détecté par</h4>
                      <p className="text-sm text-muted-foreground">{selectedSignalement.detectedByName || 'Inconnu'}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Date de signalement</h4>
                      <p className="text-sm text-muted-foreground">{formatDateTime(selectedSignalement.reportedAt)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Photo du nid-de-poule
                    </h4>
                    <div className="rounded-md overflow-hidden border">
                      <img 
                        src={selectedSignalement.imageUrl || '/placeholder-pothole.jpg'} 
                        alt="Nid-de-poule signalé" 
                        className="w-full h-64 object-cover cursor-pointer"
                        onClick={() => {
                          setSelectedImage(selectedSignalement.imageUrl || '/placeholder-pothole.jpg');
                          setImageDialogOpen(true);
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Cliquez sur l'image pour l'agrandir</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Aucun signalement associé
                  </h3>
                  <p className="text-muted-foreground">
                    Cette maintenance n'est liée à aucun signalement.
                  </p>
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setSignalementDialogOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Image Dialog */}
          <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>
                  Photo du nid-de-poule
                </DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img 
                  src={selectedImage} 
                  alt="Nid-de-poule en gros plan" 
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setImageDialogOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Validation Dialog */}
          <Dialog open={validationDialogOpen} onOpenChange={(open) => {
            setValidationDialogOpen(open);
            if (!open) {
              setIsEditing(false);
              setSelectedMaintenance(null);
            }
          }}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {hasMissingFields ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Maintenance incomplète
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Valider la maintenance
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {hasMissingFields 
                    ? "Cette maintenance nécessite des informations supplémentaires avant validation."
                    : "Vérifiez les informations avant de valider cette maintenance."}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveEdits)} className="space-y-4">
                  {selectedMaintenance && (
                    <div className="bg-muted p-4 rounded-md">
                      <h4 className="font-medium mb-2">Maintenance #{selectedMaintenance.id?.slice(-6)}</h4>
                      <p className="text-sm text-muted-foreground">{selectedMaintenance.title || 'Sans titre'}</p>
                      {selectedMaintenance.plannedDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Planifiée pour le {formatDate(selectedMaintenance.plannedDate)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Titre de la maintenance" {...field} />
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
                          <FormLabel>Date planifiée *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Équipe *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une équipe" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map(team => (
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
                          <FormLabel>Type de maintenance *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
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
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="estimatedDurationHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durée estimée (heures) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Durée en heures" 
                            {...field} 
                            min="0"
                            step="0.5"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter className="gap-2 flex-col sm:flex-row">
                    {isEditing ? (
                      <>
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                            className="flex-1"
                          >
                            Annuler modifications
                          </Button>
                          <div className="flex flex-col sm:flex-row gap-2 flex-1">
                            <Button 
                              type="submit" 
                              className="flex-1"
                            >
                              Enregistrer
                            </Button>
                            <Button 
                              type="button" 
                              onClick={handleValidateMaintenance}
                              disabled={hasMissingFields || !form.formState.isValid}
                              className="bg-green-600 hover:bg-green-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Valider
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setValidationDialogOpen(false);
                              setIsEditing(false);
                            }}
                            className="flex-1"
                          >
                            Annuler
                          </Button>
                          <div className="flex flex-col sm:flex-row gap-2 flex-1">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => setIsEditing(true)}
                              className="flex-1"
                            >
                              Modifier
                            </Button>
                            <Button 
                              type="button" 
                              onClick={handleValidateMaintenance}
                              disabled={hasMissingFields || !form.formState.isValid}
                              className="bg-green-600 hover:bg-green-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Valider
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </motion.div>
      </AnimatePresence>
    </div>
  );  
}