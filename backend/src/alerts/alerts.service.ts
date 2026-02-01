import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AlertsService {
    private readonly logger = new Logger(AlertsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get all alerts for Super Admin dashboard
     */
    async getAlerts(options: { includeRead?: boolean; includeDismissed?: boolean; limit?: number } = {}) {
        const { includeRead = false, includeDismissed = false, limit = 50 } = options;

        const where: any = {};
        if (!includeRead) where.isRead = false;
        if (!includeDismissed) where.isDismissed = false;

        const alerts = await this.prisma.systemAlert.findMany({
            where,
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
            take: limit,
            include: {
                tenant: { select: { id: true, name: true, slug: true } },
            },
        });

        const counts = await this.prisma.systemAlert.groupBy({
            by: ['severity'],
            where: { isRead: false, isDismissed: false },
            _count: true,
        });

        return {
            alerts,
            counts: {
                critical: counts.find(c => c.severity === 'CRITICAL')?._count || 0,
                warning: counts.find(c => c.severity === 'WARNING')?._count || 0,
                info: counts.find(c => c.severity === 'INFO')?._count || 0,
                total: counts.reduce((acc, c) => acc + c._count, 0),
            },
        };
    }

    /**
     * Mark an alert as read
     */
    async markAsRead(alertId: string) {
        return this.prisma.systemAlert.update({
            where: { id: alertId },
            data: { isRead: true },
        });
    }

    /**
     * Dismiss an alert
     */
    async dismiss(alertId: string) {
        return this.prisma.systemAlert.update({
            where: { id: alertId },
            data: { isDismissed: true },
        });
    }

    /**
     * Mark all alerts as read
     */
    async markAllAsRead() {
        return this.prisma.systemAlert.updateMany({
            where: { isRead: false },
            data: { isRead: true },
        });
    }

    /**
     * Create a new alert
     */
    async createAlert(data: {
        type: 'LOW_SMS_BALANCE' | 'INACTIVE_TENANT' | 'PAYMENT_OVERDUE' | 'STORAGE_WARNING' | 'SECURITY_EVENT' | 'SYSTEM_ERROR' | 'NEW_TENANT';
        severity: 'INFO' | 'WARNING' | 'CRITICAL';
        title: string;
        message: string;
        tenantId?: string;
        userId?: string;
        metadata?: any;
    }) {
        return this.prisma.systemAlert.create({ data });
    }

    /**
     * Auto-detect low SMS balance tenants - runs every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async detectLowSmsBalance() {
        this.logger.log('Checking for low SMS balances...');

        const lowBalanceTenants = await this.prisma.tenant.findMany({
            where: { smsBalance: { lt: 50 }, isActive: true },
            select: { id: true, name: true, smsBalance: true },
        });

        for (const tenant of lowBalanceTenants) {
            // Check if alert already exists for this tenant in last 24h
            const existing = await this.prisma.systemAlert.findFirst({
                where: {
                    tenantId: tenant.id,
                    type: 'LOW_SMS_BALANCE',
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            });

            if (!existing) {
                await this.createAlert({
                    type: 'LOW_SMS_BALANCE',
                    severity: tenant.smsBalance < 10 ? 'CRITICAL' : 'WARNING',
                    title: `Solde SMS faible: ${tenant.name}`,
                    message: `Le laboratoire ${tenant.name} n'a plus que ${tenant.smsBalance} SMS restants.`,
                    tenantId: tenant.id,
                    metadata: { currentBalance: tenant.smsBalance },
                });
            }
        }
    }

    /**
     * Detect inactive tenants - runs daily
     */
    @Cron(CronExpression.EVERY_DAY_AT_6AM)
    async detectInactiveTenants() {
        this.logger.log('Checking for inactive tenants...');

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Find tenants with no documents created in 7+ days
        const tenants = await this.prisma.tenant.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true },
                },
            },
        });

        for (const tenant of tenants) {
            const lastActivity = tenant.documents[0]?.createdAt;
            if (!lastActivity || lastActivity < sevenDaysAgo) {
                // Check if alert already exists
                const existing = await this.prisma.systemAlert.findFirst({
                    where: {
                        tenantId: tenant.id,
                        type: 'INACTIVE_TENANT',
                        isDismissed: false,
                    },
                });

                if (!existing) {
                    await this.createAlert({
                        type: 'INACTIVE_TENANT',
                        severity: 'INFO',
                        title: `Laboratoire inactif: ${tenant.name}`,
                        message: `Aucune activité détectée depuis ${lastActivity ? '7+ jours' : 'la création'}.`,
                        tenantId: tenant.id,
                        metadata: { lastActivity: lastActivity?.toISOString() || null },
                    });
                }
            }
        }
    }

    /**
     * Generate sample alerts for testing
     */
    async generateSampleAlerts() {
        const tenants = await this.prisma.tenant.findMany({ take: 3 });

        const samples = [
            {
                type: 'LOW_SMS_BALANCE' as const,
                severity: 'CRITICAL' as const,
                title: 'Solde SMS critique',
                message: 'Le laboratoire Demo Lab n\'a plus que 5 SMS restants.',
                tenantId: tenants[0]?.id,
            },
            {
                type: 'NEW_TENANT' as const,
                severity: 'INFO' as const,
                title: 'Nouveau laboratoire inscrit',
                message: 'Un nouveau laboratoire vient de s\'inscrire sur la plateforme.',
            },
            {
                type: 'SECURITY_EVENT' as const,
                severity: 'WARNING' as const,
                title: 'Tentatives de connexion suspectes',
                message: '5 tentatives de connexion échouées détectées pour l\'adresse IP 192.168.1.100.',
            },
        ];

        for (const alert of samples) {
            await this.createAlert(alert);
        }

        return { created: samples.length };
    }
}
