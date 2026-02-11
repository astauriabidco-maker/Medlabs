/**
 * Notifications/SMS Settings Tab
 */
import * as React from 'react';
import { Button, Input, Label } from '@/components/ui-basic';
import { useToast } from '@/components/ui-dashboard';
import {
    Phone, MessageSquare, CheckCircle, XCircle, Loader2, Eye, EyeOff
} from 'lucide-react';
import { useIntegrations } from './useSettingsHooks';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';

export function NotificationSettings() {
    const { addToast } = useToast();
    const { integration, setIntegration, loading, saving, testing, saveIntegration, testConnection } = useIntegrations();

    const [showToken, setShowToken] = React.useState(false);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-xl">
            {/* Provider Selection */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    Fournisseur SMS/WhatsApp
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {(['TWILIO', 'META', 'ORANGE'] as const).map((prov) => (
                        <button
                            key={prov}
                            onClick={() => setIntegration(prev => ({ ...prev, provider: prov }))}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${integration.provider === prov
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <p className="font-medium">{prov}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Credentials */}
            <div className="bg-white border rounded-lg p-6 space-y-4">
                <h4 className="font-medium">Configuration {integration.provider}</h4>

                <div>
                    <Label>Account ID / SID</Label>
                    <Input
                        value={integration.accountId}
                        onChange={(e) => setIntegration(prev => ({ ...prev, accountId: e.target.value }))}
                        placeholder="AC..."
                        className="mt-1"
                    />
                </div>

                <div>
                    <Label>Auth Token</Label>
                    <div className="flex gap-2 mt-1">
                        <Input
                            type={showToken ? 'text' : 'password'}
                            value={integration.authToken}
                            onChange={(e) => setIntegration(prev => ({ ...prev, authToken: e.target.value }))}
                            placeholder={integration.exists ? '••••••••' : 'Token secret'}
                            className="flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => setShowToken(!showToken)}>
                            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div>
                    <Label>Numéro de téléphone</Label>
                    <Input
                        value={integration.phoneNumber}
                        onChange={(e) => setIntegration(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="+237..."
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Channel Toggles */}
            <div className="bg-white border rounded-lg p-6 space-y-3">
                <h4 className="font-medium">Canaux actifs</h4>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={integration.smsEnabled}
                        onChange={(e) => setIntegration(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                        className="w-5 h-5 rounded accent-blue-600"
                    />
                    <Phone className="w-5 h-5 text-gray-600" />
                    <span>SMS</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={integration.whatsappEnabled}
                        onChange={(e) => setIntegration(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                        className="w-5 h-5 rounded accent-green-600"
                    />
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span>WhatsApp</span>
                </label>
            </div>

            {/* Test Status */}
            {integration.testStatus && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${integration.testStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {integration.testStatus === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <XCircle className="w-5 h-5" />
                    )}
                    <span>
                        {integration.testStatus === 'success' ? 'Connexion réussie' : 'Connexion échouée'}
                        {integration.lastTestedAt && (
                            <span className="text-sm opacity-75 ml-2">
                                ({new Date(integration.lastTestedAt).toLocaleString()})
                            </span>
                        )}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <Button onClick={saveIntegration} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enregistrer
                </Button>
                <Button variant="outline" onClick={testConnection} disabled={testing || !integration.exists}>
                    {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Tester la connexion
                </Button>
            </div>

            {/* Separator */}
            <div className="border-t pt-6">
                <PushNotificationSettings />
            </div>
        </div>
    );
}

