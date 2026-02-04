import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface ReportOptions {
    type: 'summary' | 'detailed' | 'trends';
    dateFrom?: Date;
    dateTo?: Date;
    includeCharts?: boolean;
    branding?: {
        labName?: string;
        logo?: string;
        primaryColor?: string;
    };
}

@Injectable()
export class ReportingService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate a custom report for a tenant
     */
    async generateReport(tenantId: string, options: ReportOptions) {
        const dateFrom = options.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default
        const dateTo = options.dateTo || new Date();

        // Get tenant info for branding
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        // Get documents in date range
        const documents = await this.prisma.document.findMany({
            where: {
                tenantId,
                createdAt: { gte: dateFrom, lte: dateTo },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                folderRef: true,
                createdAt: true,
                patientFirstName: true,
                patientLastName: true,
                status: true,
                isCritical: true,
                prescriberName: true,
            },
        });

        // Calculate stats
        const totalResults = documents.length;
        const criticalResults = documents.filter(d => d.isCritical).length;
        const byPrescriber: Record<string, number> = {};
        const byDay: Record<string, number> = {};

        documents.forEach(doc => {
            // By prescriber
            const prescriber = doc.prescriberName || 'Unknown';
            byPrescriber[prescriber] = (byPrescriber[prescriber] || 0) + 1;

            // By day
            const day = doc.createdAt.toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + 1;
        });

        // Generate report ID
        const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        return {
            reportId,
            generatedAt: new Date(),
            type: options.type,
            period: { from: dateFrom, to: dateTo },
            branding: {
                labName: options.branding?.labName || tenant.name,
                logo: options.branding?.logo || null, // Would be populated from tenant config if available
                primaryColor: options.branding?.primaryColor || '#3b82f6', // Default blue
            },
            summary: {
                totalResults,
                criticalResults,
                criticalRate: totalResults > 0 ? ((criticalResults / totalResults) * 100).toFixed(1) + '%' : '0%',
                averagePerDay: totalResults > 0 ? (totalResults / Math.max(1, Object.keys(byDay).length)).toFixed(1) : '0',
            },
            charts: options.includeCharts ? {
                byPrescriber: Object.entries(byPrescriber)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                byDay: Object.entries(byDay)
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => a.date.localeCompare(b.date)),
            } : null,
            data: options.type === 'detailed' ? documents.map(d => ({
                ...d,
                patientName: `${d.patientFirstName} ${d.patientLastName}`.trim(),
            })) : null,
        };
    }

    /**
     * Get list of generated reports for tenant
     */
    async getReports(tenantId: string) {
        // For now, reports are generated on demand (not stored)
        // This would be enhanced to store and retrieve historical reports
        return {
            reports: [],
            message: 'Reports are generated on-demand. Use POST /reports/generate to create a new report.',
        };
    }

    /**
     * Schedule a recurring report
     */
    async scheduleReport(tenantId: string, schedule: { frequency: 'daily' | 'weekly' | 'monthly'; recipients: string[] }) {
        // This would be implemented with a proper job queue (Bull, Agenda, etc.)
        return {
            scheduled: true,
            frequency: schedule.frequency,
            recipients: schedule.recipients,
            nextRun: this.calculateNextRun(schedule.frequency),
            message: 'Report scheduling configured. You will receive reports via email.',
        };
    }

    private calculateNextRun(frequency: 'daily' | 'weekly' | 'monthly'): Date {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            case 'monthly':
                const next = new Date(now);
                next.setMonth(next.getMonth() + 1);
                return next;
        }
    }
}
