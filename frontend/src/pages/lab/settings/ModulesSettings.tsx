/**
 * Modules & Licensing Settings Tab
 */
import * as React from 'react';
import { Button, Input } from '@/components/ui-basic';
import { useToast } from '@/components/ui-dashboard';
import {
    Key, Copy, Eye, EyeOff, Shield, Archive, Loader2, CheckCircle, XCircle
} from 'lucide-react';
import { useModules } from './useSettingsHooks';

export function ModulesSettings() {
    const { addToast } = useToast();
    const { modules, syncApiKey, loading, generateSyncKey, revokeSyncKey, activateLicense } = useModules();

    const [licenseCode, setLicenseCode] = React.useState('');
    const [archiveLicenseCode, setArchiveLicenseCode] = React.useState('');
    const [showApiKey, setShowApiKey] = React.useState(false);
    const [activating, setActivating] = React.useState(false);
    const [activatingArchive, setActivatingArchive] = React.useState(false);
    const [generatingKey, setGeneratingKey] = React.useState(false);
    const [revokingKey, setRevokingKey] = React.useState(false);

    const handleActivateLicense = async () => {
        if (!licenseCode.trim()) {
            addToast('Veuillez saisir un code', 'error');
            return;
        }
        setActivating(true);
        const success = await activateLicense(licenseCode);
        if (success) setLicenseCode('');
        setActivating(false);
    };

    const handleActivateArchive = async () => {
        if (!archiveLicenseCode.trim()) {
            addToast('Veuillez saisir un code', 'error');
            return;
        }
        setActivatingArchive(true);
        const success = await activateLicense(archiveLicenseCode);
        if (success) setArchiveLicenseCode('');
        setActivatingArchive(false);
    };

    const handleGenerateKey = async () => {
        setGeneratingKey(true);
        await generateSyncKey();
        setShowApiKey(true);
        setGeneratingKey(false);
    };

    const handleRevokeKey = async () => {
        if (!window.confirm('Révoquer cette clé ? L\'automate Windows ne pourra plus se connecter.')) return;
        setRevokingKey(true);
        await revokeSyncKey();
        setShowApiKey(false);
        setRevokingKey(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copié !', 'success');
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Windows Sync Connection */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Connexion Automate Windows</h3>
                        <p className="text-sm text-muted-foreground">
                            Générez une clé pour connecter l'automate de synchronisation
                        </p>
                    </div>
                </div>

                {syncApiKey ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white rounded-lg border px-3 py-2 font-mono text-sm">
                                {showApiKey ? syncApiKey : '••••••••••••••••••••••••'}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(syncApiKey)}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleRevokeKey} disabled={revokingKey}>
                                {revokingKey ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Révoquer
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button onClick={handleGenerateKey} disabled={generatingKey}>
                        {generatingKey ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                        Générer une clé
                    </Button>
                )}
            </div>

            {/* Active Modules */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-green-600" />
                    Modules Actifs
                </h3>
                <div className="grid gap-3">
                    {modules.map((mod) => (
                        <div
                            key={mod.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${mod.active ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                                }`}
                        >
                            <div>
                                <p className="font-medium">{mod.name}</p>
                                <p className="text-sm text-muted-foreground">{mod.description}</p>
                            </div>
                            {mod.active ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                    ))}
                    {modules.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucun module configuré</p>
                    )}
                </div>
            </div>

            {/* License Activation */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-purple-600" />
                    Activer une Licence
                </h3>
                <div className="flex gap-2">
                    <Input
                        value={licenseCode}
                        onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        className="font-mono flex-1"
                    />
                    <Button onClick={handleActivateLicense} disabled={activating}>
                        {activating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Activer
                    </Button>
                </div>
            </div>

            {/* Archive Extension */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Archive className="w-5 h-5 text-amber-600" />
                    Extension d'Archivage
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Activez une licence d'archivage pour augmenter la durée de rétention des documents.
                </p>
                <div className="flex gap-2">
                    <Input
                        value={archiveLicenseCode}
                        onChange={(e) => setArchiveLicenseCode(e.target.value.toUpperCase())}
                        placeholder="ARCH-XXXX-XXXX-XXXX"
                        className="font-mono flex-1"
                    />
                    <Button onClick={handleActivateArchive} disabled={activatingArchive}>
                        {activatingArchive ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Activer
                    </Button>
                </div>
            </div>
        </div>
    );
}
