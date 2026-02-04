/**
 * Calendar View Component
 */
import React from 'react';
import { Home, Building2 } from 'lucide-react';
import { Appointment, formatTime, typeLabels } from './types';

interface CalendarViewProps {
    appointments: Appointment[];
    weekStart: Date;
}

export function CalendarView({ appointments, weekStart }: CalendarViewProps) {
    return (
        <div className="bg-white border rounded-lg overflow-hidden">
            {/* Days header */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate() + i);
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                        <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                            <div className="text-xs text-muted-foreground uppercase">
                                {new Intl.DateTimeFormat('fr-CM', { weekday: 'short' }).format(d)}
                            </div>
                            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>
                                {d.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time slots grid */}
            <div className="grid grid-cols-7 min-h-[400px]">
                {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(weekStart.getDate() + i);
                    const dayKey = d.toDateString();
                    const dayAppts = appointments.filter(apt => new Date(apt.date).toDateString() === dayKey);
                    const isToday = dayKey === new Date().toDateString();

                    return (
                        <div key={i} className={`border-r last:border-r-0 p-2 ${isToday ? 'bg-blue-50/30' : ''}`}>
                            {dayAppts.length === 0 ? (
                                <div className="text-center text-muted-foreground text-xs py-4">-</div>
                            ) : (
                                <div className="space-y-2">
                                    {dayAppts
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map(apt => (
                                            <div
                                                key={apt.id}
                                                className={`p-2 rounded-lg text-xs cursor-pointer transition-all hover:shadow-md ${apt.status === 'PENDING' ? 'bg-amber-100 border-l-4 border-amber-500' :
                                                        apt.status === 'CONFIRMED' ? 'bg-green-100 border-l-4 border-green-500' :
                                                            apt.status === 'COMPLETED' ? 'bg-blue-100 border-l-4 border-blue-500' :
                                                                'bg-red-100 border-l-4 border-red-500'
                                                    }`}
                                                title={`${apt.patientName} - ${apt.patientPhone}`}
                                            >
                                                <div className="font-bold text-sm">{formatTime(apt.date)}</div>
                                                <div className="truncate font-medium">{apt.patientName}</div>
                                                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                                                    {apt.type === 'HOME_SAMPLING' ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                                    <span className="truncate">{typeLabels[apt.type]}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="border-t p-3 bg-gray-50 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400" /> En attente</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-400" /> Confirmé</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-400" /> Terminé</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-400" /> Annulé</div>
            </div>
        </div>
    );
}
