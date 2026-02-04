/**
 * Appointment Settings Component
 */
import React, { useState } from 'react';
import { Home, CalendarOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui-basic';
import { TenantSettings, BlockedSlot } from './types';

interface AppointmentSettingsProps {
    settings: TenantSettings;
    setSettings: (settings: TenantSettings) => void;
    blockedSlots: BlockedSlot[];
    saving: boolean;
    onSave: () => void;
    onAddBlock: (date: string, reason: string) => Promise<boolean>;
    onRemoveBlock: (id: string) => Promise<boolean>;
}

export function AppointmentSettings({
    settings,
    setSettings,
    blockedSlots,
    saving,
    onSave,
    onAddBlock,
    onRemoveBlock,
}: AppointmentSettingsProps) {
    const [newBlockDate, setNewBlockDate] = useState('');
    const [newBlockReason, setNewBlockReason] = useState('');
    const [addingBlock, setAddingBlock] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleAddBlock = async () => {
        if (!newBlockDate) return;
        setAddingBlock(true);
        const success = await onAddBlock(newBlockDate, newBlockReason);
        if (success) {
            setNewBlockDate('');
            setNewBlockReason('');
        }
        setAddingBlock(false);
    };

    const handleRemoveBlock = async (id: string) => {
        setRemovingId(id);
        await onRemoveBlock(id);
        setRemovingId(null);
    };

    return (
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

            {/* Home Sampling Toggle */}
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

            {/* Blocked Slots Section */}
            <div className="border-t pt-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                    <CalendarOff className="w-5 h-5 text-red-600" />
                    <div>
                        <h3 className="font-medium">Fermetures & Congés</h3>
                        <p className="text-sm text-muted-foreground">Bloquer des jours où le laboratoire est fermé</p>
                    </div>
                </div>

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
                    <Button onClick={handleAddBlock} disabled={addingBlock || !newBlockDate}>
                        {addingBlock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>

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
                                            {new Date(slot.date).toLocaleDateString('fr-FR', {
                                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </p>
                                        {slot.reason && <p className="text-xs text-muted-foreground">{slot.reason}</p>}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveBlock(slot.id)}
                                    disabled={removingId === slot.id}
                                    className="text-red-600 hover:bg-red-100"
                                >
                                    {removingId === slot.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Button onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Enregistrer les paramètres
            </Button>
        </div>
    );
}
