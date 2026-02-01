import * as React from 'react';
import {
    Package,
    Check,
    Lock,
    Sparkles,
    RefreshCw,
    Archive,
    CreditCard,
    MessageSquare,
    Smartphone,
    Copy,
    Eye,
    EyeOff,
    Trash2,
    Key,
    ExternalLink,
    BarChart3,
    Heart,
    Calendar,
    AlertTriangle,
    Plug,
    Users
} from 'lucide-react';
import { Button, Input, Label } from '@/components/ui-basic';
import { useToast, Badge } from '@/components/ui-dashboard';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Module {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    active: boolean;
    category: 'automation' | 'storage' | 'communication' | 'payment' | 'analytics' | 'patient' | 'alerts' | 'integration' | 'team';
    features: string[];
    configComponent?: React.ReactNode;
}

export function Marketplace() {
    const { t } = useTranslation();
    const { addToast } = useToast();

    // State
    const [modules, setModules] = React.useState<{ id: string; active: boolean }[]>([]);
    const [licenseCode, setLicenseCode] = React.useState('');
    const [activating, setActivating] = React.useState(false);
    const [syncApiKey, setSyncApiKey] = React.useState<string | null>(null);
    const [showApiKey, setShowApiKey] = React.useState(false);
    const [generatingKey, setGeneratingKey] = React.useState(false);
    const [expandedModule, setExpandedModule] = React.useState<string | null>(null);

    // Module definitions with full feature set
    const moduleDefinitions: Module[] = [
        {
            id: 'AUTO_SYNC',
            name: 'Auto-Sync Windows',
            description: 'Synchronisation automatique avec votre SIL Windows. Téléversement des résultats PDF sans intervention manuelle.',
            icon: <RefreshCw className="w-6 h-6" />,
            active: modules.find(m => m.id === 'AUTO_SYNC')?.active ?? false,
            category: 'automation',
            features: [
                'Surveillance automatique des dossiers',
                'Upload instantané des PDFs',
                'Mapping automatique patient/prescripteur',
                'Logs détaillés des synchronisations'
            ]
        },
        {
            id: 'LONG_TERM_ARCHIVE',
            name: 'Archive Longue Durée',
            description: 'Conservation des résultats jusqu\'à 5 ans. Idéal pour la conformité réglementaire et les audits.',
            icon: <Archive className="w-6 h-6" />,
            active: modules.find(m => m.id === 'LONG_TERM_ARCHIVE')?.active ?? false,
            category: 'storage',
            features: [
                'Rétention étendue jusqu\'à 1825 jours',
                'Archivage sécurisé et chiffré',
                'Conformité RGPD',
                'Export à la demande'
            ]
        },
        {
            id: 'ANALYTICS_BI',
            name: 'Analytics BI',
            description: 'Dashboard de Business Intelligence avec KPIs, graphiques et analyses de performance.',
            icon: <BarChart3 className="w-6 h-6" />,
            active: modules.find(m => m.id === 'ANALYTICS_BI')?.active ?? false,
            category: 'analytics',
            features: [
                'KPIs personnalisés',
                'Graphiques de volume et tendances',
                'Analyse par prescripteur',
                'Export rapports PDF/Excel'
            ]
        },
        {
            id: 'PATIENT_PORTAL',
            name: 'Carnet de Santé Patient',
            description: 'Portail patient complet avec historique des résultats et suivi de santé.',
            icon: <Heart className="w-6 h-6" />,
            active: modules.find(m => m.id === 'PATIENT_PORTAL')?.active ?? false,
            category: 'patient',
            features: [
                'Historique complet des résultats',
                'Courbes d\'évolution',
                'Accès sécurisé par OTP',
                'Export du dossier médical'
            ]
        },
        {
            id: 'APPOINTMENTS',
            name: 'Rendez-vous en Ligne',
            description: 'Système de prise de rendez-vous en ligne avec rappels automatiques.',
            icon: <Calendar className="w-6 h-6" />,
            active: modules.find(m => m.id === 'APPOINTMENTS')?.active ?? false,
            category: 'patient',
            features: [
                'Booking en ligne 24/7',
                'Rappels SMS automatiques',
                'Gestion des créneaux indisponibles',
                'Synchronisation calendrier'
            ]
        },
        {
            id: 'CRITICAL_ALERTS',
            name: 'Alertes Critiques',
            description: 'Notifications immédiates pour les valeurs critiques détectées dans les résultats.',
            icon: <AlertTriangle className="w-6 h-6" />,
            active: modules.find(m => m.id === 'CRITICAL_ALERTS')?.active ?? false,
            category: 'alerts',
            features: [
                'Détection automatique des valeurs critiques',
                'Alertes push en temps réel',
                'Escalade vers médecin prescripteur',
                'Tableau de bord de suivi'
            ]
        },
        {
            id: 'WHATSAPP_BUSINESS',
            name: 'WhatsApp Business',
            description: 'Envoyez les notifications de résultats directement sur WhatsApp pour un taux de lecture optimal.',
            icon: <MessageSquare className="w-6 h-6" />,
            active: modules.find(m => m.id === 'WHATSAPP_BUSINESS')?.active ?? false,
            category: 'communication',
            features: [
                'Templates pré-approuvés',
                'Envoi automatique',
                'Accusés de lecture',
                'Support média (PDF joints)'
            ]
        },
        {
            id: 'MOBILE_MONEY',
            name: 'Paiements Mobile Money',
            description: 'Acceptez les paiements via Orange Money, MTN MoMo et CamPay directement dans l\'application.',
            icon: <Smartphone className="w-6 h-6" />,
            active: modules.find(m => m.id === 'MOBILE_MONEY')?.active ?? false,
            category: 'payment',
            features: [
                'Orange Money Cameroun',
                'MTN Mobile Money',
                'CamPay integration',
                'Réconciliation automatique'
            ]
        },
        {
            id: 'API_ADVANCED',
            name: 'API LIS Avancée',
            description: 'Intégration bidirectionnelle HL7/FHIR avec votre système de laboratoire.',
            icon: <Plug className="w-6 h-6" />,
            active: modules.find(m => m.id === 'API_ADVANCED')?.active ?? false,
            category: 'integration',
            features: [
                'HL7 v2.x / FHIR R4',
                'Webhooks temps réel',
                'Mapping configurable',
                'Documentation API complète'
            ]
        },
        {
            id: 'UNLIMITED_TEAM',
            name: 'Équipe Illimitée',
            description: 'Ajoutez un nombre illimité de techniciens et utilisateurs à votre équipe.',
            icon: <Users className="w-6 h-6" />,
            active: modules.find(m => m.id === 'UNLIMITED_TEAM')?.active ?? false,
            category: 'team',
            features: [
                'Utilisateurs illimités',
                'Rôles personnalisables',
                'Audit des actions',
                'SSO / LDAP (bientôt)'
            ]
        },
    ];

    // Fetch modules on mount
    React.useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const res = await api.get('/api/tenants/me/modules');
            const data = await res.json();
            if (data.availableModules) {
                setModules(data.availableModules);
            }
            if (data.syncApiKey) {
                setSyncApiKey(data.syncApiKey);
            }
        } catch (err) {
            console.error('Failed to load modules:', err);
        }
    };

    // Activate license
    const handleActivateLicense = async () => {
        if (!licenseCode.trim()) {
            addToast('Veuillez saisir un code de licence', 'error');
            return;
        }

        setActivating(true);
        try {
            const res = await api.post('/api/tenants/me/license', { code: licenseCode });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Activation échouée');
            }

            addToast(data.message || 'Licence activée avec succès !', 'success');
            setLicenseCode('');

            if (data.syncApiKey) {
                setSyncApiKey(data.syncApiKey);
            }

            await fetchModules();
        } catch (err: any) {
            addToast(err.message || 'Échec de l\'activation', 'error');
        } finally {
            setActivating(false);
        }
    };

    // Generate sync API key
    const handleGenerateSyncKey = async () => {
        setGeneratingKey(true);
        try {
            const res = await api.post('/api/tenants/me/sync-key', {});
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSyncApiKey(data.syncApiKey);
            setShowApiKey(true);
            addToast('Clé de connexion générée', 'success');
        } catch (err: any) {
            addToast(err.message || 'Erreur', 'error');
        } finally {
            setGeneratingKey(false);
        }
    };

    // Revoke sync API key
    const handleRevokeSyncKey = async () => {
        if (!confirm('Révoquer cette clé ? L\'automate ne pourra plus se connecter.')) return;
        try {
            await api.delete('/api/tenants/me/sync-key', {});
            setSyncApiKey(null);
            addToast('Clé révoquée', 'success');
        } catch (err) {
            addToast('Erreur lors de la révocation', 'error');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copié !', 'success');
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'automation': return 'bg-blue-500';
            case 'storage': return 'bg-amber-500';
            case 'communication': return 'bg-green-500';
            case 'payment': return 'bg-purple-500';
            case 'analytics': return 'bg-indigo-500';
            case 'patient': return 'bg-rose-500';
            case 'alerts': return 'bg-red-500';
            case 'integration': return 'bg-cyan-500';
            case 'team': return 'bg-teal-500';
            default: return 'bg-gray-500';
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'automation': return 'Automatisation';
            case 'storage': return 'Stockage';
            case 'communication': return 'Communication';
            case 'payment': return 'Paiement';
            case 'analytics': return 'Analytics';
            case 'patient': return 'Patient';
            case 'alerts': return 'Alertes';
            case 'integration': return 'Intégration';
            case 'team': return 'Équipe';
            default: return category;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="w-7 h-7 text-primary" />
                        Marketplace
                    </h1>
                    <p className="text-muted-foreground">
                        Activez des modules optionnels pour étendre les fonctionnalités de votre laboratoire
                    </p>
                </div>
            </div>

            {/* License Activation Card */}
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-xl">
                        <Key className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg">Activer une licence</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Entrez votre code de licence pour débloquer de nouvelles fonctionnalités
                        </p>
                        <div className="flex gap-3">
                            <Input
                                placeholder="Ex: SYNC-2026-XXXXX"
                                value={licenseCode}
                                onChange={(e) => setLicenseCode(e.target.value)}
                                className="flex-1 font-mono"
                            />
                            <Button onClick={handleActivateLicense} disabled={activating}>
                                {activating ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                )}
                                Activer
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {moduleDefinitions.map((module) => (
                    <div
                        key={module.id}
                        className={`
                            bg-white border rounded-xl overflow-hidden transition-all duration-200
                            ${module.active
                                ? 'border-primary/30 shadow-md ring-1 ring-primary/10'
                                : 'border-gray-200 opacity-75 hover:opacity-100'
                            }
                        `}
                    >
                        {/* Module Header */}
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${module.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                        {module.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{module.name}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getCategoryColor(module.category)}`}>
                                            {getCategoryLabel(module.category)}
                                        </span>
                                    </div>
                                </div>
                                {module.active ? (
                                    <Badge variant="success" className="flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Actif
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        Inactif
                                    </Badge>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                                {module.description}
                            </p>

                            {/* Features List */}
                            <ul className="space-y-1.5 mb-4">
                                {module.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm">
                                        <Check className={`w-4 h-4 ${module.active ? 'text-green-500' : 'text-gray-300'}`} />
                                        <span className={module.active ? 'text-gray-700' : 'text-gray-400'}>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Module Actions / Config */}
                            {module.active && module.id === 'AUTO_SYNC' && (
                                <div className="pt-4 border-t">
                                    <a href="/dashboard/integration" className="w-full">
                                        <Button variant="outline" className="w-full">
                                            <Plug className="w-4 h-4 mr-2" />
                                            Configurer dans Intégration API
                                        </Button>
                                    </a>
                                </div>
                            )}

                            {module.active && module.id === 'API_ADVANCED' && (
                                <div className="pt-4 border-t">
                                    <a href="/dashboard/integration" className="w-full">
                                        <Button variant="outline" className="w-full">
                                            <Plug className="w-4 h-4 mr-2" />
                                            Voir la documentation API
                                        </Button>
                                    </a>
                                </div>
                            )}

                            {!module.active && (
                                <div className="pt-4 border-t">
                                    <p className="text-xs text-muted-foreground text-center">
                                        Contactez votre représentant commercial pour obtenir une licence
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Help Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h4 className="font-medium text-amber-800">Besoin d'une licence ?</h4>
                    <p className="text-sm text-amber-700 mt-1">
                        Contactez votre représentant commercial ou visitez le portail partenaire pour obtenir un code de licence.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Portail Partenaires
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default Marketplace;
