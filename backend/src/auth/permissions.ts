/**
 * Permission Keys for Dynamic RBAC
 * 
 * These keys are stored in the Role.permissions array
 * and checked by the PermissionsGuard at runtime.
 */

export const PERMISSIONS = {
    // Document Management
    UPLOAD_SCAN: 'UPLOAD_SCAN',
    VIEW_RESULTS: 'VIEW_RESULTS',

    // Appointments
    MANAGE_APPOINTMENTS: 'MANAGE_APPOINTMENTS',

    // Analytics
    VIEW_STATS: 'VIEW_STATS',

    // Finance
    MANAGE_FINANCE: 'MANAGE_FINANCE',

    // Administration
    MANAGE_SETTINGS: 'MANAGE_SETTINGS',
    MANAGE_TEAM: 'MANAGE_TEAM',

    // Critical Values
    HANDLE_ALERTS: 'HANDLE_ALERTS',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];

/**
 * Permission metadata for UI display
 */
export const PERMISSION_METADATA: Record<PermissionValue, {
    label: string;
    labelFr: string;
    description: string;
    category: 'documents' | 'appointments' | 'analytics' | 'finance' | 'admin';
}> = {
    UPLOAD_SCAN: {
        label: 'Upload Documents',
        labelFr: 'Téléverser des résultats',
        description: 'Can upload and manage patient result documents',
        category: 'documents',
    },
    VIEW_RESULTS: {
        label: 'View Results History',
        labelFr: 'Voir l\'historique',
        description: 'Can view the document history and patient records',
        category: 'documents',
    },
    MANAGE_APPOINTMENTS: {
        label: 'Manage Appointments',
        labelFr: 'Gérer les rendez-vous',
        description: 'Can create, modify, and cancel appointments',
        category: 'appointments',
    },
    VIEW_STATS: {
        label: 'View Dashboard & Stats',
        labelFr: 'Voir les statistiques',
        description: 'Can access the Business Intelligence dashboard',
        category: 'analytics',
    },
    MANAGE_FINANCE: {
        label: 'Manage Payments',
        labelFr: 'Gérer les paiements',
        description: 'Can view and manage payment transactions',
        category: 'finance',
    },
    MANAGE_SETTINGS: {
        label: 'Manage Settings',
        labelFr: 'Gérer les paramètres',
        description: 'Can modify laboratory settings and branding',
        category: 'admin',
    },
    MANAGE_TEAM: {
        label: 'Manage Team',
        labelFr: 'Gérer l\'équipe',
        description: 'Can create users and manage roles',
        category: 'admin',
    },
    HANDLE_ALERTS: {
        label: 'Handle Critical Alerts',
        labelFr: 'Gérer les alertes critiques',
        description: 'Can configure and respond to critical value alerts',
        category: 'admin',
    },
};

/**
 * Default permissions for legacy roles (fallback)
 */
export const LEGACY_ROLE_PERMISSIONS: Record<string, PermissionValue[]> = {
    SUPER_ADMIN: Object.values(PERMISSIONS),
    LAB_ADMIN: Object.values(PERMISSIONS),
    TECHNICIAN: [
        PERMISSIONS.UPLOAD_SCAN,
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.MANAGE_APPOINTMENTS,
        PERMISSIONS.HANDLE_ALERTS,
    ],
    VIEWER: [
        PERMISSIONS.VIEW_RESULTS,
    ],
};

/**
 * Get all permission values as array
 */
export function getAllPermissions(): PermissionValue[] {
    return Object.values(PERMISSIONS);
}
