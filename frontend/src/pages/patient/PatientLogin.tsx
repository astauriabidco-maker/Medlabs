import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Loader2, Shield, CheckCircle } from 'lucide-react';

interface BrandingData {
    name: string;
    brandColor: string;
    brandLogoUrl: string | null;
}

export default function PatientLogin() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    // State
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [branding, setBranding] = useState<BrandingData | null>(null);

    // Fetch tenant branding
    useEffect(() => {
        if (slug) {
            fetch(`/api/public/branding/${slug}`)
                .then(res => res.json())
                .then(data => setBranding(data))
                .catch(() => setBranding({ name: 'MedLab', brandColor: '#3B82F6', brandLogoUrl: null }));
        }
    }, [slug]);

    // Request OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`/api/patient/auth/request-otp/${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erreur lors de l\'envoi du code');
            }

            setStep('otp');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Verify OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`/api/patient/auth/verify-otp/${slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, code: otpCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Code incorrect');
            }

            // Store token
            localStorage.setItem('patientToken', data.token);
            localStorage.setItem('patientSlug', slug || '');

            // Navigate to dashboard
            navigate(`/patient/${slug}/dashboard`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = branding?.brandColor || '#3B82F6';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo & Branding */}
                <div className="text-center mb-8">
                    {branding?.brandLogoUrl ? (
                        <img
                            src={branding.brandLogoUrl}
                            alt={branding.name}
                            className="h-16 mx-auto mb-4"
                        />
                    ) : (
                        <div
                            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {branding?.name?.charAt(0) || 'M'}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900">
                        {branding?.name || 'MedLab'}
                    </h1>
                    <p className="text-gray-600 mt-1">Espace Patient</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {step === 'phone' ? (
                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-full bg-blue-100 mx-auto flex items-center justify-center mb-4">
                                    <Phone className="w-6 h-6 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold">Connexion sécurisée</h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Entrez votre numéro pour recevoir un code
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Numéro de téléphone
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+237 6XX XXX XXX"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !phoneNumber}
                                className="w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Recevoir mon code
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                                    <Shield className="w-6 h-6 text-green-600" />
                                </div>
                                <h2 className="text-xl font-semibold">Vérification</h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Code envoyé au {phoneNumber}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Code à 4 chiffres
                                </label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="• • • •"
                                    className="w-full px-4 py-4 text-center text-2xl tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    maxLength={4}
                                    required
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || otpCode.length !== 4}
                                className="w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Connexion
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep('phone'); setOtpCode(''); setError(null); }}
                                className="w-full text-gray-500 text-sm hover:text-gray-700"
                            >
                                ← Changer de numéro
                            </button>
                        </form>
                    )}
                </div>

                {/* Security Badge */}
                <div className="mt-6 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    Connexion sécurisée par OTP
                </div>

                {/* Booking Link */}
                <div className="mt-4 text-center">
                    <a
                        href={`/book/${slug}`}
                        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                        style={{ color: primaryColor }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Prendre un rendez-vous
                    </a>
                </div>
            </div>
        </div>
    );
}
