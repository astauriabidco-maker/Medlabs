import {
    Controller,
    Get,
    Patch,
    Post,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    /**
     * GET /api/alerts - Get all alerts
     */
    @Get()
    async getAlerts(
        @Query('includeRead') includeRead?: string,
        @Query('includeDismissed') includeDismissed?: string,
        @Query('limit') limit?: string,
    ) {
        return this.alertsService.getAlerts({
            includeRead: includeRead === 'true',
            includeDismissed: includeDismissed === 'true',
            limit: limit ? parseInt(limit, 10) : 50,
        });
    }

    /**
     * PATCH /api/alerts/:id/read - Mark alert as read
     */
    @Patch(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.alertsService.markAsRead(id);
    }

    /**
     * PATCH /api/alerts/:id/dismiss - Dismiss alert
     */
    @Patch(':id/dismiss')
    async dismiss(@Param('id') id: string) {
        return this.alertsService.dismiss(id);
    }

    /**
     * PATCH /api/alerts/read-all - Mark all alerts as read
     */
    @Patch('read-all')
    async markAllAsRead() {
        return this.alertsService.markAllAsRead();
    }

    /**
     * POST /api/alerts/generate-samples - Generate sample alerts for testing
     */
    @Post('generate-samples')
    async generateSamples() {
        return this.alertsService.generateSampleAlerts();
    }
}
