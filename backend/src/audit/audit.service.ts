
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogOptions {
    action: AuditAction;
    description: string;
    actorId?: string;
    tenantId?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Create an audit log entry
     */
    async log(action: AuditAction, description: string, actorId?: string, tenantId?: string, resourceId?: string, ipAddress?: string, userAgent?: string) {
        try {
            return await this.prisma.auditLog.create({
                data: {
                    action,
                    description,
                    actorId,
                    tenantId,
                    resourceId,
                    ipAddress,
                    userAgent
                }
            });
        } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`);
            // Don't throw - audit logging should not break main flow
        }
    }

    /**
     * Create audit log with full options
     */
    async logWithOptions(options: AuditLogOptions) {
        return this.log(
            options.action,
            options.description,
            options.actorId,
            options.tenantId,
            options.resourceId,
            options.ipAddress,
            options.userAgent
        );
    }

    // === Helper Methods for Common Actions ===

    async logLogin(email: string, userId: string, success: boolean, ipAddress?: string) {
        return this.log(
            success ? 'LOGIN' : 'LOGIN_FAILED',
            success ? `Utilisateur ${email} connecté` : `Échec de connexion pour ${email}`,
            userId,
            undefined,
            undefined,
            ipAddress
        );
    }

    async logImpersonation(adminId: string, targetEmail: string, targetId: string, start: boolean) {
        return this.log(
            start ? 'IMPERSONATION_START' : 'IMPERSONATION_END',
            start
                ? `Super Admin a démarré l'impersonation de ${targetEmail}`
                : `Super Admin a terminé l'impersonation de ${targetEmail}`,
            adminId,
            undefined,
            targetId
        );
    }

    async logUserAction(action: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_SUSPENDED',
        userEmail: string, actorId: string, tenantId?: string, userId?: string) {
        const actionTexts = {
            USER_CREATED: 'Utilisateur créé',
            USER_UPDATED: 'Utilisateur modifié',
            USER_DELETED: 'Utilisateur supprimé',
            USER_SUSPENDED: 'Utilisateur suspendu'
        };
        return this.log(action, `${actionTexts[action]}: ${userEmail}`, actorId, tenantId, userId);
    }

    async logTenantAction(action: 'TENANT_CREATED' | 'TENANT_UPDATED' | 'TENANT_SUSPENDED',
        tenantName: string, actorId: string, tenantId: string) {
        const actionTexts = {
            TENANT_CREATED: 'Laboratoire créé',
            TENANT_UPDATED: 'Laboratoire modifié',
            TENANT_SUSPENDED: 'Laboratoire suspendu'
        };
        return this.log(action, `${actionTexts[action]}: ${tenantName}`, actorId, tenantId);
    }

    async logDocumentAction(action: 'UPLOAD_DOCUMENT' | 'VIEW_DOCUMENT' | 'DELETE_DOCUMENT' | 'DOCUMENT_SHARED',
        folderRef: string, actorId?: string, tenantId?: string, documentId?: string) {
        const actionTexts = {
            UPLOAD_DOCUMENT: 'Document téléversé',
            VIEW_DOCUMENT: 'Document consulté',
            DELETE_DOCUMENT: 'Document supprimé',
            DOCUMENT_SHARED: 'Document partagé'
        };
        return this.log(action, `${actionTexts[action]}: ${folderRef}`, actorId, tenantId, documentId);
    }

    async logSettingsChange(settingName: string, actorId: string, tenantId?: string) {
        return this.log('UPDATE_SETTINGS', `Paramètres modifiés: ${settingName}`, actorId, tenantId);
    }

    async logModuleChange(moduleName: string, activated: boolean, actorId: string, tenantId: string) {
        return this.log(
            activated ? 'MODULE_ACTIVATED' : 'MODULE_DEACTIVATED',
            `Module ${activated ? 'activé' : 'désactivé'}: ${moduleName}`,
            actorId,
            tenantId
        );
    }

    /**
     * Get all audit logs with filtering
     */
    async findAll(options: { tenantId?: string; action?: AuditAction; limit?: number; offset?: number } = {}) {
        const { tenantId, action, limit = 100, offset = 0 } = options;

        const where: any = {};
        if (tenantId) where.tenantId = tenantId;
        if (action) where.action = action;

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: { select: { name: true } }
            },
            take: limit,
            skip: offset
        });
    }

    /**
     * Get audit statistics
     */
    async getStats() {
        const [total, byAction, recent24h] = await Promise.all([
            this.prisma.auditLog.count(),
            this.prisma.auditLog.groupBy({
                by: ['action'],
                _count: true,
                orderBy: { _count: { action: 'desc' } },
                take: 10
            }),
            this.prisma.auditLog.count({
                where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            })
        ]);

        return {
            total,
            recent24h,
            byAction: Object.fromEntries(byAction.map(a => [a.action, a._count]))
        };
    }

    /**
     * Generate sample audit logs for testing
     */
    async generateSampleData() {
        const users = await this.prisma.user.findMany({ take: 5 });
        const tenants = await this.prisma.tenant.findMany({ take: 3 });

        const sampleLogs = [
            // Authentication events
            { action: 'LOGIN' as AuditAction, description: 'Utilisateur admin@medlab.cm connecté', actorId: users[0]?.id },
            { action: 'LOGIN' as AuditAction, description: 'Utilisateur lab@medlab.cm connecté', actorId: users[1]?.id, tenantId: tenants[0]?.id },
            { action: 'LOGIN_FAILED' as AuditAction, description: 'Échec de connexion pour unknown@test.com' },
            { action: 'IMPERSONATION_START' as AuditAction, description: 'Super Admin a démarré l\'impersonation de lab@medlab.cm', actorId: users[0]?.id },
            { action: 'IMPERSONATION_END' as AuditAction, description: 'Super Admin a terminé l\'impersonation', actorId: users[0]?.id },

            // User management
            { action: 'USER_CREATED' as AuditAction, description: 'Utilisateur créé: nouveau.tech@lab.cm', actorId: users[1]?.id, tenantId: tenants[0]?.id },
            { action: 'USER_UPDATED' as AuditAction, description: 'Utilisateur modifié: tech@medlab.cm (rôle changé)', actorId: users[1]?.id, tenantId: tenants[0]?.id },

            // Tenant management  
            { action: 'TENANT_CREATED' as AuditAction, description: 'Laboratoire créé: Laboratoire Central', actorId: users[0]?.id },
            { action: 'TENANT_UPDATED' as AuditAction, description: 'Laboratoire modifié: Demo Lab (plan changé)', actorId: users[0]?.id, tenantId: tenants[0]?.id },
            { action: 'PLAN_CHANGED' as AuditAction, description: 'Plan modifié: STARTER → PREMIUM', actorId: users[0]?.id, tenantId: tenants[0]?.id },

            // Document events
            { action: 'UPLOAD_DOCUMENT' as AuditAction, description: 'Document téléversé: DOS-2024-001', actorId: users[2]?.id, tenantId: tenants[0]?.id },
            { action: 'UPLOAD_DOCUMENT' as AuditAction, description: 'Document téléversé: DOS-2024-002', actorId: users[2]?.id, tenantId: tenants[0]?.id },
            { action: 'VIEW_DOCUMENT' as AuditAction, description: 'Document consulté: DOS-2024-001 par patient', tenantId: tenants[0]?.id },

            // Settings
            { action: 'UPDATE_SETTINGS' as AuditAction, description: 'Paramètres modifiés: Configuration SMS', actorId: users[1]?.id, tenantId: tenants[0]?.id },
            { action: 'MODULE_ACTIVATED' as AuditAction, description: 'Module activé: WhatsApp Business', actorId: users[1]?.id, tenantId: tenants[0]?.id },
            { action: 'API_KEY_GENERATED' as AuditAction, description: 'Clé API générée pour synchronisation', actorId: users[1]?.id, tenantId: tenants[0]?.id },

            // Financial
            { action: 'PAYMENT_RECEIVED' as AuditAction, description: 'Paiement reçu: 49,000 XAF (Premium)', tenantId: tenants[0]?.id },
            { action: 'SUBSCRIPTION_CREATED' as AuditAction, description: 'Abonnement créé: Plan Premium', actorId: users[0]?.id, tenantId: tenants[0]?.id },
        ];

        let created = 0;
        for (const log of sampleLogs) {
            try {
                await this.prisma.auditLog.create({ data: log });
                created++;
            } catch (error) {
                this.logger.warn(`Failed to create sample log: ${error.message}`);
            }
        }

        this.logger.log(`Generated ${created} sample audit logs`);
        return { created };
    }
}
