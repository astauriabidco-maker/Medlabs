import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Role limits per subscription plan
 * Controls how many users of each role can be created per tenant
 */
export const PLAN_ROLE_LIMITS: Record<string, Record<string, number>> = {
    STARTER: {
        LAB_ADMIN: 1,
        BUSINESS_MANAGER: 0,  // Not available
        MANAGER: 0,           // Not available
        TECHNICIAN: 2,
        RECEPTIONIST: 1,
    },
    PREMIUM: {
        LAB_ADMIN: 1,
        BUSINESS_MANAGER: 1,
        MANAGER: 1,
        TECHNICIAN: 5,
        RECEPTIONIST: 3,
    },
    ENTERPRISE: {
        LAB_ADMIN: -1,        // Unlimited (-1)
        BUSINESS_MANAGER: -1,
        MANAGER: -1,
        TECHNICIAN: -1,
        RECEPTIONIST: -1,
    },
};

/**
 * Role metadata for UI display
 */
export const ROLE_METADATA: Record<string, {
    label: string;
    labelFr: string;
    description: string;
    category: 'admin' | 'business' | 'operations';
    color: string;
}> = {
    LAB_ADMIN: {
        label: 'Lab Administrator',
        labelFr: 'Administrateur Labo',
        description: 'Full technical access, team management, module configuration',
        category: 'admin',
        color: 'red',
    },
    BUSINESS_MANAGER: {
        label: 'Business Manager',
        labelFr: 'Responsable Commercial',
        description: 'Analytics, finance, prescriber reports',
        category: 'business',
        color: 'purple',
    },
    MANAGER: {
        label: 'Operations Manager',
        labelFr: 'Manager Opérationnel',
        description: 'Daily operations, appointments, team supervision',
        category: 'operations',
        color: 'blue',
    },
    TECHNICIAN: {
        label: 'Lab Technician',
        labelFr: 'Technicien',
        description: 'Upload results, view history, handle alerts',
        category: 'operations',
        color: 'green',
    },
    RECEPTIONIST: {
        label: 'Receptionist',
        labelFr: 'Réceptionniste',
        description: 'Read-only access, manage appointments',
        category: 'operations',
        color: 'gray',
    },
};

export interface RoleQuota {
    role: string;
    limit: number;        // -1 = unlimited, 0 = not available
    used: number;
    remaining: number;    // -1 = unlimited
    available: boolean;   // Can create more users with this role
}

export interface TenantRoleQuotas {
    plan: string;
    quotas: RoleQuota[];
    totalUsers: number;
    maxUsers: number;     // -1 = unlimited
}

@Injectable()
export class RoleLimitsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get role quotas for a tenant based on their subscription plan
     */
    async getTenantRoleQuotas(tenantId: string): Promise<TenantRoleQuotas> {
        // Get tenant plan
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                plan: true,
                subscription: { select: { plan: true } }
            },
        });

        const plan = tenant?.subscription?.plan || tenant?.plan || 'STARTER';
        const limits = PLAN_ROLE_LIMITS[plan] || PLAN_ROLE_LIMITS.STARTER;

        // Count current users by role
        const userCounts = await this.prisma.user.groupBy({
            by: ['role'],
            where: {
                tenantId,
                deletedAt: null,
                status: { not: 'SUSPENDED' }
            },
            _count: { role: true },
        });

        const countByRole: Record<string, number> = {};
        for (const uc of userCounts) {
            countByRole[uc.role] = uc._count.role;
        }

        // Build quotas
        const quotas: RoleQuota[] = [];
        let totalUsers = 0;
        let maxUsers = 0;

        for (const role of Object.keys(limits)) {
            const limit = limits[role];
            const used = countByRole[role] || 0;
            const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
            const available = limit === -1 ? true : (limit > 0 && remaining > 0);

            quotas.push({
                role,
                limit,
                used,
                remaining,
                available,
            });

            totalUsers += used;
            if (limit === -1) {
                maxUsers = -1;
            } else if (maxUsers !== -1) {
                maxUsers += limit;
            }
        }

        return {
            plan,
            quotas,
            totalUsers,
            maxUsers,
        };
    }

    /**
     * Check if a tenant can create a user with the specified role
     */
    async canCreateUserWithRole(tenantId: string, role: string): Promise<{
        allowed: boolean;
        reason?: string;
        upgradeRequired?: boolean;
    }> {
        const { plan, quotas } = await this.getTenantRoleQuotas(tenantId);
        const quota = quotas.find(q => q.role === role);

        if (!quota) {
            return { allowed: false, reason: 'Rôle invalide' };
        }

        if (quota.limit === 0) {
            return {
                allowed: false,
                reason: `Le rôle ${ROLE_METADATA[role]?.labelFr || role} n'est pas disponible avec le plan ${plan}`,
                upgradeRequired: true,
            };
        }

        if (quota.limit !== -1 && quota.remaining <= 0) {
            return {
                allowed: false,
                reason: `Limite atteinte pour le rôle ${ROLE_METADATA[role]?.labelFr || role} (${quota.limit} max)`,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Get roles available for a tenant (for dropdown selection)
     */
    async getAvailableRoles(tenantId: string): Promise<{
        role: string;
        label: string;
        labelFr: string;
        available: boolean;
        remaining: number;
        upgradeRequired: boolean;
    }[]> {
        const { quotas } = await this.getTenantRoleQuotas(tenantId);

        return quotas.map(q => ({
            role: q.role,
            label: ROLE_METADATA[q.role]?.label || q.role,
            labelFr: ROLE_METADATA[q.role]?.labelFr || q.role,
            available: q.available,
            remaining: q.remaining,
            upgradeRequired: q.limit === 0 || (q.limit !== -1 && q.remaining <= 0),
        }));
    }
}
