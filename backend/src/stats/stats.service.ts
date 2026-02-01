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
     * Check if stats are enabled for tenant
     */
    async isStatsEnabled(tenantId: string): Promise<boolean> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { statsEnabled: true },
        });
        return tenant?.statsEnabled || false;
    }
}
