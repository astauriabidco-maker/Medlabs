import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Settings2,
    Plus,
    Trash2,
    RefreshCw,
    Search,
    Tag,
    CheckCircle2,
    XCircle,
    Loader2,
    FileText,
    AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';

interface OcrKeyword {
    id: string;
    keyword: string;
    category: 'role' | 'title' | 'context';
    isActive: boolean;
    createdAt: string;
}

const categoryColors: Record<string, string> = {
    role: 'bg-blue-100 text-blue-700 border-blue-200',
    title: 'bg-purple-100 text-purple-700 border-purple-200',
    context: 'bg-amber-100 text-amber-700 border-amber-200',
};

const categoryLabels: Record<string, string> = {
    role: 'Rôle',
    title: 'Titre',
    context: 'Contexte',
};

export default function OcrConfiguration() {
    const { t } = useTranslation();
    const [keywords, setKeywords] = useState<OcrKeyword[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [newCategory, setNewCategory] = useState<'role' | 'title' | 'context'>('role');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-hide messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    useEffect(() => {
        loadKeywords();
    }, []);

    const loadKeywords = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/ocr-config/admin');
            if (!response.ok) throw new Error('Erreur chargement');
            const data = await response.json();
            setKeywords(data);
        } catch (err) {
            setErrorMessage('Erreur chargement configuration OCR');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (keyword: OcrKeyword) => {
        try {
            const response = await api.patch(`/api/ocr-config/${keyword.id}`, { isActive: !keyword.isActive });
            if (!response.ok) throw new Error('Erreur modification');
            setKeywords(keywords.map(k =>
                k.id === keyword.id ? { ...k, isActive: !k.isActive } : k
            ));
            setSuccessMessage(`Mot-clé ${!keyword.isActive ? 'activé' : 'désactivé'}`);
        } catch (err) {
            setErrorMessage('Erreur modification');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce mot-clé ?')) return;
        try {
            const response = await api.delete(`/api/ocr-config/${id}`);
            if (!response.ok) throw new Error('Erreur suppression');
            setKeywords(keywords.filter(k => k.id !== id));
            setSuccessMessage('Mot-clé supprimé');
        } catch (err) {
            setErrorMessage('Erreur suppression');
        }
    };

    const handleAdd = async () => {
        if (!newKeyword.trim()) return;

        setSaving(true);
        setError(null);
        try {
            const response = await api.post('/api/ocr-config', {
                keyword: newKeyword.toLowerCase().trim(),
                category: newCategory
            });
            if (!response.ok) {
                if (response.status === 500) {
                    setError('Ce mot-clé existe déjà');
                    return;
                }
                throw new Error('Erreur ajout');
            }
            const data = await response.json();
            setKeywords([...keywords, data]);
            setNewKeyword('');
            setShowAddModal(false);
            setSuccessMessage('Mot-clé ajouté');
        } catch (err: any) {
            setErrorMessage('Erreur ajout');
        } finally {
            setSaving(false);
        }
    };

    const handleSeedDefaults = async () => {
        if (!confirm('Ajouter les mots-clés par défaut ? (Les doublons seront ignorés)')) return;
        try {
            const response = await api.post('/api/ocr-config/seed', {});
            if (!response.ok) throw new Error('Erreur seed');
            loadKeywords();
            setSuccessMessage('Mots-clés par défaut chargés');
        } catch (err) {
            setErrorMessage('Erreur chargement défauts');
        }
    };

    // Filtered keywords
    const filteredKeywords = keywords.filter(k => {
        const matchesSearch = k.keyword.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || k.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const activeCount = keywords.filter(k => k.isActive).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Notification banners */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {errorMessage}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-indigo-600" />
                        Configuration OCR
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gérez les mots-clés de rôles staff à exclure lors de l'extraction PDF
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSeedDefaults}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Réinitialiser défauts
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{keywords.length}</div>
                    <div className="text-sm text-gray-500">Total mots-clés</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    <div className="text-sm text-gray-500">Actifs</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-2xl font-bold text-gray-400">{keywords.length - activeCount}</div>
                    <div className="text-sm text-gray-500">Désactivés</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">
                        {keywords.filter(k => k.category === 'role').length}
                    </div>
                    <div className="text-sm text-gray-500">Rôles</div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                    <p className="text-blue-700 font-medium">Comment ça fonctionne ?</p>
                    <p className="text-blue-600 text-sm mt-1">
                        L'extracteur PDF recherche ces mots-clés avant chaque nom détecté.
                        Si un mot-clé est trouvé (ex: "Biologiste : Dr. Dupont"), le nom est considéré
                        comme staff et non comme patient. Désactivez un mot-clé pour l'ignorer.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un mot-clé..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">Toutes catégories</option>
                    <option value="role">Rôles</option>
                    <option value="title">Titres</option>
                    <option value="context">Contexte</option>
                </select>
            </div>

            {/* Keywords Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                Mot-clé
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                Catégorie
                            </th>
                            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                Statut
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredKeywords.map(keyword => (
                            <tr key={keyword.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                                        {keyword.keyword}
                                    </code>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[keyword.category]}`}>
                                        {categoryLabels[keyword.category]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleToggleActive(keyword)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${keyword.isActive
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {keyword.isActive ? (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Actif
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-3.5 h-3.5" />
                                                Inactif
                                            </>
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(keyword.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredKeywords.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                    {keywords.length === 0 ? (
                                        <div>
                                            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                            <p>Aucun mot-clé configuré</p>
                                            <button
                                                onClick={handleSeedDefaults}
                                                className="mt-2 text-indigo-600 hover:underline"
                                            >
                                                Charger les défauts
                                            </button>
                                        </div>
                                    ) : (
                                        'Aucun résultat pour cette recherche'
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-600" />
                            Ajouter un mot-clé d'exclusion
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mot-clé
                                </label>
                                <input
                                    type="text"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    placeholder="ex: coordinateur"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                />
                                {error && (
                                    <p className="text-red-500 text-sm mt-1">{error}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Catégorie
                                </label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value as any)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="role">Rôle (major, biologiste...)</option>
                                    <option value="title">Titre professionnel (Dr., Pr.)</option>
                                    <option value="context">Contexte (accréditation...)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewKeyword('');
                                    setError(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={saving || !newKeyword.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
