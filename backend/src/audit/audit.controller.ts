
import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AuditController {
    constructor(private auditService: AuditService) { }

    @Get()
    async findAll(@Query('tenantId') tenantId?: string, @Query('action') action?: string) {
        return this.auditService.findAll({
            tenantId,
            action: action as any
        });
    }

    @Get('stats')
    async getStats() {
        return this.auditService.getStats();
    }

    @Post('generate-sample')
    async generateSampleData() {
        return this.auditService.generateSampleData();
    }
}
