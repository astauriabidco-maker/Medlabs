/**
 * Shared types for Appointments components
 */
import React from 'react';
import { Home, Building2 } from 'lucide-react';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type AppointmentType = 'LAB_VISIT' | 'HOME_SAMPLING';

export interface Appointment {
    id: string;
    patientName: string;
    patientPhone: string;
    type: AppointmentType;
    date: string;
    address?: string;
    notes?: string;
    status: AppointmentStatus;
    createdAt: string;
}

export interface TenantSettings {
    openingTime: string;
    closingTime: string;
    appointmentDuration: number;
    isHomeSamplingEnabled: boolean;
    maxAppointmentsPerSlot: number;
}

export interface BlockedSlot {
    id: string;
    date: string;
    allDay: boolean;
    startTime?: string;
    endTime?: string;
    reason?: string;
}

export interface NewAppointment {
    name: string;
    phone: string;
    email: string;
    type: AppointmentType;
    date: string;
    time: string;
    address: string;
    notes: string;
}

export const statusColors: Record<AppointmentStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
    COMPLETED: 'bg-blue-100 text-blue-800 border-blue-300',
    CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

export const statusLabels: Record<AppointmentStatus, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmé',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
};

export const typeIcons: Record<AppointmentType, React.ReactNode> = {
    LAB_VISIT: <Building2 className="w-4 h-4" />,
    HOME_SAMPLING: <Home className="w-4 h-4" />,
};

export const typeLabels: Record<AppointmentType, string> = {
    LAB_VISIT: 'Au laboratoire',
    HOME_SAMPLING: 'À domicile',
};

// Utility functions
export const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-CM', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }).format(date);
};

export const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-CM', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const getWeekBounds = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Sunday
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
