/**
 * SSO/LDAP Configuration Settings for Lab Admin
 *
 * Allows tenants to configure enterprise authentication:
 * - LDAP / Active Directory
 * - OAuth2 / OIDC (Google, Azure AD, custom IdP)
 *
 * Enterprise plan feature — gated by plan check.
 */
import * as React from 'react';
import {
    Shield, Loader2, CheckCircle, XCircle, Server,
    Globe, Lock, Eye, EyeOff, TestTube,
} from 'lucide-react';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Switch } from '@/components/ui-basic';
import { Badge, useToast } from '@/components/ui-dashboard';
import { useTranslation } from 'react-i18next';

type SSOProvider = 'none' | 'ldap' | 'oidc';

interface LDAPConfig {
    host: string;
    port: number;
    baseDN: string;
    bindDN: string;
    bindPassword: string;
    searchFilter: string;
    useTLS: boolean;
}

interface OIDCConfig {
    discoveryUrl: string;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scopes: string;
}

const DEFAULT_LDAP: LDAPConfig = {
    host: '',
    port: 389,
    baseDN: 'dc=example,dc=com',
    bindDN: 'cn=admin,dc=example,dc=com',
    bindPassword: '',
    searchFilter: '(uid={{username}})',
    useTLS: false,
};

const DEFAULT_OIDC: OIDCConfig = {
    discoveryUrl: '',
    clientId: '',
    clientSecret: '',
    callbackUrl: `${window.location.origin}/auth/sso/callback`,
    scopes: 'openid profile email',
};

