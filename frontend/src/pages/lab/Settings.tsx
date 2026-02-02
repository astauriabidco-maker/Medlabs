import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Input, Label } from '@/components/ui-basic';
import { Tabs, Modal, ProgressBar, useToast } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Key, Copy, Trash2, AlertTriangle, Upload, MessageSquare, Phone, CheckCircle, XCircle, Loader2, Eye, EyeOff, Shield, Archive, Palette, Wallet, Smartphone, Mail, Stethoscope } from 'lucide-react';
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

    // Prescripteurs (Médecins Prescripteurs pour BI)
    const [prescribers, setPrescribers] = React.useState<string[]>([]);
    const [newPrescriber, setNewPrescriber] = React.useState('');

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
                    setProviderConfigured(true);
                }
                // WhatsApp Business API
                if (data.whatsappPhoneNumberId) {
                    setWhatsappPhoneNumberId(data.whatsappPhoneNumberId);
                    setWhatsappConfigured(true);
                }
                if (data.whatsappBusinessAccountId) {
                    setWhatsappBusinessAccountId(data.whatsappBusinessAccountId);
                }
                // Prescripteurs
                if (data.prescribers && Array.isArray(data.prescribers)) {
                    setPrescribers(data.prescribers);
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
                    configuredRetentionDays: configuredRetentionDays,
                    prescribers: prescribers
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

    // SMTP Email Configuration State
    const [smtp, setSmtp] = React.useState({
        host: '',
        port: 587,
        user: '',
        password: '',
        fromName: '',
        fromEmail: '',
        secure: false, // TLS/SSL
        exists: false,
        testStatus: null as 'success' | 'failed' | null,
    });
    const [savingSmtp, setSavingSmtp] = React.useState(false);
    const [testingSmtp, setTestingSmtp] = React.useState(false);
    const [testEmailAddress, setTestEmailAddress] = React.useState('');


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

                            {/* Separator */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-purple-600" />
                                    Marque Blanche
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">Personnalisez l'apparence de vos pages patient</p>
                            </div>

                            {/* Color Picker */}
                            <div className="bg-white border rounded-lg p-6 space-y-4">
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

                            {/* Section Médecins Prescripteurs */}
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-medium mb-4 flex items-center gap-2">
                                    <Stethoscope className="w-5 h-5 text-purple-500" />
                                    Médecins Prescripteurs
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Configurez la liste des médecins prescripteurs qui peuvent être sélectionnés lors de l'upload des résultats.
                                </p>

                                {/* Formulaire d'ajout */}
                                <div className="flex gap-2 mb-4">
                                    <Input
                                        value={newPrescriber}
                                        onChange={(e) => setNewPrescriber(e.target.value)}
                                        placeholder="Ex: Dr. Dupont, Dr. Martin"
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newPrescriber.trim()) {
                                                setPrescribers([...prescribers, newPrescriber.trim()]);
                                                setNewPrescriber('');
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={() => {
                                            if (newPrescriber.trim()) {
                                                setPrescribers([...prescribers, newPrescriber.trim()]);
                                                setNewPrescriber('');
                                            }
                                        }}
                                        variant="outline"
                                    >
                                        Ajouter
                                    </Button>
                                </div>

                                {/* Liste des prescripteurs */}
                                {prescribers.length > 0 ? (
                                    <div className="space-y-2">
                                        {prescribers.map((name, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                                <span className="text-sm">{name}</span>
                                                <button
                                                    onClick={() => setPrescribers(prescribers.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Aucun prescripteur configuré</p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button onClick={saveSettings}>
                                    {t('common.save')}
                                </Button>
                                <Button onClick={saveBranding} disabled={savingBranding} variant="outline">
                                    {savingBranding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Enregistrer l'apparence
                                </Button>
                            </div>
                        </div>
                    ),
                },
                {
                    id: 'integrations',
                    label: t('settings.tabs.integrations') || 'Intégrations',
                    content: (
                        <div className="space-y-6 max-w-xl">
                            {/* SMS Quota Section */}
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

                            {/* Separator */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="font-semibold text-lg mb-4">Configuration SMS/WhatsApp</h3>
                            </div>

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

                            {/* Dynamic Fields Based on Provider */}
                            {integration.provider === 'TWILIO' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Account SID</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.accountId}
                                            onChange={(e) => setIntegration({ ...integration, accountId: e.target.value })}
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Disponible dans la console Twilio</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Auth Token</label>
                                        <input
                                            type="password"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.authToken}
                                            onChange={(e) => setIntegration({ ...integration, authToken: e.target.value })}
                                            placeholder={integration.exists ? '••••••••••••••••' : 'Entrez votre Auth Token'}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Le token est chiffré avant stockage.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                            <Phone className="w-4 h-4" />
                                            Numéro d'envoi Twilio
                                        </label>
                                        <input
                                            type="tel"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={integration.phoneNumber}
                                            onChange={(e) => setIntegration({ ...integration, phoneNumber: e.target.value })}
                                            placeholder="+237612345678"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Même numéro pour SMS et WhatsApp. Le format sera adapté automatiquement.</p>
                                    </div>
                                </>
                            )}

                            {integration.provider === 'META' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone Number ID</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.accountId}
                                            onChange={(e) => setIntegration({ ...integration, accountId: e.target.value })}
                                            placeholder="123456789012345"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Disponible dans Meta Developer Console</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Access Token</label>
                                        <input
                                            type="password"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.authToken}
                                            onChange={(e) => setIntegration({ ...integration, authToken: e.target.value })}
                                            placeholder={integration.exists ? '••••••••••••••••' : 'Token d\'accès Meta'}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Le token est chiffré avant stockage.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Business Account ID (WABA)</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.phoneNumber}
                                            onChange={(e) => setIntegration({ ...integration, phoneNumber: e.target.value })}
                                            placeholder="WABA ID (ex: 1234567890123456)"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">ID du compte WhatsApp Business</p>
                                    </div>
                                </>
                            )}

                            {integration.provider === 'ORANGE' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">API Client ID</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.accountId}
                                            onChange={(e) => setIntegration({ ...integration, accountId: e.target.value })}
                                            placeholder="Client ID Orange API"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Disponible sur le portail développeur Orange</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">API Secret</label>
                                        <input
                                            type="password"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={integration.authToken}
                                            onChange={(e) => setIntegration({ ...integration, authToken: e.target.value })}
                                            placeholder={integration.exists ? '••••••••••••••••' : 'Secret API Orange'}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Le secret est chiffré avant stockage.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                            <Phone className="w-4 h-4" />
                                            Sender ID / Numéro d'envoi
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={integration.phoneNumber}
                                            onChange={(e) => setIntegration({ ...integration, phoneNumber: e.target.value })}
                                            placeholder="MEDLAB ou +237XXXXXXXXX"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Nom d'expéditeur ou numéro court</p>
                                    </div>
                                </>
                            )}

                            {/* Channel Toggles - Dynamic based on provider */}
                            <div className="border-t pt-4">
                                <p className="font-medium mb-3">{t('integrations.channels') || 'Canaux activés'}</p>
                                <div className="space-y-3">
                                    {/* SMS toggle - Available for Twilio and Orange */}
                                    {integration.provider !== 'META' ? (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={integration.smsEnabled}
                                                onChange={(e) => setIntegration({ ...integration, smsEnabled: e.target.checked })}
                                                className="w-4 h-4 accent-blue-600"
                                            />
                                            <span>SMS</span>
                                        </label>
                                    ) : (
                                        <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
                                            <input
                                                type="checkbox"
                                                checked={false}
                                                disabled
                                                className="w-4 h-4"
                                            />
                                            <span>SMS</span>
                                            <span className="text-xs text-muted-foreground">(Non disponible avec Meta)</span>
                                        </label>
                                    )}

                                    {/* WhatsApp toggle - Available for Twilio and Meta */}
                                    {integration.provider !== 'ORANGE' ? (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={integration.whatsappEnabled}
                                                onChange={(e) => setIntegration({ ...integration, whatsappEnabled: e.target.checked })}
                                                className="w-4 h-4 accent-green-600"
                                            />
                                            <span>WhatsApp</span>
                                        </label>
                                    ) : (
                                        <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
                                            <input
                                                type="checkbox"
                                                checked={false}
                                                disabled
                                                className="w-4 h-4"
                                            />
                                            <span>WhatsApp</span>
                                            <span className="text-xs text-muted-foreground">(Non disponible avec Orange)</span>
                                        </label>
                                    )}
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

                            {/* Separator - Email Configuration */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="font-semibold text-lg mb-4">Configuration Email (SMTP)</h3>
                            </div>

                            {/* SMTP Email Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Serveur SMTP</h3>
                                        <p className="text-sm text-muted-foreground">Configurez l'envoi d'emails pour les notifications</p>
                                    </div>
                                </div>
                            </div>

                            {/* SMTP Form Fields */}
                            <div className="space-y-4">
                                {/* SMTP Host */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Serveur SMTP</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2 font-mono"
                                            value={smtp.host}
                                            onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                                            placeholder="smtp.gmail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Port</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={smtp.port}
                                            onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) })}
                                        >
                                            <option value={587}>587 (TLS/STARTTLS)</option>
                                            <option value={465}>465 (SSL)</option>
                                            <option value={25}>25 (Non sécurisé)</option>
                                            <option value={2525}>2525 (Alternatif)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Username and Password */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Utilisateur / Email</label>
                                        <input
                                            type="email"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={smtp.user}
                                            onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                                            placeholder="noreply@votre-labo.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Mot de passe</label>
                                        <input
                                            type="password"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={smtp.password}
                                            onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                                            placeholder={smtp.exists ? '••••••••••••••••' : 'Mot de passe SMTP'}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Pour Gmail, utilisez un mot de passe d'application</p>
                                    </div>
                                </div>

                                {/* From Name and From Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom d'expéditeur</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={smtp.fromName}
                                            onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
                                            placeholder="Laboratoire MedLab"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email d'expédition</label>
                                        <input
                                            type="email"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={smtp.fromEmail}
                                            onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                                            placeholder="resultats@votre-labo.com"
                                        />
                                    </div>
                                </div>

                                {/* TLS Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">Connexion sécurisée (TLS/SSL)</p>
                                        <p className="text-sm text-muted-foreground">Recommandé pour les ports 587 et 465</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={smtp.secure}
                                            onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Test Status */}
                                {smtp.testStatus && (
                                    <div className={`flex items-center gap-2 p-3 rounded-lg ${smtp.testStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                        {smtp.testStatus === 'success' ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <XCircle className="w-5 h-5" />
                                        )}
                                        <span>
                                            {smtp.testStatus === 'success'
                                                ? 'Email de test envoyé avec succès'
                                                : 'Échec de l\'envoi du test'}
                                        </span>
                                    </div>
                                )}

                                {/* SMTP Action Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        onClick={async () => {
                                            setSavingSmtp(true);
                                            try {
                                                await api.put('/api/integrations/smtp', {
                                                    smtpHost: smtp.host,
                                                    smtpPort: smtp.port,
                                                    smtpUser: smtp.user,
                                                    smtpPassword: smtp.password,
                                                    smtpFromName: smtp.fromName,
                                                    smtpFromEmail: smtp.fromEmail,
                                                    smtpSecure: smtp.secure,
                                                });
                                                setSmtp(prev => ({ ...prev, exists: true }));
                                                addToast('Configuration SMTP enregistrée', 'success');
                                            } catch (err) {
                                                addToast('Erreur lors de l\'enregistrement', 'error');
                                            } finally {
                                                setSavingSmtp(false);
                                            }
                                        }}
                                        disabled={savingSmtp}
                                        className="flex-1"
                                    >
                                        {savingSmtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Enregistrer
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (!testEmailAddress) {
                                                addToast('Veuillez entrer une adresse email de test', 'error');
                                                return;
                                            }
                                            setTestingSmtp(true);
                                            try {
                                                const res = await api.post('/api/integrations/smtp/test', {
                                                    to: testEmailAddress,
                                                });
                                                const data = await res.json();
                                                setSmtp(prev => ({ ...prev, testStatus: data.success ? 'success' : 'failed' }));
                                                if (data.success) {
                                                    addToast('Email de test envoyé', 'success');
                                                } else {
                                                    addToast(data.message || 'Échec du test', 'error');
                                                }
                                            } catch (err) {
                                                setSmtp(prev => ({ ...prev, testStatus: 'failed' }));
                                                addToast('Erreur lors du test', 'error');
                                            } finally {
                                                setTestingSmtp(false);
                                            }
                                        }}
                                        disabled={testingSmtp || !smtp.host}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        {testingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        Tester
                                    </Button>
                                </div>

                                {/* Test Email Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        className="flex-1 border rounded-lg px-3 py-2"
                                        value={testEmailAddress}
                                        onChange={(e) => setTestEmailAddress(e.target.value)}
                                        placeholder="Adresse email pour le test..."
                                    />
                                </div>
                            </div>

                            {/* Separator */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="font-semibold text-lg mb-4">Paiements - Mobile Money</h3>
                            </div>

                            {/* Mobile Money Header */}
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

                            {/* Payment Provider Selection */}
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

                            {/* Payment Test Status */}
                            {paymentTestStatus && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${paymentTestStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {paymentTestStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    <span>{paymentTestStatus === 'success' ? 'Connexion réussie ✓' : 'Échec de la connexion'}</span>
                                </div>
                            )}

                            {/* Payment Action Buttons */}
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
                                    Enregistrer Paiements
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

                            {/* Payment Info Box */}
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
                {
                    id: 'api-docs',
                    label: 'Documentation API',
                    content: (
                        <div className="space-y-6 max-w-3xl">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">Pour connecter votre système d'information (LIS/SIL)</p>
                                    <p className="mt-1">
                                        Activez le module <strong>Auto-Sync Windows</strong> via l'onglet Modules et générez une clé API.
                                    </p>
                                </div>
                            </div>

                            {/* JSON Format */}
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    📄 Format JSON
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
      }
    ]
  }
}`}
                                </pre>
                            </div>

                            {/* HL7 Format */}
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    🔗 Format HL7 (ORU^R01)
                                </h3>
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                    {`{
  "format": "HL7",
  "data": "MSH|^~\\\\&|LIS|LABO|APP|MEDLAB|...\\r
PID|1||PAT001^^^LABO||Dupont^Jean||19850315|M|||...\\r
OBX|1|NM|GLU^Glycémie^L||1.05|g/L|0.70-1.10|N|||F"
}`}
                                </pre>
                                <p className="text-sm text-muted-foreground mt-3">
                                    Segments supportés: MSH, PID, OBX. Le message HL7 doit être échappé en JSON.
                                </p>
                            </div>

                            {/* Response */}
                            <div className="bg-white border rounded-lg p-6">
                                <h3 className="font-semibold mb-3">Réponse attendue</h3>
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                    {`{
  "status": "success",
  "documentId": "uuid-du-document",
  "message": "Document created and notification sent"
}`}
                                </pre>
                            </div>

                            {/* Endpoint Info */}
                            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Endpoint</span>
                                    <code className="text-sm bg-white px-2 py-1 rounded border">/api/connect/ingest</code>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Méthode</span>
                                    <span className="text-sm font-mono">POST</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Authentification</span>
                                    <code className="text-sm bg-white px-2 py-1 rounded border">X-API-Key: votre_clé</code>
                                </div>
                            </div>
                        </div>
                    ),
                },
            ]} defaultTab={getInitialTab()} />
        </div>
    );
}
