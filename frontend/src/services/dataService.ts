import axios from 'axios';
import { Signalement, Maintenance, Team, User, SignalementStatus, MaintenanceStatus } from '../types';
import { toast } from '@/hooks/use-toast';

const api = axios.create({
  baseURL: 'http://localhost:9090/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User Management
export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    const response = await api.post('/users/create', {
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId || null,
      createdAt: new Date(user.createdAt).toISOString(),
    });
    return response.data;
  } catch (error: any) {
    console.error('User creation error:', error.response?.data || error);
    throw new Error(error.response?.data?.error || 'Failed to create user');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error: any) {
    console.error('User deletion error:', error.response?.data || error);
    throw new Error(error.response?.data?.error || 'Failed to delete user');
  }
};
export const fetchUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/users');
  return response.data;
};

export const assignUserToTeam = async (userId: string, teamId: string | null): Promise<User> => {
  try {
    const response = await api.patch(`/users/${userId}/team`, { teamId });
    return response.data;
  } catch (error: any) {
    console.error('Assign user to team error:', error);
    const message = error.response?.data?.error || 'Failed to assign user to team';
    throw new Error(message);
  }
};

// Team Management
export const fetchTeams = async (): Promise<Team[]> => {
  const response = await api.get('/teams');
  return response.data;
};

export const fetchTeamById = async (id: string): Promise<Team> => {
  const response = await api.get(`/teams/${id}`);
  return response.data;
};

export const createTeam = async (team: Omit<Team, 'id' | 'createdAt' | 'members'>): Promise<Team> => {
  const response = await api.post('/teams', { ...team, members: 0 });
  return response.data;
};

export const updateTeam = async (id: string, team: Partial<Team>): Promise<Team> => {
  const response = await api.put(`/teams/${id}`, team);
  return response.data;
};

export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`/teams/${id}`);
};

// Signalement and Maintenance endpoints
export const fetchSignalements = async (): Promise<Signalement[]> => {
  const response = await api.get('/reports');
  return response.data;
};

export const fetchSignalement = async (id: string): Promise<Signalement> => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

export const updateSignalementStatus = async (id: string, status: SignalementStatus): Promise<void> => {
  await api.patch(`/reports/${id}/status`, { status });
};

export const createSignalement = async (signalement: Omit<Signalement, 'id'>): Promise<Signalement> => {
  const response = await api.post('/reports', signalement);
  return response.data;
};

export const filterSignalements = async (filters: {
  status?: SignalementStatus;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Signalement[]> => {
  const response = await api.get('/reports/filter', { params: filters });
  return response.data;
};

export const fetchMaintenances = async (): Promise<Maintenance[]> => {
  const response = await api.get('/maintenances');
  return response.data;
};

export const updateMaintenanceStatus = async (id: string, status: MaintenanceStatus): Promise<void> => {
  try {
    console.log('Sending PUT request to /maintenances/${id}/status with status:', status);
    const response = await api.put(`/maintenances/${id}/status`, { status });
    console.log('Response:', response.data);
  } catch (error: any) {
    console.error('Update error:', error.response?.data || error.message);
    throw new Error('Erreur lors de la mise à jour du statut.');
  }
};

export const fetchMaintenanceById = async (id: string): Promise<Maintenance> => {
  const response = await api.get(`/maintenances/${id}`);
  return response.data;
};

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
  const response = await api.post('/maintenances', maintenance);
  if (maintenance.signalementId) {
    await updateSignalementStatus(maintenance.signalementId, 'EN_COURS');
  }
  return response.data;
};

export const updateMaintenance = async (maintenance: Maintenance & { id: string }): Promise<Maintenance> => {
  try {
    const response = await api.put(`/maintenances/${maintenance.id}`, maintenance);
    if (maintenance.signalementId) {
      await updateSignalementStatus(maintenance.signalementId, 'EN_COURS');
    }
    return response.data;
  } catch (error: any) {
    console.error('Update maintenance error:', error);
    throw new Error('Erreur lors de la mise à jour de la maintenance.');
  }
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  await api.delete(`/maintenances/${id}`);
};

export const exportSignalementsToCSV = async (): Promise<string> => {
  const response = await api.get('/reports/export', {
    headers: { 'Accept': 'text/csv' },
  });
  return response.data;
};

// Helper function to format dates properly for Excel
const formatDateForExcel = (dateInput?: string): string => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    // Format as DD/MM/YYYY HH:MM for better Excel compatibility
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

// Helper function to properly escape CSV values for Excel
const escapeCSVField = (value: any): string => {
  if (value == null || value === undefined) return '';
  
  let stringValue = String(value);
  
  // If the value contains comma, newline, or double quote, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r') || stringValue.includes('"')) {
    // Escape any existing double quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    // Wrap the entire value in double quotes
    return `"${stringValue}"`;
  }
  
  return stringValue;
};

// Helper function to translate status to French
const translateStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'PLANIFIE': 'Planifié',
    'TERMINE': 'Terminé',
    'EN_COURS': 'En cours',
    'NOUVEAU': 'Nouveau',
    'RESOLU': 'Résolu'
  };
  return statusMap[status] || status;
};

export const exportMaintenancesToCSV = async (
  maintenances: Maintenance[],
  teams: Team[]
): Promise<string> => {
  try {
    // Define headers in French for better readability
    const headers = [
      'ID',
      'Titre',
      'Date Planifiée',
      'Équipe',
      'Type',
      'Durée Estimée (heures)',
      'Statut',
      'ID Signalement',
      'Date de Création'
    ];

    // Create CSV rows
    const csvRows: string[] = [];
    
    // Add headers
    csvRows.push(headers.map(header => escapeCSVField(header)).join(','));

    // Add data rows
    maintenances.forEach(maintenance => {
      const team = teams.find(t => t.id === maintenance.teamId);
      
      const row = [
        escapeCSVField(maintenance.id || ''),
        escapeCSVField(maintenance.title || 'Sans titre'),
        escapeCSVField(formatDateForExcel(maintenance.plannedDate)),
        escapeCSVField(team?.name || 'Non assignée'),
        escapeCSVField(maintenance.type || 'Non spécifié'),
        escapeCSVField(maintenance.estimatedDurationHours || 0),
        escapeCSVField(translateStatus(maintenance.status || 'PLANIFIE')),
        escapeCSVField(maintenance.signalementId || ''),
        escapeCSVField(formatDateForExcel(maintenance.createdAt))
      ];
      
      csvRows.push(row.join(','));
    });

    // Join all rows with line breaks
    const csvContent = csvRows.join('\r\n');

    // Add UTF-8 BOM for proper Excel encoding of French characters
    const csvWithBOM = '\uFEFF' + csvContent;

    // Create and download the file
    const blob = new Blob([csvWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `maintenances_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    window.URL.revokeObjectURL(url);

    return csvContent;
  } catch (error) {
    console.error('CSV export error:', error);
    toast({
      title: 'Erreur d\'export',
      description: 'Impossible d\'exporter les données en CSV.',
      variant: 'destructive',
    });
    throw error;
  }
};

export const fetchDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};