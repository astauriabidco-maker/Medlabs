import * as React from 'react';
import { Users, Shield, Plus, Edit2, Trash2, Search, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui-basic';
import { useToast, DataTable, Badge, Modal } from '@/components/ui-dashboard';

interface Permission {
    key: string;
    label: string;
    labelFr: string;
    description: string;
    category: string;
}

interface Role {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    isSystem: boolean;
    _count: { users: number };
}

interface TeamUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
    customRole: { id: string; name: string; permissions: string[] } | null;
    lastLoginAt: string | null;
}

export function Team() {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = React.useState<'users' | 'roles'>('users');

    // Data
    const [users, setUsers] = React.useState<TeamUser[]>([]);
    const [roles, setRoles] = React.useState<Role[]>([]);
    const [permissions, setPermissions] = React.useState<Permission[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Modals
    const [userModalOpen, setUserModalOpen] = React.useState(false);
    const [roleModalOpen, setRoleModalOpen] = React.useState(false);
    const [editingRole, setEditingRole] = React.useState<Role | null>(null);

    // Forms
    const [userForm, setUserForm] = React.useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        customRoleId: '',
    });

    const [roleForm, setRoleForm] = React.useState({
        name: '',
        description: '',
        permissions: [] as string[],
    });

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, permsRes] = await Promise.all([
                api.get('/api/team/users'),
                api.get('/api/team/roles'),
                api.get('/api/team/permissions'),
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (rolesRes.ok) setRoles(await rolesRes.json());
            if (permsRes.ok) setPermissions(await permsRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    // ==================== USERS ====================

    const handleCreateUser = async () => {
        try {
            const res = await api.post('/api/team/users', userForm);
            if (!res.ok) throw new Error('Failed');

            addToast('Utilisateur créé avec succès', 'success');
            setUserModalOpen(false);
            setUserForm({ email: '', password: '', firstName: '', lastName: '', customRoleId: '' });
            fetchData();
        } catch (err) {
            addToast('Erreur lors de la création', 'error');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Supprimer cet utilisateur ?')) return;
        try {
            const res = await api.delete(`/api/team/users/${id}`);
            if (res.ok) {
                addToast('Utilisateur supprimé', 'success');
                fetchData();
            }
        } catch (err) {
            addToast('Erreur', 'error');
        }
    };

    // ==================== ROLES ====================

    const openRoleModal = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            setRoleForm({
                name: role.name,
                description: role.description || '',
                permissions: role.permissions,
            });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', description: '', permissions: [] });
        }
        setRoleModalOpen(true);
    };

    const handleSaveRole = async () => {
        try {
            const res = editingRole
                ? await api.put(`/api/team/roles/${editingRole.id}`, roleForm)
                : await api.post('/api/team/roles', roleForm);

            if (!res.ok) throw new Error('Failed');

            addToast(editingRole ? 'Rôle modifié' : 'Rôle créé', 'success');
            setRoleModalOpen(false);
            fetchData();
        } catch (err) {
            addToast('Erreur lors de la sauvegarde', 'error');
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm('Supprimer ce rôle ?')) return;
        try {
            const res = await api.delete(`/api/team/roles/${id}`);
            if (res.ok) {
                addToast('Rôle supprimé', 'success');
                fetchData();
            }
        } catch (err) {
            addToast('Erreur', 'error');
        }
    };

    const togglePermission = (key: string) => {
        setRoleForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(key)
                ? prev.permissions.filter(p => p !== key)
                : [...prev.permissions, key],
        }));
    };

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const categoryLabels: Record<string, string> = {
        documents: 'Documents',
        appointments: 'Rendez-vous',
        analytics: 'Statistiques',
        finance: 'Finance',
        admin: 'Administration',
    };

    // ==================== RENDER ====================

    const userColumns = [
        {
            header: 'Utilisateur',
            key: 'email',
            render: (row: TeamUser) => (
                <div>
                    <div className="font-medium text-slate-900">
                        {row.firstName} {row.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{row.email}</div>
                </div>
            ),
        },
        {
            header: 'Rôle',
            key: 'role',
            render: (row: TeamUser) => (
                <Badge variant="secondary">
                    {row.customRole?.name || 'Non assigné'}
                </Badge>
            ),
        },
        {
            header: 'Statut',
            key: 'status',
            render: (row: TeamUser) => (
                <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'danger' : 'warning'}>
                    {row.status}
                </Badge>
            ),
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (row: TeamUser) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleDeleteUser(row.id)}
                        className="text-red-600 hover:text-red-700"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Gestion d'Équipe</h1>
                <p className="text-slate-500">Gérez les membres de votre équipe et leurs permissions</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Utilisateurs
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'roles'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Shield className="w-4 h-4" />
                    Rôles & Permissions
                </button>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="font-semibold">Membres de l'équipe</h2>
                        <Button size="sm" onClick={() => setUserModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Ajouter un membre
                        </Button>
                    </div>
                    <DataTable data={users} columns={userColumns} />
                </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold">Rôles disponibles</h2>
                        <Button size="sm" onClick={() => openRoleModal()}>
                            <Plus className="w-4 h-4 mr-1" />
                            Créer un rôle
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className="bg-white rounded-xl border shadow-sm p-4 space-y-3"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{role.name}</h3>
                                        {role.description && (
                                            <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                                        )}
                                    </div>
                                    {role.isSystem && (
                                        <Badge variant="secondary">Système</Badge>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {role.permissions.slice(0, 4).map((perm) => (
                                        <span
                                            key={perm}
                                            className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                                        >
                                            {perm}
                                        </span>
                                    ))}
                                    {role.permissions.length > 4 && (
                                        <span className="text-xs text-slate-400">
                                            +{role.permissions.length - 4}
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-xs text-slate-500">
                                        {role._count.users} utilisateur(s)
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openRoleModal(role)}
                                            className="text-slate-600 hover:text-slate-700"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {!role.isSystem && (
                                            <button
                                                onClick={() => handleDeleteRole(role.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* User Modal */}
            <Modal
                open={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                title="Ajouter un membre"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Prénom</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2"
                                value={userForm.firstName}
                                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nom</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2"
                                value={userForm.lastName}
                                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Mot de passe temporaire</label>
                        <input
                            type="password"
                            className="w-full border rounded-lg px-3 py-2"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Rôle</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={userForm.customRoleId}
                            onChange={(e) => setUserForm({ ...userForm, customRoleId: e.target.value })}
                        >
                            <option value="">Sélectionner un rôle</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="ghost" onClick={() => setUserModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreateUser}>Créer</Button>
                    </div>
                </div>
            </Modal>

            {/* Role Modal */}
            <Modal
                open={roleModalOpen}
                onClose={() => setRoleModalOpen(false)}
                title={editingRole ? 'Modifier le rôle' : 'Créer un rôle'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nom du rôle</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={roleForm.name}
                            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                            disabled={editingRole?.isSystem}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={roleForm.description}
                            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Permissions</label>
                        <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-3">
                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                <div key={category}>
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                        {categoryLabels[category] || category}
                                    </h4>
                                    <div className="space-y-2">
                                        {perms.map((perm) => (
                                            <label
                                                key={perm.key}
                                                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded"
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${roleForm.permissions.includes(perm.key)
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'border-slate-300'
                                                        }`}
                                                    onClick={() => togglePermission(perm.key)}
                                                >
                                                    {roleForm.permissions.includes(perm.key) && (
                                                        <Check className="w-3 h-3" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{perm.labelFr}</div>
                                                    <div className="text-xs text-slate-500">{perm.description}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="ghost" onClick={() => setRoleModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSaveRole}>
                            {editingRole ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
