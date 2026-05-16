import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
} from '../../components/ui-basic';
import { api } from '../../lib/api';
import { BarChart } from 'recharts/es6/chart/BarChart';
import { PieChart } from 'recharts/es6/chart/PieChart';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid';
import { XAxis } from 'recharts/es6/cartesian/XAxis';
import { YAxis } from 'recharts/es6/cartesian/YAxis';
import { Cell } from 'recharts/es6/component/Cell';
import { Legend } from 'recharts/es6/component/Legend';
import { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer';
import { Tooltip } from 'recharts/es6/component/Tooltip';
import { Pie } from 'recharts/es6/polar/Pie';
import {
    Users,
    TrendingUp,
    Stethoscope,
    Clock,
    Loader2,
    Lock,
    RefreshCw,
} from 'lucide-react';

interface DashboardStats {
    kpis: {
        totalPatients: number;
        totalRevenue: number;
        topPrescriber: string | null;
        avgPerDay: number;
    };
    volumeByDay: Array<{ date: string; count: number }>;
    prescriberDistribution: Array<{ name: string; count: number }>;
    peakHours: Array<{ hour: string; count: number }>;
}

const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
];

const PERIODS = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '3 mois' },
    { value: 'year', label: '1 an' },
] as const;

type Period = (typeof PERIODS)[number]['value'];

interface PlatformDashboardStats {
    error?: string;
    message?: string;
    overview?: {
        totalResults?: number;
        resultsThisMonth?: number;
    };
    growthTrend?: Array<{ date: string; results?: number }>;
    usersByRole?: Array<{ role: string; count: number }>;
}

export default function BIDashboard() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<Period>('30d');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [disabled, setDisabled] = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/api/stats/dashboard?period=${period}`);

            // Handle non-OK responses gracefully
            if (!res.ok) {
                if (res.status === 403) {
                    setDisabled(true);
                    setError(
                        'Accès non autorisé. Cette fonctionnalité est réservée aux administrateurs de laboratoire.',
                    );
                } else {
                    setError(`Erreur ${res.status}: ${res.statusText}`);
                }
                return;
            }

            const data = (await res.json()) as DashboardStats &
                PlatformDashboardStats;

            if (data.error === 'FEATURE_DISABLED') {
                setDisabled(true);
                setError(data.message);
            } else if (data.overview) {
                // Platform stats (SUPER_ADMIN) — normalize to DashboardStats shape
                const normalized: DashboardStats = {
                    kpis: {
                        totalPatients: data.overview.totalResults || 0,
                        totalRevenue: 0,
                        topPrescriber: null,
                        avgPerDay: data.overview.resultsThisMonth
                            ? Math.round(
                                  (data.overview.resultsThisMonth / 30) * 10,
                              ) / 10
                            : 0,
                    },
                    volumeByDay: (data.growthTrend || []).map((t) => ({
                        date: t.date,
                        count: t.results || 0,
                    })),
                    prescriberDistribution: (data.usersByRole || []).map(
                        (r) => ({
                            name: r.role,
                            count: r.count,
                        }),
                    ),
                    peakHours: [],
                };
                setStats(normalized);
                setDisabled(false);
            } else {
                setStats(data);
                setDisabled(false);
            }
        } catch (err) {
            setError('Erreur lors du chargement des statistiques');
            console.error('Erreur de chargement:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
        });
    };

    if (loading && !refreshing) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (disabled) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6 text-center">
                        <Lock className="w-16 h-16 mx-auto text-yellow-600 mb-4" />
                        <h2 className="text-xl font-bold text-yellow-800 mb-2">
                            Module Business Intelligence
                        </h2>
                        <p className="text-yellow-700 mb-4">{error}</p>
                        <p className="text-sm text-yellow-600">
                            Ce module Premium vous permet de suivre vos KPIs,
                            analyser vos prescripteurs et optimiser vos heures
                            d'affluence.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                Aucune donnée disponible
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Business Intelligence
                    </h1>
                    <p className="text-muted-foreground">
                        Tableau de bord analytique
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    period === p.value
                                        ? 'bg-white shadow text-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                        />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Patients
                                </p>
                                <p className="text-3xl font-bold">
                                    {stats.kpis.totalPatients}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    ~{stats.kpis.avgPerDay}/jour
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Chiffre d'Affaires
                                </p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(stats.kpis.totalRevenue)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Top Prescripteur
                                </p>
                                <p className="text-lg font-bold truncate max-w-[150px]">
                                    {stats.kpis.topPrescriber || 'N/A'}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <Stethoscope className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Heure de Pointe
                                </p>
                                <p className="text-2xl font-bold">
                                    {
                                        stats.peakHours.reduce(
                                            (max, h) =>
                                                h.count > max.count ? h : max,
                                            { hour: 'N/A', count: 0 },
                                        ).hour
                                    }
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Évolution du Volume</CardTitle>
                        <p className="text-sm text-gray-500">
                            Nombre de résultats par jour
                        </p>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.volumeByDay}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#E5E7EB"
                                />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip
                                    labelFormatter={(label) =>
                                        `Date: ${formatDate(label as string)}`
                                    }
                                    formatter={(value: number) => [
                                        `${value} résultats`,
                                        'Volume',
                                    ]}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#3B82F6"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Prescriber Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Répartition par Prescripteur</CardTitle>
                        <p className="text-sm text-gray-500">
                            Top 10 des médecins référents
                        </p>
                    </CardHeader>
                    <CardContent>
                        {stats.prescriberDistribution.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Stethoscope className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>Aucun prescripteur enregistré</p>
                                    <p className="text-sm">
                                        Ajoutez le nom du médecin lors de
                                        l'upload
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={stats.prescriberDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="count"
                                        nameKey="name"
                                        label={({ name, percent }) =>
                                            `${name.split(' ').slice(0, 2).join(' ')} (${(percent * 100).toFixed(0)}%)`
                                        }
                                    >
                                        {stats.prescriberDistribution.map(
                                            (_, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        COLORS[
                                                            index %
                                                                COLORS.length
                                                        ]
                                                    }
                                                />
                                            ),
                                        )}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [
                                            `${value} patients`,
                                            'Patients',
                                        ]}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Peak Hours Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Heures d'Affluence</CardTitle>
                    <p className="text-sm text-gray-500">
                        Distribution des uploads par heure de la journée
                    </p>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={stats.peakHours}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#E5E7EB"
                            />
                            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => [
                                    `${value} uploads`,
                                    'Volume',
                                ]}
                            />
                            <Bar
                                dataKey="count"
                                fill="#10B981"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        💡 Identifiez vos heures de pointe pour optimiser le
                        planning de votre équipe
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
