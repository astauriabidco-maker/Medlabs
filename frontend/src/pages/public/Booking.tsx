import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Phone, MapPin, Building2, Home, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui-basic';

interface TenantSettings {
    id: string;
    name: string;
    slug: string;
    brandColor: string | null;
    brandLogoUrl: string | null;
    openingTime: string;
    closingTime: string;
    appointmentDuration: number;
    isHomeSamplingEnabled: boolean;
    appointmentBookingEnabled: boolean;
}

interface AvailableSlot {
    time: string;
    datetime: string;
    available: boolean;
}

type AppointmentType = 'LAB_VISIT' | 'HOME_SAMPLING';

const steps = ['Service', 'Date', 'Horaire', 'Détails', 'Confirmation'];

export default function Booking() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState<TenantSettings | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [appointmentType, setAppointmentType] = useState<AppointmentType>('LAB_VISIT');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    // Fetch tenant settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`/api/appointments/settings/${slug}`);
                if (!res.ok) {
                    throw new Error('Laboratoire introuvable');
                }
                const data = await res.json();
                setTenant(data);
            } catch (err: any) {
                setError(err.message || 'Erreur de chargement');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [slug]);

    // Fetch available slots when date changes
    useEffect(() => {
        if (!selectedDate || !tenant) return;

        const fetchSlots = async () => {
            setLoadingSlots(true);
            try {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const res = await fetch(`/api/appointments/availability/${tenant.id}?date=${dateStr}`);
                if (res.ok) {
                    const slots = await res.json();
                    setAvailableSlots(slots);
                }
            } catch (err) {
                console.error('Failed to fetch slots:', err);
            } finally {
                setLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [selectedDate, tenant]);

    // Submit booking
    const handleSubmit = async () => {
        if (!tenant || !selectedSlot) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/appointments/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: tenant.id,
                    name,
                    phone,
                    email: email || undefined,
                    type: appointmentType,
                    date: selectedSlot.datetime,
                    address: appointmentType === 'HOME_SAMPLING' ? address : undefined,
                    notes: notes || undefined,
                }),
            });

            if (res.ok) {
                setSuccess(true);
                setCurrentStep(4);
            } else {
                const data = await res.json();
                setError(data.message || 'Erreur lors de la réservation');
            }
        } catch (err) {
            setError('Erreur réseau');
        } finally {
            setSubmitting(false);
        }
    };

    // Generate next 14 days
    const getNextDays = () => {
        const days: Date[] = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            // Skip Sundays (getDay() === 0)
            if (d.getDay() !== 0) {
                days.push(d);
            }
        }
        return days;
    };

    const formatDay = (date: Date) => {
        return new Intl.DateTimeFormat('fr-CM', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return true;
            case 1: return selectedDate !== null;
            case 2: return selectedSlot !== null;
            case 3: return name.trim() !== '' && phone.trim().length >= 9 && (appointmentType === 'LAB_VISIT' || address.trim() !== '');
            default: return false;
        }
    };

    const brandColor = tenant?.brandColor || '#3B82F6';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error && !tenant) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Erreur</h1>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Header */}
            <header className="bg-white border-b shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    {tenant?.brandLogoUrl ? (
                        <img src={tenant.brandLogoUrl} alt={tenant.name} className="h-10 object-contain" />
                    ) : (
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: brandColor }}
                        >
                            {tenant?.name?.[0] || 'L'}
                        </div>
                    )}
                    <div>
                        <h1 className="font-bold text-lg">{tenant?.name}</h1>
                        <p className="text-sm text-muted-foreground">Prise de rendez-vous en ligne</p>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            {!success && (
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between mb-2">
                        {steps.slice(0, 4).map((step, i) => (
                            <div key={step} className="flex items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${i <= currentStep
                                        ? 'text-white'
                                        : 'bg-gray-200 text-gray-500'
                                        }`}
                                    style={{ backgroundColor: i <= currentStep ? brandColor : undefined }}
                                >
                                    {i + 1}
                                </div>
                                {i < 3 && (
                                    <div
                                        className={`w-16 sm:w-24 h-1 mx-2 rounded ${i < currentStep ? '' : 'bg-gray-200'
                                            }`}
                                        style={{ backgroundColor: i < currentStep ? brandColor : undefined }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        {steps.slice(0, 4).map((step) => (
                            <span key={step} className="w-16 text-center">{step}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 pb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    {/* Step 0: Service Selection */}
                    {currentStep === 0 && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">Choisissez votre service</h2>
                            <div className="grid gap-4">
                                <button
                                    onClick={() => setAppointmentType('LAB_VISIT')}
                                    className={`p-6 border-2 rounded-xl text-left transition-all ${appointmentType === 'LAB_VISIT'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <Building2 className="w-7 h-7 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Au Laboratoire</h3>
                                            <p className="text-muted-foreground">Venez au laboratoire pour votre prélèvement</p>
                                        </div>
                                    </div>
                                </button>

                                {tenant?.isHomeSamplingEnabled && (
                                    <button
                                        onClick={() => setAppointmentType('HOME_SAMPLING')}
                                        className={`p-6 border-2 rounded-xl text-left transition-all ${appointmentType === 'HOME_SAMPLING'
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center">
                                                <Home className="w-7 h-7 text-orange-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">À Domicile</h3>
                                                <p className="text-muted-foreground">Un préleveur vient chez vous</p>
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Date Selection */}
                    {currentStep === 1 && (
                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Choisissez une date
                            </h2>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {getNextDays().map((day) => {
                                    const isSelected = selectedDate?.toDateString() === day.toDateString();
                                    return (
                                        <button
                                            key={day.toISOString()}
                                            onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                                            className={`p-3 rounded-lg border-2 text-center transition-all ${isSelected
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium">{formatDay(day)}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Time Selection */}
                    {currentStep === 2 && (
                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Choisissez un horaire
                            </h2>
                            <p className="text-muted-foreground mb-4">
                                {selectedDate && formatDay(selectedDate)}
                            </p>
                            {loadingSlots ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {availableSlots.map((slot) => (
                                        <button
                                            key={slot.time}
                                            disabled={!slot.available}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-2 rounded-lg border text-center transition-all ${!slot.available
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : selectedSlot?.time === slot.time
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                                    : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {!loadingSlots && availableSlots.filter(s => s.available).length === 0 && (
                                <p className="text-center text-muted-foreground py-4">
                                    Aucun créneau disponible pour cette date
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 3: Details */}
                    {currentStep === 3 && (
                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Vos informations
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <Label>Nom complet *</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jean Dupont"
                                    />
                                </div>
                                <div>
                                    <Label>Téléphone *</Label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-md text-muted-foreground">
                                            +237
                                        </span>
                                        <Input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                            placeholder="699 123 456"
                                            className="rounded-l-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Email (optionnel)</Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="exemple@email.com"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Recevez une confirmation par email
                                    </p>
                                </div>
                                {appointmentType === 'HOME_SAMPLING' && (
                                    <div>
                                        <Label>Adresse complète *</Label>
                                        <Input
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Quartier, rue, repère..."
                                        />
                                    </div>
                                )}
                                <div>
                                    <Label>Notes (optionnel)</Label>
                                    <Input
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ex: À jeun, diabétique..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {currentStep === 4 && success && (
                        <div className="text-center py-8">
                            <div
                                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{ backgroundColor: brandColor }}
                            >
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Demande envoyée !</h2>
                            <p className="text-muted-foreground mb-6">
                                Vous recevrez une confirmation par WhatsApp
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 text-left max-w-sm mx-auto">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedDate && formatDay(selectedDate)}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedSlot?.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {appointmentType === 'LAB_VISIT' ? (
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                        <Home className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span>{appointmentType === 'LAB_VISIT' ? 'Au laboratoire' : 'À domicile'}</span>
                                </div>
                            </div>

                            {/* Close/Return Button */}
                            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/')}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Retour à l'accueil
                                </Button>
                                <Button
                                    onClick={() => {
                                        // Reset form for new booking
                                        setSuccess(false);
                                        setCurrentStep(0);
                                        setSelectedDate(null);
                                        setSelectedSlot(null);
                                        setName('');
                                        setPhone('');
                                        setAddress('');
                                        setNotes('');
                                    }}
                                    style={{ backgroundColor: brandColor }}
                                >
                                    Nouveau rendez-vous
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    {!success && (
                        <div className="flex justify-between mt-8 pt-6 border-t">
                            {currentStep > 0 ? (
                                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Retour
                                </Button>
                            ) : (
                                <div />
                            )}

                            {currentStep < 3 ? (
                                <Button
                                    onClick={() => setCurrentStep(currentStep + 1)}
                                    disabled={!canProceed()}
                                    style={{ backgroundColor: brandColor }}
                                >
                                    Continuer
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!canProceed() || submitting}
                                    style={{ backgroundColor: brandColor }}
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    Confirmer
                                </Button>
                            )}
                        </div>
                    )}

                    {error && currentStep !== 4 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
