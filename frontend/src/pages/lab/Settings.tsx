import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Input, Label } from '@/components/ui-basic';
import { Tabs, Modal, ProgressBar, useToast } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Key, Copy, Trash2, AlertTriangle, Upload, MessageSquare, Phone, CheckCircle, XCircle, Loader2, Eye, EyeOff, Shield, Archive, Palette, Wallet, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsed: string | null;
}

export function Settings() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const location = useLocation();

    // Determine default tab from URL
    const getInitialTab = () => {
        if (location.pathname.includes('/sms')) return 'sms';
        if (location.pathname.includes('/api')) return 'api';
        return 'general';
    };

    // General Settings State
    const [labName, setLabName] = React.useState('Laboratoire Mvolyé');
    const [labAddress, setLabAddress] = React.useState('123 Rue du Centre, Yaoundé');
    const [configuredRetentionDays, setConfiguredRetentionDays] = React.useState(30);
    const [maxRetentionDays, setMaxRetentionDays] = React.useState(30); // Limite du contrat

    // White Labeling / Branding State
    const [brandColor, setBrandColor] = React.useState('#3B82F6');
    const [brandLogoUrl, setBrandLogoUrl] = React.useState<string | null>(null);
    const [tenantSlug, setTenantSlug] = React.useState('');
    const [savingBranding, setSavingBranding] = React.useState(false);
    const [uploadingLogo, setUploadingLogo] = React.useState(false);

    React.useEffect(() => {
        // Fetch Tenant Settings
        fetch('/api/tenants/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.name) setLabName(data.name);
                if (data.address) setLabAddress(data.address);
                if (data.configuredRetentionDays) setConfiguredRetentionDays(data.configuredRetentionDays);
                if (data.maxRetentionDays) setMaxRetentionDays(data.maxRetentionDays);
                // White Labeling
                if (data.brandColor) setBrandColor(data.brandColor);
                if (data.brandLogoUrl) setBrandLogoUrl(data.brandLogoUrl);
                if (data.slug) setTenantSlug(data.slug);
                // Campay
                if (data.campayUsername) {
                    setCampayUsername(data.campayUsername);
                    setCampayConfigured(true);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const saveSettings = async () => {
        // Validation: configuredRetentionDays must be <= maxRetentionDays
        if (configuredRetentionDays > maxRetentionDays) {
            addToast(t('settings.general.retention.limitError', { days: maxRetentionDays }), 'error');
            return;
        }
        if (configuredRetentionDays < 7) {
            addToast(t('settings.general.retention.minError'), 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tenants/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: labName,
                    address: labAddress,
                    configuredRetentionDays: configuredRetentionDays
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to update settings');
            }

            addToast(t('common.success'), 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message, 'error');
        }
    };

    // API Keys State
    const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([
        { id: '1', name: 'SIL Integration', prefix: 'sk_live_abc1...', createdAt: '2025-12-01', lastUsed: '2025-12-15' },
        { id: '2', name: 'Test Key', prefix: 'sk_test_xyz2...', createdAt: '2025-11-15', lastUsed: null },
    ]);
    const [newKeyModalOpen, setNewKeyModalOpen] = React.useState(false);
    const [newKeyName, setNewKeyName] = React.useState('');
    const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);

    // SMS State
    const smsUsed = 450;
    const smsTotal = 1000;

    // Integration State
    const [integration, setIntegration] = React.useState({
        exists: false,
        provider: 'TWILIO' as 'TWILIO' | 'META' | 'ORANGE',
        accountId: '',
        authToken: '',
        phoneNumber: '',
        smsEnabled: true,
        whatsappEnabled: false,
        isActive: true,
        lastTestedAt: null as Date | null,
        testStatus: null as string | null,
    });
    const [integrationLoading, setIntegrationLoading] = React.useState(false);
    const [testingConnection, setTestingConnection] = React.useState(false);

    // Fetch Integration on mount
    React.useEffect(() => {
        api.get('/api/integrations')
            .then(res => res.json())
            .then(data => {
                if (data.exists) {
                    setIntegration({
                        exists: true,
                        provider: data.provider || 'TWILIO',
                        accountId: data.accountId || '',
                        authToken: '', // Never returned from server
                        phoneNumber: data.phoneNumber || '',
                        smsEnabled: data.smsEnabled ?? true,
                        whatsappEnabled: data.whatsappEnabled ?? false,
                        isActive: data.isActive ?? true,
                        lastTestedAt: data.lastTestedAt,
                        testStatus: data.testStatus,
                    });
                }
            })
            .catch(err => console.error('Failed to load integrations:', err));
    }, []);

    const handleSaveIntegration = async () => {
        if (!integration.accountId || !integration.authToken || !integration.phoneNumber) {
            addToast(t('integrations.errors.required'), 'error');
            return;
        }

        setIntegrationLoading(true);
        try {
            const res = await api.put('/api/integrations', {
                provider: integration.provider,
                accountId: integration.accountId,
                authToken: integration.authToken,
                phoneNumber: integration.phoneNumber,
                smsEnabled: integration.smsEnabled,
                whatsappEnabled: integration.whatsappEnabled,
                isActive: integration.isActive,
            });

            if (!res.ok) throw new Error('Failed to save');

            addToast(t('integrations.saved'), 'success');
            setIntegration(prev => ({ ...prev, exists: true, authToken: '' }));
        } catch (err) {
            addToast(t('errors.failed'), 'error');
        } finally {
            setIntegrationLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            const res = await api.post('/api/integrations/test', {});
            const data = await res.json();

            setIntegration(prev => ({
                ...prev,
                lastTestedAt: new Date(),
                testStatus: data.success ? 'success' : 'failed',
            }));

            if (data.success) {
                addToast(t('integrations.testSuccess'), 'success');
            } else {
                addToast(data.message || t('integrations.testFailed'), 'error');
            }
        } catch (err) {
            addToast(t('integrations.testFailed'), 'error');
        } finally {
            setTestingConnection(false);
        }
    };

    // Modules & Licensing State
    interface Module {
        id: string;
        name: string;
        description: string;
        active: boolean;
    }
    const [modules, setModules] = React.useState<Module[]>([]);
    const [licenseCode, setLicenseCode] = React.useState('');
    const [activatingLicense, setActivatingLicense] = React.useState(false);
    const [syncApiKey, setSyncApiKey] = React.useState<string | null>(null);
    const [showApiKey, setShowApiKey] = React.useState(false);
    const [generatingKey, setGeneratingKey] = React.useState(false);
    const [revokingKey, setRevokingKey] = React.useState(false);

    // Archive License State
    const [archiveLicenseCode, setArchiveLicenseCode] = React.useState('');
    const [activatingArchiveLicense, setActivatingArchiveLicense] = React.useState(false);

    // Payment Provider Settings State
    const [paymentProvider, setPaymentProvider] = React.useState<'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO'>('CAMPAY');
    const [campayUsername, setCampayUsername] = React.useState('');
    const [campayPassword, setCampayPassword] = React.useState('');
    // Orange Money credentials
    const [orangeUsername, setOrangeUsername] = React.useState('');
    const [orangePassword, setOrangePassword] = React.useState('');
    const [orangeAuthToken, setOrangeAuthToken] = React.useState('');
    const [orangeMsisdn, setOrangeMsisdn] = React.useState('');
    // MTN MoMo credentials
    const [mtnApiUser, setMtnApiUser] = React.useState('');
    const [mtnApiKey, setMtnApiKey] = React.useState('');
    const [mtnSubscriptionKey, setMtnSubscriptionKey] = React.useState('');
    const [mtnTargetEnv, setMtnTargetEnv] = React.useState<'sandbox' | 'production'>('sandbox');
    // Common state
    const [providerConfigured, setProviderConfigured] = React.useState(false);
    const [savingPayment, setSavingPayment] = React.useState(false);
    const [testingPayment, setTestingPayment] = React.useState(false);
    const [paymentTestStatus, setPaymentTestStatus] = React.useState<'success' | 'failed' | null>(null);

    // Fetch Modules and Sync Key Status on mount
    React.useEffect(() => {
        // Fetch modules
        api.get('/api/tenants/me/modules')
            .then(res => res.json())
            .then(data => {
                if (data.availableModules) {
                    setModules(data.availableModules);
                }
                if (data.syncApiKey) {
                    setSyncApiKey(data.syncApiKey);
                }
            })
            .catch(err => console.error('Failed to load modules:', err));

        // Also fetch sync key status directly
        api.get('/api/tenants/me/sync-key')
            .then(res => res.json())
            .then(data => {
                if (data.syncApiKey) {
                    setSyncApiKey(data.syncApiKey);
                }
            })
            .catch(err => console.error('Failed to load sync key status:', err));
    }, []);

    // Generate new sync API key
    const handleGenerateSyncKey = async () => {
        setGeneratingKey(true);
        try {
            const res = await api.post('/api/tenants/me/sync-key', {});
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to generate key');
            setSyncApiKey(data.syncApiKey);
            setShowApiKey(true); // Show immediately after generation
            addToast('Clé de connexion générée avec succès', 'success');
        } catch (err: any) {
            addToast(err.message || 'Erreur lors de la génération', 'error');
        } finally {
            setGeneratingKey(false);
        }
    };

    // Revoke sync API key
    const handleRevokeSyncKey = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir révoquer cette clé ? L\'automate Windows ne pourra plus se connecter.')) {
            return;
        }
        setRevokingKey(true);
        try {
            const res = await api.delete('/api/tenants/me/sync-key', {});
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to revoke key');
            }
            setSyncApiKey(null);
            setShowApiKey(false);
            addToast('Clé révoquée avec succès', 'success');
        } catch (err: any) {
            addToast(err.message || 'Erreur lors de la révocation', 'error');
        } finally {
            setRevokingKey(false);
        }
    };

    const handleActivateLicense = async () => {
        if (!licenseCode.trim()) {
            addToast(t('modules.errors.codeRequired') || 'Veuillez saisir un code de licence', 'error');
            return;
        }

        setActivatingLicense(true);
        try {
            const res = await api.post('/api/tenants/me/license', { code: licenseCode });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Activation failed');
            }

            addToast(data.message || t('modules.activated') || 'Licence activée avec succès', 'success');
            setLicenseCode('');

            // Store syncApiKey if returned
            if (data.syncApiKey) {
                setSyncApiKey(data.syncApiKey);
            }

            // Refresh modules list
            const modulesRes = await api.get('/api/tenants/me/modules');
            const modulesData = await modulesRes.json();
            if (modulesData.availableModules) {
                setModules(modulesData.availableModules);
            }
            if (modulesData.syncApiKey) {
                setSyncApiKey(modulesData.syncApiKey);
            }
        } catch (err: any) {
            addToast(err.message || t('modules.activationFailed') || 'Échec de l\'activation', 'error');
        } finally {
            setActivatingLicense(false);
        }
    };

    // Handle Archive License Activation
    const handleActivateArchiveLicense = async () => {
        if (!archiveLicenseCode.trim()) {
            addToast('Veuillez saisir un code de licence d\'archivage', 'error');
            return;
        }

        setActivatingArchiveLicense(true);
        try {
            const res = await api.post('/api/tenants/me/license', { code: archiveLicenseCode });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Activation failed');
            }

            addToast(data.message || 'Extension d\'archivage activée avec succès', 'success');
            setArchiveLicenseCode('');

            // Refresh tenant data to get updated maxRetentionDays
            const tenantRes = await fetch('/api/tenants/me', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const tenantData = await tenantRes.json();
            if (tenantData.maxRetentionDays) {
                setMaxRetentionDays(tenantData.maxRetentionDays);
            }

            // Refresh modules list
            const modulesRes = await api.get('/api/tenants/me/modules');
            const modulesData = await modulesRes.json();
            if (modulesData.availableModules) {
                setModules(modulesData.availableModules);
            }
        } catch (err: any) {
            addToast(err.message || 'Échec de l\'activation', 'error');
        } finally {
            setActivatingArchiveLicense(false);
        }
    };

    const handleGenerateKey = () => {
        // Mock key generation
        const key = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        setGeneratedKey(key);
        setApiKeys([
            ...apiKeys,
            {
                id: Date.now().toString(),
                name: newKeyName || 'New API Key',
                prefix: `${key.substring(0, 12)}...`,
                createdAt: new Date().toISOString().split('T')[0],
                lastUsed: null,
            },
        ]);
        addToast(t('settings.api.modal.success'), 'success');
    };

    const handleRevokeKey = (id: string) => {
        setApiKeys(apiKeys.filter((k) => k.id !== id));
        addToast(t('settings.api.table.revoked'), 'info');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('common.copied'), 'success');
    };

    // ========== WHITE LABELING HANDLERS ==========

    const saveBranding = async () => {
        setSavingBranding(true);
        try {
            const res = await api.patch('/api/tenants/me/branding', {
                brandColor,
                slug: tenantSlug,
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to save branding');
            }
            addToast('Branding enregistré avec succès', 'success');
        } catch (error: any) {
            addToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
        } finally {
            setSavingBranding(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match(/image\/(png|jpeg|jpg|gif|webp)/)) {
            addToast('Format non supporté. Utilisez PNG, JPG ou WebP.', 'error');
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            addToast('Le fichier est trop volumineux (max 2 Mo)', 'error');
            return;
        }

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const res = await fetch('/api/tenants/me/logo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Upload failed');
            }

            const data = await res.json();
            setBrandLogoUrl(data.logoUrl);
            addToast('Logo uploadé avec succès', 'success');
        } catch (error: any) {
            addToast(error.message || 'Erreur lors de l\'upload', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    {user?.role === 'SUPER_ADMIN' ? t('platform.title') : t('settings.title')}
                </h1>
                <p className="text-muted-foreground">
                    {t('settings.subtitle')}
                </p>
            </div>

            <Tabs key={getInitialTab()} tabs={[
                {
                    id: 'general',
                    label: t('settings.tabs.general'),
                    content: (
                        <div className="space-y-6 max-w-xl">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('settings.general.name')}</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={labName}
                                    onChange={(e) => setLabName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('settings.general.address')}</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={3}
                                    value={labAddress}
                                    onChange={(e) => setLabAddress(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('settings.general.logo')}</label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    {t('settings.general.logoDesc')}
                                </p>
                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
                                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {t('upload.dragDrop')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('settings.general.logoHint')}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                                    {t('settings.general.senderId')}
                                    <span className="text-muted-foreground" title={t('settings.general.senderIdHint')}>
                                        <Key className="w-3.5 h-3.5" />
                                    </span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-muted-foreground font-mono cursor-not-allowed"
                                        value="MEDLAB"
                                        disabled
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                                        <Key className="w-4 h-4 opacity-50" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-100 p-2 rounded-md">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <span>
                                        {t('settings.general.senderIdHint')}
                                    </span>
                                </p>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="font-medium mb-3">{t('settings.general.retention.title')}</h3>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                                    <Trash2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium">{t('settings.general.retention.policy')}</p>
                                        <p>{t('settings.general.retention.policyDesc')}</p>
                                    </div>
                                </div>
                                <label className="block text-sm font-medium mb-2">{t('settings.general.retention.label')}</label>
                                <div className="space-y-3">
                                    <input
                                        type="range"
                                        min={7}
                                        max={maxRetentionDays}
                                        value={configuredRetentionDays}
                                        onChange={(e) => setConfiguredRetentionDays(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{t('settings.general.retention.min')}</span>
                                        <span className="text-lg font-bold text-blue-600">{configuredRetentionDays} {t('common.days') || 'jours'}</span>
                                        <span>{t('settings.general.retention.max', { days: maxRetentionDays })}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 bg-amber-50 border border-amber-100 p-2 rounded-md">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
                                    {t('settings.general.retention.hint')}
                                </p>
                            </div>

                            <Button onClick={saveSettings}>
                                {t('common.save')}
                            </Button>
                        </div>
                    ),
                },
                {
                    id: 'api',
                    label: t('settings.tabs.api'),
                    content: (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{t('settings.api.title')}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('settings.api.subtitle')}
                                    </p>
                                </div>
                                <Button onClick={() => setNewKeyModalOpen(true)} className="gap-2">
                                    <Key className="w-4 h-4" />
                                    {t('settings.api.btn_generate')}
                                </Button>
                            </div>

                            <div className="border rounded-lg divide-y">
                                {apiKeys.map((key) => (
                                    <div key={key.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{key.name}</p>
                                            <p className="text-sm text-muted-foreground font-mono">{key.prefix}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('settings.api.table.info', { date: key.createdAt, used: key.lastUsed ? `Last used ${key.lastUsed}` : 'Never used' })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeKey(key.id)}
                                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <Modal
                                open={newKeyModalOpen}
                                onClose={() => {
                                    setNewKeyModalOpen(false);
                                    setGeneratedKey(null);
                                    setNewKeyName('');
                                }}
                                title={generatedKey ? t('settings.api.modal.save') : t('settings.api.modal.create')}
                            >
                                {generatedKey ? (
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-800">
                                                <p className="font-medium">{t('settings.api.modal.save')}</p>
                                                <p>{t('settings.api.modal.saveDesc')}</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm break-all flex items-center gap-2">
                                            <span className="flex-1">{generatedKey}</span>
                                            <button onClick={() => copyToClipboard(generatedKey)} className="p-1 hover:bg-gray-200 rounded">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setNewKeyModalOpen(false);
                                                setGeneratedKey(null);
                                                setNewKeyName('');
                                            }}
                                            className="w-full"
                                        >
                                            {t('settings.api.modal.btn_confirm')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('settings.api.modal.name')}</label>
                                            <input
                                                type="text"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={newKeyName}
                                                onChange={(e) => setNewKeyName(e.target.value)}
                                                placeholder="e.g., SIL Production"
                                            />
                                        </div>
                                        <Button onClick={handleGenerateKey} className="w-full">
                                            {t('settings.api.btn_generate')}
                                        </Button>
                                    </div>
                                )}
                            </Modal>
                        </div>
                    ),
                },
                {
                    id: 'sms',
                    label: t('settings.tabs.sms'),
                    content: (
                        <div className="space-y-6 max-w-xl">
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-medium mb-4">{t('settings.sms.title')}</h3>
                                <ProgressBar value={smsUsed} max={smsTotal} label={t('settings.sms.used')} showWarning />
                                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold">{smsTotal - smsUsed}</p>
                                        <p className="text-sm text-muted-foreground">{t('settings.sms.remaining')}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-2xl font-bold">{smsUsed}</p>
                                        <p className="text-sm text-muted-foreground">{t('settings.sms.thisMonth')}</p>
                                    </div>
                                </div>
                            </div>

                            {(smsTotal - smsUsed) < 100 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800">{t('settings.sms.warning')}</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            {t('settings.sms.warningDesc')}
                                        </p>
                                        <Button className="mt-3 bg-amber-600 hover:bg-amber-700">
                                            {t('settings.sms.btn_recharge')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-muted-foreground">
                                <p>{t('settings.sms.hint')}</p>
                            </div>
                        </div>
                    ),
                },
                {
                    id: 'integrations',
                    label: t('settings.tabs.integrations') || 'Intégrations',
                    content: (
                        <div className="space-y-6 max-w-xl">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">{t('integrations.title') || 'Configuration SMS/WhatsApp'}</p>
                                    <p>{t('integrations.description') || 'Configurez vos propres identifiants Twilio ou META pour envoyer les notifications.'}</p>
                                </div>
                            </div>

                            {/* Provider Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('integrations.provider') || 'Fournisseur'}</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={integration.provider}
                                    onChange={(e) => setIntegration({ ...integration, provider: e.target.value as any })}
                                >
                                    <option value="TWILIO">Twilio (SMS + WhatsApp)</option>
                                    <option value="META">META WhatsApp Business API</option>
                                    <option value="ORANGE">Orange SMS Cameroun</option>
                                </select>
                            </div>

                            {/* Account ID */}
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('integrations.accountId') || 'Account SID / App ID'}</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 font-mono"
                                    value={integration.accountId}
                                    onChange={(e) => setIntegration({ ...integration, accountId: e.target.value })}
                                    placeholder={integration.provider === 'TWILIO' ? 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'App ID'}
                                />
                            </div>

                            {/* Auth Token */}
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('integrations.authToken') || 'Auth Token'}</label>
                                <input
                                    type="password"
                                    className="w-full border rounded-lg px-3 py-2 font-mono"
                                    value={integration.authToken}
                                    onChange={(e) => setIntegration({ ...integration, authToken: e.target.value })}
                                    placeholder={integration.exists ? '••••••••••••••••' : 'Entrez votre token'}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('integrations.authTokenHint') || 'Le token est chiffré avant stockage. Ne sera jamais affiché.'}
                                </p>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    {t('integrations.phoneNumber') || 'Numéro d\'envoi'}
                                </label>
                                <input
                                    type="tel"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={integration.phoneNumber}
                                    onChange={(e) => setIntegration({ ...integration, phoneNumber: e.target.value })}
                                    placeholder="+237612345678"
                                />
                            </div>

                            {/* Channel Toggles */}
                            <div className="border-t pt-4">
                                <p className="font-medium mb-3">{t('integrations.channels') || 'Canaux activés'}</p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={integration.smsEnabled}
                                            onChange={(e) => setIntegration({ ...integration, smsEnabled: e.target.checked })}
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                        <span>SMS</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={integration.whatsappEnabled}
                                            onChange={(e) => setIntegration({ ...integration, whatsappEnabled: e.target.checked })}
                                            className="w-4 h-4 accent-green-600"
                                        />
                                        <span>WhatsApp</span>
                                    </label>
                                </div>
                            </div>

                            {/* Test Status */}
                            {integration.testStatus && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${integration.testStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                    }`}>
                                    {integration.testStatus === 'success' ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <XCircle className="w-5 h-5" />
                                    )}
                                    <span>
                                        {integration.testStatus === 'success'
                                            ? t('integrations.testSuccess') || 'Connexion réussie'
                                            : t('integrations.testFailed') || 'Échec de connexion'}
                                    </span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleSaveIntegration}
                                    disabled={integrationLoading}
                                    className="flex-1"
                                >
                                    {integrationLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    {t('common.save') || 'Enregistrer'}
                                </Button>
                                <Button
                                    onClick={handleTestConnection}
                                    disabled={testingConnection || !integration.exists}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                    {t('integrations.testConnection') || 'Tester'}
                                </Button>
                            </div>
                        </div>
                    ),
                },
                // Modules & Licences Tab
                {
                    id: 'modules',
                    label: t('settings.tabs.modules') || 'Modules & Licences',
                    content: (
                        <div className="space-y-8">
                            {/* License Activation */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-blue-600" />
                                    {t('modules.activate.title') || 'Activer un module'}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {t('modules.activate.description') || 'Saisissez votre code de licence pour activer des fonctionnalités premium'}
                                </p>
                                <div className="flex gap-3">
                                    <Input
                                        value={licenseCode}
                                        onChange={(e) => setLicenseCode(e.target.value)}
                                        placeholder={t('modules.activate.placeholder') || 'Ex: SYNC-2026-X'}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleActivateLicense}
                                        disabled={activatingLicense || !licenseCode.trim()}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {activatingLicense ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {t('modules.activate.button') || 'Activer'}
                                    </Button>
                                </div>
                            </div>

                            {/* Politique d'Archivage & Rétention */}
                            <div className={`rounded-lg p-6 border-2 ${maxRetentionDays > 60
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                                : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${maxRetentionDays > 60
                                        ? 'bg-green-500' : 'bg-gray-400'}`}>
                                        {maxRetentionDays > 60
                                            ? <Shield className="w-6 h-6 text-white" />
                                            : <Archive className="w-6 h-6 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            Politique d'Archivage & Rétention
                                            {maxRetentionDays > 60 && (
                                                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                                    Coffre-fort Activé ✅
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {maxRetentionDays > 60
                                                ? 'Vos données bénéficient d\'une rétention longue durée conforme aux exigences réglementaires.'
                                                : 'Offre Standard - Archivage limité. Activez une extension pour conserver vos dossiers plus longtemps.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Current Retention Display */}
                                <div className="bg-white rounded-lg p-4 border mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Conservation actuelle</p>
                                            <p className="text-3xl font-bold text-gray-900">
                                                {maxRetentionDays} <span className="text-lg font-normal text-muted-foreground">jours</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {maxRetentionDays <= 60 && (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Offre Standard
                                                </span>
                                            )}
                                            {maxRetentionDays >= 365 && maxRetentionDays < 1825 && (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full">
                                                    <Shield className="w-4 h-4" />
                                                    Archive 1 an
                                                </span>
                                            )}
                                            {maxRetentionDays >= 1825 && maxRetentionDays < 3650 && (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                                                    <Shield className="w-4 h-4" />
                                                    Coffre-fort 5 ans
                                                </span>
                                            )}
                                            {maxRetentionDays >= 3650 && (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full">
                                                    <Shield className="w-4 h-4" />
                                                    Coffre-fort 10 ans
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Archive License Activation */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium">
                                        Clé d'extension d'archivage
                                    </label>
                                    <div className="flex gap-3">
                                        <Input
                                            value={archiveLicenseCode}
                                            onChange={(e) => setArchiveLicenseCode(e.target.value.toUpperCase())}
                                            placeholder="Ex: ARCH-5Y-2026 ou DEMO-ARCHIVE-5Y"
                                            className="flex-1 font-mono"
                                        />
                                        <Button
                                            onClick={handleActivateArchiveLicense}
                                            disabled={activatingArchiveLicense || !archiveLicenseCode.trim()}
                                            className={maxRetentionDays > 60
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'bg-blue-600 hover:bg-blue-700'}
                                        >
                                            {activatingArchiveLicense ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Activer l'extension
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Codes disponibles: <code className="bg-gray-100 px-1 rounded">DEMO-ARCHIVE-5Y</code> (5 ans),
                                        <code className="bg-gray-100 px-1 ml-1 rounded">DEMO-ARCHIVE-10Y</code> (10 ans)
                                    </p>
                                </div>
                            </div>

                            {/* Modules Grid */}
                            <div>
                                <h3 className="font-semibold text-lg mb-4">
                                    {t('modules.available') || 'Modules Disponibles'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Auto-Sync Module */}
                                    {(() => {
                                        const autoSyncActive = modules.find(m => m.id === 'AUTO_SYNC')?.active ?? false;
                                        return (
                                            <div className={`p-5 rounded-lg border-2 ${autoSyncActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${autoSyncActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                            <Upload className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium">{t('modules.autoSync.title') || 'Auto-Sync'}</h4>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${autoSyncActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                                                {autoSyncActive ? 'Actif' : 'Inactif'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {t('modules.autoSync.description') || 'Synchronisation Windows avec SIL. Téléversement automatique des résultats PDF.'}
                                                </p>
                                                {autoSyncActive && (
                                                    <div className="space-y-4 mt-4">
                                                        {/* Generate Key or Display Key */}
                                                        {!syncApiKey ? (
                                                            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                                                                <p className="text-sm text-amber-800 mb-3">
                                                                    Aucune clé de connexion configurée. Générez une clé pour permettre à l'automate Windows de se connecter.
                                                                </p>
                                                                <Button
                                                                    onClick={handleGenerateSyncKey}
                                                                    disabled={generatingKey}
                                                                    className="bg-blue-600 hover:bg-blue-700"
                                                                >
                                                                    {generatingKey ? (
                                                                        <>
                                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                            Génération...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Key className="w-4 h-4 mr-2" />
                                                                            Générer une clé de connexion
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* API Key Display */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-muted-foreground">{t('modules.apiKey') || 'Clé API'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border font-mono truncate">
                                                                            {showApiKey ? syncApiKey : '••••••••••••••••••••••••••••••••'}
                                                                        </code>
                                                                        <Button
                                                                            onClick={() => setShowApiKey(!showApiKey)}
                                                                            variant="ghost"
                                                                            className="h-8 px-2"
                                                                            title={showApiKey ? 'Masquer' : 'Révéler'}
                                                                        >
                                                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                        </Button>
                                                                        <Button
                                                                            onClick={() => copyToClipboard(syncApiKey)}
                                                                            variant="ghost"
                                                                            className="h-8 px-2"
                                                                        >
                                                                            <Copy className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Bot Endpoint */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-muted-foreground">{t('modules.syncEndpoint') || 'Point de terminaison Bot'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border font-mono truncate">
                                                                            POST {window.location.origin}/api/sync/bot
                                                                        </code>
                                                                        <Button
                                                                            onClick={() => copyToClipboard(`${window.location.origin}/api/sync/bot`)}
                                                                            variant="ghost"
                                                                            className="h-8 px-2"
                                                                        >
                                                                            <Copy className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Health Check Endpoint */}
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-muted-foreground">{t('modules.healthEndpoint') || 'Health Check'}</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border font-mono truncate">
                                                                            GET {window.location.origin}/api/sync/health
                                                                        </code>
                                                                        <Button
                                                                            onClick={() => copyToClipboard(`${window.location.origin}/api/sync/health`)}
                                                                            variant="ghost"
                                                                            className="h-8 px-2"
                                                                        >
                                                                            <Copy className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                <p className="text-xs text-muted-foreground">
                                                                    {t('modules.autoSync.downloadBot') || 'Utilisez l\'en-tête x-api-key pour l\'authentification.'}
                                                                </p>

                                                                {/* Revoke Button */}
                                                                <div className="pt-2 border-t">
                                                                    <Button
                                                                        onClick={handleRevokeSyncKey}
                                                                        disabled={revokingKey}
                                                                        variant="ghost"
                                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    >
                                                                        {revokingKey ? (
                                                                            <>
                                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                Révocation...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                                Révoquer la clé
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Archive Module */}
                                    {(() => {
                                        const archiveActive = modules.find(m => m.id === 'LONG_TERM_ARCHIVE')?.active ?? false;
                                        return (
                                            <div className={`p-5 rounded-lg border-2 ${archiveActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${archiveActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                            <Key className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium">{t('modules.archive.title') || 'Archive Longue Durée'}</h4>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${archiveActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                                                {archiveActive ? 'Actif' : 'Inactif'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {t('modules.archive.description') || 'Conservation des résultats jusqu\'à 5 ans. Idéal pour la conformité réglementaire.'}
                                                </p>
                                                {archiveActive && (
                                                    <div className="mt-4">
                                                        <p className="text-sm text-green-700 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4" />
                                                            {t('modules.archive.active') || 'Rétention étendue active'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Windows Automation Connection - Always Visible */}
                            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                                        <Key className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Connexion Automate Windows</h3>
                                        <p className="text-sm text-muted-foreground">Clé de connexion pour le service de synchronisation PDF</p>
                                    </div>
                                </div>

                                {!syncApiKey ? (
                                    <div className="p-4 border rounded-lg bg-white border-amber-200">
                                        <p className="text-sm text-gray-700 mb-3">
                                            Aucune clé de connexion configurée. Générez une clé pour permettre à l'automate Windows de téléverser automatiquement les résultats PDF.
                                        </p>
                                        <Button
                                            onClick={handleGenerateSyncKey}
                                            disabled={generatingKey}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {generatingKey ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Génération...
                                                </>
                                            ) : (
                                                <>
                                                    <Key className="w-4 h-4 mr-2" />
                                                    Générer une clé de connexion
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* API Key */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Clé API</Label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border font-mono truncate">
                                                    {showApiKey ? syncApiKey : '••••••••••••••••••••••••••••••••'}
                                                </code>
                                                <Button
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    variant="ghost"
                                                    className="h-8 px-2"
                                                    title={showApiKey ? 'Masquer' : 'Révéler'}
                                                >
                                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    onClick={() => copyToClipboard(syncApiKey)}
                                                    variant="ghost"
                                                    className="h-8 px-2"
                                                    title="Copier"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Endpoint URL */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Point de terminaison (pour l'automate)</Label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border font-mono truncate">
                                                    POST {window.location.origin}/api/sync/bot
                                                </code>
                                                <Button
                                                    onClick={() => copyToClipboard(`${window.location.origin}/api/sync/bot`)}
                                                    variant="ghost"
                                                    className="h-8 px-2"
                                                    title="Copier"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            L'automate doit envoyer la clé dans l'en-tête HTTP: <code className="bg-gray-100 px-1 rounded">x-api-key: VOTRE_CLE</code>
                                        </p>

                                        {/* Revoke */}
                                        <div className="pt-3 border-t border-blue-200">
                                            <Button
                                                onClick={handleRevokeSyncKey}
                                                disabled={revokingKey}
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {revokingKey ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Révocation...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Révoquer la clé
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Help Text */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-amber-800">{t('modules.help.title') || 'Besoin d\'une licence?'}</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            {t('modules.help.description') || 'Contactez votre représentant commercial ou visitez le portail partenaire pour obtenir un code de licence.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ),
                },
                {
                    id: 'apparence',
                    label: 'Apparence',
                    content: (
                        <div className="space-y-6 max-w-xl">
                            {/* Header */}
                            <div className="bg-white border rounded-lg p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                        <Palette className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Marque Blanche</h3>
                                        <p className="text-sm text-muted-foreground">Personnalisez l'apparence de vos pages patient</p>
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="block mb-2">Couleur principale</Label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={brandColor}
                                                onChange={(e) => setBrandColor(e.target.value)}
                                                className="w-12 h-12 rounded-lg border cursor-pointer"
                                            />
                                            <Input
                                                value={brandColor}
                                                onChange={(e) => setBrandColor(e.target.value)}
                                                placeholder="#3B82F6"
                                                className="w-32 font-mono"
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                Utilisé pour les boutons et accents
                                            </span>
                                        </div>
                                    </div>

                                    {/* Logo Upload */}
                                    <div>
                                        <Label className="block mb-2">Logo du laboratoire</Label>
                                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                            {brandLogoUrl ? (
                                                <div className="space-y-3">
                                                    <img
                                                        src={brandLogoUrl || ''}
                                                        alt="Logo"
                                                        className="max-h-20 mx-auto object-contain"
                                                    />
                                                    <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Logo configuré
                                                    </p>
                                                    <label className="cursor-pointer">
                                                        <span className="text-sm text-blue-600 hover:underline">
                                                            Changer le logo
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp"
                                                            onChange={handleLogoUpload}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer block">
                                                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-600">
                                                        {uploadingLogo ? (
                                                            <span className="flex items-center justify-center gap-2">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Upload en cours...
                                                            </span>
                                                        ) : (
                                                            <>Cliquez ou glissez votre logo ici</>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WebP (max 2 Mo)</p>
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp"
                                                        onChange={handleLogoUpload}
                                                        className="hidden"
                                                        disabled={uploadingLogo}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Slug */}
                                    <div>
                                        <Label className="block mb-2">Identifiant URL (slug)</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">medlab.cm/</span>
                                            <Input
                                                value={tenantSlug}
                                                onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                placeholder="mon-labo"
                                                className="flex-1"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            URL personnalisée pour vos patients
                                        </p>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="mt-6 pt-4 border-t">
                                    <Button onClick={saveBranding} disabled={savingBranding}>
                                        {savingBranding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Enregistrer les modifications
                                    </Button>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="bg-white border rounded-lg p-6">
                                <h4 className="font-medium mb-4">Aperçu du bouton patient</h4>
                                <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-center gap-4">
                                    {brandLogoUrl && (
                                        <img
                                            src={brandLogoUrl || ''}
                                            alt="Logo Preview"
                                            className="max-h-12 object-contain"
                                        />
                                    )}
                                    <button
                                        style={{ backgroundColor: brandColor }}
                                        className="px-6 py-3 text-white rounded-lg font-medium shadow-lg transition-transform hover:scale-105"
                                    >
                                        Accéder à mes résultats
                                    </button>
                                    <p className="text-xs text-gray-500">
                                        Tel que vu par vos patients
                                    </p>
                                </div>
                            </div>
                        </div>
                    ),
                },
                // Payment Tab - Multi-Provider
                {
                    id: 'payment',
                    label: 'Paiements',
                    content: (
                        <div className="space-y-6 max-w-xl">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Mobile Money</h3>
                                        <p className="text-sm text-muted-foreground">Acceptez les paiements MTN MoMo et Orange Money</p>
                                    </div>
                                </div>
                                <p className="text-sm text-orange-800 mt-3">
                                    Choisissez votre opérateur de paiement et configurez vos identifiants API pour permettre aux patients de payer leurs résultats médicaux.
                                </p>
                            </div>

                            {/* Provider Selection */}
                            <div className="bg-white border rounded-lg p-6 space-y-4">
                                <h4 className="font-medium">Opérateur de paiement</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'CAMPAY' as const, name: 'Campay', desc: 'Aggregateur', color: 'bg-gradient-to-br from-blue-500 to-purple-500' },
                                        { id: 'ORANGE_MONEY' as const, name: 'Orange Money', desc: 'API directe', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
                                        { id: 'MTN_MOMO' as const, name: 'MTN MoMo', desc: 'API directe', color: 'bg-gradient-to-br from-yellow-400 to-yellow-500' },
                                    ].map(provider => (
                                        <button
                                            key={provider.id}
                                            onClick={() => { setPaymentProvider(provider.id); setPaymentTestStatus(null); }}
                                            className={`p-4 rounded-lg border-2 transition-all text-left ${paymentProvider === provider.id
                                                    ? 'border-orange-500 bg-orange-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2`}>
                                                {provider.id === 'CAMPAY' ? '⚡' : provider.id === 'ORANGE_MONEY' ? 'OM' : 'MTN'}
                                            </div>
                                            <div className="font-medium text-sm">{provider.name}</div>
                                            <div className="text-xs text-muted-foreground">{provider.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Credentials Form - Campay */}
                            {paymentProvider === 'CAMPAY' && (
                                <div className="bg-white border rounded-lg p-6 space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Identifiants Campay
                                    </h4>
                                    <div>
                                        <Label className="block mb-1">Nom d'utilisateur</Label>
                                        <Input type="text" value={campayUsername} onChange={(e) => setCampayUsername(e.target.value)} placeholder="votre-username" className="font-mono" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">Mot de passe</Label>
                                        <Input type="password" value={campayPassword} onChange={(e) => setCampayPassword(e.target.value)} placeholder={providerConfigured ? '••••••••••••' : 'Mot de passe API'} />
                                    </div>
                                </div>
                            )}

                            {/* Credentials Form - Orange Money */}
                            {paymentProvider === 'ORANGE_MONEY' && (
                                <div className="bg-white border rounded-lg p-6 space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Identifiants Orange Money CM
                                    </h4>
                                    <div>
                                        <Label className="block mb-1">Nom d'utilisateur (Client ID)</Label>
                                        <Input type="text" value={orangeUsername} onChange={(e) => setOrangeUsername(e.target.value)} placeholder="client-id" className="font-mono" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">Mot de passe (Client Secret)</Label>
                                        <Input type="password" value={orangePassword} onChange={(e) => setOrangePassword(e.target.value)} placeholder="client-secret" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">X-AUTH-TOKEN</Label>
                                        <Input type="password" value={orangeAuthToken} onChange={(e) => setOrangeAuthToken(e.target.value)} placeholder="Token fourni par Orange" className="font-mono" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">MSISDN Marchand</Label>
                                        <Input type="text" value={orangeMsisdn} onChange={(e) => setOrangeMsisdn(e.target.value)} placeholder="237XXXXXXXXX" className="font-mono" />
                                    </div>
                                </div>
                            )}

                            {/* Credentials Form - MTN MoMo */}
                            {paymentProvider === 'MTN_MOMO' && (
                                <div className="bg-white border rounded-lg p-6 space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Key className="w-4 h-4" />
                                        Identifiants MTN MoMo
                                    </h4>
                                    <div>
                                        <Label className="block mb-1">API User</Label>
                                        <Input type="text" value={mtnApiUser} onChange={(e) => setMtnApiUser(e.target.value)} placeholder="UUID de l'API User" className="font-mono" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">API Key</Label>
                                        <Input type="password" value={mtnApiKey} onChange={(e) => setMtnApiKey(e.target.value)} placeholder="Clé API secrète" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">Subscription Key (Primary)</Label>
                                        <Input type="password" value={mtnSubscriptionKey} onChange={(e) => setMtnSubscriptionKey(e.target.value)} placeholder="Ocp-Apim-Subscription-Key" className="font-mono" />
                                    </div>
                                    <div>
                                        <Label className="block mb-1">Environnement</Label>
                                        <select
                                            value={mtnTargetEnv}
                                            onChange={(e) => setMtnTargetEnv(e.target.value as 'sandbox' | 'production')}
                                            className="w-full border rounded-md px-3 py-2"
                                        >
                                            <option value="sandbox">Sandbox (Test)</option>
                                            <option value="production">Production</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Test Status */}
                            {paymentTestStatus && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${paymentTestStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {paymentTestStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    <span>{paymentTestStatus === 'success' ? 'Connexion réussie ✓' : 'Échec de la connexion'}</span>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={async () => {
                                        setSavingPayment(true);
                                        try {
                                            const payload: Record<string, any> = { paymentProvider };
                                            if (paymentProvider === 'CAMPAY') {
                                                payload.campayUsername = campayUsername;
                                                payload.campayPassword = campayPassword;
                                            } else if (paymentProvider === 'ORANGE_MONEY') {
                                                payload.orangeUsername = orangeUsername;
                                                payload.orangePassword = orangePassword;
                                                payload.orangeAuthToken = orangeAuthToken;
                                                payload.orangeMsisdn = orangeMsisdn;
                                            } else if (paymentProvider === 'MTN_MOMO') {
                                                payload.mtnApiUser = mtnApiUser;
                                                payload.mtnApiKey = mtnApiKey;
                                                payload.mtnSubscriptionKey = mtnSubscriptionKey;
                                                payload.mtnTargetEnv = mtnTargetEnv;
                                            }
                                            const res = await api.patch('/api/tenants/me/payment-provider', payload);
                                            if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Erreur'); }
                                            setProviderConfigured(true);
                                            addToast('Configuration enregistrée', 'success');
                                        } catch (err: any) {
                                            addToast(err.message || 'Erreur', 'error');
                                        } finally {
                                            setSavingPayment(false);
                                        }
                                    }}
                                    disabled={savingPayment}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                                >
                                    {savingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Enregistrer
                                </Button>
                                <Button
                                    onClick={async () => {
                                        setTestingPayment(true);
                                        setPaymentTestStatus(null);
                                        try {
                                            const res = await api.post('/api/payment/test-connection', {});
                                            const data = await res.json();
                                            setPaymentTestStatus(data.success ? 'success' : 'failed');
                                            if (!data.success) addToast(data.message || 'Test échoué', 'error');
                                        } catch {
                                            setPaymentTestStatus('failed');
                                            addToast('Erreur lors du test', 'error');
                                        } finally {
                                            setTestingPayment(false);
                                        }
                                    }}
                                    disabled={testingPayment || !providerConfigured}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    {testingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                                    Tester
                                </Button>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">Compte marchand requis</p>
                                    <p className="mt-1">
                                        {paymentProvider === 'CAMPAY' && <>Créez un compte sur <a href="https://campay.net" target="_blank" rel="noopener noreferrer" className="underline">campay.net</a></>}
                                        {paymentProvider === 'ORANGE_MONEY' && <>Inscrivez-vous sur Orange Developer Portal (nécessite KYC)</>}
                                        {paymentProvider === 'MTN_MOMO' && <>Créez un compte sur <a href="https://momodeveloper.mtn.com" target="_blank" rel="noopener noreferrer" className="underline">momodeveloper.mtn.com</a></>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ),
                },
            ]} defaultTab={getInitialTab()} />
        </div>
    );
}
