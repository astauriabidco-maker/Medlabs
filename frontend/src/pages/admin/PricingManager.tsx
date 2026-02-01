import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui-basic';
import {
    Plus, Trash2, Edit, Save, X, Eye, Sparkles, Package,
    Check, GripVertical, RefreshCw, ExternalLink
} from 'lucide-react';

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
    sortOrder: number;
    active: boolean;
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
    sortOrder: number;
    active: boolean;
}

const API_BASE = '/api/pricing';

export default function PricingManager() {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [features, setFeatures] = useState<PricingFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [editingFeature, setEditingFeature] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'plans' | 'features' | 'addons'>('plans');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [plansRes, featuresRes] = await Promise.all([
                fetch(`${API_BASE}/plans?activeOnly=false`, { headers }),
                fetch(`${API_BASE}/features?activeOnly=false`, { headers }),
            ]);

            if (plansRes.ok) setPlans(await plansRes.json());
            if (featuresRes.ok) setFeatures(await featuresRes.json());
        } catch (error) {
            console.error('Error fetching pricing data:', error);
        }
        setLoading(false);
    };

    const seedData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/seed`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                await fetchData();
                alert('Données initiales créées avec succès!');
            }
        } catch (error) {
            console.error('Error seeding:', error);
        }
    };

    const updatePlan = async (id: string, data: Partial<PricingPlan>) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/plans/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                setPlans(plans.map(p => p.id === id ? { ...p, ...data } : p));
                setEditingPlan(null);
            }
        } catch (error) {
            console.error('Error updating plan:', error);
        }
    };

    const updateFeature = async (id: string, data: Partial<PricingFeature>) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/features/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                setFeatures(features.map(f => f.id === id ? { ...f, ...data } : f));
                setEditingFeature(null);
            }
        } catch (error) {
            console.error('Error updating feature:', error);
        }
    };

    const togglePlanFeature = async (planId: string, featureKey: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        const newFeatures = plan.includedFeatures.includes(featureKey)
            ? plan.includedFeatures.filter(f => f !== featureKey)
            : [...plan.includedFeatures, featureKey];

        await updatePlan(planId, { includedFeatures: newFeatures });
    };

    const addons = features.filter(f => f.isAddon);
    const coreFeatures = features.filter(f => !f.isAddon);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Tarifs</h1>
                    <p className="text-gray-500">Gérez les plans, fonctionnalités et modules add-on</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => window.open('/pricing', '_blank')}>
                        <Eye className="w-4 h-4 mr-2" />
                        Aperçu
                    </Button>
                    {plans.length === 0 && (
                        <Button onClick={seedData}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Initialiser les données
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                {[
                    { key: 'plans', label: 'Plans', icon: Package },
                    { key: 'features', label: 'Fonctionnalités', icon: Check },
                    { key: 'addons', label: 'Modules Add-on', icon: Plus },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Plans Tab */}
            {activeTab === 'plans' && (
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.sort((a, b) => a.sortOrder - b.sortOrder).map(plan => (
                        <Card key={plan.id} className={`relative ${!plan.active ? 'opacity-50' : ''}`}>
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                                    ⭐ Le plus populaire
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingPlan(editingPlan === plan.id ? null : plan.id)}
                                    >
                                        {editingPlan === plan.id ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                    </Button>
                                </div>

                                {editingPlan === plan.id ? (
                                    <div className="space-y-3">
                                        <Input
                                            type="number"
                                            placeholder="Prix"
                                            defaultValue={plan.price}
                                            onChange={e => updatePlan(plan.id, { price: parseInt(e.target.value) || 0 })}
                                        />
                                        <Input
                                            placeholder="Description"
                                            defaultValue={plan.description || ''}
                                            onChange={e => updatePlan(plan.id, { description: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={plan.popular ? 'default' : 'outline'}
                                                onClick={() => updatePlan(plan.id, { popular: !plan.popular })}
                                            >
                                                Populaire
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={plan.active ? 'default' : 'outline'}
                                                onClick={() => updatePlan(plan.id, { active: !plan.active })}
                                            >
                                                {plan.active ? 'Actif' : 'Inactif'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-2xl font-bold">
                                            {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString()} FCFA`}
                                            {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>}
                                        </p>
                                        <p className="text-sm text-gray-500">{plan.description}</p>
                                    </>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-medium text-gray-600 mb-2">Fonctionnalités incluses:</p>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {coreFeatures.map(feature => (
                                        <label
                                            key={feature.key}
                                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={plan.includedFeatures.includes(feature.key)}
                                                onChange={() => togglePlanFeature(plan.id, feature.key)}
                                                className="rounded border-gray-300"
                                            />
                                            <span className={plan.includedFeatures.includes(feature.key) ? 'text-gray-900' : 'text-gray-400'}>
                                                {feature.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
                <div className="bg-white rounded-lg border">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fonctionnalité</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Clé</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Catégorie</th>
                                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actif</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {coreFeatures.sort((a, b) => a.sortOrder - b.sortOrder).map(feature => (
                                <tr key={feature.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {editingFeature === feature.id ? (
                                            <Input
                                                defaultValue={feature.name}
                                                onBlur={e => updateFeature(feature.id, { name: e.target.value })}
                                            />
                                        ) : (
                                            <span className="font-medium">{feature.name}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{feature.key}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{feature.category}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => updateFeature(feature.id, { active: !feature.active })}
                                            className={`w-8 h-8 rounded-full ${feature.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                                        >
                                            <Check className="w-4 h-4 mx-auto" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingFeature(editingFeature === feature.id ? null : feature.id)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add-ons Tab */}
            {activeTab === 'addons' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {addons.sort((a, b) => a.sortOrder - b.sortOrder).map(addon => (
                        <Card key={addon.id} className={`${!addon.active ? 'opacity-50' : ''}`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${addon.addonColor || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                                        <Package className="w-5 h-5 text-white" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingFeature(editingFeature === addon.id ? null : addon.id)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>

                                {editingFeature === addon.id ? (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Nom"
                                            defaultValue={addon.name}
                                            onBlur={e => updateFeature(addon.id, { name: e.target.value })}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Prix"
                                            defaultValue={addon.addonPrice || 0}
                                            onBlur={e => updateFeature(addon.id, { addonPrice: parseInt(e.target.value) || 0 })}
                                        />
                                        <Button
                                            size="sm"
                                            variant={addon.active ? 'default' : 'outline'}
                                            onClick={() => updateFeature(addon.id, { active: !addon.active })}
                                        >
                                            {addon.active ? 'Actif' : 'Inactif'}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="font-bold text-gray-900">{addon.name}</h3>
                                        <p className="text-sm text-gray-500 mb-2">{addon.description}</p>
                                        <p className="text-lg font-bold">
                                            {(addon.addonPrice || 0).toLocaleString()} <span className="text-sm font-normal text-gray-500">FCFA/mois</span>
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
