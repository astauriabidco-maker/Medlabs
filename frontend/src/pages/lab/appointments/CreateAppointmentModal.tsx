/**
 * Create Appointment Modal Component
 */
import React, { useState, useEffect } from 'react';
import { X, Loader2, Home, Building2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui-basic';
import { AppointmentType, NewAppointment } from './types';

interface CreateAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: NewAppointment) => Promise<boolean>;
    availableSlots: string[];
    loadingSlots: boolean;
    onDateChange: (date: string) => void;
    creating: boolean;
}

export function CreateAppointmentModal({
    isOpen,
    onClose,
    onCreate,
    availableSlots,
    loadingSlots,
    onDateChange,
    creating,
}: CreateAppointmentModalProps) {
    const [formData, setFormData] = useState<NewAppointment>({
        name: '',
        phone: '',
        email: '',
        type: 'LAB_VISIT',
        date: '',
        time: '',
        address: '',
        notes: '',
    });

    const handleSubmit = async () => {
        const success = await onCreate(formData);
        if (success) {
            setFormData({
                name: '',
                phone: '',
                email: '',
                type: 'LAB_VISIT',
                date: '',
                time: '',
                address: '',
                notes: '',
            });
            onClose();
        }
    };

    const handleDateChange = (date: string) => {
        setFormData(prev => ({ ...prev, date, time: '' }));
        onDateChange(date);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold">Nouveau Rendez-vous</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <Label>Nom du patient *</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Jean Dupont"
                        />
                    </div>

                    <div>
                        <Label>Téléphone *</Label>
                        <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+237..."
                        />
                    </div>

                    <div>
                        <Label>Email (optionnel)</Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@exemple.com"
                        />
                    </div>

                    <div>
                        <Label>Type de rendez-vous</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                                onClick={() => setFormData({ ...formData, type: 'LAB_VISIT' })}
                                className={`p-3 rounded-lg border-2 flex items-center gap-2 ${formData.type === 'LAB_VISIT' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Au laboratoire
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, type: 'HOME_SAMPLING' })}
                                className={`p-3 rounded-lg border-2 flex items-center gap-2 ${formData.type === 'HOME_SAMPLING' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                                    }`}
                            >
                                <Home className="w-4 h-4" />
                                À domicile
                            </button>
                        </div>
                    </div>

                    {formData.type === 'HOME_SAMPLING' && (
                        <div>
                            <Label>Adresse *</Label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Adresse complète"
                            />
                        </div>
                    )}

                    <div>
                        <Label>Date *</Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <Label>Créneau horaire *</Label>
                        {loadingSlots ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Chargement des créneaux...
                            </div>
                        ) : !formData.date ? (
                            <p className="text-sm text-muted-foreground p-2">Sélectionnez d'abord une date</p>
                        ) : availableSlots.length === 0 ? (
                            <p className="text-sm text-red-600 p-2">Aucun créneau disponible à cette date</p>
                        ) : (
                            <div className="grid grid-cols-4 gap-1 mt-1 max-h-32 overflow-y-auto">
                                {availableSlots.map((slot) => (
                                    <button
                                        key={slot}
                                        onClick={() => setFormData({ ...formData, time: slot })}
                                        className={`px-2 py-1.5 text-sm rounded border ${formData.time === slot
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white hover:bg-gray-50'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label>Notes (optionnel)</Label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2"
                            rows={2}
                            placeholder="Notes additionnelles..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={creating || !formData.name || !formData.phone || !formData.date || !formData.time}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Créer le RDV
                    </Button>
                </div>
            </div>
        </div>
    );
}
