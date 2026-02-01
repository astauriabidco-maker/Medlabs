import React, { useState, useEffect } from 'react';
import { Heart, Users, FileText, ExternalLink, Copy, QrCode, Settings, Share2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui-dashboard';

export default function PatientPortal() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [stats, setStats] = useState({ totalPatients: 0, activeDocuments: 0, accessedToday: 0 });

    // Get the patient portal URL for this tenant
    const tenantSlug = (user as any)?.tenantSlug || (user?.tenantName?.toLowerCase().replace(/\s+/g, '-')) || 'demo-lab';
    const patientPortalUrl = `${window.location.origin}/patient/${tenantSlug}/login`;

    useEffect(() => {
        // TODO: Fetch actual stats from backend
        setStats({
            totalPatients: 142,
            activeDocuments: 38,
            accessedToday: 12,
        });
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Lien copié dans le presse-papiers', 'success');
    };

    const openPortal = () => {
        window.open(patientPortalUrl, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Carnet de Santé Numérique</h1>
                <p className="text-gray-500">Portail d'accès patient sécurisé par OTP</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-100 rounded-xl">
                            <Users className="w-6 h-6 text-pink-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                            <p className="text-sm text-gray-500">Patients enregistrés</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.activeDocuments}</p>
                            <p className="text-sm text-gray-500">Résultats disponibles</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-xl">
                            <Heart className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.accessedToday}</p>
                            <p className="text-sm text-gray-500">Consultations aujourd'hui</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Portal Access Card */}
            <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                            <Heart className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Portail Patient</h2>
                            <p className="text-pink-100">Accès sécurisé par code OTP</p>
                        </div>
                    </div>
                    <button
                        onClick={openPortal}
                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-lg transition"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Ouvrir le portail
                    </button>
                </div>

                <div className="mt-6 bg-white/10 backdrop-blur rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 truncate">
                            <p className="text-xs text-pink-200 mb-1">URL du portail patient</p>
                            <p className="font-mono text-sm truncate">{patientPortalUrl}</p>
                        </div>
                        <button
                            onClick={() => copyToClipboard(patientPortalUrl)}
                            className="ml-4 p-2 hover:bg-white/20 rounded-lg transition"
                            title="Copier le lien"
                        >
                            <Copy className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Features Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <QrCode className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Comment ça marche ?</h3>
                    </div>
                    <ol className="space-y-3 text-sm text-gray-600">
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span>Le patient accède au portail via son téléphone</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span>Il saisit son numéro de téléphone</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span>Un code OTP est envoyé par SMS</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                            <span>Il peut consulter tous ses résultats médicaux</span>
                        </li>
                    </ol>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Share2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Partager avec vos patients</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Affichez ce lien ou QR code dans votre salle d'attente pour permettre à vos patients d'accéder facilement à leurs résultats.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => copyToClipboard(patientPortalUrl)}
                            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition text-sm"
                        >
                            <Copy className="w-4 h-4" />
                            Copier le lien
                        </button>
                        <button
                            onClick={openPortal}
                            className="flex-1 flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition text-sm"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Tester le portail
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Link */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Settings className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Personnalisation</h3>
                            <p className="text-sm text-gray-500">Logo, couleurs et branding du portail patient</p>
                        </div>
                    </div>
                    <a
                        href="/dashboard/settings"
                        className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                    >
                        Configurer →
                    </a>
                </div>
            </div>
        </div>
    );
}
