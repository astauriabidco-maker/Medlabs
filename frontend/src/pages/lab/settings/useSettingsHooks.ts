/**
 * Shared types and hooks for Settings components
 */

import * as React from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui-dashboard';

// Types
export interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsed: string | null;
}

export interface Module {
    id: string;
    name: string;
    description: string;
    active: boolean;
}

export interface SmtpSettings {
    host: string;
    port: number;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
    secure: boolean;
    exists: boolean;
    testStatus: 'success' | 'failed' | null;
}

export interface IntegrationSettings {
    exists: boolean;
    provider: 'TWILIO' | 'META' | 'ORANGE';
    accountId: string;
    authToken: string;
    phoneNumber: string;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    isActive: boolean;
    lastTestedAt: Date | null;
    testStatus: string | null;
}

// Hook for tenant settings
export function useTenantSettings() {
    const { addToast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [tenant, setTenant] = React.useState<{
        name: string;
        address: string;
        configuredRetentionDays: number;
        maxRetentionDays: number;
        brandColor: string;
        brandLogoUrl: string | null;
        slug: string;
        prescribers: string[];
        campayUsername?: string;
        whatsappPhoneNumberId?: string;
        whatsappBusinessAccountId?: string;
    }>({
        name: '',
        address: '',
        configuredRetentionDays: 30,
        maxRetentionDays: 30,
        brandColor: '#3B82F6',
        brandLogoUrl: null,
        slug: '',
        prescribers: [],
    });

    React.useEffect(() => {
        fetch('/api/tenants/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                setTenant({
                    name: data.name || '',
                    address: data.address || '',
                    configuredRetentionDays: data.configuredRetentionDays || 30,
                    maxRetentionDays: data.maxRetentionDays || 30,
                    brandColor: data.brandColor || '#3B82F6',
                    brandLogoUrl: data.brandLogoUrl || null,
                    slug: data.slug || '',
                    prescribers: data.prescribers || [],
                    campayUsername: data.campayUsername,
                    whatsappPhoneNumberId: data.whatsappPhoneNumberId,
                    whatsappBusinessAccountId: data.whatsappBusinessAccountId,
                });
            })
            .catch(err => console.error('Failed to load tenant:', err))
            .finally(() => setLoading(false));
    }, []);

    const updateTenant = (updates: Partial<typeof tenant>) => {
        setTenant(prev => ({ ...prev, ...updates }));
    };

    const saveTenant = async (data: Partial<typeof tenant>) => {
        try {
            const res = await fetch('/api/tenants/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to save');
            addToast('Paramètres enregistrés', 'success');
            return true;
        } catch {
            addToast('Erreur lors de l\'enregistrement', 'error');
            return false;
        }
    };

    return { tenant, updateTenant, saveTenant, loading };
}

// Hook for modules
export function useModules() {
    const { addToast } = useToast();
    const [modules, setModules] = React.useState<Module[]>([]);
    const [syncApiKey, setSyncApiKey] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        Promise.all([
            api.get('/api/tenants/me/modules').then(r => r.json()),
            api.get('/api/tenants/me/sync-key').then(r => r.json()),
        ])
            .then(([modulesData, syncData]) => {
                if (modulesData.availableModules) setModules(modulesData.availableModules);
                if (modulesData.syncApiKey || syncData.syncApiKey) {
                    setSyncApiKey(modulesData.syncApiKey || syncData.syncApiKey);
                }
            })
            .catch(err => console.error('Failed to load modules:', err))
            .finally(() => setLoading(false));
    }, []);

    const generateSyncKey = async () => {
        try {
            const res = await api.post('/api/tenants/me/sync-key', {});
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSyncApiKey(data.syncApiKey);
            addToast('Clé générée avec succès', 'success');
            return data.syncApiKey;
        } catch (err: any) {
            addToast(err.message || 'Erreur', 'error');
            return null;
        }
    };

    const revokeSyncKey = async () => {
        try {
            const res = await api.delete('/api/tenants/me/sync-key', {});
            if (!res.ok) throw new Error('Failed');
            setSyncApiKey(null);
            addToast('Clé révoquée', 'success');
            return true;
        } catch {
            addToast('Erreur lors de la révocation', 'error');
            return false;
        }
    };

    const activateLicense = async (code: string) => {
        try {
            const res = await api.post('/api/tenants/me/license', { code });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            if (data.syncApiKey) setSyncApiKey(data.syncApiKey);

            // Refresh modules
            const modulesRes = await api.get('/api/tenants/me/modules');
            const modulesData = await modulesRes.json();
            if (modulesData.availableModules) setModules(modulesData.availableModules);

            addToast(data.message || 'Licence activée', 'success');
            return true;
        } catch (err: any) {
            addToast(err.message || 'Échec activation', 'error');
            return false;
        }
    };

    return { modules, syncApiKey, loading, generateSyncKey, revokeSyncKey, activateLicense };
}

// Hook for integrations (SMS/WhatsApp)
export function useIntegrations() {
    const { addToast } = useToast();
    const [integration, setIntegration] = React.useState<IntegrationSettings>({
        exists: false,
        provider: 'TWILIO',
        accountId: '',
        authToken: '',
        phoneNumber: '',
        smsEnabled: true,
        whatsappEnabled: false,
        isActive: true,
        lastTestedAt: null,
        testStatus: null,
    });
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [testing, setTesting] = React.useState(false);

    React.useEffect(() => {
        api.get('/api/integrations')
            .then(res => res.json())
            .then(data => {
                if (data.exists) {
                    setIntegration({
                        exists: true,
                        provider: data.provider || 'TWILIO',
                        accountId: data.accountId || '',
                        authToken: '',
                        phoneNumber: data.phoneNumber || '',
                        smsEnabled: data.smsEnabled ?? true,
                        whatsappEnabled: data.whatsappEnabled ?? false,
                        isActive: data.isActive ?? true,
                        lastTestedAt: data.lastTestedAt,
                        testStatus: data.testStatus,
                    });
                }
            })
            .catch(err => console.error('Failed to load integrations:', err))
            .finally(() => setLoading(false));
    }, []);

    const saveIntegration = async () => {
        setSaving(true);
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
            if (!res.ok) throw new Error('Failed');
            addToast('Configuration enregistrée', 'success');
            setIntegration(prev => ({ ...prev, exists: true, authToken: '' }));
            return true;
        } catch {
            addToast('Erreur', 'error');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        setTesting(true);
        try {
            const res = await api.post('/api/integrations/test', {});
            const data = await res.json();
            setIntegration(prev => ({
                ...prev,
                lastTestedAt: new Date(),
                testStatus: data.success ? 'success' : 'failed',
            }));
            addToast(data.success ? 'Test réussi' : 'Test échoué', data.success ? 'success' : 'error');
            return data.success;
        } catch {
            addToast('Erreur lors du test', 'error');
            return false;
        } finally {
            setTesting(false);
        }
    };

    return { integration, setIntegration, loading, saving, testing, saveIntegration, testConnection };
}
