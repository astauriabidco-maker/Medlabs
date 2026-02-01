import * as React from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui-basic';
import { Badge, useToast } from '@/components/ui-dashboard';
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCheck,
    X,
    RefreshCcw,
    MessageSquareWarning,
    Building2,
    Shield,
    CreditCard,
    HardDrive,
    UserPlus,
} from 'lucide-react';

interface Alert {
    id: string;
    type: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
    isDismissed: boolean;
    tenant?: { id: string; name: string; slug: string };
    metadata?: any;
}

interface AlertsData {
    alerts: Alert[];
    counts: {
        critical: number;
        warning: number;
        info: number;
        total: number;
    };
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
    LOW_SMS_BALANCE: <MessageSquareWarning className="w-5 h-5" />,
    INACTIVE_TENANT: <Building2 className="w-5 h-5" />,
    PAYMENT_OVERDUE: <CreditCard className="w-5 h-5" />,
    STORAGE_WARNING: <HardDrive className="w-5 h-5" />,
    SECURITY_EVENT: <Shield className="w-5 h-5" />,
    SYSTEM_ERROR: <AlertCircle className="w-5 h-5" />,
    NEW_TENANT: <UserPlus className="w-5 h-5" />,
};

const SEVERITY_CONFIG = {
    CRITICAL: { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
    WARNING: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertCircle className="w-4 h-4 text-amber-500" /> },
    INFO: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Info className="w-4 h-4 text-blue-500" /> },
};

export function SystemAlerts() {
    const { addToast } = useToast();
    const [data, setData] = React.useState<AlertsData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState<'all' | 'unread'>('unread');

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const params = filter === 'all' ? '?includeRead=true' : '';
            const res = await api.get(`/api/alerts${params}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAlerts();
    }, [filter]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.patch(`/api/alerts/${id}/read`, {});
            fetchAlerts();
        } catch (err) {
            addToast('Erreur lors du marquage', 'error');
        }
    };

    const handleDismiss = async (id: string) => {
        try {
            await api.patch(`/api/alerts/${id}/dismiss`, {});
            fetchAlerts();
            addToast('Alerte masquée', 'success');
        } catch (err) {
            addToast('Erreur lors du masquage', 'error');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.patch('/api/alerts/read-all', {});
            fetchAlerts();
            addToast('Toutes les alertes marquées comme lues', 'success');
        } catch (err) {
            addToast('Erreur', 'error');
        }
    };

    const handleGenerateSamples = async () => {
        try {
            await api.post('/api/alerts/generate-samples', {});
            fetchAlerts();
            addToast('Alertes de test créées', 'success');
        } catch (err) {
            addToast('Erreur', 'error');
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Alertes Système</h1>
                        <p className="text-slate-500">Notifications critiques de la plateforme</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={fetchAlerts} className="h-9">
                        <RefreshCcw className="w-4 h-4 mr-1" /> Actualiser
                    </Button>
                    {data && data.counts.total > 0 && (
                        <Button variant="ghost" onClick={handleMarkAllAsRead} className="h-9">
                            <CheckCheck className="w-4 h-4 mr-1" /> Tout marquer comme lu
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            {data && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-red-700">Critiques</span>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-3xl font-bold text-red-800 mt-2">{data.counts.critical}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-amber-700">Avertissements</span>
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-3xl font-bold text-amber-800 mt-2">{data.counts.warning}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-700">Informations</span>
                            <Info className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-3xl font-bold text-blue-800 mt-2">{data.counts.info}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Total Non Lues</span>
                            <Bell className="w-5 h-5 text-slate-500" />
                        </div>
                        <p className="text-3xl font-bold text-slate-800 mt-2">{data.counts.total}</p>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-4 border-b">
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === 'unread' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Non lues
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Toutes
                </button>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Chargement...</div>
                ) : data?.alerts.length === 0 ? (
                    <div className="text-center py-12">
                        <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Aucune alerte {filter === 'unread' ? 'non lue' : ''}</p>
                        <Button variant="ghost" onClick={handleGenerateSamples} className="mt-4">
                            Générer des alertes de test
                        </Button>
                    </div>
                ) : (
                    data?.alerts.map((alert) => {
                        const config = SEVERITY_CONFIG[alert.severity];
                        return (
                            <div
                                key={alert.id}
                                className={`bg-white border rounded-xl p-4 transition-all hover:shadow-md ${alert.isRead ? 'opacity-60' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                                        {ALERT_ICONS[alert.type] || <Bell className="w-5 h-5" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={alert.severity === 'CRITICAL' ? 'danger' : alert.severity === 'WARNING' ? 'warning' : 'secondary'}>
                                                {alert.severity}
                                            </Badge>
                                            <span className="text-xs text-slate-400">{formatTime(alert.createdAt)}</span>
                                            {alert.tenant && (
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    {alert.tenant.name}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {!alert.isRead && (
                                            <button
                                                onClick={() => handleMarkAsRead(alert.id)}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Marquer comme lu"
                                            >
                                                <CheckCheck className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDismiss(alert.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Masquer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
