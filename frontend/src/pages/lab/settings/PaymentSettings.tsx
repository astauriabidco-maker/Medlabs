/**
 * Payment Settings Tab - CamPay, Orange Money, MTN MoMo
 */
import * as React from 'react';
import { Button, Input, Label } from '@/components/ui-basic';
import { useToast } from '@/components/ui-dashboard';
import { api } from '@/lib/api';
import {
    Wallet, CheckCircle, Loader2, Eye, EyeOff
} from 'lucide-react';

type PaymentProvider = 'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO';

export function PaymentSettings() {
    const { addToast } = useToast();

    const [provider, setProvider] = React.useState<PaymentProvider>('CAMPAY');
    const [saving, setSaving] = React.useState(false);
    const [testing, setTesting] = React.useState(false);
    const [testStatus, setTestStatus] = React.useState<'success' | 'failed' | null>(null);
    const [showSecrets, setShowSecrets] = React.useState(false);

    // CamPay
    const [campayUsername, setCampayUsername] = React.useState('');
    const [campayPassword, setCampayPassword] = React.useState('');

    // Orange Money
    const [orangeUsername, setOrangeUsername] = React.useState('');
    const [orangePassword, setOrangePassword] = React.useState('');
    const [orangeMsisdn, setOrangeMsisdn] = React.useState('');

    // MTN MoMo
    const [mtnApiUser, setMtnApiUser] = React.useState('');
    const [mtnApiKey, setMtnApiKey] = React.useState('');
    const [mtnSubscriptionKey, setMtnSubscriptionKey] = React.useState('');
    const [mtnTargetEnv, setMtnTargetEnv] = React.useState<'sandbox' | 'production'>('sandbox');

    const handleSave = async () => {
        setSaving(true);
        try {
            let endpoint = '';
            let body = {};

            switch (provider) {
                case 'CAMPAY':
                    endpoint = '/api/tenants/me/campay';
                    body = { campayUsername, campayPassword };
                    break;
                case 'ORANGE_MONEY':
                    endpoint = '/api/tenants/me/orange';
                    body = { orangeUsername, orangePassword, orangeMsisdn };
                    break;
                case 'MTN_MOMO':
                    endpoint = '/api/tenants/me/mtn';
                    body = { mtnApiUser, mtnApiKey, mtnSubscriptionKey, mtnTargetEnv };
                    break;
            }

            const res = await api.put(endpoint, body);
            if (!res.ok) throw new Error('Failed');
            addToast('Configuration enregistrée', 'success');
        } catch {
            addToast('Erreur lors de l\'enregistrement', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestStatus(null);
        try {
            const res = await api.post(`/api/tenants/me/payment/test`, { provider });
            const data = await res.json();
            setTestStatus(data.success ? 'success' : 'failed');
            addToast(data.success ? 'Test réussi' : 'Test échoué', data.success ? 'success' : 'error');
        } catch {
            setTestStatus('failed');
            addToast('Erreur lors du test', 'error');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-xl">
            {/* Provider Selection */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-green-600" />
                    Fournisseur de Paiement
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'CAMPAY', label: 'CamPay', color: 'orange' },
                        { id: 'ORANGE_MONEY', label: 'Orange Money', color: 'orange' },
                        { id: 'MTN_MOMO', label: 'MTN MoMo', color: 'yellow' },
                    ].map((prov) => (
                        <button
                            key={prov.id}
                            onClick={() => setProvider(prov.id as PaymentProvider)}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${provider === prov.id
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <p className="font-medium">{prov.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* CamPay Config */}
            {provider === 'CAMPAY' && (
                <div className="bg-white border rounded-lg p-6 space-y-4">
                    <h4 className="font-medium">Configuration CamPay</h4>
                    <div>
                        <Label>Nom d'utilisateur API</Label>
                        <Input
                            value={campayUsername}
                            onChange={(e) => setCampayUsername(e.target.value)}
                            placeholder="Votre username CamPay"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Mot de passe API</Label>
                        <div className="flex gap-2 mt-1">
                            <Input
                                type={showSecrets ? 'text' : 'password'}
                                value={campayPassword}
                                onChange={(e) => setCampayPassword(e.target.value)}
                                placeholder="••••••••"
                                className="flex-1"
                            />
                            <Button variant="ghost" size="icon" onClick={() => setShowSecrets(!showSecrets)}>
                                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Orange Money Config */}
            {provider === 'ORANGE_MONEY' && (
                <div className="bg-white border rounded-lg p-6 space-y-4">
                    <h4 className="font-medium">Configuration Orange Money</h4>
                    <div>
                        <Label>Username</Label>
                        <Input value={orangeUsername} onChange={(e) => setOrangeUsername(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label>Password</Label>
                        <Input type="password" value={orangePassword} onChange={(e) => setOrangePassword(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label>MSISDN (numéro marchand)</Label>
                        <Input value={orangeMsisdn} onChange={(e) => setOrangeMsisdn(e.target.value)} placeholder="+237..." className="mt-1" />
                    </div>
                </div>
            )}

            {/* MTN MoMo Config */}
            {provider === 'MTN_MOMO' && (
                <div className="bg-white border rounded-lg p-6 space-y-4">
                    <h4 className="font-medium">Configuration MTN MoMo</h4>
                    <div>
                        <Label>API User</Label>
                        <Input value={mtnApiUser} onChange={(e) => setMtnApiUser(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label>API Key</Label>
                        <Input type="password" value={mtnApiKey} onChange={(e) => setMtnApiKey(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label>Subscription Key</Label>
                        <Input value={mtnSubscriptionKey} onChange={(e) => setMtnSubscriptionKey(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label>Environnement</Label>
                        <select
                            value={mtnTargetEnv}
                            onChange={(e) => setMtnTargetEnv(e.target.value as 'sandbox' | 'production')}
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                        >
                            <option value="sandbox">Sandbox (test)</option>
                            <option value="production">Production</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Test Status */}
            {testStatus && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${testStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <CheckCircle className="w-5 h-5" />
                    <span>{testStatus === 'success' ? 'Connexion réussie' : 'Connexion échouée'}</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Enregistrer
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                    {testing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Tester la connexion
                </Button>
            </div>
        </div>
    );
}
