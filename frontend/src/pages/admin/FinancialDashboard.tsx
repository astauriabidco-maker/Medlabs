import * as React from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui-basic';
import { Badge, useToast, DataTable } from '@/components/ui-dashboard';
import {
    CreditCard,
    TrendingUp,
    Users,
    DollarSign,
    Calendar,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    RefreshCcw,
    Receipt,
    Building2,
} from 'lucide-react';

interface Subscription {
    id: string;
    tenantId: string;
    plan: 'STARTER' | 'PREMIUM' | 'ENTERPRISE';
    status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
    billingCycle: string;
    pricePerMonth: number;
    trialEndsAt: string | null;
    currentPeriodEnd: string;
    tenant: { id: string; name: string; slug: string; smsBalance: number };
    payments: { id: string; amount: number; status: string; createdAt: string }[];
}

interface Stats {
    total: number;
    byStatus: Record<string, number>;
    byPlan: Record<string, number>;
    totalRevenue: number;
    mrr: number;
}

const STATUS_CONFIG = {
    TRIAL: { icon: <Clock className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700', label: 'Essai' },
    ACTIVE: { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-700', label: 'Actif' },
    PAST_DUE: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700', label: 'Impayé' },
    CANCELLED: { icon: <XCircle className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700', label: 'Annulé' },
    SUSPENDED: { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-700', label: 'Suspendu' },
};

const PLAN_CONFIG = {
    STARTER: { color: 'bg-slate-100 text-slate-700', price: 0 },
    PREMIUM: { color: 'bg-purple-100 text-purple-700', price: 49000 },
    ENTERPRISE: { color: 'bg-amber-100 text-amber-700', price: 99000 },
};

export function FinancialDashboard() {
    const { addToast } = useToast();
    const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState<'subscriptions' | 'payments'>('subscriptions');
    const [payments, setPayments] = React.useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subsRes, paymentsRes] = await Promise.all([
                api.get('/api/subscriptions'),
                api.get('/api/subscriptions/payments'),
            ]);

            if (subsRes.ok) {
                const data = await subsRes.json();
                setSubscriptions(data.subscriptions);
                setStats(data.stats);
            }
            if (paymentsRes.ok) {
                setPayments(await paymentsRes.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleGenerateSamples = async () => {
        try {
            await api.post('/api/subscriptions/generate-samples', {});
            fetchData();
            addToast('Abonnements de test créés', 'success');
        } catch (err) {
            addToast('Erreur', 'error');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(amount) + ' XAF';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const columns = [
        {
            header: 'Laboratoire',
            key: 'tenant',
            render: (row: Subscription) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-900">{row.tenant.name}</p>
                        <p className="text-xs text-slate-500">{row.tenant.slug}</p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Plan',
            key: 'plan',
            render: (row: Subscription) => {
                const config = PLAN_CONFIG[row.plan];
                return (
                    <Badge className={config.color}>
                        {row.plan}
                    </Badge>
                );
            },
        },
        {
            header: 'Statut',
            key: 'status',
            render: (row: Subscription) => {
                const config = STATUS_CONFIG[row.status];
                return (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        {config.icon}
                        {config.label}
                    </div>
                );
            },
        },
        {
            header: 'Prix / mois',
            key: 'price',
            render: (row: Subscription) => (
                <span className="font-medium">{formatCurrency(row.pricePerMonth)}</span>
            ),
        },
        {
            header: 'Fin période',
            key: 'periodEnd',
            render: (row: Subscription) => (
                <span className="text-sm text-slate-600">{formatDate(row.currentPeriodEnd)}</span>
            ),
        },
        {
            header: 'Dernier paiement',
            key: 'lastPayment',
            render: (row: Subscription) => {
                const last = row.payments[0];
                if (!last) return <span className="text-slate-400">-</span>;
                return (
                    <div className="text-sm">
                        <span className="font-medium">{formatCurrency(last.amount)}</span>
                        <span className="text-slate-400 ml-2">{formatDate(last.createdAt)}</span>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Gestion Financière</h1>
                        <p className="text-slate-500">Abonnements et paiements des laboratoires</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={fetchData} className="h-9">
                        <RefreshCcw className="w-4 h-4 mr-1" /> Actualiser
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500">MRR</span>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.mrr)}</p>
                        <p className="text-xs text-slate-400 mt-1">Revenu mensuel récurrent</p>
                    </div>
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500">Revenu Total</span>
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
                        <p className="text-xs text-slate-400 mt-1">Depuis le début</p>
                    </div>
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500">Abonnés Actifs</span>
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.byStatus.ACTIVE || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">sur {stats.total} total</p>
                    </div>
                    <div className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500">En Essai</span>
                            <Calendar className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.byStatus.TRIAL || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">Convertibles</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b">
                <button
                    onClick={() => setActiveTab('subscriptions')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'subscriptions' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <CreditCard className="w-4 h-4" /> Abonnements
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'payments' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Receipt className="w-4 h-4" /> Historique Paiements
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Chargement...</div>
            ) : activeTab === 'subscriptions' ? (
                subscriptions.length === 0 ? (
                    <div className="text-center py-12">
                        <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Aucun abonnement</p>
                        <Button variant="ghost" onClick={handleGenerateSamples} className="mt-4">
                            Générer des abonnements de test
                        </Button>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={subscriptions}
                        getRowKey={(row) => row.id}
                    />
                )
            ) : (
                payments.length === 0 ? (
                    <div className="text-center py-12">
                        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Aucun paiement enregistré</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payments.map((payment) => (
                            <div key={payment.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <Receipt className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {payment.subscription?.tenant?.name || 'N/A'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {formatDate(payment.periodStart)} → {formatDate(payment.periodEnd)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-slate-900">{formatCurrency(payment.amount)}</p>
                                    <p className="text-xs text-slate-400">{formatDate(payment.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
