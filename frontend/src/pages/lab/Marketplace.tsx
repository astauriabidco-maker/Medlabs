import * as React from 'react';
import { Link } from 'react-router-dom';
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
    Users,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Crown,
    ArrowUpRight,
    ShoppingCart,
    Send,
    Zap,
    Star,
    Shield,
    X
} from 'lucide-react';
import { Button, Input, Label } from '@/components/ui-basic';
import { useToast, Badge } from '@/components/ui-dashboard';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { getModuleDoc } from '@/data/modulesDocs';

interface ModulePricing {
    price: number;
    label: string;
}

interface Module {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    active: boolean;
    category: 'automation' | 'storage' | 'communication' | 'payment' | 'analytics' | 'patient' | 'alerts' | 'integration' | 'team';
    features: string[];
    configComponent?: React.ReactNode;
    includedInPlan?: boolean;
}

interface PlanInfo {
    key: string;
    name: string;
    price: number;
    features: string[];
    color: string;
    icon: React.ReactNode;
    popular?: boolean;
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
    const [currentPlan, setCurrentPlan] = React.useState<string>('STARTER');
    const [modulePricing, setModulePricing] = React.useState<Record<string, ModulePricing>>({});
    const [planPricing, setPlanPricing] = React.useState<Record<string, { price: number; label: string }>>({});
    const [activeTab, setActiveTab] = React.useState<'modules' | 'plans' | 'license'>('modules');
    const [requestingModule, setRequestingModule] = React.useState<string | null>(null);
    const [requestMessage, setRequestMessage] = React.useState('');
    const [upgradingPlan, setUpgradingPlan] = React.useState<string | null>(null);
    const [showRequestModal, setShowRequestModal] = React.useState<string | null>(null);

