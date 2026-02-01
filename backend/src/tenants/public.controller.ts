import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';

/**
 * Public controller for tenant branding - NO AUTH REQUIRED
 * Used by patient-facing pages to get tenant theming
 */
@Controller('public')
export class PublicController {
    constructor(private tenantsService: TenantsService) { }

    /**
     * Get public branding info by tenant slug
     * GET /api/public/branding/:slug
     */
    @Get('branding/:slug')
    async getBranding(@Param('slug') slug: string) {
        const branding = await this.tenantsService.getPublicBranding(slug);

        if (!branding) {
            throw new NotFoundException('Tenant not found');
        }

        return {
            name: branding.name,
            brandColor: branding.brandColor || '#3B82F6', // Default blue
            brandLogoUrl: branding.brandLogoUrl || null,
        };
    }
}
