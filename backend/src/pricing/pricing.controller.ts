import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('pricing')
export class PricingController {
    constructor(private pricingService: PricingService) { }

    // ==================
    // PUBLIC ENDPOINTS
    // ==================

    @Get('public')
    async getPublicPricing() {
        return this.pricingService.getPublicPricing();
    }

    // ==================
    // PLANS (Super Admin only)
    // ==================

    @Get('plans')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async getAllPlans(@Query('activeOnly') activeOnly?: string) {
        return this.pricingService.findAllPlans(activeOnly !== 'false');
    }

    @Get('plans/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async getPlanById(@Param('id') id: string) {
        return this.pricingService.findPlanById(id);
    }

    @Post('plans')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async createPlan(@Body() data: {
        name: string;
        slug: string;
        description?: string;
        price?: number;
        interval?: string;
        popular?: boolean;
        color?: string;
        buttonText?: string;
        buttonVariant?: string;
        sortOrder?: number;
        includedFeatures?: string[];
        featureLimits?: Record<string, number>;
    }) {
        return this.pricingService.createPlan(data);
    }

    @Patch('plans/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async updatePlan(@Param('id') id: string, @Body() data: any) {
        return this.pricingService.updatePlan(id, data);
    }

    @Delete('plans/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async deletePlan(@Param('id') id: string) {
        return this.pricingService.deletePlan(id);
    }

    // ==================
    // FEATURES (Super Admin only)
    // ==================

    @Get('features')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async getAllFeatures(@Query('activeOnly') activeOnly?: string) {
        return this.pricingService.findAllFeatures(activeOnly !== 'false');
    }

    @Get('features/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async getFeatureById(@Param('id') id: string) {
        return this.pricingService.findFeatureById(id);
    }

    @Post('features')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async createFeature(@Body() data: {
        name: string;
        key: string;
        description?: string;
        category?: string;
        icon?: string;
        isAddon?: boolean;
        addonPrice?: number;
        addonColor?: string;
        sortOrder?: number;
    }) {
        return this.pricingService.createFeature(data);
    }

    @Patch('features/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async updateFeature(@Param('id') id: string, @Body() data: any) {
        return this.pricingService.updateFeature(id, data);
    }

    @Delete('features/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async deleteFeature(@Param('id') id: string) {
        return this.pricingService.deleteFeature(id);
    }

    // ==================
    // SEEDING (Super Admin only)
    // ==================

    @Post('seed')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async seedData() {
        return this.pricingService.seedInitialData();
    }
}
