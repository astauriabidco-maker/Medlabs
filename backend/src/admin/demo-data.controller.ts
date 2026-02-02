
import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('admin/demo-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class DemoDataController {
    private readonly logger = new Logger(DemoDataController.name);

    constructor(
        private auditService: AuditService,
        private alertsService: AlertsService,
        private subscriptionsService: SubscriptionsService,
    ) { }

    /**
     * Generate all sample data for demo/testing purposes
     */
    @Post('generate-all')
    async generateAll() {
        this.logger.log('Generating all sample data...');

        const results = {
            auditLogs: { created: 0 },
            systemAlerts: { created: 0 },
            subscriptions: { created: 0 },
        };

        try {
            // Generate audit logs
            results.auditLogs = await this.auditService.generateSampleData();
            this.logger.log(`Generated ${results.auditLogs.created} audit logs`);
        } catch (error) {
            this.logger.error(`Failed to generate audit logs: ${error.message}`);
        }

        try {
            // Generate system alerts
            results.systemAlerts = await this.alertsService.generateSampleAlerts();
            this.logger.log(`Generated ${results.systemAlerts.created} system alerts`);
        } catch (error) {
            this.logger.error(`Failed to generate system alerts: ${error.message}`);
        }

        try {
            // Generate subscriptions (and demo tenants + payments)
            results.subscriptions = await this.subscriptionsService.generateSampleData() as any;
            this.logger.log(`Generated ${results.subscriptions.created} subscriptions, ${(results.subscriptions as any).payments || 0} payments`);
        } catch (error) {
            this.logger.error(`Failed to generate subscriptions: ${error.message}`);
        }

        // Log the action
        await this.auditService.log(
            'CONFIG_UPDATED' as any, // SAMPLE_DATA_GENERATED
            `Données de démonstration générées: ${results.auditLogs.created} logs, ${results.systemAlerts.created} alertes, ${results.subscriptions.created} abonnements`
        );

        return {
            success: true,
            message: 'Données de démonstration générées avec succès',
            results
        };
    }

    /**
     * Generate only audit logs
     */
    @Post('generate-audit-logs')
    async generateAuditLogs() {
        const result = await this.auditService.generateSampleData();
        return { success: true, ...result };
    }

    /**
     * Generate only system alerts
     */
    @Post('generate-alerts')
    async generateAlerts() {
        const result = await this.alertsService.generateSampleAlerts();
        return { success: true, ...result };
    }

    /**
     * Generate only subscriptions
     */
    @Post('generate-subscriptions')
    async generateSubscriptions() {
        const result = await this.subscriptionsService.generateSampleData();
        return { success: true, ...result };
    }
}
