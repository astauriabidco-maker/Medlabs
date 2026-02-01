import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Download, Calendar, LogOut, Loader2, FileX, User } from 'lucide-react';

interface BrandingData {
    name: string;
    brandColor: string;
    brandLogoUrl: string | null;
}

interface DocumentItem {
    id: string;
    patientName: string;
    date: string;
    status: string;
    mimeType: string;
    downloadUrl: string;
}

export default function PatientDashboard() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    // State
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [branding, setBranding] = useState<BrandingData | null>(null);
    const [patientName, setPatientName] = useState<string>('');

    // Check auth and fetch data
    useEffect(() => {
        const token = localStorage.getItem('patientToken');
        const storedSlug = localStorage.getItem('patientSlug');

        if (!token || storedSlug !== slug) {
            navigate(`/patient/${slug}/login`);
            return;
        }

        // Fetch branding
        fetch(`/api/public/branding/${slug}`)
            .then(res => res.json())
            .then(data => setBranding(data))
            .catch(() => setBranding({ name: 'MedLab', brandColor: '#3B82F6', brandLogoUrl: null }));

        // Fetch documents
        fetchDocuments(token);
    }, [slug, navigate]);

    const fetchDocuments = async (token: string) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/patient/documents', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem('patientToken');
                    navigate(`/patient/${slug}/login`);
                    return;
                }
                throw new Error('Erreur lors du chargement');
            }

            const data = await res.json();
            setDocuments(data.documents || []);

            // Set patient name from first document
            if (data.documents?.length > 0) {
                setPatientName(data.documents[0].patientName);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientSlug');
        navigate(`/patient/${slug}/login`);
    };

    const handleDownload = (doc: DocumentItem) => {
        // Open download URL in new tab
        window.open(doc.downloadUrl, '_blank');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; bg: string; text: string }> = {
            UPLOADED: { label: 'Nouveau', bg: 'bg-blue-100', text: 'text-blue-700' },
            NOTIFIED: { label: 'Envoyé', bg: 'bg-yellow-100', text: 'text-yellow-700' },
            DELIVERED: { label: 'Reçu', bg: 'bg-green-100', text: 'text-green-700' },
            OPENED: { label: 'Consulté', bg: 'bg-purple-100', text: 'text-purple-700' },
        };
        const s = statusMap[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                {s.label}
            </span>
        );
    };

    const primaryColor = branding?.brandColor || '#3B82F6';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {branding?.brandLogoUrl ? (
                            <img
                                src={branding.brandLogoUrl}
                                alt={branding.name}
                                className="h-10"
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {branding?.name?.charAt(0) || 'M'}
                            </div>
                        )}
                        <div>
                            <h1 className="font-semibold text-gray-900">{branding?.name || 'MedLab'}</h1>
                            <p className="text-xs text-gray-500">Espace Patient</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {patientName && (
                            <div className="hidden sm:flex items-center gap-2 text-gray-600">
                                <User className="w-4 h-4" />
                                <span className="text-sm">{patientName}</span>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm">Déconnexion</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Mon Historique Médical</h2>
                    <p className="text-gray-500 mt-1">
                        Consultez et téléchargez vos résultats d'analyses
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={() => fetchDocuments(localStorage.getItem('patientToken') || '')}
                            className="mt-4 text-red-500 hover:underline"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                        <FileX className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700">Aucun résultat trouvé</h3>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                            Aucun résultat d'analyse n'est associé à ce numéro de téléphone pour le moment.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
                            >
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${primaryColor}15` }}
                                >
                                    <FileText
                                        className="w-6 h-6"
                                        style={{ color: primaryColor }}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 truncate">
                                        Résultat d'Analyse
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(doc.date)}
                                        </span>
                                        {getStatusBadge(doc.status)}
                                    </div>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => handleDownload(doc)}
                                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Télécharger</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h4 className="font-medium text-blue-900">💡 Astuce</h4>
                    <p className="text-blue-700 text-sm mt-1">
                        Gardez ce lien accessible : vous pouvez consulter vos résultats à tout moment
                        depuis n'importe quel appareil avec votre numéro de téléphone.
                    </p>
                </div>
            </main>
        </div>
    );
}