    // Plan features for comparison
    const PLAN_FEATURE_LIST: Record<string, string[]> = {
        STARTER: [
            'Envoi de résultats par SMS',
            'WhatsApp Business (inclus)',
            'Gestion de 3 membres d\'équipe',
            'Rétention 30 jours',
            'Support par email',
        ],
        PREMIUM: [
            'Tout de Starter +',
            'Auto-Sync Windows',
            'Archive Longue Durée (1 an)',
            'Analytics BI Dashboard',
            'API LIS Avancée (HL7/FHIR)',
            'Support Prioritaire',
            'Rétention 365 jours',
        ],
        ENTERPRISE: [
            'Tout de Premium +',
            'Archive 5 ans & 10 ans',
            'Carnet de Santé Patient',
            'Rendez-vous en Ligne',
            'Alertes Critiques',
            'Paiements Mobile Money',
            'Équipe Illimitée',
            'Support dédié 24/7',
        ],
    };

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
        {
            id: 'E_SIGNATURE',
            name: 'Signature Électronique',
            description: 'Signature électronique des résultats conforme aux normes médicales et réglementaires.',
            icon: <Key className="w-6 h-6" />,
            active: modules.find(m => m.id === 'E_SIGNATURE')?.active ?? false,
            category: 'automation',
            features: [
                'Signature cryptographique sécurisée',
                'Horodatage certifié',
                'Conformité réglementaire',
                'Traçabilité complète'
            ]
        },
        {
            id: 'PATIENT_HISTORY',
            name: 'Historique Patient Complet',
            description: 'Consultez l\'historique complet des résultats d\'un patient sur plusieurs années.',
            icon: <Users className="w-6 h-6" />,
            active: modules.find(m => m.id === 'PATIENT_HISTORY')?.active ?? false,
            category: 'patient',
            features: [
                'Historique sur 5 ans',
                'Recherche avancée',
                'Courbes d\'évolution',
                'Export dossier médical'
            ]
        },
        {
            id: 'REALTIME_DASHBOARD',
            name: 'Dashboard Temps Réel',
            description: 'Notifications push instantanées et tableau de bord en temps réel avec WebSockets.',
            icon: <RefreshCw className="w-6 h-6" />,
            active: modules.find(m => m.id === 'REALTIME_DASHBOARD')?.active ?? false,
            category: 'analytics',
            features: [
                'Notifications push instantanées',
                'Mises à jour en temps réel',
                'Alertes sonores configurables',
                'Indicateurs live'
            ]
        },
        {
            id: 'ADVANCED_REPORTING',
            name: 'Reporting Avancé',
            description: 'Génération de rapports PDF personnalisés avec votre branding et mise en page.',
            icon: <Archive className="w-6 h-6" />,
            active: modules.find(m => m.id === 'ADVANCED_REPORTING')?.active ?? false,
            category: 'analytics',
            features: [
                'Templates personnalisables',
                'Branding laboratoire',
                'Rapports programmés',
                'Export multi-format (PDF, Excel, CSV)'
            ]
        },
        {
            id: 'RESULT_COMPARISON',
            name: 'Comparaison Graphique',
            description: 'Visualisez l\'évolution des résultats avec des graphiques comparatifs interactifs.',
            icon: <BarChart3 className="w-6 h-6" />,
            active: modules.find(m => m.id === 'RESULT_COMPARISON')?.active ?? false,
            category: 'analytics',
            features: [
                'Graphiques interactifs',
                'Comparaison multi-périodes',
                'Détection des tendances',
                'Partage avec médecin'
            ]
        },
        {
            id: 'WORKFLOW_ENGINE',
            name: 'Moteur de Workflow',
            description: 'Automatisez vos processus avec un moteur de règles configurable sans code.',
            icon: <Sparkles className="w-6 h-6" />,
            active: modules.find(m => m.id === 'WORKFLOW_ENGINE')?.active ?? false,
            category: 'automation',
            features: [
                'Règles conditionnelles',
                'Actions automatiques',
                'Escalade intelligente',
                'Logs d\'exécution'
            ]
        },
        {
            id: 'PRIORITY_SUPPORT',
            name: 'Support Prioritaire',
            description: 'Accès prioritaire au support technique avec temps de réponse garanti.',
            icon: <MessageSquare className="w-6 h-6" />,
            active: modules.find(m => m.id === 'PRIORITY_SUPPORT')?.active ?? false,
            category: 'communication',
            features: [
                'Réponse sous 2h garantie',
                'Chat en direct',
                'Assistance téléphonique',
                'Formation personnalisée'
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
            if (data.currentPlan) {
                setCurrentPlan(data.currentPlan);
            }
            if (data.modulePricing) {
                setModulePricing(data.modulePricing);
            }
            if (data.planPricing) {
                setPlanPricing(data.planPricing);
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

    // Request Module (Contact Sales)
    const handleRequestModule = async (moduleId: string) => {
        setRequestingModule(moduleId);
        try {
            const res = await api.post('/api/tenants/me/request-module', {
                moduleId,
                message: requestMessage,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            addToast(data.message || 'Demande envoyée !', 'success');
            setShowRequestModal(null);
            setRequestMessage('');
        } catch (err: any) {
            addToast(err.message || 'Erreur lors de la demande', 'error');
        } finally {
            setRequestingModule(null);
        }
    };

    // Upgrade Plan
    const handleUpgradePlan = async (plan: string) => {
        if (!confirm(`Confirmer le passage au plan ${plan} ?`)) return;
        setUpgradingPlan(plan);
        try {
            const res = await api.post('/api/tenants/me/upgrade-plan', { plan });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            addToast(data.message || 'Plan mis à jour !', 'success');
            setCurrentPlan(plan);
            await fetchModules();
        } catch (err: any) {
            addToast(err.message || 'Erreur lors du changement de plan', 'error');
        } finally {
            setUpgradingPlan(null);
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
            await api.delete('/api/tenants/me/sync-key');
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

    const formatPrice = (price: number) => {
        if (price === 0) return 'Gratuit';
        return `${price.toLocaleString('fr-FR')} FCFA`;
    };

    const getModulePrice = (moduleId: string): number => {
        return modulePricing[moduleId]?.price ?? 0;
    };

    const plans: PlanInfo[] = [
        {
            key: 'STARTER',
            name: 'Starter',
            price: planPricing.STARTER?.price ?? 0,
            features: PLAN_FEATURE_LIST.STARTER,
            color: 'from-gray-400 to-gray-500',
            icon: <Package className="w-6 h-6" />,
        },
        {
            key: 'PREMIUM',
            name: 'Premium',
            price: planPricing.PREMIUM?.price ?? 49000,
            features: PLAN_FEATURE_LIST.PREMIUM,
            color: 'from-blue-500 to-indigo-600',
            icon: <Star className="w-6 h-6" />,
            popular: true,
        },
        {
            key: 'ENTERPRISE',
            name: 'Enterprise',
            price: planPricing.ENTERPRISE?.price ?? 99000,
            features: PLAN_FEATURE_LIST.ENTERPRISE,
            color: 'from-purple-600 to-pink-600',
            icon: <Crown className="w-6 h-6" />,
        },
    ];

    const activeModulesCount = moduleDefinitions.filter(m => m.active).length;
    const totalModulesCount = moduleDefinitions.length;

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
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Plan actuel</p>
                        <Badge variant={currentPlan === 'ENTERPRISE' ? 'success' : currentPlan === 'PREMIUM' ? 'default' : 'secondary'} className="text-sm">
                            <Crown className="w-3 h-3 mr-1" />
                            {currentPlan}
                        </Badge>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Modules actifs</p>
                        <p className="text-lg font-bold text-primary">{activeModulesCount}/{totalModulesCount}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[
                    { key: 'modules', label: 'Modules', icon: Package },
                    { key: 'plans', label: 'Plans & Tarifs', icon: CreditCard },
                    { key: 'license', label: 'Licence', icon: Key },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 justify-center ${activeTab === tab.key
                            ? 'bg-white shadow-sm text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ==================== MODULES TAB ==================== */}
            {activeTab === 'modules' && (
                <div className="space-y-6">
                    {/* Modules Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {moduleDefinitions.map((module) => {
                            const price = getModulePrice(module.id);
                            const isWhatsapp = module.id === 'WHATSAPP_BUSINESS';
                            return (
                                <div
                                    key={module.id}
                                    className={`
                                        bg-white border rounded-xl overflow-hidden transition-all duration-200
                                        ${module.active
                                            ? 'border-primary/30 shadow-md ring-1 ring-primary/10'
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
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
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getCategoryColor(module.category)}`}>
                                                            {getCategoryLabel(module.category)}
                                                        </span>
                                                        {!module.active && !isWhatsapp && price > 0 && (
                                                            <span className="text-sm font-bold text-primary">
                                                                {formatPrice(price)}/mois
                                                            </span>
                                                        )}
                                                        {isWhatsapp && (
                                                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                                ✅ Inclus
                                                            </span>
                                                        )}
                                                    </div>
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

                                        {/* Module Documentation for Active Modules */}
                                        {module.active && (() => {
                                            const doc = getModuleDoc(module.id);
                                            if (!doc) return null;
                                            const isExpanded = expandedModule === module.id;
                                            return (
                                                <div className="pt-4 border-t space-y-3">
                                                    <button
                                                        onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                                                        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                                                    >
                                                        <span className="flex items-center gap-2 text-sm font-medium text-blue-700">
                                                            <Sparkles className="w-4 h-4" />
                                                            Guide de démarrage rapide
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4 text-blue-500" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-blue-500" />
                                                        )}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="bg-blue-50/50 rounded-lg p-4 space-y-3">
                                                            {doc.quickStart.map((step) => (
                                                                <div key={step.step} className="flex gap-3">
                                                                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                        {step.step}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium">{step.title}</p>
                                                                        <p className="text-xs text-muted-foreground">{step.description}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2">
                                                        <Link to={`/dashboard/docs/${module.id}`} className="flex-1">
                                                            <Button variant="outline" className="w-full" size="sm">
                                                                <BookOpen className="w-4 h-4 mr-2" />
                                                                Documentation complète
                                                            </Button>
                                                        </Link>
                                                        {doc.configPath && (
                                                            <Link to={doc.configPath} className="flex-1">
                                                                <Button className="w-full" size="sm">
                                                                    <Plug className="w-4 h-4 mr-2" />
                                                                    Configurer
                                                                </Button>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* CTA for inactive modules */}
                                        {!module.active && !isWhatsapp && (
                                            <div className="pt-4 border-t space-y-2">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setShowRequestModal(module.id);
                                                            setRequestMessage('');
                                                        }}
                                                    >
                                                        <Send className="w-3.5 h-3.5 mr-1.5" />
                                                        Demander
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => setActiveTab('license')}
                                                    >
                                                        <Key className="w-3.5 h-3.5 mr-1.5" />
                                                        J'ai un code
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-center text-muted-foreground">
                                                    ou <button onClick={() => setActiveTab('plans')} className="text-primary hover:underline font-medium">voir les plans incluant ce module →</button>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ==================== PLANS TAB ==================== */}
            {activeTab === 'plans' && (
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold">Choisissez votre plan</h2>
                        <p className="text-muted-foreground mt-1">
                            Débloquez plus de fonctionnalités en passant à un plan supérieur
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = currentPlan === plan.key;
                            const isDowngrade = (
                                (currentPlan === 'ENTERPRISE' && plan.key !== 'ENTERPRISE') ||
                                (currentPlan === 'PREMIUM' && plan.key === 'STARTER')
                            );

                            return (
                                <div
                                    key={plan.key}
                                    className={`relative bg-white border-2 rounded-2xl overflow-hidden transition-all duration-300 ${isCurrent
                                        ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                        : plan.popular
                                            ? 'border-blue-200 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {/* Popular badge */}
                                    {plan.popular && !isCurrent && (
                                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center py-1.5 text-xs font-bold">
                                            ⭐ Le plus populaire
                                        </div>
                                    )}

                                    {/* Current plan badge */}
                                    {isCurrent && (
                                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-white text-center py-1.5 text-xs font-bold">
                                            ✅ Votre plan actuel
                                        </div>
                                    )}

                                    <div className={`p-6 ${(plan.popular || isCurrent) ? 'pt-10' : ''}`}>
                                        {/* Plan icon & name */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.color} text-white`}>
                                                {plan.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="mb-6">
                                            <p className="text-3xl font-bold">
                                                {plan.price === 0 ? 'Gratuit' : (
                                                    <>
                                                        {plan.price.toLocaleString('fr-FR')}
                                                        <span className="text-base font-normal text-muted-foreground ml-1">FCFA/mois</span>
                                                    </>
                                                )}
                                            </p>
                                            {plan.price > 0 && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    soit {(plan.price * 12 * 0.85).toLocaleString('fr-FR')} FCFA/an (-15%)
                                                </p>
                                            )}
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-2.5 mb-6">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA Button */}
                                        {isCurrent ? (
                                            <Button variant="outline" className="w-full" disabled>
                                                <Check className="w-4 h-4 mr-2" />
                                                Plan actuel
                                            </Button>
                                        ) : isDowngrade ? (
                                            <Button variant="outline" className="w-full opacity-50" disabled>
                                                Inclus dans votre plan
                                            </Button>
                                        ) : (
                                            <Button
                                                className={`w-full bg-gradient-to-r ${plan.color} text-white hover:opacity-90`}
                                                onClick={() => handleUpgradePlan(plan.key)}
                                                disabled={upgradingPlan === plan.key}
                                            >
                                                {upgradingPlan === plan.key ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <ArrowUpRight className="w-4 h-4 mr-2" />
                                                )}
                                                Passer à {plan.name}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Module Add-ons Pricing */}
                    <div className="mt-10">
                        <h3 className="text-lg font-bold mb-1">Modules à la carte</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Ajoutez des modules individuels à votre plan actuel, quel que soit votre abonnement
                        </p>

                        <div className="bg-white rounded-xl border overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Module</th>
                                        <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Catégorie</th>
                                        <th className="text-right px-5 py-3 text-sm font-medium text-gray-600">Prix/mois</th>
                                        <th className="text-center px-5 py-3 text-sm font-medium text-gray-600">Statut</th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {moduleDefinitions
                                        .filter(m => m.id !== 'WHATSAPP_BUSINESS')
                                        .sort((a, b) => getModulePrice(b.id) - getModulePrice(a.id))
                                        .map((module) => {
                                            const price = getModulePrice(module.id);
                                            return (
                                                <tr key={module.id} className="border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-1.5 rounded-lg ${module.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                                {module.icon}
                                                            </div>
                                                            <span className="font-medium text-sm">{module.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getCategoryColor(module.category)}`}>
                                                            {getCategoryLabel(module.category)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className="font-bold text-sm">{formatPrice(price)}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        {module.active ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                                                                <Check className="w-3 h-3" /> Actif
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                                                <Lock className="w-3 h-3" /> Verrouillé
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        {!module.active && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setShowRequestModal(module.id);
                                                                    setRequestMessage('');
                                                                }}
                                                            >
                                                                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                                                                Souscrire
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== LICENSE TAB ==================== */}
            {activeTab === 'license' && (
                <div className="space-y-6">
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
                                        placeholder="Ex: SYNC-A1B2-C3D4"
                                        value={licenseCode}
                                        onChange={(e) => setLicenseCode(e.target.value)}
                                        className="flex-1 font-mono uppercase"
                                        onKeyDown={(e) => e.key === 'Enter' && handleActivateLicense()}
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

                    {/* Sync API Key Section */}
                    {moduleDefinitions.find(m => m.id === 'AUTO_SYNC')?.active && (
                        <div className="bg-white border rounded-xl p-6">
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <Plug className="w-5 h-5 text-blue-500" />
                                Clé API Auto-Sync
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Utilisez cette clé pour connecter l'automate Windows à votre compte MedLab
                            </p>

                            {syncApiKey ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                                        <code className="flex-1 text-sm font-mono truncate">
                                            {showApiKey ? syncApiKey : '••••••••••••••••••••••••••••••••'}
                                        </code>
                                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(syncApiKey!)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-red-600" onClick={handleRevokeSyncKey}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Révoquer la clé
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleGenerateSyncKey} disabled={generatingKey}>
                                    {generatingKey ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Key className="w-4 h-4 mr-2" />
                                    )}
                                    Générer une clé de connexion
                                </Button>
                            )}
                        </div>
                    )}

                    {/* API LIS Avancée Section */}
                    {moduleDefinitions.find(m => m.id === 'API_ADVANCED')?.active && (
                        <div className="bg-white border rounded-xl p-6">
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <Plug className="w-5 h-5 text-cyan-500" />
                                API LIS Avancée
                                <Badge variant="success" className="ml-2 text-xs">Actif</Badge>
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Intégrez votre Système d'Information de Laboratoire (SIL) via l'API HL7/FHIR bidirectionnelle
                            </p>

                            {/* API Key */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Clé d'authentification API
                                </label>
                                {syncApiKey ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                                            <code className="flex-1 text-sm font-mono truncate">
                                                {showApiKey ? syncApiKey : '••••••••••••••••••••••••••••••••'}
                                            </code>
                                            <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(syncApiKey!)}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button onClick={handleGenerateSyncKey} disabled={generatingKey}>
                                        {generatingKey ? (
                                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Key className="w-4 h-4 mr-2" />
                                        )}
                                        Générer une clé API
                                    </Button>
                                )}
                            </div>

                            {/* API Endpoints Quick Reference */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Points d'accès API</h4>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">GET</span>
                                        <code className="text-gray-600">/api/v1/results</code>
                                        <span className="text-gray-400 ml-auto">Liste des résultats</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">POST</span>
                                        <code className="text-gray-600">/api/v1/results/upload</code>
                                        <span className="text-gray-400 ml-auto">Envoi de résultats</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">GET</span>
                                        <code className="text-gray-600">/api/v1/patients</code>
                                        <span className="text-gray-400 ml-auto">Patients du labo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">WS</span>
                                        <code className="text-gray-600">/api/v1/webhooks</code>
                                        <span className="text-gray-400 ml-auto">Webhooks HL7/FHIR</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                <Link to="/dashboard/docs/API_ADVANCED" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" /> Documentation complète
                                </Link>
                                <Link to="/dashboard/integration" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <ExternalLink className="w-4 h-4" /> Configuration avancée
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* How it works */}
                    <div className="bg-white border rounded-xl p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Comment obtenir une licence ?
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            {[
                                {
                                    step: 1,
                                    title: 'Choisissez un module',
                                    desc: 'Dans l\'onglet Modules, cliquez sur "Demander" pour le module souhaité.',
                                    icon: <ShoppingCart className="w-5 h-5" />,
                                },
                                {
                                    step: 2,
                                    title: 'Notre équipe vous contacte',
                                    desc: 'Un représentant commercial vous contacte sous 24h pour finaliser.',
                                    icon: <MessageSquare className="w-5 h-5" />,
                                },
                                {
                                    step: 3,
                                    title: 'Activez votre code',
                                    desc: 'Saisissez le code reçu ci-dessus pour débloquer instantanément le module.',
                                    icon: <Sparkles className="w-5 h-5" />,
                                },
                            ].map((s) => (
                                <div key={s.step} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {s.step}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{s.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Sparkles className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-amber-800">Besoin d'aide ?</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Contactez-nous par email à <strong>sales@medlab.cm</strong> ou par WhatsApp au <strong>+237 6XX XXX XXX</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== REQUEST MODULE MODAL ==================== */}
            {showRequestModal && (() => {
                const mod = moduleDefinitions.find(m => m.id === showRequestModal);
                const price = getModulePrice(showRequestModal);
                if (!mod) return null;
                return (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-primary" />
                                        Demande de module
                                    </h3>
                                    <button onClick={() => setShowRequestModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Module info */}
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                        {mod.icon}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{mod.name}</p>
                                        <p className="text-sm text-primary font-bold">{formatPrice(price)}/mois</p>
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <Label className="text-sm font-medium mb-1.5 block">Message (optionnel)</Label>
                                    <textarea
                                        className="w-full border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="Précisez vos besoins ou questions..."
                                        value={requestMessage}
                                        onChange={(e) => setRequestMessage(e.target.value)}
                                    />
                                </div>

                                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                                    <p className="font-medium">📋 Ce qui va se passer :</p>
                                    <ul className="mt-1 space-y-0.5 text-xs">
                                        <li>• Notre équipe commerciale reçoit votre demande</li>
                                        <li>• Un représentant vous contacte sous 24h</li>
                                        <li>• Vous recevez un code de licence après validation</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="p-6 border-t flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setShowRequestModal(null)}>
                                    Annuler
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => handleRequestModule(showRequestModal)}
                                    disabled={requestingModule === showRequestModal}
                                >
                                    {requestingModule === showRequestModal ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="w-4 h-4 mr-2" />
                                    )}
                                    Envoyer la demande
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

export default Marketplace;
