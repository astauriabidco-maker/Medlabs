import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriptionsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get all subscriptions with stats for Super Admin dashboard
     */
    async getAll(options: { status?: string; plan?: string } = {}) {
        const { status, plan } = options;

        const where: any = {};
        if (status) where.status = status;
        if (plan) where.plan = plan;

        const subscriptions = await this.prisma.subscription.findMany({
            where,
            include: {
                tenant: { select: { id: true, name: true, slug: true, smsBalance: true } },
                payments: { orderBy: { createdAt: 'desc' }, take: 3 },
            },
            orderBy: { updatedAt: 'desc' },
        });

        // Calculate stats
        const stats = await this.getStats();

        return { subscriptions, stats };
    }

    /**
     * Get subscription stats
     */
    async getStats() {
        const [total, byStatus, byPlan, revenue] = await Promise.all([
            this.prisma.subscription.count(),
            this.prisma.subscription.groupBy({ by: ['status'], _count: true }),
            this.prisma.subscription.groupBy({ by: ['plan'], _count: true }),
            this.prisma.subscriptionPayment.aggregate({
                where: { status: 'SUCCESS' },
                _sum: { amount: true },
            }),
        ]);

        // Monthly Recurring Revenue estimate
        const activePremium = await this.prisma.subscription.count({ where: { status: 'ACTIVE', plan: 'PREMIUM' } });
        const activeEnterprise = await this.prisma.subscription.count({ where: { status: 'ACTIVE', plan: 'ENTERPRISE' } });
        const mrr = (activePremium * 49000) + (activeEnterprise * 99000);

        return {
            total,
            byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
            byPlan: Object.fromEntries(byPlan.map(p => [p.plan, p._count])),
            totalRevenue: revenue._sum.amount || 0,
            mrr,
        };
    }

    /**
     * Get a single subscription by tenant ID
     */
    async getByTenantId(tenantId: string) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
            include: {
                tenant: { select: { id: true, name: true, slug: true } },
                payments: { orderBy: { createdAt: 'desc' } },
            },
        });

        if (!subscription) throw new NotFoundException('Subscription not found');
        return subscription;
    }

    /**
     * Create or update subscription for a tenant
     */
    async upsert(tenantId: string, data: {
        plan: 'STARTER' | 'PREMIUM' | 'ENTERPRISE';
        status?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
        billingCycle?: 'MONTHLY' | 'YEARLY';
        pricePerMonth?: number;
        trialEndsAt?: Date;
    }) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        // Calculate price based on plan
        let price = data.pricePerMonth;
        if (!price) {
            switch (data.plan) {
                case 'PREMIUM': price = 49000; break;
                case 'ENTERPRISE': price = 99000; break;
                default: price = 0;
            }
        }

        return this.prisma.subscription.upsert({
            where: { tenantId },
            create: {
                tenantId,
                plan: data.plan,
                status: data.status || 'TRIAL',
                billingCycle: data.billingCycle || 'MONTHLY',
                pricePerMonth: price,
                trialEndsAt: data.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
            update: {
                plan: data.plan,
                status: data.status,
                billingCycle: data.billingCycle,
                pricePerMonth: price,
            },
            include: {
                tenant: { select: { id: true, name: true } },
            },
        });
    }

    /**
     * Record a payment for a subscription
     */
    async recordPayment(subscriptionId: string, data: {
        amount: number;
        provider?: 'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO';
        externalRef?: string;
        periodStart: Date;
        periodEnd: Date;
        notes?: string;
    }) {
        // Create payment record
        const payment = await this.prisma.subscriptionPayment.create({
            data: {
                subscriptionId,
                amount: data.amount,
                provider: data.provider,
                externalRef: data.externalRef,
                status: 'SUCCESS',
                periodStart: data.periodStart,
                periodEnd: data.periodEnd,
                notes: data.notes,
            },
        });

        // Update subscription status and period
        await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: 'ACTIVE',
                currentPeriodStart: data.periodStart,
                currentPeriodEnd: data.periodEnd,
            },
        });

        return payment;
    }

    /**
     * Get payment history
     */
    async getPaymentHistory(options: { limit?: number; subscriptionId?: string } = {}) {
        const { limit = 50, subscriptionId } = options;

        const where: any = {};
        if (subscriptionId) where.subscriptionId = subscriptionId;

        return this.prisma.subscriptionPayment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                subscription: {
                    include: {
                        tenant: { select: { id: true, name: true, slug: true } },
                    },
                },
            },
        });
    }

    /**
     * Cancel subscription
     */
    async cancel(subscriptionId: string) {
        return this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });
    }

    /**
     * Generate sample subscriptions for testing
     */
    async generateSampleData() {
        const tenants = await this.prisma.tenant.findMany({ take: 5 });
        let created = 0;

        for (const tenant of tenants) {
            const existing = await this.prisma.subscription.findUnique({ where: { tenantId: tenant.id } });
            if (!existing) {
                const plans = ['STARTER', 'PREMIUM', 'ENTERPRISE'] as const;
                const statuses = ['TRIAL', 'ACTIVE', 'ACTIVE', 'ACTIVE'] as const;
                const plan = plans[Math.floor(Math.random() * plans.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];

                await this.upsert(tenant.id, { plan, status });
                created++;
            }
        }

        return { created };
    }
}
