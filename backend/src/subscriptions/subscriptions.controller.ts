import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SubscriptionsController {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    /**
     * GET /api/subscriptions - Get all subscriptions with stats
     */
    @Get()
    async getAll(
        @Query('status') status?: string,
        @Query('plan') plan?: string,
    ) {
        return this.subscriptionsService.getAll({ status, plan });
    }

    /**
     * GET /api/subscriptions/stats - Get subscription statistics
     */
    @Get('stats')
    async getStats() {
        return this.subscriptionsService.getStats();
    }

    /**
     * GET /api/subscriptions/payments - Get payment history
     */
    @Get('payments')
    async getPayments(
        @Query('limit') limit?: string,
        @Query('subscriptionId') subscriptionId?: string,
    ) {
        return this.subscriptionsService.getPaymentHistory({
            limit: limit ? parseInt(limit, 10) : 50,
            subscriptionId,
        });
    }

    /**
     * GET /api/subscriptions/tenant/:tenantId - Get subscription by tenant
     */
    @Get('tenant/:tenantId')
    async getByTenant(@Param('tenantId') tenantId: string) {
        return this.subscriptionsService.getByTenantId(tenantId);
    }

    /**
     * POST /api/subscriptions/tenant/:tenantId - Create/update subscription
     */
    @Post('tenant/:tenantId')
    async upsertSubscription(
        @Param('tenantId') tenantId: string,
        @Body() body: {
            plan: 'STARTER' | 'PREMIUM' | 'ENTERPRISE';
            status?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
            billingCycle?: 'MONTHLY' | 'YEARLY';
            pricePerMonth?: number;
        },
    ) {
        return this.subscriptionsService.upsert(tenantId, body);
    }

    /**
     * POST /api/subscriptions/:id/payment - Record a payment
     */
    @Post(':id/payment')
    async recordPayment(
        @Param('id') subscriptionId: string,
        @Body() body: {
            amount: number;
            provider?: 'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO';
            externalRef?: string;
            periodStart: string;
            periodEnd: string;
            notes?: string;
        },
    ) {
        return this.subscriptionsService.recordPayment(subscriptionId, {
            ...body,
            periodStart: new Date(body.periodStart),
            periodEnd: new Date(body.periodEnd),
        });
    }

    /**
     * PATCH /api/subscriptions/:id/cancel - Cancel subscription
     */
    @Patch(':id/cancel')
    async cancel(@Param('id') subscriptionId: string) {
        return this.subscriptionsService.cancel(subscriptionId);
    }

    /**
     * POST /api/subscriptions/generate-samples - Generate sample data
     */
    @Post('generate-samples')
    async generateSamples() {
        return this.subscriptionsService.generateSampleData();
    }
}
