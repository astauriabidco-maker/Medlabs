import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { PrismaService } from '../prisma.service';

@Controller('api/alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all critical rules for current tenant
     */
    @Get('rules')
    async getRules(@Request() req: any) {
        const tenantId = req.user.tenantId;

        const rules = await this.prisma.criticalRule.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });

        return { rules };
    }

    /**
     * Create a new critical rule
     */
    @Post('rules')
    async createRule(
        @Request() req: any,
        @Body() body: {
            name: string;
            keywords: string[];
            mustContainAll?: boolean;
            alertMessage: string;
        },
    ) {
        const tenantId = req.user.tenantId;

        const rule = await this.prisma.criticalRule.create({
            data: {
                tenantId,
                name: body.name,
                keywords: body.keywords,
                mustContainAll: body.mustContainAll ?? true,
                alertMessage: body.alertMessage,
            },
        });

        return { rule };
    }

    /**
     * Update a critical rule
     */
    @Put('rules/:id')
    async updateRule(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: {
            name?: string;
            keywords?: string[];
            mustContainAll?: boolean;
            alertMessage?: string;
            isActive?: boolean;
        },
    ) {
        const tenantId = req.user.tenantId;

        // Verify ownership
        const existing = await this.prisma.criticalRule.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return { error: 'Rule not found' };
        }

        const rule = await this.prisma.criticalRule.update({
            where: { id },
            data: {
                name: body.name,
                keywords: body.keywords,
                mustContainAll: body.mustContainAll,
                alertMessage: body.alertMessage,
                isActive: body.isActive,
            },
        });

        return { rule };
    }

    /**
     * Delete a critical rule
     */
    @Delete('rules/:id')
    async deleteRule(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;

        const existing = await this.prisma.criticalRule.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            return { error: 'Rule not found' };
        }

        await this.prisma.criticalRule.delete({ where: { id } });

        return { success: true };
    }

    /**
     * Get/Update biologist phone for alerts
     */
    @Get('biologist-phone')
    async getBiologistPhone(@Request() req: any) {
        const tenantId = req.user.tenantId;

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { biologistPhone: true },
        });

        return { biologistPhone: tenant?.biologistPhone || '' };
    }

    @Put('biologist-phone')
    async updateBiologistPhone(
        @Request() req: any,
        @Body() body: { biologistPhone: string },
    ) {
        const tenantId = req.user.tenantId;

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { biologistPhone: body.biologistPhone },
        });

        return { success: true };
    }
}
