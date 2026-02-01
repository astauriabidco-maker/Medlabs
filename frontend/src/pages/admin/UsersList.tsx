
import * as React from 'react';
import { Search, Shield, AlertTriangle, Key, Ban, Edit2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui-basic';
import { useToast, DataTable, Badge, Modal } from '@/components/ui-dashboard';
import { useTranslation } from 'react-i18next';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    tenant?: { name: string };
    lastLoginAt: string;
}

export function UsersList() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = React.useState<'STAFF' | 'GLOBAL'>('GLOBAL');
    const [users, setUsers] = React.useState<User[]>([]);
    const [search, setSearch] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [createModalOpen, setCreateModalOpen] = React.useState(false);
    const [editModalOpen, setEditModalOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [formData, setFormData] = React.useState({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/users?search=${search}`);
            if (res.ok) {
                const data = await res.json();
                if (activeTab === 'STAFF') {
                    setUsers(data.filter((u: User) => u.role === 'SUPER_ADMIN'));
                } else {
                    setUsers(data.filter((u: User) => u.role !== 'SUPER_ADMIN'));
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async () => {
        try {
            const payload = {
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                role: 'SUPER_ADMIN',
                // tenantId is null/undefined for Super Admin
            };

            const res = await api.post('/api/users', payload);
            if (!res.ok) throw new Error('Failed to create user');

            addToast(t('users.toasts.created'), 'success');
            setCreateModalOpen(false);
            setFormData({ email: '', firstName: '', lastName: '', password: '' });
            fetchUsers();
        } catch (error) {
            addToast(t('users.toasts.failed'), 'error');
        }
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            password: '', // Not used in edit
        });
        setEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
            };

            const res = await api.patch(`/users/${selectedUser.id}`, payload);
            if (!res.ok) throw new Error('Failed to update user');

            addToast(t('users.toasts.updated'), 'success');
            setEditModalOpen(false);
            fetchUsers();
        } catch (error) {
            addToast(t('users.toasts.failed'), 'error');
        }
    };

    React.useEffect(() => {
        fetchUsers();
    }, [search, activeTab]);

    const handleForceSuspend = async (id: string) => {
        if (!confirm(t('users.toasts.emergency'))) return;
        try {
            const res = await api.patch(`/users/${id}`, { status: 'SUSPENDED' });
            if (res.ok) fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const columns = [
        {
            header: t('users.table.user'),
            key: 'email',
            render: (row: User) => (
                <div>
                    <div className="font-medium text-slate-900">{row.firstName} {row.lastName}</div>
                    <div className="text-xs text-slate-500">{row.email}</div>
                </div>
            )
        },
        {
            header: t('users.table.role'),
            key: 'role',
            render: (row: User) => <Badge variant={row.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>{row.role}</Badge>
        },
        {
            header: t('users.table.organization'),
            key: 'tenant',
            render: (row: User) => <span className="text-sm text-slate-600">{row.tenant?.name || 'Platform'}</span>
        },
        {
            header: t('users.table.status'),
            key: 'status',
            render: (row: User) => (
                <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'danger' : 'warning'}>
                    {t(`status.${row.status}`)}
                </Badge>
            )
        },
        {
            header: t('users.table.actions'),
            key: 'actions',
            render: (row: User) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEditClick(row)}
                        className="bg-slate-50 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200 flex items-center gap-1 hover:bg-slate-100"
                    >
                        <Edit2 className="w-3 h-3" /> {t('actions.edit')}
                    </button>
                    {row.status !== 'SUSPENDED' && (
                        <button
                            onClick={() => handleForceSuspend(row.id)}
                            className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-medium border border-red-100 flex items-center gap-1 hover:bg-red-100"
                        >
                            <Ban className="w-3 h-3" /> {t('actions.suspend')}
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('users.title')}</h1>
                <p className="text-slate-500">{t('users.subtitle')}</p>
            </div>

            <div className="flex border-b justify-between items-center">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('GLOBAL')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'GLOBAL' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {t('users.tabs.global')}
                    </button>
                    <button
                        onClick={() => setActiveTab('STAFF')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'STAFF' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {t('users.tabs.staff')}
                    </button>
                </div>
                {activeTab === 'STAFF' && (
                    <Button size="sm" onClick={() => setCreateModalOpen(true)} className="mb-1 mr-4">
                        + {t('users.addAdmin')}
                    </Button>
                )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === 'GLOBAL' ? t('users.searchPlaceholder') : t('users.searchStaff')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>
                </div>
                {activeTab === 'GLOBAL' && (
                    <div className="px-4 py-2 bg-yellow-50 text-yellow-800 text-xs flex items-center gap-2 border-b border-yellow-100">
                        <AlertTriangle className="w-3 h-3" />
                        {t('users.sensitiveWarn')}
                    </div>
                )}
                <DataTable
                    data={users}
                    columns={columns}
                />
            </div>

            <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title={t('users.modals.createAdminTitle')}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.modals.email')}</label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.modals.firstName')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.modals.lastName')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                    {/* Password is generated automatically by backend for now, or we can add field if we want manual set */}
                    <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs">
                        {t('users.modals.tempPassword')}
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>{t('actions.cancel')}</Button>
                        <Button onClick={handleCreateAdmin}>{t('actions.create')}</Button>
                    </div>
                </div>
            </Modal>

            <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title={t('users.modals.editUserTitle')}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.modals.firstName')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('users.modals.lastName')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="ghost" onClick={() => setEditModalOpen(false)}>{t('actions.cancel')}</Button>
                        <Button onClick={handleUpdateUser}>{t('actions.save')}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
