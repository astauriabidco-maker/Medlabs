/**
 * General Settings Tab - Lab info, branding, retention, prescribers
 */
import * as React from 'react';
import { Button, Input, Label } from '@/components/ui-basic';
import { useToast } from '@/components/ui-dashboard';
import { useTranslation } from 'react-i18next';
import {
    Key, AlertTriangle, Upload, CheckCircle, Loader2, Palette, Stethoscope, Trash2
} from 'lucide-react';
import { useTenantSettings } from './useSettingsHooks';

export function GeneralSettings() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const { tenant, updateTenant, saveTenant, loading } = useTenantSettings();

    // Local state for form
    const [newPrescriber, setNewPrescriber] = React.useState('');
    const [uploadingLogo, setUploadingLogo] = React.useState(false);
    const [savingBranding, setSavingBranding] = React.useState(false);

    const handleSaveSettings = async () => {
        if (tenant.configuredRetentionDays > tenant.maxRetentionDays) {
            addToast(t('settings.general.retention.limitError', { days: tenant.maxRetentionDays }), 'error');
            return;
        }
        if (tenant.configuredRetentionDays < 7) {
            addToast(t('settings.general.retention.minError'), 'error');
            return;
        }
        await saveTenant({
            name: tenant.name,
            address: tenant.address,
            configuredRetentionDays: tenant.configuredRetentionDays,
            prescribers: tenant.prescribers,
        });
    };

    const handleSaveBranding = async () => {
        setSavingBranding(true);
        try {
            const res = await fetch('/api/tenants/me/branding', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    brandColor: tenant.brandColor,
                    slug: tenant.slug,
                }),
            });
            if (!res.ok) throw new Error('Failed');
            addToast('Branding enregistré', 'success');
        } catch {
            addToast('Erreur', 'error');
        } finally {
            setSavingBranding(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.match(/image\/(png|jpeg|jpg|gif|webp)/)) {
            addToast('Format non supporté', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            addToast('Fichier trop volumineux (max 2 Mo)', 'error');
            return;
        }

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const res = await fetch('/api/tenants/me/logo', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData,
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            updateTenant({ brandLogoUrl: data.logoUrl });
            addToast('Logo uploadé', 'success');
        } catch {
            addToast('Erreur upload', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    const addPrescriber = () => {
        if (newPrescriber.trim()) {
            updateTenant({ prescribers: [...tenant.prescribers, newPrescriber.trim()] });
            setNewPrescriber('');
        }
    };

    const removePrescriber = (idx: number) => {
        updateTenant({ prescribers: tenant.prescribers.filter((_, i) => i !== idx) });
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-xl">
            {/* Lab Info */}
            <div>
                <label className="block text-sm font-medium mb-1">{t('settings.general.name')}</label>
                <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    value={tenant.name}
                    onChange={(e) => updateTenant({ name: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">{t('settings.general.address')}</label>
                <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                    value={tenant.address}
                    onChange={(e) => updateTenant({ address: e.target.value })}
                />
            </div>

            {/* Sender ID */}
            <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                    {t('settings.general.senderId')}
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                </label>
                <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-muted-foreground font-mono"
                    value="MEDLAB"
                    disabled
                />
                <p className="text-xs text-muted-foreground mt-1.5 bg-amber-50 border border-amber-100 p-2 rounded-md flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{t('settings.general.senderIdHint')}</span>
                </p>
            </div>

            {/* Retention */}
            <div className="pt-4 border-t">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-blue-600" />
                    {t('settings.general.retention.title')}
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">{t('settings.general.retention.policyDesc')}</p>
                </div>
                <label className="block text-sm font-medium mb-2">{t('settings.general.retention.label')}</label>
                <input
                    type="range"
                    min={7}
                    max={tenant.maxRetentionDays}
                    value={tenant.configuredRetentionDays}
                    onChange={(e) => updateTenant({ configuredRetentionDays: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('settings.general.retention.min')}</span>
                    <span className="text-lg font-bold text-blue-600">{tenant.configuredRetentionDays} jours</span>
                    <span>{t('settings.general.retention.max', { days: tenant.maxRetentionDays })}</span>
                </div>
            </div>

            {/* Branding */}
            <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-600" />
                    Marque Blanche
                </h3>
                <div className="bg-white border rounded-lg p-6 space-y-4">
                    <div>
                        <Label>Couleur principale</Label>
                        <div className="flex items-center gap-3 mt-2">
                            <input
                                type="color"
                                value={tenant.brandColor}
                                onChange={(e) => updateTenant({ brandColor: e.target.value })}
                                className="w-12 h-12 rounded-lg border cursor-pointer"
                            />
                            <Input
                                value={tenant.brandColor}
                                onChange={(e) => updateTenant({ brandColor: e.target.value })}
                                className="w-32 font-mono"
                            />
                        </div>
                    </div>

                    {/* Logo */}
                    <div>
                        <Label>Logo du laboratoire</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center mt-2">
                            {tenant.brandLogoUrl ? (
                                <div className="space-y-2">
                                    <img src={tenant.brandLogoUrl} alt="Logo" className="max-h-20 mx-auto" />
                                    <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> Logo configuré
                                    </p>
                                </div>
                            ) : (
                                <label className="cursor-pointer">
                                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm">{uploadingLogo ? 'Upload en cours...' : 'Cliquer pour uploader'}</p>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Slug */}
                    <div>
                        <Label>Identifiant URL (slug)</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-muted-foreground">medlab.cm/</span>
                            <Input
                                value={tenant.slug}
                                onChange={(e) => updateTenant({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                placeholder="mon-labo"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
                <Button onClick={handleSaveBranding} className="mt-4" disabled={savingBranding}>
                    {savingBranding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enregistrer le branding
                </Button>
            </div>

            {/* Prescribers */}
            <div className="bg-white border rounded-lg p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-purple-500" />
                    Médecins Prescripteurs
                </h3>
                <div className="flex gap-2 mb-4">
                    <Input
                        value={newPrescriber}
                        onChange={(e) => setNewPrescriber(e.target.value)}
                        placeholder="Dr. Dupont"
                        onKeyDown={(e) => e.key === 'Enter' && addPrescriber()}
                    />
                    <Button onClick={addPrescriber} variant="outline">Ajouter</Button>
                </div>
                <div className="space-y-2">
                    {tenant.prescribers.map((name, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span>{name}</span>
                            <button onClick={() => removePrescriber(idx)} className="text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
                <Button onClick={handleSaveSettings}>
                    {t('common.save')}
                </Button>
            </div>
        </div>
    );
}
