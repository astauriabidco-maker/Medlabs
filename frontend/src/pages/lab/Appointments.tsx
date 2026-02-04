/**
 * Appointments Page - Refactored to use modular components
 * Original: 1000 lines → Now: ~180 lines
 */
import React, { useState } from 'react';
import { Calendar, Settings as SettingsIcon, ChevronLeft, ChevronRight, Filter, List, Grid3X3, Download, Plus, Loader2, Copy, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui-basic';
import { useToast } from '@/components/ui-dashboard';

import {
    AppointmentStatus,
    formatDate,
    typeLabels,
    statusLabels,
    useAppointments,
    useTenantAppointmentSettings,
    useCreateAppointment,
    AppointmentList,
    CalendarView,
    AppointmentSettings,
    CreateAppointmentModal,
} from './appointments/index';

export default function Appointments() {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'agenda' | 'settings'>('agenda');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Hooks
    const {
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
        refreshAppointments,
    } = useAppointments();

    const {
        settings,
        setSettings,
        tenantSlug,
        blockedSlots,
        savingSettings,
        saveSettings,
        addBlockedSlot,
        removeBlockedSlot,
    } = useTenantAppointmentSettings();

    const {
        creating,
        availableSlots,
        loadingSlots,
        fetchAvailableSlots,
        createAppointment,
    } = useCreateAppointment(tenantSlug, () => {
        setShowCreateModal(false);
        refreshAppointments();
    });

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

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
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
                {tenantSlug && (
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <Link2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Lien de réservation :</span>
                            <code className="text-xs bg-white px-2 py-1 rounded border">
                                {window.location.origin}/book/{tenantSlug}
                            </code>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/book/${tenantSlug}`);
                            addToast('Lien copié !', 'success');
                        }}>
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/book/${tenantSlug}`, '_blank')}>
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('agenda')}
                    className={`px-4 py-2 font-medium -mb-px transition-colors ${activeTab === 'agenda' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Agenda
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 font-medium -mb-px transition-colors ${activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
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
                                {formatDate(weekBounds.start.toISOString())} - {formatDate(weekBounds.end.toISOString())}
                            </span>
                            <Button variant="outline" size="icon" onClick={nextWeek}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
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
                            <div className="flex border rounded-md overflow-hidden ml-2">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`px-3 py-1.5 text-sm ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                            </div>
                            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={appointments.length === 0} className="ml-2">
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => setShowCreateModal(true)} className="ml-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
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
                        <AppointmentList appointments={appointments} updatingId={updatingId} onUpdateStatus={updateStatus} />
                    ) : (
                        <CalendarView appointments={appointments} weekStart={weekBounds.start} />
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <AppointmentSettings
                    settings={settings}
                    setSettings={setSettings}
                    blockedSlots={blockedSlots}
                    saving={savingSettings}
                    onSave={saveSettings}
                    onAddBlock={addBlockedSlot}
                    onRemoveBlock={removeBlockedSlot}
                />
            )}

            {/* Create Modal */}
            <CreateAppointmentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={createAppointment}
                availableSlots={availableSlots}
                loadingSlots={loadingSlots}
                onDateChange={fetchAvailableSlots}
                creating={creating}
            />
        </div>
    );
}
