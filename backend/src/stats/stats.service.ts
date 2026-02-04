import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface DashboardStats {
    kpis: {
        totalPatients: number;
        totalRevenue: number;
        topPrescriber: string | null;
        avgPerDay: number;
    };
    volumeByDay: Array<{ date: string; count: number }>;
    prescriberDistribution: Array<{ name: string; count: number }>;
    peakHours: Array<{ hour: string; count: number }>;
}

@Injectable()
export class StatsService {
    private readonly logger = new Logger(StatsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get dashboard statistics for a tenant
     */
    async getDashboardStats(tenantId: string, period: '7d' | '30d' | '90d' | 'year' = '30d'): Promise<DashboardStats> {
        const startDate = this.getStartDate(period);

        // 1. Total patients (documents) count
        const totalPatients = await this.prisma.document.count({
            where: {
                tenantId,
                createdAt: { gte: startDate },
            },
        });

        // 2. Total revenue from paid documents
        const revenueAgg = await this.prisma.document.aggregate({
            where: {
                tenantId,
                createdAt: { gte: startDate },
                paymentStatus: 'PAID',
            },
            _sum: { price: true },
        });
        const totalRevenue = revenueAgg._sum.price || 0;

        // 3. Top prescriber
        const prescriberCounts = await this.prisma.document.groupBy({
            by: ['prescriberName'],
            where: {
                tenantId,
                createdAt: { gte: startDate },
                prescriberName: { not: null },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 1,
        });
        const topPrescriber = prescriberCounts[0]?.prescriberName || null;

        // 4. Volume by day
        const volumeByDay = await this.getVolumeByDay(tenantId, startDate);

        // 5. Prescriber distribution (top 10)
        const prescriberDistribution = await this.prisma.document.groupBy({
            by: ['prescriberName'],
            where: {
                tenantId,
                createdAt: { gte: startDate },
                prescriberName: { not: null },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });

        // 6. Peak hours distribution
        const peakHours = await this.getPeakHours(tenantId, startDate);

        // Calculate average per day
        const dayCount = this.getDayCount(period);
        const avgPerDay = Math.round((totalPatients / dayCount) * 10) / 10;

        return {
            kpis: {
                totalPatients,
                totalRevenue,
                topPrescriber,
                avgPerDay,
            },
            volumeByDay,
            prescriberDistribution: prescriberDistribution.map(p => ({
                name: p.prescriberName || 'Non spécifié',
                count: p._count.id,
            })),
            peakHours,
        };
    }

    /**
     * Get volume grouped by day
     */
    private async getVolumeByDay(tenantId: string, startDate: Date): Promise<Array<{ date: string; count: number }>> {
        // Use raw query for date grouping (PostgreSQL)
        const results = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM documents
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${startDate}
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;

        return results.map(r => ({
            date: new Date(r.date).toISOString().split('T')[0],
            count: Number(r.count),
        }));
    }

    /**
     * Get peak hours distribution
     */
    private async getPeakHours(tenantId: string, startDate: Date): Promise<Array<{ hour: string; count: number }>> {
        // Use raw query for hour extraction (PostgreSQL)
        const results = await this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as count
            FROM documents
            WHERE tenant_id = ${tenantId}
              AND created_at >= ${startDate}
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour ASC
        `;

        // Fill in missing hours with 0
        const hourMap = new Map<number, number>();
        results.forEach(r => hourMap.set(Number(r.hour), Number(r.count)));

        const peakHours: Array<{ hour: string; count: number }> = [];
        for (let h = 6; h <= 20; h++) { // 06:00 to 20:00
            peakHours.push({
                hour: `${h.toString().padStart(2, '0')}:00`,
                count: hourMap.get(h) || 0,
            });
        }

        return peakHours;
    }

    /**
     * Get start date based on period
     */
    private getStartDate(period: '7d' | '30d' | '90d' | 'year'): Date {
        const now = new Date();
        switch (period) {
            case '7d':
                return new Date(now.setDate(now.getDate() - 7));
            case '30d':
                return new Date(now.setDate(now.getDate() - 30));
            case '90d':
                return new Date(now.setDate(now.getDate() - 90));
            case 'year':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return new Date(now.setDate(now.getDate() - 30));
        }
    }

    /**
     * Get day count for period (for average calculation)
     */
    private getDayCount(period: '7d' | '30d' | '90d' | 'year'): number {
        switch (period) {
            case '7d': return 7;
            case '30d': return 30;
            case '90d': return 90;
            case 'year': return 365;
            default: return 30;
        }
    }

    /**
     * Check if stats/analytics feature is enabled for tenant
     * Uses the unified licensing system (plan features + license codes)
     */
    async isStatsEnabled(tenantId: string): Promise<boolean> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                features: true,
                subscription: { select: { plan: true, status: true } }
            },
        });

        if (!tenant) return false;

        // Check if ANALYTICS_BI is in plan features (PREMIUM or ENTERPRISE)
        const plan = tenant.subscription?.plan || 'STARTER';
        const planFeatures = this.getPlanFeatures(plan);

        // Check if ANALYTICS_BI is in additional licensed features
        const licensedFeatures = tenant.features || [];

        // Module is enabled if ANALYTICS_BI is in plan or in additional licensed features
        return planFeatures.includes('ANALYTICS_BI') || licensedFeatures.includes('ANALYTICS_BI');
    }

    /**
     * Get features included in a plan
     */
    private getPlanFeatures(plan: string): string[] {
        const PLAN_FEATURES: Record<string, string[]> = {
            STARTER: [],
            PREMIUM: ['AUTO_SYNC', 'LONG_TERM_ARCHIVE', 'ANALYTICS_BI', 'API_ADVANCED', 'PRIORITY_SUPPORT'],
            ENTERPRISE: [
                'AUTO_SYNC', 'ARCHIVE_5Y', 'ARCHIVE_10Y', 'ANALYTICS_BI', 'PATIENT_PORTAL',
                'APPOINTMENTS', 'CRITICAL_ALERTS', 'WHATSAPP_BUSINESS', 'MOBILE_MONEY',
                'API_ADVANCED', 'UNLIMITED_TEAM', 'PRIORITY_SUPPORT'
            ],
        };
        return PLAN_FEATURES[plan] || [];
    }

    /**
     * Get platform-wide statistics for Super Admin
     */
    async getPlatformStats(): Promise<{
        overview: {
            totalTenants: number;
            activeTenants: number;
            totalUsers: number;
            totalResults: number;
            resultsToday: number;
            resultsThisMonth: number;
        };
        tenantsByPlan: Array<{ plan: string; count: number }>;
        usersByRole: Array<{ role: string; count: number }>;
        growthTrend: Array<{ date: string; tenants: number; results: number }>;
        recentActivity: Array<{ type: string; message: string; time: Date }>;
        topTenants: Array<{ name: string; slug: string; resultsCount: number }>;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        // === OVERVIEW METRICS ===
        const [
            totalTenants,
            activeTenants,
            totalUsers,
            totalResults,
            resultsToday,
            resultsThisMonth,
        ] = await Promise.all([
            this.prisma.tenant.count(),
            this.prisma.tenant.count({ where: { isActive: true } }),
            this.prisma.user.count(),
            this.prisma.document.count(),
            this.prisma.document.count({ where: { createdAt: { gte: today } } }),
            this.prisma.document.count({ where: { createdAt: { gte: thisMonth } } }),
        ]);

        // === TENANTS BY STRUCTURE TYPE (since no 'plan' field) ===
        const tenantsByPlan = await this.prisma.tenant.groupBy({
            by: ['structureType'],
            _count: { id: true },
        }).then(results => results.map(r => ({
            plan: r.structureType || 'PRIVATE_LAB',
            count: r._count?.id || 0,
        })));

        const usersByRole = await this.prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
        }).then(results => results.map(r => ({
            role: r.role,
            count: r._count?.id || 0,
        })));

        // === GROWTH TREND (last 30 days) ===
        const growthTrend = await this.getGrowthTrend(last30Days);

        // === TOP TENANTS BY RESULTS ===
        const topTenants = await this.prisma.tenant.findMany({
            select: {
                name: true,
                slug: true,
                _count: { select: { documents: true } },
            },
            orderBy: { documents: { _count: 'desc' } },
            take: 10,
        }).then(tenants => tenants.map(t => ({
            name: t.name,
            slug: t.slug,
            resultsCount: t._count.documents,
        })));

        // === RECENT ACTIVITY ===
        const recentActivity = await this.getRecentPlatformActivity();

        return {
            overview: {
                totalTenants,
                activeTenants,
                totalUsers,
                totalResults,
                resultsToday,
                resultsThisMonth,
            },
            tenantsByPlan,
            usersByRole,
            growthTrend,
            recentActivity,
            topTenants,
        };
    }

    /**
     * Get growth trend for the last 30 days
     */
    private async getGrowthTrend(startDate: Date): Promise<Array<{ date: string; tenants: number; results: number }>> {
        try {
            const tenantGrowth = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM tenants
                WHERE created_at >= ${startDate}
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `;

            const resultGrowth = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM documents
                WHERE created_at >= ${startDate}
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `;

            // Merge both into a single trend array
            const trendMap = new Map<string, { tenants: number; results: number }>();

            tenantGrowth.forEach(t => {
                const dateStr = new Date(t.date).toISOString().split('T')[0];
                trendMap.set(dateStr, { tenants: Number(t.count), results: 0 });
            });

            resultGrowth.forEach(r => {
                const dateStr = new Date(r.date).toISOString().split('T')[0];
                const existing = trendMap.get(dateStr) || { tenants: 0, results: 0 };
                trendMap.set(dateStr, { ...existing, results: Number(r.count) });
            });

            return Array.from(trendMap.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            this.logger.warn('Error fetching growth trend', error);
            return [];
        }
    }

    /**
     * Get recent platform activity
     */
    private async getRecentPlatformActivity(): Promise<Array<{ type: string; message: string; time: Date }>> {
        const activities: Array<{ type: string; message: string; time: Date }> = [];

        // Recent tenants
        const recentTenants = await this.prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { name: true, createdAt: true },
        });
        recentTenants.forEach(t => {
            activities.push({
                type: 'tenant',
                message: `Nouveau laboratoire: ${t.name}`,
                time: t.createdAt,
            });
        });

        // Recent users
        const recentUsers = await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { firstName: true, lastName: true, role: true, createdAt: true },
        });
        recentUsers.forEach(u => {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Utilisateur';
            activities.push({
                type: 'user',
                message: `Nouvel utilisateur: ${fullName} (${u.role})`,
                time: u.createdAt,
            });
        });

        // Sort by time descending
        return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
    }
}

