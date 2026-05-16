import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui-basic';
import {
    Key, Plus, Trash2, RefreshCw, Check, Copy, Search,
    Filter, Package, Clock, Building2, AlertTriangle, Sparkles, X, ChevronDown
} from 'lucide-react';
import { Badge, useToast } from '@/components/ui-dashboard';
import { ExportCSVButton } from '@/components/ExportCSV';

// Module feature options
const FEATURE_OPTIONS = [
    { key: 'AUTO_SYNC', label: 'Auto-Sync Windows', category: 'Automatisation' },
    { key: 'LONG_TERM_ARCHIVE', label: 'Archive Longue Durée', category: 'Stockage' },
    { key: 'ARCHIVE_5Y', label: 'Archive 5 ans', category: 'Stockage' },
    { key: 'ARCHIVE_10Y', label: 'Archive 10 ans', category: 'Stockage' },
    { key: 'ANALYTICS_BI', label: 'Analytics BI', category: 'Analytics' },
    { key: 'REALTIME_DASHBOARD', label: 'Dashboard Temps Réel', category: 'Analytics' },
    { key: 'ADVANCED_REPORTING', label: 'Reporting Avancé', category: 'Analytics' },
    { key: 'RESULT_COMPARISON', label: 'Comparaison Graphique', category: 'Analytics' },
    { key: 'PATIENT_PORTAL', label: 'Carnet de Santé Patient', category: 'Patient' },
    { key: 'PATIENT_HISTORY', label: 'Historique Patient', category: 'Patient' },
    { key: 'APPOINTMENTS', label: 'Rendez-vous en Ligne', category: 'Patient' },
    { key: 'CRITICAL_ALERTS', label: 'Alertes Critiques', category: 'Alertes' },
    { key: 'WHATSAPP_BUSINESS', label: 'WhatsApp Business', category: 'Communication' },
    { key: 'MOBILE_MONEY', label: 'Paiements Mobile Money', category: 'Paiement' },
    { key: 'API_ADVANCED', label: 'API LIS Avancée', category: 'Intégration' },
    { key: 'UNLIMITED_TEAM', label: 'Équipe Illimitée', category: 'Équipe' },
    { key: 'E_SIGNATURE', label: 'Signature Électronique', category: 'Automatisation' },
    { key: 'WORKFLOW_ENGINE', label: 'Moteur de Workflow', category: 'Automatisation' },
    { key: 'PRIORITY_SUPPORT', label: 'Support Prioritaire', category: 'Support' },
];

interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan?: string;
}

interface License {
    id: string;
    createdAt: string;
    code: string;
    feature: string;
    status: 'AVAILABLE' | 'USED';
    generatedBy: string;
    usedByTenantId: string | null;
    usedAt: string | null;
    usedByTenant: { id: string; name: string; slug: string } | null;
}

