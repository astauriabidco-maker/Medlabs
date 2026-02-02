import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Building2, Users, FileText, TrendingUp, Activity,
    RefreshCw, ArrowUpRight, ArrowDownRight, Clock,
    BarChart3, PieChart, Calendar, Bell
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui-basic';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface PlatformStats {
    overview: {
        totalTenants: number;
        activeTenants: number;
        totalUsers: number;
        totalResults: number;
        resultsToday: number;
        resultsThisMonth: number;
    };
    tenantsByPlan: Array<{ plan: string; count: number }>;
    usersByRole: Array<{ role: string; count: number }>;
    growthTrend: Array<{ date: string; tenants: number; results: number }>;
    recentActivity: Array<{ type: string; message: string; time: string }>;
    topTenants: Array<{ name: string; slug: string; resultsCount: number }>;
}

const PLAN_COLORS: Record<string, string> = {
    FREE: '#94a3b8',
    STARTER: '#60a5fa',
    PREMIUM: '#8b5cf6',
    ENTERPRISE: '#f59e0b',
};

const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: '#ef4444',
    LAB_ADMIN: '#3b82f6',
    TECHNICIAN: '#22c55e',
};

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/stats/platform', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError('Erreur lors du chargement des statistiques');
            console.error(err);
        }
        setLoading(false);
    };

    const generateDemoData = async () => {
        if (!confirm('Générer des données de démonstration (audit logs, alertes, abonnements)?')) return;

        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/demo-data/generate-all', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to generate demo data');
            const data = await res.json();
            alert(`✅ Données générées:\n- ${data.results.auditLogs.created} logs d'audit\n- ${data.results.systemAlerts.created} alertes système\n- ${data.results.subscriptions.created} abonnements`);
            fetchStats(); // Refresh stats
        } catch (err) {
            console.error(err);
            alert('❌ Erreur lors de la génération des données');
        }
        setGenerating(false);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="text-center py-10">
                <p className="text-red-500">{error || 'Aucune donnée'}</p>
                <Button onClick={fetchStats} className="mt-4">Réessayer</Button>
            </div>
        );
    }

    const { overview, tenantsByPlan, usersByRole, growthTrend, recentActivity, topTenants } = stats;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Plateforme</h1>
                    <p className="text-gray-500">Vue globale de MedLabs</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={generateDemoData} variant="outline" disabled={generating}>
                        {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                        Générer Démo
                    </Button>
                    <Button onClick={fetchStats} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard
                    title="Laboratoires"
                    value={overview.totalTenants}
                    subtitle={`${overview.activeTenants} actifs`}
                    icon={<Building2 className="w-5 h-5" />}
                    color="blue"
                />
                <KPICard
                    title="Utilisateurs"
                    value={overview.totalUsers}
                    icon={<Users className="w-5 h-5" />}
                    color="green"
                />
                <KPICard
                    title="Résultats Total"
                    value={overview.totalResults}
                    icon={<FileText className="w-5 h-5" />}
                    color="purple"
                />
                <KPICard
                    title="Aujourd'hui"
                    value={overview.resultsToday}
                    icon={<Calendar className="w-5 h-5" />}
                    color="orange"
                    trend={overview.resultsToday > 0 ? 'up' : undefined}
                />
                <KPICard
                    title="Ce mois"
                    value={overview.resultsThisMonth}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="cyan"
                />
                <KPICard
                    title="Taux actif"
                    value={`${Math.round((overview.activeTenants / overview.totalTenants) * 100)}%`}
                    icon={<Activity className="w-5 h-5" />}
                    color="emerald"
                />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Growth Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            Tendance des 30 derniers jours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthTrend}>
                                    <defs>
                                        <linearGradient id="colorResults" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="results" stroke="#3b82f6" fill="url(#colorResults)" name="Résultats" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Distribution Charts */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Tenants by Plan */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Par Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie
                                            data={tenantsByPlan}
                                            dataKey="count"
                                            nameKey="plan"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={2}
                                        >
                                            {tenantsByPlan.map((entry, index) => (
                                                <Cell key={index} fill={PLAN_COLORS[entry.plan] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users by Role */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Par Rôle</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={usersByRole} layout="vertical">
                                        <XAxis type="number" fontSize={12} />
                                        <YAxis type="category" dataKey="role" fontSize={10} width={80} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Tenants */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-500" />
                            Top Laboratoires
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {topTenants.slice(0, 5).map((tenant, idx) => (
                                <div key={tenant.slug} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-blue-50 text-blue-600'
                                            }`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-900">{tenant.name}</p>
                                            <p className="text-xs text-gray-500">{tenant.slug}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-700">{tenant.resultsCount}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-orange-500" />
                            Activité Récente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentActivity.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
                            ) : (
                                recentActivity.map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'tenant' ? 'bg-blue-100 text-blue-600' :
                                            activity.type === 'user' ? 'bg-green-100 text-green-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {activity.type === 'tenant' ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 truncate">{activity.message}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(activity.time).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// KPI Card Component
function KPICard({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down';
}) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        emerald: 'bg-emerald-50 text-emerald-600',
    };

    return (
        <Card className="relative overflow-hidden">
            <CardContent className="pt-4">
                <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
                    {icon}
                </div>
                <p className="text-sm text-gray-500">{title}</p>
                <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    {trend && (
                        trend === 'up'
                            ? <ArrowUpRight className="w-4 h-4 text-green-500" />
                            : <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                </div>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}