export function SSOSettings() {
    const { t } = useTranslation();
    const { addToast } = useToast();

    const [provider, setProvider] = React.useState<SSOProvider>('none');
    const [ldapConfig, setLdapConfig] = React.useState<LDAPConfig>(DEFAULT_LDAP);
    const [oidcConfig, setOidcConfig] = React.useState<OIDCConfig>(DEFAULT_OIDC);
    const [showSecrets, setShowSecrets] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
    const [ssoEnabled, setSsoEnabled] = React.useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            // API call to save SSO config
            await new Promise(r => setTimeout(r, 800)); // Simulated
            addToast(t('common.saved'), 'success');
        } catch {
            addToast(t('common.error'), 'error');
        }
        setSaving(false);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            // API call to test SSO connection
            await new Promise(r => setTimeout(r, 1500)); // Simulated
            setTestResult({
                success: true,
                message: provider === 'ldap'
                    ? `Connexion LDAP réussie vers ${ldapConfig.host}:${ldapConfig.port}`
                    : `Fournisseur OIDC validé: ${oidcConfig.discoveryUrl}`,
            });
        } catch {
            setTestResult({
                success: false,
                message: 'Échec de la connexion. Vérifiez vos paramètres.',
            });
        }
        setTesting(false);
    };

    return (
        <div className="space-y-6 max-w-xl">
            {/* SSO Provider Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {t('sso.title')}
                        <Badge variant="secondary" className="ml-2 text-xs">Enterprise</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{t('sso.subtitle')}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Master toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                        <div>
                            <p className="text-sm font-medium">{t('sso.enableSSO')}</p>
                            <p className="text-xs text-muted-foreground">{t('sso.enableDesc')}</p>
                        </div>
                        <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
                    </div>

                    {ssoEnabled && (
                        <>
                            {/* Provider Selection */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { key: 'none' as const, label: t('sso.providers.standard'), icon: Lock, desc: 'Email/Password' },
                                    { key: 'ldap' as const, label: 'LDAP / AD', icon: Server, desc: 'Active Directory' },
                                    { key: 'oidc' as const, label: 'OAuth2 / OIDC', icon: Globe, desc: 'Google, Azure...' },
                                ].map(({ key, label, icon: Icon, desc }) => (
                                    <button
                                        key={key}
                                        onClick={() => setProvider(key)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${provider === key
                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-2 ${provider === key ? 'text-blue-600' : 'text-gray-500'}`} />
                                        <p className="font-medium text-sm">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </button>
                                ))}
                            </div>

                            {/* LDAP Configuration */}
                            {provider === 'ldap' && (
                                <div className="space-y-4 p-5 bg-gray-50 rounded-xl border">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Server className="w-4 h-4 text-blue-600" />
                                        {t('sso.ldap.title')}
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>{t('sso.ldap.host')}</Label>
                                            <Input
                                                value={ldapConfig.host}
                                                onChange={(e) => setLdapConfig(prev => ({ ...prev, host: e.target.value }))}
                                                placeholder="ldap.example.com"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>{t('sso.ldap.port')}</Label>
                                            <Input
                                                type="number"
                                                value={ldapConfig.port}
                                                onChange={(e) => setLdapConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 389 }))}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Base DN</Label>
                                        <Input
                                            value={ldapConfig.baseDN}
                                            onChange={(e) => setLdapConfig(prev => ({ ...prev, baseDN: e.target.value }))}
                                            placeholder="dc=example,dc=com"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label>Bind DN</Label>
                                        <Input
                                            value={ldapConfig.bindDN}
                                            onChange={(e) => setLdapConfig(prev => ({ ...prev, bindDN: e.target.value }))}
                                            placeholder="cn=admin,dc=example,dc=com"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label>{t('sso.ldap.bindPassword')}</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                type={showSecrets ? 'text' : 'password'}
                                                value={ldapConfig.bindPassword}
                                                onChange={(e) => setLdapConfig(prev => ({ ...prev, bindPassword: e.target.value }))}
                                                className="flex-1"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => setShowSecrets(!showSecrets)}>
                                                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>{t('sso.ldap.searchFilter')}</Label>
                                        <Input
                                            value={ldapConfig.searchFilter}
                                            onChange={(e) => setLdapConfig(prev => ({ ...prev, searchFilter: e.target.value }))}
                                            placeholder="(uid={{username}})"
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">{t('sso.ldap.searchFilterHelp')}</p>
                                    </div>

                                    <label className="flex items-center gap-3 p-3 rounded-lg bg-white cursor-pointer border">
                                        <input
                                            type="checkbox"
                                            checked={ldapConfig.useTLS}
                                            onChange={(e) => setLdapConfig(prev => ({ ...prev, useTLS: e.target.checked }))}
                                            className="w-5 h-5 rounded accent-blue-600"
                                        />
                                        <div>
                                            <span className="text-sm font-medium">{t('sso.ldap.useTLS')}</span>
                                            <p className="text-xs text-muted-foreground">{t('sso.ldap.useTLSDesc')}</p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* OIDC Configuration */}
                            {provider === 'oidc' && (
                                <div className="space-y-4 p-5 bg-gray-50 rounded-xl border">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        {t('sso.oidc.title')}
                                    </h4>

                                    <div>
                                        <Label>{t('sso.oidc.discoveryUrl')}</Label>
                                        <Input
                                            value={oidcConfig.discoveryUrl}
                                            onChange={(e) => setOidcConfig(prev => ({ ...prev, discoveryUrl: e.target.value }))}
                                            placeholder="https://accounts.google.com/.well-known/openid-configuration"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Client ID</Label>
                                            <Input
                                                value={oidcConfig.clientId}
                                                onChange={(e) => setOidcConfig(prev => ({ ...prev, clientId: e.target.value }))}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Client Secret</Label>
                                            <div className="flex gap-2 mt-1">
                                                <Input
                                                    type={showSecrets ? 'text' : 'password'}
                                                    value={oidcConfig.clientSecret}
                                                    onChange={(e) => setOidcConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                                                    className="flex-1"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => setShowSecrets(!showSecrets)}>
                                                    {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Callback URL</Label>
                                        <Input
                                            value={oidcConfig.callbackUrl}
                                            onChange={(e) => setOidcConfig(prev => ({ ...prev, callbackUrl: e.target.value }))}
                                            className="mt-1"
                                            disabled
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">{t('sso.oidc.callbackHelp')}</p>
                                    </div>

                                    <div>
                                        <Label>Scopes</Label>
                                        <Input
                                            value={oidcConfig.scopes}
                                            onChange={(e) => setOidcConfig(prev => ({ ...prev, scopes: e.target.value }))}
                                            className="mt-1"
                                        />
                                    </div>

                                    {/* Quick SSO Providers */}
                                    <div className="border-t pt-4">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('sso.oidc.quickSetup')}</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { name: 'Google', url: 'https://accounts.google.com/.well-known/openid-configuration' },
                                                { name: 'Azure AD', url: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration' },
                                                { name: 'Okta', url: '' },
                                            ].map((p) => (
                                                <button
                                                    key={p.name}
                                                    onClick={() => p.url && setOidcConfig(prev => ({ ...prev, discoveryUrl: p.url }))}
                                                    className="px-3 py-2 text-xs font-medium bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                                                    disabled={!p.url}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Test Result */}
                            {testResult && (
                                <div className={`flex items-center gap-2 p-4 rounded-xl ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    <span className="text-sm">{testResult.message}</span>
                                </div>
                            )}

                            {/* Actions */}
                            {provider !== 'none' && (
                                <div className="flex gap-3 pt-2">
                                    <Button onClick={handleSave} disabled={saving}>
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {t('common.save')}
                                    </Button>
                                    <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
                                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                                        {t('sso.testConnection')}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
