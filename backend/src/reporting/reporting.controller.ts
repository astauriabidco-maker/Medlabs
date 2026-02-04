import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
    constructor(private readonly reportingService: ReportingService) { }

    /**
     * Generate a custom report
     */
    @Post('generate')
    @Roles('LAB_ADMIN', 'BUSINESS_MANAGER')
    @ApiOperation({ summary: 'Generate a custom report with optional branding' })
    generateReport(
        @User() user: any,
        @Body() body: {
            type: 'summary' | 'detailed' | 'trends';
            dateFrom?: string;
            dateTo?: string;
            includeCharts?: boolean;
            branding?: {
                labName?: string;
                logo?: string;
                primaryColor?: string;
            };
        },
    ) {
        return this.reportingService.generateReport(user.tenantId, {
            type: body.type || 'summary',
            dateFrom: body.dateFrom ? new Date(body.dateFrom) : undefined,
            dateTo: body.dateTo ? new Date(body.dateTo) : undefined,
            includeCharts: body.includeCharts ?? true,
            branding: body.branding,
        });
    }

    /**
     * Get list of generated reports
     */
    @Get()
    @Roles('LAB_ADMIN', 'BUSINESS_MANAGER')
    @ApiOperation({ summary: 'Get list of generated reports' })
    getReports(@User() user: any) {
        return this.reportingService.getReports(user.tenantId);
    }

    /**
     * Schedule a recurring report
     */
    @Post('schedule')
    @Roles('LAB_ADMIN')
    @ApiOperation({ summary: 'Schedule a recurring report' })
    scheduleReport(
        @User() user: any,
        @Body() body: {
            frequency: 'daily' | 'weekly' | 'monthly';
            recipients: string[];
        },
    ) {
        return this.reportingService.scheduleReport(user.tenantId, body);
    }
}
