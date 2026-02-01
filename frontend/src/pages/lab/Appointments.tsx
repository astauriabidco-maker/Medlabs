import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Phone, Check, X, Filter, Settings as SettingsIcon, Home, Building2, Loader2, ChevronLeft, ChevronRight, ExternalLink, Copy, Share2, Link2, Grid3X3, List, Download, Plus, Trash2, CalendarOff, History } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui-basic';
import { useToast } from '@/components/ui-dashboard';
import { api } from '@/lib/api';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
type AppointmentType = 'LAB_VISIT' | 'HOME_SAMPLING';

interface Appointment {
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

interface TenantSettings {
    openingTime: string;
    closingTime: string;
    appointmentDuration: number;
    isHomeSamplingEnabled: boolean;
    maxAppointmentsPerSlot: number;
}

const statusColors: Record<AppointmentStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
    COMPLETED: 'bg-blue-100 text-blue-800 border-blue-300',
    CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels: Record<AppointmentStatus, string> = {
    PENDING: 'En attente',
    CONFIRMED: 'Confirmé',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
};

const typeIcons: Record<AppointmentType, React.ReactNode> = {
    LAB_VISIT: <Building2 className="w-4 h-4" />,
    HOME_SAMPLING: <Home className="w-4 h-4" />,
};

const typeLabels: Record<AppointmentType, string> = {
    LAB_VISIT: 'Au laboratoire',
    HOME_SAMPLING: 'À domicile',
};

export default function Appointments() {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'agenda' | 'settings'>('agenda');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    // Settings state
    const [settings, setSettings] = useState<TenantSettings>({
        openingTime: '07:00',
        closingTime: '15:00',
        appointmentDuration: 15,
        isHomeSamplingEnabled: false,
        maxAppointmentsPerSlot: 1,
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [tenantSlug, setTenantSlug] = useState<string>('');

    // Blocked Slots state
    interface BlockedSlot {
        id: string;
        date: string;
        allDay: boolean;
        startTime?: string;
        endTime?: string;
        reason?: string;
    }
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [newBlockDate, setNewBlockDate] = useState('');
    const [newBlockReason, setNewBlockReason] = useState('');
    const [addingBlock, setAddingBlock] = useState(false);

    // Create Appointment Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingAppointment, setCreatingAppointment] = useState(false);
    const [newAppointment, setNewAppointment] = useState({
        name: '',
        phone: '',
        email: '',
        type: 'LAB_VISIT' as AppointmentType,
        date: '',
        time: '',
        address: '',
        notes: '',
    });
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Get week boundaries
    const getWeekBounds = (date: Date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay() + 1); // Monday
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6); // Sunday
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('fr-CM', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        }).format(date);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('fr-CM', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // Fetch appointments
    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const { start, end } = getWeekBounds(currentWeek);
            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });
            if (statusFilter !== 'ALL') {
                params.append('status', statusFilter);
            }
            const res = await api.get(`/api/appointments?${params}`);
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (err) {
            console.error('Failed to fetch appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch tenant settings
    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/tenants/me');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    openingTime: data.openingTime || '07:00',
                    closingTime: data.closingTime || '15:00',
                    appointmentDuration: data.appointmentDuration || 15,
                    isHomeSamplingEnabled: data.isHomeSamplingEnabled || false,
                    maxAppointmentsPerSlot: data.maxAppointmentsPerSlot || 1,
                });
                if (data.slug) {
                    setTenantSlug(data.slug);
                }
            }
            // Fetch blocked slots
            const blockedRes = await api.get('/appointments/blocked-slots');
            if (blockedRes.ok) {
                const blockedData = await blockedRes.json();
                setBlockedSlots(blockedData);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    useEffect(() => {
        fetchAppointments();
        fetchSettings();
    }, [currentWeek, statusFilter]);

    // Update appointment status
    const updateStatus = async (id: string, status: AppointmentStatus) => {
        setUpdatingId(id);
        try {
            const res = await api.patch(`/api/appointments/${id}/status`, { status });
            if (res.ok) {
                addToast(status === 'CONFIRMED' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé', 'success');
                fetchAppointments();
            } else {
                addToast('Erreur lors de la mise à jour', 'error');
            }
        } catch (err) {
            addToast('Erreur réseau', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    // Save settings
    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await api.patch('/api/tenants/me', settings);
            if (res.ok) {
                addToast('Paramètres enregistrés', 'success');
            } else {
                addToast('Erreur lors de l\'enregistrement', 'error');
            }
        } catch (err) {
            addToast('Erreur réseau', 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    // Navigate weeks
    const prevWeek = () => {
        const d = new Date(currentWeek);
        d.setDate(d.getDate() - 7);
        setCurrentWeek(d);
    };

    const nextWeek = () => {
        const d = new Date(currentWeek);
        d.setDate(d.getDate() + 7);
        setCurrentWeek(d);
    };

    const { start: weekStart, end: weekEnd } = getWeekBounds(currentWeek);

    // Export to CSV
    const exportToCSV = () => {
        if (appointments.length === 0) {
            addToast('Aucun rendez-vous à exporter', 'error');
            return;
        }

        const headers = ['Date', 'Heure', 'Patient', 'Téléphone', 'Type', 'Statut', 'Adresse', 'Notes'];
        const rows = appointments.map(apt => {
            const d = new Date(apt.date);
            return [
                new Intl.DateTimeFormat('fr-CM', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
                new Intl.DateTimeFormat('fr-CM', { hour: '2-digit', minute: '2-digit' }).format(d),
                apt.patientName,
                apt.patientPhone,
                typeLabels[apt.type],
                statusLabels[apt.status],
                apt.address || '',
                apt.notes || ''
            ];
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Intl.DateTimeFormat('fr-CM', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
        link.download = `rendez-vous_${dateStr.replace(/\//g, '-')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        addToast(`${appointments.length} rendez-vous exportés`, 'success');
    };

    // Fetch available slots for a given date (for create modal)
    const fetchAvailableSlots = async (date: string) => {
        if (!tenantSlug || !date) return;
        setLoadingSlots(true);
        try {
            const res = await fetch(`/api/appointments/slots/${tenantSlug}?date=${date}`);
            if (res.ok) {
                const slots = await res.json();
                setAvailableSlots(slots.filter((s: any) => s.available).map((s: any) => s.time));
            }
        } catch (err) {
            console.error('Failed to fetch slots:', err);
        } finally {
            setLoadingSlots(false);
        }
    };

    // Handle date change in create modal
    const handleNewAppointmentDateChange = (date: string) => {
        setNewAppointment(prev => ({ ...prev, date, time: '' }));
        fetchAvailableSlots(date);
    };

    // Create appointment from admin interface
    const handleCreateAppointment = async () => {
        if (!newAppointment.name || !newAppointment.phone || !newAppointment.date || !newAppointment.time) {
            addToast('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        setCreatingAppointment(true);
        try {
            // Combine date and time
            const dateTime = new Date(`${newAppointment.date}T${newAppointment.time}`);

            const res = await api.post('/api/appointments/book', {
                tenantId: localStorage.getItem('tenantId'),
                name: newAppointment.name,
                phone: newAppointment.phone,
                email: newAppointment.email || undefined,
                type: newAppointment.type,
                date: dateTime.toISOString(),
                address: newAppointment.type === 'HOME_SAMPLING' ? newAppointment.address : undefined,
                notes: newAppointment.notes || undefined,
            });

            if (res.ok) {
                addToast('Rendez-vous créé avec succès', 'success');
                setShowCreateModal(false);
                setNewAppointment({
                    name: '',
                    phone: '',
                    email: '',
                    type: 'LAB_VISIT',
                    date: '',
                    time: '',
                    address: '',
                    notes: '',
                });
                fetchAppointments();
            } else {
                const data = await res.json();
                addToast(data.message || 'Erreur lors de la création', 'error');
            }
        } catch (err) {
            addToast('Erreur lors de la création du rendez-vous', 'error');
        } finally {
            setCreatingAppointment(false);
        }
    };

    // Group appointments by day
    const groupedByDay = appointments.reduce((acc, apt) => {
        const dateKey = new Date(apt.date).toDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(apt);
        return acc;
    }, {} as Record<string, Appointment[]>);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        Agenda & Rendez-vous
                    </h1>
                    <p className="text-muted-foreground mt-1">Gérez les rendez-vous des patients</p>
                </div>
                {/* Booking Link Shortcuts */}
                {tenantSlug && (
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <Link2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Lien de réservation :</span>
                            <code className="text-xs bg-white px-2 py-1 rounded border">
                                {window.location.origin}/book/{tenantSlug}
                            </code>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const url = `${window.location.origin}/book/${tenantSlug}`;
                                navigator.clipboard.writeText(url);
                                addToast('Lien copié !', 'success');
                            }}
                            title="Copier le lien"
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/book/${tenantSlug}`, '_blank')}
                            title="Ouvrir le portail"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('agenda')}
                    className={`px-4 py-2 font-medium -mb-px transition-colors ${activeTab === 'agenda'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Agenda
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 font-medium -mb-px transition-colors ${activeTab === 'settings'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <SettingsIcon className="w-4 h-4 inline mr-2" />
                    Paramètres
                </button>
            </div>

            {/* Agenda Tab */}
            {activeTab === 'agenda' && (
                <div>
                    {/* Week Navigation & Filters */}
                    <div className="flex items-center justify-between mb-6 bg-white border rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={prevWeek}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-medium px-4">
                                {formatDate(weekStart.toISOString())} - {formatDate(weekEnd.toISOString())}
                            </span>
                            <Button variant="outline" size="icon" onClick={nextWeek}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())} className="ml-2">
                                Aujourd'hui
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'ALL')}
                                className="border rounded-md px-3 py-1.5 text-sm"
                            >
                                <option value="ALL">Tous les statuts</option>
                                <option value="PENDING">En attente</option>
                                <option value="CONFIRMED">Confirmés</option>
                                <option value="COMPLETED">Terminés</option>
                                <option value="CANCELLED">Annulés</option>
                            </select>

                            {/* View Toggle */}
                            <div className="flex border rounded-md overflow-hidden ml-2">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 flex items-center gap-1 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    title="Vue liste"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`px-3 py-1.5 flex items-center gap-1 text-sm ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    title="Vue calendrier"
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Export Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                disabled={appointments.length === 0}
                                className="ml-2 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Exporter</span>
                            </Button>

                            {/* New Appointment Button */}
                            <Button
                                size="sm"
                                onClick={() => setShowCreateModal(true)}
                                className="ml-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Nouveau RDV</span>
                            </Button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-12 bg-white border rounded-lg">
                            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium text-lg">Aucun rendez-vous</h3>
                            <p className="text-muted-foreground">Aucun rendez-vous pour cette période</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        /* LIST VIEW */
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
                                                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${apt.type === 'HOME_SAMPLING' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
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
                                                                <Button size="sm" onClick={() => updateStatus(apt.id, 'CONFIRMED')} disabled={updatingId === apt.id} className="bg-green-600 hover:bg-green-700">
                                                                    {updatingId === apt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, 'CANCELLED')} disabled={updatingId === apt.id} className="text-red-600 border-red-300 hover:bg-red-50">
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {apt.status === 'CONFIRMED' && (
                                                            <Button size="sm" onClick={() => updateStatus(apt.id, 'COMPLETED')} disabled={updatingId === apt.id} className="bg-blue-600 hover:bg-blue-700">
                                                                Terminer
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        /* CALENDAR VIEW */
                        <div className="bg-white border rounded-lg overflow-hidden">
                            {/* Days header */}
                            <div className="grid grid-cols-7 border-b bg-gray-50">
                                {(() => {
                                    const days = [];
                                    const start = new Date(weekStart);
                                    for (let i = 0; i < 7; i++) {
                                        const d = new Date(start);
                                        d.setDate(start.getDate() + i);
                                        const isToday = d.toDateString() === new Date().toDateString();
                                        days.push(
                                            <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                                                <div className="text-xs text-muted-foreground uppercase">
                                                    {new Intl.DateTimeFormat('fr-CM', { weekday: 'short' }).format(d)}
                                                </div>
                                                <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>
                                                    {d.getDate()}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return days;
                                })()}
                            </div>
                            {/* Time slots grid */}
                            <div className="grid grid-cols-7 min-h-[400px]">
                                {(() => {
                                    const columns = [];
                                    const start = new Date(weekStart);
                                    for (let i = 0; i < 7; i++) {
                                        const d = new Date(start);
                                        d.setDate(start.getDate() + i);
                                        const dayKey = d.toDateString();
                                        const dayAppts = appointments.filter(apt => new Date(apt.date).toDateString() === dayKey);
                                        const isToday = dayKey === new Date().toDateString();
                                        columns.push(
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
                                    }
                                    return columns;
                                })()}
                            </div>
                            {/* Legend */}
                            <div className="border-t p-3 bg-gray-50 flex items-center justify-center gap-6 text-xs">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400" /> En attente</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-400" /> Confirmé</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-400" /> Terminé</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-400" /> Annulé</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="bg-white border rounded-lg p-6 max-w-xl space-y-6">
                    <h3 className="font-semibold text-lg">Paramètres des rendez-vous</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Heure d'ouverture</Label>
                            <Input
                                type="time"
                                value={settings.openingTime}
                                onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Heure de fermeture</Label>
                            <Input
                                type="time"
                                value={settings.closingTime}
                                onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Durée par créneau (minutes)</Label>
                        <select
                            value={settings.appointmentDuration}
                            onChange={(e) => setSettings({ ...settings, appointmentDuration: Number(e.target.value) })}
                            className="w-full border rounded-md px-3 py-2 mt-1"
                        >
                            <option value={10}>10 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={20}>20 minutes</option>
                            <option value={30}>30 minutes</option>
                        </select>
                    </div>

                    <div>
                        <Label>Patients max par créneau</Label>
                        <select
                            value={settings.maxAppointmentsPerSlot}
                            onChange={(e) => setSettings({ ...settings, maxAppointmentsPerSlot: Number(e.target.value) })}
                            className="w-full border rounded-md px-3 py-2 mt-1"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <option key={n} value={n}>{n} patient{n > 1 ? 's' : ''}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nombre de patients pouvant réserver le même créneau horaire
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Home className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="font-medium">Prélèvements à domicile</p>
                                <p className="text-sm text-muted-foreground">Permettre aux patients de demander un prélèvement chez eux</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.isHomeSamplingEnabled}
                                onChange={(e) => setSettings({ ...settings, isHomeSamplingEnabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                    </div>

                    {/* Blocked Slots / Closures Section */}
                    <div className="border-t pt-6 mt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <CalendarOff className="w-5 h-5 text-red-600" />
                            <div>
                                <h3 className="font-medium">Fermetures & Congés</h3>
                                <p className="text-sm text-muted-foreground">Bloquer des jours où le laboratoire est fermé</p>
                            </div>
                        </div>

                        {/* Add new block form */}
                        <div className="flex gap-2 mb-4">
                            <Input
                                type="date"
                                value={newBlockDate}
                                onChange={(e) => setNewBlockDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="flex-1"
                            />
                            <Input
                                type="text"
                                value={newBlockReason}
                                onChange={(e) => setNewBlockReason(e.target.value)}
                                placeholder="Raison (ex: Congés, Jour férié)"
                                className="flex-1"
                            />
                            <Button
                                onClick={async () => {
                                    if (!newBlockDate) {
                                        addToast('Sélectionnez une date', 'error');
                                        return;
                                    }
                                    setAddingBlock(true);
                                    try {
                                        await api.post('/appointments/blocked-slots', {
                                            date: newBlockDate,
                                            allDay: true,
                                            reason: newBlockReason || 'Fermeture',
                                        });
                                        const res = await api.get('/appointments/blocked-slots');
                                        if (res.ok) {
                                            const data = await res.json();
                                            setBlockedSlots(data);
                                        }
                                        setNewBlockDate('');
                                        setNewBlockReason('');
                                        addToast('Fermeture ajoutée', 'success');
                                    } catch {
                                        addToast('Erreur lors de l\'ajout', 'error');
                                    } finally {
                                        setAddingBlock(false);
                                    }
                                }}
                                disabled={addingBlock || !newBlockDate}
                                className="whitespace-nowrap"
                            >
                                {addingBlock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </div>

                        {/* List of blocked slots */}
                        {blockedSlots.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">Aucune fermeture programmée</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {blockedSlots.map((slot) => (
                                    <div key={slot.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <CalendarOff className="w-4 h-4 text-red-600" />
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {new Date(slot.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                {slot.reason && <p className="text-xs text-muted-foreground">{slot.reason}</p>}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 border-red-300 hover:bg-red-100"
                                            onClick={async () => {
                                                try {
                                                    await api.delete(`/appointments/blocked-slots/${slot.id}`);
                                                    setBlockedSlots(blockedSlots.filter(s => s.id !== slot.id));
                                                    addToast('Fermeture supprimée', 'success');
                                                } catch {
                                                    addToast('Erreur lors de la suppression', 'error');
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
                        {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Enregistrer
                    </Button>
                </div>
            )}

            {/* Create Appointment Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold">Nouveau Rendez-vous</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Patient Name */}
                            <div>
                                <Label>Nom du patient *</Label>
                                <Input
                                    value={newAppointment.name}
                                    onChange={(e) => setNewAppointment(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Nom complet"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <Label>Téléphone *</Label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-md text-muted-foreground">
                                        +237
                                    </span>
                                    <Input
                                        type="tel"
                                        value={newAppointment.phone}
                                        onChange={(e) => setNewAppointment(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                                        placeholder="699 123 456"
                                        className="rounded-l-none"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <Label>Email (optionnel)</Label>
                                <Input
                                    type="email"
                                    value={newAppointment.email}
                                    onChange={(e) => setNewAppointment(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="exemple@email.com"
                                />
                            </div>

                            {/* Appointment Type */}
                            <div>
                                <Label>Type de rendez-vous *</Label>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setNewAppointment(prev => ({ ...prev, type: 'LAB_VISIT' }))}
                                        className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${newAppointment.type === 'LAB_VISIT' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <Building2 className="w-5 h-5" />
                                        <span>Au laboratoire</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAppointment(prev => ({ ...prev, type: 'HOME_SAMPLING' }))}
                                        className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${newAppointment.type === 'HOME_SAMPLING' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                                        disabled={!settings.isHomeSamplingEnabled}
                                    >
                                        <Home className="w-5 h-5" />
                                        <span>À domicile</span>
                                    </button>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <Label>Date *</Label>
                                <Input
                                    type="date"
                                    value={newAppointment.date}
                                    onChange={(e) => handleNewAppointmentDateChange(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            {/* Time Slot */}
                            <div>
                                <Label>Créneau horaire *</Label>
                                {loadingSlots ? (
                                    <div className="flex items-center gap-2 text-muted-foreground py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Chargement des créneaux...
                                    </div>
                                ) : !newAppointment.date ? (
                                    <p className="text-muted-foreground text-sm py-2">Sélectionnez d'abord une date</p>
                                ) : availableSlots.length === 0 ? (
                                    <p className="text-red-500 text-sm py-2">Aucun créneau disponible pour cette date</p>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2 mt-1 max-h-32 overflow-y-auto">
                                        {availableSlots.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setNewAppointment(prev => ({ ...prev, time: slot }))}
                                                className={`px-3 py-2 text-sm rounded-md border transition-all ${newAppointment.time === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Address (for home sampling) */}
                            {newAppointment.type === 'HOME_SAMPLING' && (
                                <div>
                                    <Label>Adresse complète *</Label>
                                    <Input
                                        value={newAppointment.address}
                                        onChange={(e) => setNewAppointment(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="Quartier, Ville, Repères"
                                    />
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <Label>Notes (optionnel)</Label>
                                <textarea
                                    value={newAppointment.notes}
                                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="À jeun, diabétique, etc."
                                    className="w-full border rounded-md p-2 text-sm h-20 resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleCreateAppointment}
                                disabled={creatingAppointment || !newAppointment.name || !newAppointment.phone || !newAppointment.date || !newAppointment.time}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {creatingAppointment ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Création...
                                    </>
                                ) : (
                                    'Créer le rendez-vous'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
