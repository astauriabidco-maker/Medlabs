import * as React from 'react';
import { useState, useEffect } from 'react';
import { Check, X, Sparkles, Building2, Rocket, Crown, ArrowRight, MessageSquare, Phone, Database, BarChart3, Users, Calendar, AlertTriangle, CreditCard, Plug, Clock, RefreshCw, Heart, FileHeart, Headphones, UsersRound, Upload, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui-basic';
import { useNavigate } from 'react-router-dom';

// Icon mapping for dynamic icons from API
const ICON_MAP: Record<string, React.ComponentType<any>> = {
    Upload, MessageSquare, MessageCircle, Heart, Users, Database, RefreshCw, BarChart3, Headphones,
    FileHeart, Calendar, AlertTriangle, CreditCard, Plug, Clock, UsersRound, Phone,
};

interface PricingPlan {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    interval: string;
    popular: boolean;
    color: string;
    buttonText: string | null;
    buttonVariant: string;
    includedFeatures: string[];
    featureLimits: Record<string, number> | null;
}

interface PricingFeature {
    id: string;
    name: string;
    key: string;
    description: string | null;
    category: string | null;
    icon: string | null;
    isAddon: boolean;
    addonPrice: number | null;
    addonColor: string | null;
}

// Fallback static data (used when API is unavailable)
const FALLBACK_FEATURES = [
    { name: 'Upload manuel des résultats', key: 'MANUAL_UPLOAD' },
    { name: 'Notifications SMS', key: 'SMS_NOTIFICATIONS' },
    { name: 'WhatsApp Business', key: 'WHATSAPP_BUSINESS' },
    { name: 'Portail patient sécurisé', key: 'PATIENT_PORTAL' },
    { name: 'Membres d\'équipe', key: 'TEAM_MEMBERS' },
    { name: 'Rétention des données', key: 'DATA_RETENTION' },
    { name: 'Auto-Sync Windows (SIL)', key: 'AUTO_SYNC' },
    { name: 'Analytics & BI Dashboard', key: 'ANALYTICS_BI' },
    { name: 'Support prioritaire', key: 'PRIORITY_SUPPORT' },
    { name: 'Carnet de Santé Patient', key: 'HEALTH_RECORD' },
    { name: 'Rendez-vous en ligne', key: 'APPOINTMENTS' },
    { name: 'Alertes valeurs critiques', key: 'CRITICAL_ALERTS' },
    { name: 'Paiements Mobile Money', key: 'MOBILE_MONEY' },
    { name: 'API LIS/HL7 avancée', key: 'API_ADVANCED' },
];

const FALLBACK_PLANS = [
    {
        name: 'Starter',
        slug: 'starter',
        description: 'Parfait pour démarrer',
        price: 0,
        popular: false,
        color: 'gray',
        buttonText: 'Commencer gratuitement',
        buttonVariant: 'outline',
        includedFeatures: ['MANUAL_UPLOAD', 'SMS_NOTIFICATIONS', 'WHATSAPP_BUSINESS', 'PATIENT_PORTAL', 'TEAM_MEMBERS', 'DATA_RETENTION'],
        featureLimits: { TEAM_MEMBERS: 3, DATA_RETENTION: 90 },
    },
    {
        name: 'Premium',
        slug: 'premium',
        description: 'Pour laboratoires établis',
        price: 49000,
        popular: true,
        color: 'blue',
        buttonText: 'Souscrire maintenant',
        buttonVariant: 'default',
        includedFeatures: ['MANUAL_UPLOAD', 'SMS_NOTIFICATIONS', 'WHATSAPP_BUSINESS', 'PATIENT_PORTAL', 'TEAM_MEMBERS', 'DATA_RETENTION', 'AUTO_SYNC', 'ANALYTICS_BI', 'PRIORITY_SUPPORT'],
        featureLimits: { TEAM_MEMBERS: 10, DATA_RETENTION: 365 },
    },
    {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'Pour grands laboratoires',
        price: 99000,
        popular: false,
        color: 'purple',
        buttonText: 'Contacter les ventes',
        buttonVariant: 'outline',
        includedFeatures: ['MANUAL_UPLOAD', 'SMS_NOTIFICATIONS', 'WHATSAPP_BUSINESS', 'PATIENT_PORTAL', 'TEAM_MEMBERS', 'DATA_RETENTION', 'AUTO_SYNC', 'ANALYTICS_BI', 'PRIORITY_SUPPORT', 'HEALTH_RECORD', 'APPOINTMENTS', 'CRITICAL_ALERTS', 'MOBILE_MONEY', 'API_ADVANCED'],
        featureLimits: { TEAM_MEMBERS: -1, DATA_RETENTION: 3650 },
    },
];

const FALLBACK_ADDONS = [
    { name: 'Auto-Sync Windows', key: 'AUTO_SYNC', addonPrice: 25000, addonColor: 'from-blue-500 to-blue-600', icon: 'RefreshCw', description: 'Synchronisation automatique avec votre SIL Windows' },
    { name: 'Archive 5 ans', key: 'ARCHIVE_5Y', addonPrice: 15000, addonColor: 'from-purple-500 to-purple-600', icon: 'Clock', description: 'Conservation des résultats jusqu\'à 5 ans' },
    { name: 'Analytics BI', key: 'ANALYTICS_BI', addonPrice: 20000, addonColor: 'from-green-500 to-green-600', icon: 'BarChart3', description: 'Dashboard Business Intelligence complet' },
    { name: 'Rendez-vous', key: 'APPOINTMENTS', addonPrice: 15000, addonColor: 'from-orange-500 to-orange-600', icon: 'Calendar', description: 'Booking en ligne avec rappels automatiques' },
    { name: 'Alertes Critiques', key: 'CRITICAL_ALERTS', addonPrice: 10000, addonColor: 'from-red-500 to-red-600', icon: 'AlertTriangle', description: 'Notifications immédiates pour valeurs anormales' },
    { name: 'Mobile Money', key: 'MOBILE_MONEY', addonPrice: 20000, addonColor: 'from-yellow-500 to-yellow-600', icon: 'CreditCard', description: 'Acceptez Orange Money, MTN MoMo' },
    { name: 'Carnet Patient', key: 'HEALTH_RECORD', addonPrice: 30000, addonColor: 'from-rose-500 to-rose-600', icon: 'Heart', description: 'Historique médical complet du patient' },
    { name: 'API LIS/HL7', key: 'API_ADVANCED', addonPrice: 50000, addonColor: 'from-indigo-500 to-indigo-600', icon: 'Plug', description: 'Intégration bidirectionnelle HL7 v2.x' },
];

export default function Pricing() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);
    const [features, setFeatures] = useState<any[]>(FALLBACK_FEATURES);
    const [addons, setAddons] = useState<any[]>(FALLBACK_ADDONS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch('/api/pricing/public');
                if (res.ok) {
                    const data = await res.json();
                    if (data.plans?.length > 0) setPlans(data.plans);
                    if (data.allFeatures?.length > 0) setFeatures(data.allFeatures);
                    if (data.addons?.length > 0) setAddons(data.addons);
                }
            } catch (error) {
                console.warn('Using fallback pricing data');
            }
            setLoading(false);
        };
        fetchPricing();
    }, []);

    const getFeatureValue = (plan: any, featureKey: string) => {
        if (!plan.includedFeatures?.includes(featureKey)) return false;

        // Special handling for features with limits
        if (featureKey === 'TEAM_MEMBERS' && plan.featureLimits?.TEAM_MEMBERS) {
            const limit = plan.featureLimits.TEAM_MEMBERS;
            return limit === -1 ? 'Illimité' : `${limit} max`;
        }
        if (featureKey === 'DATA_RETENTION' && plan.featureLimits?.DATA_RETENTION) {
            const days = plan.featureLimits.DATA_RETENTION;
            if (days >= 3650) return '5-10 ans';
            if (days >= 365) return '1 an';
            return `${days} jours`;
        }
        return true;
    };

    const getIcon = (iconName: string | null) => {
        if (!iconName || !ICON_MAP[iconName]) return Database;
        return ICON_MAP[iconName];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">M</span>
                        </div>
                        <span className="font-bold text-xl text-gray-900">MedLabs</span>
                    </div>
                    <Button onClick={() => navigate('/login')}>Se connecter</Button>
                </div>
            </header>

            {/* Hero */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6">
                        <Sparkles className="w-4 h-4" />
                        Tarification transparente
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Choisissez l'offre adaptée à votre laboratoire
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Du petit laboratoire de quartier au groupe hospitalier, nous avons une solution pour vous. Tous les prix sont en FCFA/mois.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="max-w-6xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan, idx) => (
                            <div
                                key={plan.slug || idx}
                                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 ${plan.popular ? 'border-blue-500 scale-105' : 'border-gray-100'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-2 text-sm font-medium">
                                        ⭐ Le plus populaire
                                    </div>
                                )}
                                <div className={`p-8 ${plan.popular ? 'pt-14' : ''}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        {plan.slug === 'starter' && <Building2 className="w-8 h-8 text-gray-500" />}
                                        {plan.slug === 'premium' && <Rocket className="w-8 h-8 text-blue-500" />}
                                        {plan.slug === 'enterprise' && <Crown className="w-8 h-8 text-purple-500" />}
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                                            <p className="text-gray-500 text-sm">{plan.description}</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-gray-900">
                                            {plan.price === 0 ? 'Gratuit' : plan.price.toLocaleString()}
                                        </span>
                                        {plan.price > 0 && <span className="text-gray-500 ml-1">FCFA/mois</span>}
                                    </div>

                                    <Button
                                        variant={plan.buttonVariant === 'outline' ? 'outline' : 'default'}
                                        className={`w-full mb-6 ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`}
                                        onClick={() => navigate('/login')}
                                    >
                                        {plan.buttonText || 'Commencer'}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>

                                    <p className="text-sm font-medium text-gray-600 mb-4">
                                        {plan.slug === 'starter' ? 'Inclus :' : plan.slug === 'premium' ? 'Tout de Starter, plus :' : 'Tout de Premium, plus :'}
                                    </p>

                                    <ul className="space-y-3">
                                        {plan.slug === 'starter' && (
                                            <>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> Upload manuel des résultats</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> Notifications SMS</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> WhatsApp Business</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> 3 membres d'équipe</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /> 90 jours de rétention</li>
                                            </>
                                        )}
                                        {plan.slug === 'premium' && (
                                            <>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-500" /> Auto-Sync Windows</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-500" /> Analytics BI Dashboard</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-500" /> 10 membres d'équipe</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-500" /> 1 an de rétention</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-blue-500" /> Support prioritaire</li>
                                            </>
                                        )}
                                        {plan.slug === 'enterprise' && (
                                            <>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> Membres illimités</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> Archive 5-10 ans</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> Carnet de Santé Patient</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> Rendez-vous en ligne</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> Alertes valeurs critiques</li>
                                                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-purple-500" /> Mobile Money & API LIS</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Feature Comparison Table */}
            <section className="bg-white py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Comparaison détaillée</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-4 px-4 font-medium text-gray-600">Fonctionnalité</th>
                                    <th className="text-center py-4 px-4 font-medium text-gray-600">Starter</th>
                                    <th className="text-center py-4 px-4 font-medium text-blue-600 bg-blue-50">Premium</th>
                                    <th className="text-center py-4 px-4 font-medium text-purple-600">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {features.filter(f => !f.isAddon).map((feature, idx) => (
                                    <tr key={feature.key || idx} className="border-b hover:bg-gray-50">
                                        <td className="py-4 px-4 text-sm">{feature.name}</td>
                                        {plans.map((plan, pIdx) => {
                                            const value = getFeatureValue(plan, feature.key);
                                            return (
                                                <td key={pIdx} className={`py-4 px-4 text-center ${plan.popular ? 'bg-blue-50' : ''}`}>
                                                    {value === true ? (
                                                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                                                    ) : value === false ? (
                                                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                                                    ) : (
                                                        <span className={`text-sm font-medium ${plan.popular ? 'text-blue-600' : 'text-gray-700'}`}>{value}</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Add-on Modules */}
            <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Modules à la carte</h2>
                        <p className="text-gray-600">Personnalisez votre offre avec des modules complémentaires</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {addons.map((addon, idx) => {
                            const IconComponent = getIcon(addon.icon);
                            return (
                                <div key={addon.key || idx} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${addon.addonColor || 'from-gray-400 to-gray-500'} flex items-center justify-center mb-4`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">{addon.name}</h3>
                                    <p className="text-sm text-gray-500 mb-3">{addon.description}</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {(addon.addonPrice || 0).toLocaleString()} <span className="text-sm font-normal text-gray-500">FCFA/mois</span>
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Prêt à moderniser votre laboratoire ?</h2>
                    <p className="text-blue-100 mb-8">Rejoignez des dizaines de laboratoires qui utilisent MedLabs pour améliorer leur service.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-blue-50" onClick={() => navigate('/login')}>
                            Commencer gratuitement
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate('/become-partner')}>
                            Demander une démo
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-sm">© {new Date().getFullYear()} MedLabs - Plateforme de résultats médicaux sécurisés</p>
                </div>
            </footer>
        </div>
    );
}
