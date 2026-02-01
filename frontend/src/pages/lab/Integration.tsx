import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Label, Switch } from '../../components/ui-basic';
import { useToast } from '../../components/ui-dashboard';
import { api } from '../../lib/api';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Copy,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    FileJson,
    FileCode,
    Clock
} from 'lucide-react';

interface IntegrationLog {
    id: string;
    createdAt: string;
    format: string;
    status: 'SUCCESS' | 'ERROR' | 'PENDING_INFO';
    errorMessage?: string;
    documentId?: string;
    patientPhone?: string;
    payloadPreview: string;
}

interface IntegrationStatus {
    enabled: boolean;
    hasApiKey: boolean;
    endpoint: string;
}

export default function Integration() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [status, setStatus] = useState<IntegrationStatus | null>(null);
    const [logs, setLogs] = useState<IntegrationLog[]>([]);
    const [showDocs, setShowDocs] = useState(false);
    const [refreshingLogs, setRefreshingLogs] = useState(false);

    // Get base URL for API endpoint display
    const baseUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : '';

    useEffect(() => {
        fetchStatus();
        fetchLogs();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/connect/status');
            if (res.ok) {
                setStatus(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch status:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setRefreshingLogs(true);
        try {
            const res = await api.get('/api/connect/logs?limit=50');
            if (res.ok) {
                setLogs(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setRefreshingLogs(false);
        }
    };

    const toggleIntegration = async () => {
        if (!status) return;
        setToggling(true);
        try {
            const res = await api.patch('/api/connect/toggle', { enabled: !status.enabled });
            if (res.ok) {
                const data = await res.json();
                setStatus({ ...status, enabled: data.enabled });
                addToast(
                    data.enabled
                        ? 'Intégration activée'
                        : 'Intégration désactivée',
                    'success'
                );
            }
        } catch (err) {
            addToast('Erreur lors de la modification', 'error');
        } finally {
            setToggling(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copié dans le presse-papier', 'success');
    };

    const getStatusIcon = (logStatus: string) => {
        switch (logStatus) {
            case 'SUCCESS':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'ERROR':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'PENDING_INFO':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            default:
                return null;
        }
    };

    const getStatusLabel = (logStatus: string) => {
        switch (logStatus) {
            case 'SUCCESS':
                return 'Succès';
            case 'ERROR':
                return 'Erreur';
            case 'PENDING_INFO':
                return 'Info manquante';
            default:
                return logStatus;
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Intégration API</h1>
                <p className="text-muted-foreground">
                    Connectez votre système d'information (LIS/SIL) pour envoyer automatiquement les résultats
                </p>
            </div>

            {/* Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {status?.enabled ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        Statut de l'intégration
                    </CardTitle>
                    <CardDescription>
                        {status?.enabled
                            ? 'L\'intégration est active. Votre LIS peut envoyer des données.'
                            : 'L\'intégration est désactivée.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Activer l'intégration</Label>
                            <p className="text-sm text-muted-foreground">
                                Autorise les appels API depuis votre système externe
                            </p>
                        </div>
                        <Switch
                            checked={status?.enabled || false}
                            onCheckedChange={toggleIntegration}
                            disabled={toggling || !status?.hasApiKey}
                        />
                    </div>

                    {!status?.hasApiKey && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            ⚠️ Vous devez d'abord générer une clé API dans les paramètres pour activer l'intégration.
                        </div>
                    )}

                    {status?.enabled && (
                        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                                        {baseUrl}/api/connect/ingest
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(`${baseUrl}/api/connect/ingest`)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Méthode HTTP</Label>
                                <p className="font-mono text-sm mt-1">POST</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Authentification</Label>
                                <p className="text-sm mt-1">Header <code className="bg-white px-1 rounded">X-API-Key: votre_clé</code></p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Documentation */}
            <Card>
                <CardHeader
                    className="cursor-pointer"
                    onClick={() => setShowDocs(!showDocs)}
                >
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <FileJson className="w-5 h-5" />
                            Documentation API
                        </span>
                        {showDocs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </CardTitle>
                    <CardDescription>
                        Structure des données JSON et HL7 acceptées
                    </CardDescription>
                </CardHeader>
                {showDocs && (
                    <CardContent className="space-y-6">
                        {/* JSON Format */}
                        <div>
                            <h3 className="font-semibold flex items-center gap-2 mb-2">
                                <FileJson className="w-4 h-4" />
                                Format JSON
                            </h3>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {`{
  "format": "JSON",
  "data": {
    "patient": {
      "name": "Jean Dupont",
      "phone": "+237699123456",
      "dateOfBirth": "15/03/1985"
    },
    "results": [
      {
        "test": "Glycémie à jeun",
        "value": "1.05",
        "unit": "g/L",
        "range": "0.70 - 1.10",
        "isAbnormal": false
      },
      {
        "test": "Hémoglobine",
        "value": "15.2",
        "unit": "g/dL",
        "range": "12.0 - 16.0"
      }
    ]
  }
}`}
                            </pre>
                        </div>

                        {/* HL7 Format */}
                        <div>
                            <h3 className="font-semibold flex items-center gap-2 mb-2">
                                <FileCode className="w-4 h-4" />
                                Format HL7 (ORU^R01)
                            </h3>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {`{
  "format": "HL7",
  "data": "MSH|^~\\\\&|LIS|LABO|APP|MEDLAB|20260201...\\r
PID|1||PAT001^^^LABO||Dupont^Jean||19850315|M|||Adresse||+237699123456\\r
OBX|1|NM|GLU^Glycémie^L||1.05|g/L|0.70-1.10|N|||F\\r
OBX|2|NM|HGB^Hémoglobine^L||15.2|g/dL|12.0-16.0|N|||F"
}`}
                            </pre>
                            <p className="text-sm text-muted-foreground mt-2">
                                Segments supportés: MSH, PID, OBX. Le message HL7 doit être échappé en JSON.
                            </p>
                        </div>

                        {/* Response */}
                        <div>
                            <h3 className="font-semibold mb-2">Réponse</h3>
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {`{
  "status": "success",
  "documentId": "uuid-du-document",
  "message": "Document created and notification sent"
}`}
                            </pre>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Logs d'intégration
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchLogs}
                            disabled={refreshingLogs}
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshingLogs ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        Dernières 50 requêtes reçues
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Aucun log d'intégration pour le moment
                        </p>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-medium">Date</th>
                                        <th className="text-left px-4 py-2 font-medium">Format</th>
                                        <th className="text-left px-4 py-2 font-medium">Statut</th>
                                        <th className="text-left px-4 py-2 font-medium">Patient</th>
                                        <th className="text-left px-4 py-2 font-medium">Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-t hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                {new Intl.DateTimeFormat('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }).format(new Date(log.createdAt))}
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.format === 'HL7'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {log.format}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(log.status)}
                                                    {getStatusLabel(log.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-xs">
                                                {log.patientPhone || '-'}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">
                                                {log.errorMessage || log.documentId || log.payloadPreview}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
