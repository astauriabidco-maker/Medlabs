/**
 * Appointment List View Component
 */
import React from 'react';
import { User, Phone, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui-basic';
import {
    Appointment, AppointmentStatus,
    statusColors, statusLabels, typeIcons, typeLabels, formatTime, formatDate
} from './types';

interface AppointmentListProps {
    appointments: Appointment[];
    updatingId: string | null;
    onUpdateStatus: (id: string, status: AppointmentStatus) => void;
}

export function AppointmentList({ appointments, updatingId, onUpdateStatus }: AppointmentListProps) {
    // Group by day
    const groupedByDay = appointments.reduce((acc, apt) => {
        const dateKey = new Date(apt.date).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(apt);
        return acc;
    }, {} as Record<string, Appointment[]>);

    return (
        <div className="space-y-4">
            {Object.entries(groupedByDay)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([dateKey, dayAppointments]) => (
                    <div key={dateKey} className="bg-white border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b font-medium">
                            {formatDate(new Date(dateKey).toISOString())}
                            <span className="text-muted-foreground ml-2">
                                ({dayAppointments.length} RDV)
                            </span>
                        </div>
                        <div className="divide-y">
                            {dayAppointments
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((apt) => (
                                    <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                                        <div className="text-center min-w-16">
                                            <div className="text-xl font-bold">{formatTime(apt.date)}</div>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${apt.type === 'HOME_SAMPLING' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {typeIcons[apt.type]}
                                            {typeLabels[apt.type]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                {apt.patientName}
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Phone className="w-3 h-3" />
                                                {apt.patientPhone}
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[apt.status]}`}>
                                            {statusLabels[apt.status]}
                                        </div>
                                        {apt.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => onUpdateStatus(apt.id, 'CONFIRMED')}
                                                    disabled={updatingId === apt.id}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {updatingId === apt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onUpdateStatus(apt.id, 'CANCELLED')}
                                                    disabled={updatingId === apt.id}
                                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                        {apt.status === 'CONFIRMED' && (
                                            <Button
                                                size="sm"
                                                onClick={() => onUpdateStatus(apt.id, 'COMPLETED')}
                                                disabled={updatingId === apt.id}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Terminer
                                            </Button>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
        </div>
    );
}
