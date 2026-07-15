// types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'MEMBER';
  teamId: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  members: number;
  specialization?: string;
  createdAt?: string;
}

export type SignalementStatus = 'NOUVEAU' | 'EN_VALIDATION' | 'EN_COURS' | 'REPARE';

export interface Signalement {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  reportedAt: string;
  status: SignalementStatus;
  detectedByName: string;
  maintenanceId?: string | null;
}

export type MaintenanceStatus = 'PENDING' | 'PLANIFIE' | 'TERMINE';

export interface Maintenance {
  id: string | null;
  title: string;
  plannedDate: string;
  type: string;
  estimatedDurationHours?: number;
  status: MaintenanceStatus;
  teamDetails?: {
    id: string | null;
    name: string;
    createdAt?: string;
  };
  teamId?: string | null;
  signalementId?: string | null;
  createdAt?: string;
}

export interface DashboardStats {
  signalementsByStatus: {
    newCount: number;
    inProgress: number;
    repaired: number;
    scheduled: number;
    completed: number;
  };
  maintenancesByStatus: {
    newCount: number;
    inProgress: number;
    repaired: number;
    scheduled: number;
    completed: number;
  };
  signalementsThisMonth: number;
  totalSignalements: number;
  maintenanceCompletedThisMonth: number;
}
