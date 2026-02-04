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
    VIEW_BUSINESS_REPORTS: 'VIEW_BUSINESS_REPORTS',

    // Finance
    MANAGE_FINANCE: 'MANAGE_FINANCE',

    // Administration
    MANAGE_SETTINGS: 'MANAGE_SETTINGS',
    MANAGE_TEAM: 'MANAGE_TEAM',
    CONFIGURE_MODULES: 'CONFIGURE_MODULES',

    // Operations
    SUPERVISE_TEAM: 'SUPERVISE_TEAM',
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
    category: 'documents' | 'appointments' | 'analytics' | 'finance' | 'admin' | 'operations';
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
    VIEW_BUSINESS_REPORTS: {
        label: 'View Business Reports',
        labelFr: 'Voir les rapports business',
        description: 'Can access financial and prescriber reports',
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
    CONFIGURE_MODULES: {
        label: 'Configure Modules',
        labelFr: 'Configurer les modules',
        description: 'Can configure API integration, Auto-Sync, and technical modules',
        category: 'admin',
    },
    SUPERVISE_TEAM: {
        label: 'Supervise Team',
        labelFr: 'Superviser l\'équipe',
        description: 'Can view team activity and supervise daily operations',
        category: 'operations',
    },
    HANDLE_ALERTS: {
        label: 'Handle Critical Alerts',
        labelFr: 'Gérer les alertes critiques',
        description: 'Can configure and respond to critical value alerts',
        category: 'operations',
    },
};

/**
 * Default permissions for roles (based on UserRole enum)
 */
export const ROLE_PERMISSIONS: Record<string, PermissionValue[]> = {
    // === PLATFORM ROLES (tenantId = null) ===

    // Platform owner - all permissions
    SUPER_ADMIN: Object.values(PERMISSIONS),

    // Platform manager - tenants, users, alerts management
    PLATFORM_MANAGER: [
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.VIEW_STATS,
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.HANDLE_ALERTS,
        PERMISSIONS.SUPERVISE_TEAM,
    ],

    // Platform support - read access, logs, help tenants
    PLATFORM_SUPPORT: [
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.VIEW_STATS,
        PERMISSIONS.HANDLE_ALERTS,
    ],

    // Platform sales - pricing, subscriptions, commercial
    PLATFORM_SALES: [
        PERMISSIONS.VIEW_STATS,
        PERMISSIONS.VIEW_BUSINESS_REPORTS,
        PERMISSIONS.MANAGE_FINANCE,
    ],

    // Platform accountant - financial dashboard, payments
    PLATFORM_ACCOUNTANT: [
        PERMISSIONS.VIEW_STATS,
        PERMISSIONS.VIEW_BUSINESS_REPORTS,
        PERMISSIONS.MANAGE_FINANCE,
    ],

    // === TENANT ROLES (tenantId = labId) ===

    // Technical admin - full tenant access including module configuration
    LAB_ADMIN: Object.values(PERMISSIONS),

    // Business/Commercial - analytics, finance, reports (no technical config)
    BUSINESS_MANAGER: [
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.VIEW_STATS,
        PERMISSIONS.VIEW_BUSINESS_REPORTS,
        PERMISSIONS.MANAGE_FINANCE,
    ],

    // Operations supervisor - daily operations, appointments, alerts
    MANAGER: [
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.MANAGE_APPOINTMENTS,
        PERMISSIONS.HANDLE_ALERTS,
        PERMISSIONS.SUPERVISE_TEAM,
    ],

    // Lab technician - upload results, view history, handle alerts
    TECHNICIAN: [
        PERMISSIONS.UPLOAD_SCAN,
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.HANDLE_ALERTS,
    ],

    // Front desk - read-only, manage appointments
    RECEPTIONIST: [
        PERMISSIONS.VIEW_RESULTS,
        PERMISSIONS.MANAGE_APPOINTMENTS,
    ],
};

// Backwards compatibility alias
export const LEGACY_ROLE_PERMISSIONS = ROLE_PERMISSIONS;

/**
 * Get all permission values as array
 */
export function getAllPermissions(): PermissionValue[] {
    return Object.values(PERMISSIONS);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: PermissionValue): boolean {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return false;
    return rolePerms.includes(permission);
}