export default function LicenseManager() {
    const { addToast } = useToast();
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [tenantSearch, setTenantSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterFeature, setFilterFeature] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [showFeatureDropdown, setShowFeatureDropdown] = useState(false);

    const fetchLicenses = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (filterFeature) params.set('feature', filterFeature);

            const res = await fetch(`/api/tenants/admin/licenses?${params.toString()}`, {
                credentials: 'include',
            });
            if (res.ok) {
                setLicenses(await res.json());
            } else {
                addToast('Erreur lors du chargement des licences', 'error');
            }
        } catch (error) {
            console.error('Error fetching licenses:', error);
            addToast('Erreur réseau', 'error');
        }
        setLoading(false);
    }, [addToast, filterFeature, filterStatus]);

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterFeature) params.set('feature', filterFeature);

        fetch(`/api/tenants/admin/licenses?${params.toString()}`, {
            credentials: 'include',
        })
            .then((res) => {
                if (!res.ok) {
                    addToast('Erreur lors du chargement des licences', 'error');
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data && !cancelled) setLicenses(data);
            })
            .catch((error) => {
                console.error('Error fetching licenses:', error);
                addToast('Erreur réseau', 'error');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        fetch('/api/tenants', {
            credentials: 'include',
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && !cancelled) {
                    setTenants(Array.isArray(data) ? data : data.tenants || []);
                }
            })
            .catch((error) => {
                console.error('Error fetching tenants:', error);
            })
            .finally(() => {
                if (!cancelled) setLoadingTenants(false);
            });

        return () => {
            cancelled = true;
        };
    }, [addToast, filterFeature, filterStatus]);

    const generateLicense = async () => {
        if (selectedFeatures.length === 0) {
            addToast('Sélectionnez au moins un module', 'error');
            return;
        }
        if (!selectedTenantId) {
            addToast('Sélectionnez un tenant destinataire', 'error');
            return;
        }
        setGenerating(true);
        try {
            const res = await fetch('/api/tenants/admin/licenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    features: selectedFeatures,
                    tenantId: selectedTenantId,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const tenantName = tenants.find(t => t.id === selectedTenantId)?.name || '';
                addToast(`Licence générée : ${data.code} → ${tenantName}`, 'success');
                setSelectedFeatures([]);
                setSelectedTenantId('');
                setShowGenerateForm(false);
                await fetchLicenses();
            } else {
                const error = await res.json();
                addToast(error.message || 'Erreur lors de la génération', 'error');
            }
        } catch (error) {
            addToast('Erreur réseau', 'error');
        }
        setGenerating(false);
    };

    const revokeLicense = async (id: string, code: string) => {
        if (!confirm(`Révoquer la licence ${code} ? Si elle a été utilisée, les features seront retirées du tenant.`)) return;
        try {
            const res = await fetch(`/api/tenants/admin/licenses/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                addToast(`Licence ${code} supprimée`, 'success');
                await fetchLicenses();
            } else {
                addToast('Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            addToast('Erreur réseau', 'error');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Code copié !', 'success');
    };

    const toggleFeature = (key: string) => {
        setSelectedFeatures(prev =>
            prev.includes(key)
                ? prev.filter(f => f !== key)
                : [...prev, key]
        );
    };

    const getFeatureLabel = (featureKey: string): string => {
        // Handle comma-separated features (bundles)
        const keys = featureKey.split(',').map(k => k.trim());
        return keys.map(k => {
            const option = FEATURE_OPTIONS.find(f => f.key === k);
            return option?.label || k;
        }).join(' + ');
    };

    const getCategoryColor = (featureKey: string): string => {
        const firstKey = featureKey.split(',')[0].trim();
        const option = FEATURE_OPTIONS.find(f => f.key === firstKey);
        switch (option?.category) {
            case 'Automatisation': return 'bg-blue-100 text-blue-700';
            case 'Stockage': return 'bg-amber-100 text-amber-700';
            case 'Analytics': return 'bg-indigo-100 text-indigo-700';
            case 'Patient': return 'bg-rose-100 text-rose-700';
            case 'Alertes': return 'bg-red-100 text-red-700';
            case 'Communication': return 'bg-green-100 text-green-700';
            case 'Paiement': return 'bg-purple-100 text-purple-700';
            case 'Intégration': return 'bg-cyan-100 text-cyan-700';
            case 'Équipe': return 'bg-teal-100 text-teal-700';
            case 'Support': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Filtered licenses
    const filteredLicenses = licenses.filter(l => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                l.code.toLowerCase().includes(q) ||
                l.feature.toLowerCase().includes(q) ||
                l.usedByTenant?.name.toLowerCase().includes(q) ||
                l.usedByTenant?.slug.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Stats
    const totalLicenses = licenses.length;
    const availableLicenses = licenses.filter(l => l.status === 'AVAILABLE').length;
    const usedLicenses = licenses.filter(l => l.status === 'USED').length;

    // Group features by category for the dropdown
    const featuresByCategory = FEATURE_OPTIONS.reduce((acc, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category].push(f);
        return acc;
    }, {} as Record<string, typeof FEATURE_OPTIONS>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Key className="w-7 h-7 text-primary" />
                        Gestion des Licences
                    </h1>
                    <p className="text-gray-500">Générez, suivez et gérez les codes de licence pour les tenants</p>
                </div>
                <div className="flex items-center gap-3">
                    <ExportCSVButton
                        data={filteredLicenses}
                        columns={[
                            { key: 'code', label: 'Code' },
                            { key: 'feature', label: 'Module', format: (v: string) => FEATURE_OPTIONS.find(f => f.key === v)?.label || v },
                            { key: 'status', label: 'Statut', format: (v: string) => v === 'USED' ? 'Utilisée' : 'Disponible' },
                            { key: 'usedByTenant', label: 'Tenant', format: (_v: any, row: any) => row.usedByTenant?.name || '-' },
                            { key: 'createdAt', label: 'Créée le', format: (v: string) => v ? new Date(v).toLocaleDateString('fr-FR') : '' },
                            { key: 'usedAt', label: 'Utilisée le', format: (v: string) => v ? new Date(v).toLocaleDateString('fr-FR') : '-' },
                        ]}
                        filename="licences"
                        label="Exporter CSV"
                    />
                    <Button onClick={() => setShowGenerateForm(!showGenerateForm)}>
                        {showGenerateForm ? (
                            <><X className="w-4 h-4 mr-2" /> Fermer</>
                        ) : (
                            <><Plus className="w-4 h-4 mr-2" /> Nouvelle licence</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total</p>
                                <p className="text-2xl font-bold">{totalLicenses}</p>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-xl">
                                <Key className="w-5 h-5 text-gray-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Disponibles</p>
                                <p className="text-2xl font-bold text-green-600">{availableLicenses}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-xl">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Utilisées</p>
                                <p className="text-2xl font-bold text-blue-600">{usedLicenses}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Generate Form */}
            {showGenerateForm && (
                <Card className="border-primary/30 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Générer un nouveau code de licence
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Tenant Selector */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                <Building2 className="w-4 h-4 inline mr-1.5" />
                                Laboratoire destinataire <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Rechercher un laboratoire…"
                                    value={tenantSearch}
                                    onChange={(e) => setTenantSearch(e.target.value)}
                                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                            {loadingTenants ? (
                                <p className="text-xs text-gray-400 mt-1">Chargement des laboratoires…</p>
                            ) : (
                                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                                    {tenants
                                        .filter(t => {
                                            if (!tenantSearch) return true;
                                            const q = tenantSearch.toLowerCase();
                                            return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
                                        })
                                        .map(t => (
                                            <label
                                                key={t.id}
                                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${selectedTenantId === t.id
                                                    ? 'bg-primary/10 border-l-2 border-l-primary'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="tenant"
                                                    checked={selectedTenantId === t.id}
                                                    onChange={() => setSelectedTenantId(t.id)}
                                                    className="text-primary"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                                                    <p className="text-xs text-gray-400">{t.slug}</p>
                                                </div>
                                                {t.plan && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                        t.plan === 'PREMIUM' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {t.plan}
                                                    </span>
                                                )}
                                            </label>
                                        ))}
                                    {tenants.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-3">Aucun laboratoire trouvé</p>
                                    )}
                                </div>
                            )}
                            {selectedTenantId && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    {tenants.find(t => t.id === selectedTenantId)?.name}
                                </p>
                            )}
                        </div>

                        {/* Feature Selector */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Modules à inclure <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setShowFeatureDropdown(!showFeatureDropdown)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm text-left bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className={selectedFeatures.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                                        {selectedFeatures.length === 0
                                            ? 'Sélectionnez les modules…'
                                            : `${selectedFeatures.length} module(s) sélectionné(s)`
                                        }
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>

                                {showFeatureDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                                        {Object.entries(featuresByCategory).map(([category, features]) => (
                                            <div key={category}>
                                                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                                                    {category}
                                                </div>
                                                {features.map(f => (
                                                    <label
                                                        key={f.key}
                                                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFeatures.includes(f.key)}
                                                            onChange={() => toggleFeature(f.key)}
                                                            className="rounded border-gray-300 text-primary"
                                                        />
                                                        <span className="text-sm">{f.label}</span>
                                                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${getCategoryColor(f.key)}`}>
                                                            {f.key}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected features tags */}
                            {selectedFeatures.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedFeatures.map(key => {
                                        const opt = FEATURE_OPTIONS.find(f => f.key === key);
                                        return (
                                            <span
                                                key={key}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(key)}`}
                                            >
                                                {opt?.label || key}
                                                <button
                                                    onClick={() => toggleFeature(key)}
                                                    className="hover:opacity-70"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Bundles */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Bundles rapides</label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedFeatures(['AUTO_SYNC', 'LONG_TERM_ARCHIVE', 'ANALYTICS_BI', 'API_ADVANCED', 'PRIORITY_SUPPORT'])}
                                >
                                    🌟 Premium
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedFeatures(FEATURE_OPTIONS.map(f => f.key))}
                                >
                                    👑 Enterprise (tout)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedFeatures(['ANALYTICS_BI', 'REALTIME_DASHBOARD', 'ADVANCED_REPORTING', 'RESULT_COMPARISON'])}
                                >
                                    📊 Pack Analytics
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedFeatures(['PATIENT_PORTAL', 'PATIENT_HISTORY', 'APPOINTMENTS'])}
                                >
                                    🏥 Pack Patient
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => { setShowGenerateForm(false); setSelectedFeatures([]); setSelectedTenantId(''); }}>
                                Annuler
                            </Button>
                            <Button onClick={generateLicense} disabled={generating || selectedFeatures.length === 0 || !selectedTenantId}>
                                {generating ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                )}
                                Générer le code ({selectedFeatures.length} module{selectedFeatures.length > 1 ? 's' : ''})
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        placeholder="Rechercher par code, module ou tenant…"
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="border rounded-lg px-3 py-2 text-sm bg-white"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">Tous les statuts</option>
                    <option value="AVAILABLE">Disponibles</option>
                    <option value="USED">Utilisées</option>
                </select>
                <Button variant="outline" size="icon" onClick={fetchLicenses}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Licenses Table */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredLicenses.length === 0 ? (
                <div className="text-center py-12 bg-white border rounded-xl">
                    <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Aucune licence trouvée</p>
                    <p className="text-sm text-gray-400 mt-1">Cliquez sur "Nouvelle licence" pour en créer une</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Modules</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLicenses.map((license) => (
                                <tr key={license.id} className="border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                                    {/* Code */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                {license.code}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(license.code)}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                title="Copier le code"
                                            >
                                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                                        </div>
                                    </td>

                                    {/* Modules */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {license.feature.split(',').map((f, i) => (
                                                <span
                                                    key={i}
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(f.trim())}`}
                                                >
                                                    {FEATURE_OPTIONS.find(opt => opt.key === f.trim())?.label || f.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        {license.status === 'AVAILABLE' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                                                <Check className="w-3 h-3" /> Disponible
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                                <Building2 className="w-3 h-3" /> Utilisée
                                            </span>
                                        )}
                                    </td>

                                    {/* Tenant */}
                                    <td className="px-4 py-3">
                                        {license.usedByTenant ? (
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{license.usedByTenant.name}</p>
                                                <p className="text-xs text-gray-400">{license.usedByTenant.slug}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">—</span>
                                        )}
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(license.createdAt)}
                                        </div>
                                        {license.usedAt && (
                                            <div className="flex items-center gap-1.5 text-xs text-blue-500 mt-0.5">
                                                <Check className="w-3 h-3" />
                                                Activée {formatDate(license.usedAt)}
                                            </div>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => revokeLicense(license.id, license.code)}
                                            title="Supprimer la licence"
                                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
