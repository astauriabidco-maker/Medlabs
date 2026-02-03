import {
    Controller,
    Get,
    Query,
    Request,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    /**
     * Get dashboard statistics
     * GET /api/stats/dashboard
     */
    @Get('dashboard')
    @Roles('LAB_ADMIN', 'SUPER_ADMIN')
    async getDashboard(
        @Request() req: any,
        @Query('period') period?: '7d' | '30d' | '90d' | 'year'
    ) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new ForbiddenException('No tenant associated with user');
        }

        // Check if stats feature is enabled
        const isEnabled = await this.statsService.isStatsEnabled(tenantId);
        if (!isEnabled) {
            return {
                error: 'FEATURE_DISABLED',
                message: 'Le module Business Intelligence n\'est pas activé pour votre laboratoire. Contactez le support pour l\'activer.',
            };
        }

        return this.statsService.getDashboardStats(tenantId, period || '30d');
    }

    /**
     * Check if stats are enabled
     * GET /api/stats/status
     */
    @Get('status')
    @Roles('LAB_ADMIN')
    async getStatus(@Request() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { enabled: false };
        }

        const enabled = await this.statsService.isStatsEnabled(tenantId);
        return { enabled };
    }

    /**
     * Get platform-wide statistics for Super Admin
     * GET /api/stats/platform
     */
    @Get('platform')
    @Roles('SUPER_ADMIN')
    async getPlatformStats() {
        return this.statsService.getPlatformStats();
    }
}
