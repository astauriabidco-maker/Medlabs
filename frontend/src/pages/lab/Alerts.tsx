import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, AlertTriangle, Phone, Shield, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface CriticalRule {
    id: string;
    name: string;
    keywords: string[];
    mustContainAll: boolean;
    alertMessage: string;
    isActive: boolean;
    createdAt: string;
}

export default function Alerts() {
    const [rules, setRules] = useState<CriticalRule[]>([]);
    const [biologistPhone, setBiologistPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<CriticalRule | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formKeywords, setFormKeywords] = useState('');
    const [formMustContainAll, setFormMustContainAll] = useState(true);
    const [formMessage, setFormMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rulesRes, phoneRes] = await Promise.all([
                fetch('/api/alerts/rules', {
                    credentials: 'include',
                }),
                fetch('/api/alerts/biologist-phone', {
                    credentials: 'include',
                }),
            ]);

            const rulesData = await rulesRes.json();
            const phoneData = await phoneRes.json();

            setRules(rulesData.rules || []);
            setBiologistPhone(phoneData.biologistPhone || '');
        } catch (error) {
            console.error('Failed to fetch alerts data:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveBiologistPhone = async () => {
        try {
            await fetch('/api/alerts/biologist-phone', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ biologistPhone }),
            });
            alert('Numéro du biologiste enregistré');
        } catch (error) {
            console.error('Failed to save biologist phone:', error);
        }
    };

    const openCreateForm = () => {
        setEditingRule(null);
        setFormName('');
        setFormKeywords('');
        setFormMustContainAll(true);
        setFormMessage('');
        setShowForm(true);
    };

    const openEditForm = (rule: CriticalRule) => {
        setEditingRule(rule);
        setFormName(rule.name);
        setFormKeywords(rule.keywords.join(', '));
        setFormMustContainAll(rule.mustContainAll);
        setFormMessage(rule.alertMessage);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const keywords = formKeywords.split(',').map(k => k.trim()).filter(k => k);

        const data = {
            name: formName,
            keywords,
            mustContainAll: formMustContainAll,
            alertMessage: formMessage,
        };

        try {
            if (editingRule) {
                await fetch(`/api/alerts/rules/${editingRule.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });
            } else {
                await fetch('/api/alerts/rules', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(data),
                });
            }

            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save rule:', error);
        }
    };

    const toggleRule = async (rule: CriticalRule) => {
        try {
            await fetch(`/api/alerts/rules/${rule.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ isActive: !rule.isActive }),
            });
            fetchData();
        } catch (error) {
            console.error('Failed to toggle rule:', error);
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm('Supprimer cette règle ?')) return;

        try {
            await fetch(`/api/alerts/rules/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Alertes Critiques</h1>
                    <p className="text-gray-500">Configuration des alertes pour valeurs critiques</p>
                </div>
                <button
                    onClick={openCreateForm}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                    <Plus size={18} />
                    Nouvelle règle
                </button>
            </div>

            {/* Biologist Phone */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Phone className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">Biologiste responsable</h2>
                        <p className="text-sm text-gray-500">Numéro recevant les alertes critiques</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <input
                        type="tel"
                        value={biologistPhone}
                        onChange={(e) => setBiologistPhone(e.target.value)}
                        placeholder="+237 6XX XXX XXX"
                        className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        onClick={saveBiologistPhone}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Save size={18} />
                        Enregistrer
                    </button>
                </div>
            </div>

            {/* Rules List */}
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="text-red-600" size={20} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900">Règles de détection</h2>
                            <p className="text-sm text-gray-500">Mots-clés déclenchant une alerte</p>
                        </div>
                    </div>
                </div>

                {rules.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Shield className="mx-auto mb-4 text-gray-300" size={48} />
                        <p>Aucune règle configurée</p>
                        <p className="text-sm">Créez une règle pour détecter les valeurs critiques</p>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {rules.map(rule => (
                            <li key={rule.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`font-medium ${rule.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {rule.name}
                                            </h3>
                                            {!rule.isActive && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                    Désactivée
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {rule.keywords.map((kw, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                            <span className="text-xs text-gray-400 ml-2">
                                                {rule.mustContainAll ? '(tous requis)' : '(un suffit)'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                            {rule.alertMessage}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => toggleRule(rule)}
                                            className={`p-2 rounded transition ${rule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title={rule.isActive ? 'Désactiver' : 'Activer'}
                                        >
                                            {rule.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button
                                            onClick={() => openEditForm(rule)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteRule(rule.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Create/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-lg font-semibold">
                                {editingRule ? 'Modifier la règle' : 'Nouvelle règle'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom de la règle
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="ex: Alerte VIH"
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mots-clés (séparés par virgule)
                                </label>
                                <input
                                    type="text"
                                    value={formKeywords}
                                    onChange={(e) => setFormKeywords(e.target.value)}
                                    placeholder="ex: VIH, Positif, Réactif"
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="mustContainAll"
                                    checked={formMustContainAll}
                                    onChange={(e) => setFormMustContainAll(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="mustContainAll" className="text-sm text-gray-700">
                                    Tous les mots-clés doivent être présents
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message d'alerte
                                </label>
                                <textarea
                                    value={formMessage}
                                    onChange={(e) => setFormMessage(e.target.value)}
                                    placeholder="Message envoyé au biologiste..."
                                    rows={3}
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                >
                                    <Save size={18} />
                                    {editingRule ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
