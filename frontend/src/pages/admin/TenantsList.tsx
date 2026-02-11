import * as React from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui-basic';
import { Badge, Modal, DataTable, StatCard, useToast } from '@/components/ui-dashboard';
import { ExportCSVButton } from '@/components/ExportCSV';
import { Plus, Users, Building2, MessageSquare, Edit2, Trash2, Crown, Sparkles, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    smsBalance: number;
    smsSenderId: string;
    createdAt: string;
    usersCount: number;
    niu?: string;
    rccm?: string;
    contactEmail?: string;
    maxRetentionDays?: number;
    plan: 'STARTER' | 'PREMIUM' | 'ENTERPRISE';
}

const PLAN_CONFIG = {
    STARTER: { label: 'Starter', color: 'bg-slate-100 text-slate-700', icon: Zap },
    PREMIUM: { label: 'Premium', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
    ENTERPRISE: { label: 'Enterprise', color: 'bg-amber-100 text-amber-700', icon: Crown },
};

export function TenantsList() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [tenants, setTenants] = React.useState<Tenant[]>([]);
    const [createModalOpen, setCreateModalOpen] = React.useState(false);
    const [editModalOpen, setEditModalOpen] = React.useState(false);
    const [configModalOpen, setConfigModalOpen] = React.useState(false);
    const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null);

    const [formData, setFormData] = React.useState({
        name: '',
        slug: '',
        niu: '',
        rccm: '',
        contactEmail: '',
        initialSmsQuota: 100,
        adminPassword: '',
        maxRetentionDays: 30,
        plan: 'STARTER' as 'STARTER' | 'PREMIUM' | 'ENTERPRISE',
    });

    const [configData, setConfigData] = React.useState({
        smsSenderId: '',
        smsTopup: 0,
    });

    const fetchTenants = async () => {
        try {
            const res = await api.get('/api/tenants');
            if (res.ok) {
                const data = await res.json();
                setTenants(data);
            }
        } catch (error) {
            console.error(error);
            addToast(t('errors.fetch_failed'), 'error');
        }
    };

    React.useEffect(() => {
        fetchTenants();
    }, []);

    const handleCreate = async () => {
        try {
            const payload = {
                name: formData.name,
                slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                niu: formData.niu,
                rccm: formData.rccm,
                contactEmail: formData.contactEmail,
                initialSmsQuota: formData.initialSmsQuota,
                adminEmail: formData.contactEmail,
                adminPassword: formData.adminPassword,
            };

            const res = await api.post('/api/tenants', payload);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create tenant');
            }

            addToast(t('tenants.modals.success_create', { name: formData.name }), 'success');
            setCreateModalOpen(false);
            setFormData({ name: '', slug: '', niu: '', rccm: '', contactEmail: '', initialSmsQuota: 100, adminPassword: '', maxRetentionDays: 30, plan: 'STARTER' });
            fetchTenants();
        } catch (error: any) {
            addToast(error.message, 'error');
        }
    };

    const handleEdit = async () => {
        if (!selectedTenant) return;
        try {
            const payload = {
                name: formData.name,
                slug: formData.slug,
                niu: formData.niu,
                rccm: formData.rccm,
                contactEmail: formData.contactEmail,
                maxRetentionDays: formData.maxRetentionDays,
                plan: formData.plan,
            };

            const res = await api.patch(`/tenants/${selectedTenant.id}`, payload);
            if (!res.ok) throw new Error('Failed to update tenant');

            addToast(t('tenants.modals.success_update'), 'success');
            setEditModalOpen(false);
            fetchTenants();
        } catch (error) {
            addToast(t('errors.update_failed'), 'error');
        }
    };

    const handleDelete = async (tenantId: string) => {
        if (!confirm(t('tenants.modals.confirm_suspend'))) return;
        try {
            const res = await api.delete(`/tenant/${tenantId}`);
            if (!res.ok) throw new Error('Failed to suspend tenant');
            addToast(t('tenants.modals.success_suspend'), 'success');
            fetchTenants();
        } catch (error) {
            addToast(t('errors.failed'), 'error');
        }
    };

    const openEdit = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setFormData({
            ...formData,
            name: tenant.name,
            slug: tenant.slug,
            niu: tenant.niu || '',
            rccm: tenant.rccm || '',
            contactEmail: tenant.contactEmail || '',
            maxRetentionDays: tenant.maxRetentionDays || 30,
            plan: tenant.plan || 'STARTER',
        });
        setEditModalOpen(true);
    };

    const handleOpenConfig = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setConfigData({
            smsSenderId: tenant.smsSenderId,
            smsTopup: 0,
        });
        setConfigModalOpen(true);
    };

    const handleSaveConfig = () => {
        if (!selectedTenant) return;

        const senderIdRegex = /^[a-zA-Z0-9]{3,11}$/;
        if (!senderIdRegex.test(configData.smsSenderId)) {
            addToast(t('errors.invalid_sender_id'), 'error');
            return;
        }

        // Mock update for now or implement API endpoint for update
        addToast(t('tenants.modals.success_config', { name: selectedTenant.name }), 'success');
        setConfigModalOpen(false);
    };

    const columns = [
        { key: 'name', header: t('tenants.table.name') },
        {
            key: 'smsSenderId',
            header: t('tenants.table.senderId'),
            render: (row: Tenant) => (
                <code className="text-xs font-mono bg-gray-100 px-1 rounded">{row.smsSenderId}</code>
            )
        },
        {
            key: 'isActive',
            header: t('common.status'),
            render: (row: Tenant) => (
                <Badge variant={row.isActive ? 'success' : 'danger'}>
                    {row.isActive ? t('common.active') : t('common.suspended')}
                </Badge>
            ),
        },
        {
            key: 'plan',
            header: 'Plan',
            render: (row: Tenant) => {
                const config = PLAN_CONFIG[row.plan] || PLAN_CONFIG.STARTER;
                const IconComponent = config.icon;
                return (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <IconComponent className="w-3 h-3" />
                        {config.label}
                    </div>
                );
            }
        },
        {
            key: 'smsBalance',
            header: t('tenants.table.balance'),
            render: (row: Tenant) => (
                <span className={row.smsBalance < 100 ? 'text-amber-600 font-medium' : ''}>
                    {row.smsBalance} {t('tenants.table.credits')}
                </span>
            ),
        },
        {
            key: 'usersCount',
            header: t('tenants.table.users'),
            render: (row: Tenant) => (
                <div className="flex items-center gap-1 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>{row.usersCount || 0}</span>
                </div>
            )
        },
        {
            key: 'id',
            header: '',
            render: (row: Tenant) => (
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" className="h-8 py-0 px-2" onClick={() => openEdit(row)} title={t('common.edit')}>
                        <Edit2 className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button variant="ghost" className="h-8 py-0 px-2" onClick={() => handleOpenConfig(row)}>
                        {t('tenants.modals.configTitle')}
                    </Button>
                    <Button variant="ghost" className="h-8 py-0 px-2" onClick={() => handleDelete(row.id)} title={t('common.delete')}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                </div>
            )
        }
    ];

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.isActive).length;
    const totalSmsBalance = tenants.reduce((sum, t) => sum + (t.smsBalance || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('tenants.title')}</h1>
                    <p className="text-muted-foreground">{t('tenants.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <ExportCSVButton
                        data={tenants}
                        columns={[
                            { key: 'name', label: t('tenants.table.name') },
                            { key: 'slug', label: 'Slug' },
                            { key: 'plan', label: 'Plan' },
                            { key: 'isActive', label: t('common.status'), format: (v) => v ? t('common.active') : t('common.suspended') },
                            { key: 'smsBalance', label: t('tenants.table.balance') },
                            { key: 'smsSenderId', label: t('tenants.table.senderId') },
                            { key: 'usersCount', label: t('tenants.table.users') },
                            { key: 'contactEmail', label: t('common.email') },
                            { key: 'createdAt', label: 'Date création', format: (v) => v ? new Date(v).toLocaleDateString('fr-FR') : '' },
                        ]}
                        filename="laboratoires"
                        label={t('common.export', 'Exporter CSV')}
                    />
                    <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('tenants.createButton')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title={t('tenants.stats.total')} value={totalTenants} icon={<Building2 className="w-8 h-8" />} />
                <StatCard title={t('tenants.stats.active')} value={activeTenants} icon={<Users className="w-8 h-8" />} />
                <StatCard title={t('tenants.stats.sms')} value={totalSmsBalance} icon={<MessageSquare className="w-8 h-8" />} />
            </div>

            <DataTable data={tenants} columns={columns} />

            <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title={t('tenants.modals.createTitle')}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.nameLabel')} *</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Laboratoire Mvolyé"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('common.slug')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="labo-mvolye"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('tenants.modals.niuLabel')}</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.niu}
                                onChange={(e) => setFormData({ ...formData, niu: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">RCCM</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2"
                                value={formData.rccm}
                                onChange={(e) => setFormData({ ...formData, rccm: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.emailLabel')} *</label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            placeholder="contact@labo.cm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t('tenants.modals.emailDesc')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.passwordLabel')} *</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 font-mono bg-gray-50"
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                            placeholder={t('tenants.modals.passwordPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.quotaLabel')}</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.initialSmsQuota}
                            onChange={(e) => setFormData({ ...formData, initialSmsQuota: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => setCreateModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300">
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleCreate} className="flex-1" disabled={!formData.name || !formData.contactEmail || !formData.adminPassword}>
                            {t('common.create')}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title={t('tenants.modals.editTitle')}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.nameLabel')}</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.slugLabel')}</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">NIU</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={formData.niu} onChange={e => setFormData({ ...formData, niu: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">RCCM</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={formData.rccm} onChange={e => setFormData({ ...formData, rccm: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.emailLabel')}</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <label className="block text-sm font-medium mb-1 text-amber-800">{t('tenants.modals.retentionLabel')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={7}
                                max={365}
                                className="w-24 border rounded-lg px-3 py-2"
                                value={formData.maxRetentionDays}
                                onChange={e => setFormData({ ...formData, maxRetentionDays: parseInt(e.target.value) || 30 })}
                            />
                            <span className="text-sm text-amber-700">{t('common.days')}</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1">{t('tenants.modals.retentionDesc')}</p>
                    </div>
                    {/* Plan Selector */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <label className="block text-sm font-medium mb-2 text-purple-800">Plan d'abonnement</label>
                        <div className="flex gap-2">
                            {(['STARTER', 'PREMIUM', 'ENTERPRISE'] as const).map(plan => {
                                const config = PLAN_CONFIG[plan];
                                const IconComponent = config.icon;
                                const isSelected = formData.plan === plan;
                                return (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, plan })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-purple-500 bg-purple-100'
                                            : 'border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                                        <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                                            {config.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => setEditModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800">{t('common.cancel')}</Button>
                        <Button onClick={handleEdit} className="flex-1">{t('common.save')}</Button>
                    </div>
                </div>
            </Modal>

            <Modal open={configModalOpen} onClose={() => setConfigModalOpen(false)} title={`${t('tenants.modals.configTitle')}: ${selectedTenant?.name}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.senderIdLabel')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 uppercase font-mono"
                            maxLength={11}
                            value={configData.smsSenderId}
                            onChange={(e) => setConfigData({ ...configData, smsSenderId: e.target.value.toUpperCase() })}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-amber-600">
                            {t('tenants.modals.senderIdWarning')}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('tenants.modals.creditsLabel')}</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={configData.smsTopup}
                            onChange={(e) => setConfigData({ ...configData, smsTopup: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('tenants.modals.currentBalance')}: {selectedTenant?.smsBalance} {t('tenants.table.credits')}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => setConfigModalOpen(false)} className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300">
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveConfig} className="flex-1">
                            {t('common.save')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
