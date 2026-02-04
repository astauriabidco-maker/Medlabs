/**
 * Custom hooks for Appointments management
 */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui-dashboard';
import { api } from '@/lib/api';
import { Appointment, TenantSettings, BlockedSlot, AppointmentStatus, getWeekBounds } from './types';

export function useAppointments() {
    const { addToast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');

    const fetchAppointments = useCallback(async () => {
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
    }, [currentWeek, statusFilter]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

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

    const goToToday = () => setCurrentWeek(new Date());

    const weekBounds = getWeekBounds(currentWeek);

    return {
        appointments,
        loading,
        updatingId,
        statusFilter,
        setStatusFilter,
        weekBounds,
        prevWeek,
        nextWeek,
        goToToday,
        updateStatus,
        refreshAppointments: fetchAppointments,
    };
}

export function useTenantAppointmentSettings() {
    const { addToast } = useToast();
    const [settings, setSettings] = useState<TenantSettings>({
        openingTime: '07:00',
        closingTime: '15:00',
        appointmentDuration: 15,
        isHomeSamplingEnabled: false,
        maxAppointmentsPerSlot: 1,
    });
    const [tenantSlug, setTenantSlug] = useState<string>('');
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
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
                    if (data.slug) setTenantSlug(data.slug);
                }
                const blockedRes = await api.get('/appointments/blocked-slots');
                if (blockedRes.ok) {
                    const blockedData = await blockedRes.json();
                    setBlockedSlots(blockedData);
                }
            } catch (err) {
                console.error('Failed to fetch settings:', err);
            }
        };
        fetchSettings();
    }, []);

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

    const addBlockedSlot = async (date: string, reason: string) => {
        try {
            await api.post('/appointments/blocked-slots', {
                date,
                allDay: true,
                reason: reason || 'Fermeture',
            });
            const res = await api.get('/appointments/blocked-slots');
            if (res.ok) {
                const data = await res.json();
                setBlockedSlots(data);
            }
            addToast('Fermeture ajoutée', 'success');
            return true;
        } catch {
            addToast('Erreur lors de l\'ajout', 'error');
            return false;
        }
    };

    const removeBlockedSlot = async (id: string) => {
        try {
            await api.delete(`/appointments/blocked-slots/${id}`, {});
            setBlockedSlots(prev => prev.filter(s => s.id !== id));
            addToast('Fermeture supprimée', 'success');
            return true;
        } catch {
            addToast('Erreur', 'error');
            return false;
        }
    };

    return {
        settings,
        setSettings,
        tenantSlug,
        blockedSlots,
        savingSettings,
        saveSettings,
        addBlockedSlot,
        removeBlockedSlot,
    };
}

export function useCreateAppointment(tenantSlug: string, onCreated: () => void) {
    const { addToast } = useToast();
    const [creating, setCreating] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

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

    const createAppointment = async (data: {
        name: string;
        phone: string;
        email?: string;
        type: 'LAB_VISIT' | 'HOME_SAMPLING';
        date: string;
        time: string;
        address?: string;
        notes?: string;
    }) => {
        if (!data.name || !data.phone || !data.date || !data.time) {
            addToast('Veuillez remplir tous les champs obligatoires', 'error');
            return false;
        }

        setCreating(true);
        try {
            const dateTime = new Date(`${data.date}T${data.time}`);
            const res = await api.post('/api/appointments/book', {
                tenantId: localStorage.getItem('tenantId'),
                name: data.name,
                phone: data.phone,
                email: data.email || undefined,
                type: data.type,
                date: dateTime.toISOString(),
                address: data.type === 'HOME_SAMPLING' ? data.address : undefined,
                notes: data.notes || undefined,
            });

            if (res.ok) {
                addToast('Rendez-vous créé avec succès', 'success');
                onCreated();
                return true;
            } else {
                const resData = await res.json();
                addToast(resData.message || 'Erreur lors de la création', 'error');
                return false;
            }
        } catch (err) {
            addToast('Erreur lors de la création du rendez-vous', 'error');
            return false;
        } finally {
            setCreating(false);
        }
    };

    return {
        creating,
        availableSlots,
        loadingSlots,
        fetchAvailableSlots,
        createAppointment,
    };
}
