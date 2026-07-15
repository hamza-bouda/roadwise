import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSignalements } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Signalement, SignalementStatus } from '@/types';
import { 
  MapPin, 
  Calendar, 
  Eye, 
  Filter, 
  Search, 
  Download, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut,
  Maximize,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon creator
const createCustomIcon = (color: string, iconType: string) => {
  const getIconSvg = () => {
    switch(iconType) {
      case 'validation':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
      case 'repair':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M19.86 3a1.995 1.995 0 0 0-2.74-.73L6.92 8.16C6.62 8.06 6.31 8 6 8 4.34 8 3 9.34 3 11c0 1.31.84 2.41 2 2.82V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h1c.55 0 1-.45 1-1v-1h1c.55 0 1-.45 1-1v-1h3c.55 0 1-.45 1-1v-3.18c.31-.11.59-.31.82-.57l2.21-2.21 1.94 1.94c.51.51 1.38.33 1.64-.35l1.34-3.69c.16-.44.08-.92-.23-1.27L19.86 3zm-9.47 9.76l-1.41-1.41 6.36-6.36 1.41 1.41-6.36 6.36z"/></svg>`;
      case 'new':
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
    }
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 32px; 
        height: 32px; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg);
        display: flex; 
        align-items: center; 
        justify-content: center; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.3); 
        border: 3px solid white;
        cursor: pointer;
      ">
        <div style="transform: rotate(45deg);">
          ${getIconSvg()}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map click events
const MapClickHandler = ({ onMapClick }: { onMapClick: () => void }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

// Map controls component
const MapControls = () => {
  const map = useMap();
  
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control leaflet-bar bg-white dark:bg-gray-800 shadow-md rounded-md overflow-hidden">
        <button 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => map.zoomIn()}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
          onClick={() => map.zoomOut()}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button 
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
          onClick={() => map.fitBounds(map.getBounds(), { padding: [20, 20] })}
          title="Fit bounds"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const Map = () => {
  const { data: signalements, isLoading, error, refetch } = useQuery({
    queryKey: ['signalements'],
    queryFn: fetchSignalements,
    refetchOnWindowFocus: false,
  });

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeMarker, setActiveMarker] = useState<Signalement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSmallPopup, setShowSmallPopup] = useState<string | null>(null);

  // Close popup when clicking outside
  const handleMapClick = useCallback(() => {
    setShowSmallPopup(null);
  }, []);

  const filteredSignalements = useMemo(() => {
    if (!signalements) return [];
    
    return signalements.filter((signalement: Signalement) => {
      // Status filter
      if (statusFilter && signalement.status !== statusFilter) return false;
      
      // Date filter
      if (dateFilter !== 'all') {
        const reportDate = new Date(signalement.reportedAt);
        const now = new Date();
        
        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return reportDate >= today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return reportDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return reportDate >= monthAgo;
        }
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesDescription = signalement.description?.toLowerCase().includes(searchLower);
        const matchesDetectedBy = signalement.detectedByName?.toLowerCase().includes(searchLower);
        const matchesStatus = signalement.status.toLowerCase().includes(searchLower);
        
        if (!matchesDescription && !matchesDetectedBy && !matchesStatus) return false;
      }
      
      return true;
    });
  }, [signalements, statusFilter, dateFilter, searchTerm]);

  const getStatusBadge = (status: SignalementStatus) => {
    switch (status) {
      case 'NOUVEAU':
        return (
          <Badge
            variant="outline"
            className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700 flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Nouveau
          </Badge>
        );
      case 'EN_VALIDATION':
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            En validation
          </Badge>
        );
      case 'EN_COURS':
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700 flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            En cours
          </Badge>
        );
      case 'REPARE':
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            Réparé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
            Inconnu
          </Badge>
        );
    }
  };

  const formatDate = (dateInput: string): string => {
    try {
      return new Date(dateInput).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getMarkerColorAndIcon = (status: SignalementStatus) => {
    switch (status) {
      case 'REPARE':
        return { color: '#22c55e', icon: 'repair' }; // green
      case 'EN_COURS':
        return { color: '#3b82f6', icon: 'repair' }; // blue
      case 'EN_VALIDATION':
        return { color: '#eab308', icon: 'validation' }; // yellow
      default:
        return { color: '#ef4444', icon: 'new' }; // red
    }
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Description,Statut,Latitude,Longitude,Date,Détecté par\n"
      + filteredSignalements.map(s => 
          `"${s.id}","${s.description || ''}","${s.status}","${s.latitude}","${s.longitude}","${formatDate(s.reportedAt)}","${s.detectedByName || ''}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `signalements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight dark:text-white">Carte des signalements</h2>
        </div>

        <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 dark:text-red-400 text-lg font-medium mb-2">
              Erreur lors du chargement des données
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error.message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight dark:text-white">Carte des signalements</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visualisez et gérez tous les signalements de nids-de-poule
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportData}
            disabled={isLoading || filteredSignalements.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="NOUVEAU">Nouveaux</SelectItem>
              <SelectItem value="EN_VALIDATION">En validation</SelectItem>
              <SelectItem value="EN_COURS">En cours</SelectItem>
              <SelectItem value="REPARE">Réparés</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <CardTitle className="dark:text-white">Carte interactive</CardTitle>
            <CardDescription className="dark:text-gray-400">
              {isLoading ? 'Chargement...' : `${filteredSignalements.length} signalements`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[500px] w-full rounded-lg dark:bg-gray-700" />
          ) : (
            <div className="h-[500px] w-full rounded-lg overflow-hidden relative z-0 border dark:border-gray-700">
              <MapContainer
                center={[34.6829, -1.9100]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapClickHandler onMapClick={handleMapClick} />
                <MapControls />
                
                {filteredSignalements.map((signalement: Signalement) => {
                  const { color, icon } = getMarkerColorAndIcon(signalement.status);
                  return (
                    <Marker
                      key={signalement.id}
                      position={[signalement.latitude, signalement.longitude]}
                      eventHandlers={{
                        click: () => {
                          setShowSmallPopup(signalement.id);
                        },
                      }}
                      icon={createCustomIcon(color, icon)}
                    >
                      {showSmallPopup === signalement.id && (
                        <Popup 
                          className="custom-popup" 
                          closeButton={false}
                        >
                          <div className="p-3 min-w-[250px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg">
                            <div className="flex items-start gap-3 mb-3">
                              <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-semibold text-sm block mb-1">Détecté par {signalement.detectedByName || 'Utilisateur'}</span>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                                  {signalement.description || 'Nid-de-poule signalé'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                              {getStatusBadge(signalement.status)}
                              <Button
                                size="sm"
                                variant="default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMarker(signalement);
                                  setIsDialogOpen(true);
                                  setShowSmallPopup(null);
                                }}
                                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Eye className="h-3 w-3 mr-1.5" />
                                Détails
                              </Button>
                            </div>
                          </div>
                        </Popup>
                      )}
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
              <span className="text-sm dark:text-gray-300">Nouveaux</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-sm"></div>
              <span className="text-sm dark:text-gray-300">En validation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
              <span className="text-sm dark:text-gray-300">En cours</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              <span className="text-sm dark:text-gray-300">Réparés</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold dark:text-white">Détails du signalement</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Informations complètes sur ce signalement
            </DialogDescription>
          </DialogHeader>

          {activeMarker && (
            <div className="space-y-6 pt-2">
              <div className="relative h-[220px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={activeMarker.imageUrl || '/placeholder.png'}
                  alt="Signalement"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        activeMarker.status === 'REPARE'
                          ? 'bg-green-500'
                          : activeMarker.status === 'EN_COURS'
                          ? 'bg-blue-500'
                          : activeMarker.status === 'EN_VALIDATION'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    ></div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Statut</p>
                  </div>
                  <div>{getStatusBadge(activeMarker.status)}</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Coordonnées</p>
                  </div>
                  <p className="font-mono text-sm dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                    {activeMarker.latitude.toFixed(6)}, {activeMarker.longitude.toFixed(6)}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Date de signalement</p>
                  </div>
                  <p className="font-medium dark:text-white">{formatDate(activeMarker.reportedAt)}</p>
                </div>

                {activeMarker.detectedByName && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Signalé par</p>
                    <p className="font-medium dark:text-white">{activeMarker.detectedByName}</p>
                  </div>
                )}

                {activeMarker.description && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Description</p>
                    <p className="text-sm dark:text-gray-200">{activeMarker.description}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t dark:border-gray-600">
                <Link to={`/reports/${activeMarker.id}`} className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500">
                    Voir détails complets
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent;
          border-radius: 12px;
          box-shadow: none;
          border: none;
          padding: 0;
          overflow: visible;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          padding: 0;
          width: auto !important;
        }
        .custom-popup .leaflet-popup-tip {
          display: none;
        }
        .leaflet-popup-close-button {
          display: none !important;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Dark mode styles */
        .dark .leaflet-control-zoom a {
          background-color: #1f2937;
          color: #f3f4f6;
          border-bottom-color: #374151;
        }
        .dark .leaflet-control-zoom a:hover {
          background-color: #374151;
        }
      `}</style>
    </div>
  );
};

export default Map;