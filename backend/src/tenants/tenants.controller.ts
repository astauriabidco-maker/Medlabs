
import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, UnauthorizedException, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { TenantsService } from './tenants.service';
import { LicensingService } from './licensing.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import * as fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
    constructor(
        private tenantsService: TenantsService,
        private licensingService: LicensingService,
    ) { }

    // ========== STATIC 'me' ROUTES FIRST ==========
    // These must come BEFORE parameterized :id routes

    @Get('me')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'VIEWER')
    async getMyTenant(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.findOne(tenantId);
    }

    @Patch('me')
    @Roles('LAB_ADMIN')
    async updateMyTenant(@Request() req: any, @Body() body: { retentionDays?: number }) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.update(tenantId, body);
    }

    @Get('me/modules')
    @Roles('LAB_ADMIN')
    async getModules(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.licensingService.getLicenseInfo(tenantId);
    }

    /**
     * Get accessible features based on subscription plan and license codes
     * Used by frontend to filter navigation menus
     */
    @Get('me/access')
    @Roles('LAB_ADMIN', 'TECHNICIAN')
    async getAccessInfo(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.licensingService.getAccessibleFeatures(tenantId);
    }

    @Post('me/license')
    @Roles('LAB_ADMIN')
    async activateLicense(@Request() req: any, @Body() body: { code: string }) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.licensingService.activateLicense(tenantId, body.code);
    }

    // ========== SYNC API KEY MANAGEMENT ==========

    @Get('me/sync-key')
    @Roles('LAB_ADMIN')
    async getSyncKeyStatus(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.getSyncApiKeyStatus(tenantId);
    }

    @Post('me/sync-key')
    @Roles('LAB_ADMIN')
    async generateSyncKey(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.generateSyncApiKey(tenantId);
    }

    @Delete('me/sync-key')
    @Roles('LAB_ADMIN')
    async revokeSyncKey(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.revokeSyncApiKey(tenantId);
    }

    // ========== WHITE LABELING / BRANDING ==========

    @Patch('me/branding')
    @Roles('LAB_ADMIN')
    async updateBranding(@Request() req: any, @Body() body: { brandColor?: string; slug?: string }) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.updateBranding(tenantId, body);
    }

    // ========== PAYMENT PROVIDER CONFIGURATION (Multi-Provider) ==========

    @Patch('me/payment-provider')
    @Roles('LAB_ADMIN')
    async updatePaymentProvider(
        @Request() req: any,
        @Body() body: {
            paymentProvider?: 'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO';
            // Campay credentials
            campayUsername?: string;
            campayPassword?: string;
            // Orange Money credentials
            orangeUsername?: string;
            orangePassword?: string;
            orangeAuthToken?: string;
            orangeMsisdn?: string;
            // MTN MoMo credentials
            mtnApiUser?: string;
            mtnApiKey?: string;
            mtnSubscriptionKey?: string;
            mtnTargetEnv?: string;
        }
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.updatePaymentProviderConfig(tenantId, body);
    }

    // Legacy endpoint for backward compatibility
    @Patch('me/campay')
    @Roles('LAB_ADMIN')
    async updateCampayCredentials(
        @Request() req: any,
        @Body() body: { campayUsername: string; campayPassword: string }
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.updatePaymentProviderConfig(tenantId, {
            paymentProvider: 'CAMPAY',
            ...body,
        });
    }

    @Post('me/logo')
    @Roles('LAB_ADMIN')
    @UseInterceptors(FileInterceptor('logo', {
        storage: diskStorage({
            destination: uploadsDir,
            filename: (req: any, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const tenantId = req.user?.tenantId || 'unknown';
                cb(null, `${tenantId}-${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                return cb(new BadRequestException('Only image files are allowed'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    }))
    async uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        if (!file) throw new BadRequestException('No file uploaded');

        // Generate public URL (relative to backend)
        const logoUrl = `/uploads/logos/${file.filename}`;

        await this.tenantsService.updateLogoUrl(tenantId, logoUrl);

        return {
            success: true,
            logoUrl,
            message: 'Logo uploaded successfully'
        };
    }

    // ========== PARAMETERIZED ROUTES AFTER ==========

    @Post()
    @Roles('SUPER_ADMIN')
    async create(@Body() createTenantDto: CreateTenantDto) {
        return this.tenantsService.createTenantWithAdmin(createTenantDto);
    }

    @Get()
    @Roles('SUPER_ADMIN')
    async findAll() {
        return this.tenantsService.findAll();
    }

    @Patch(':id')
    @Roles('SUPER_ADMIN')
    async updateTenant(@Param('id') id: string, @Body() body: any) {
        return this.tenantsService.update(id, body);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    async deleteTenant(@Param('id') id: string) {
        return this.tenantsService.delete(id);
    }
}
