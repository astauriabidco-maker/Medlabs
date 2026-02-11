
import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, UnauthorizedException, Param, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
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

@ApiTags('Tenants')
@ApiBearerAuth()
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
    @ApiOperation({ summary: 'Get current tenant info', description: 'Returns the tenant associated with the authenticated user' })
    @ApiResponse({ status: 200, description: 'Tenant information retrieved successfully' })
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
    @ApiOperation({ summary: 'Get tenant modules', description: 'Returns activated modules and license information for the current tenant' })
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
    @ApiOperation({ summary: 'Get accessible features', description: 'Returns the list of features accessible based on plan and licenses. Used for frontend navigation filtering.' })
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

    // ========== MODULE REQUEST (Contact Sales) ==========

    @Post('me/request-module')
    @Roles('LAB_ADMIN')
    async requestModule(
        @Request() req: any,
        @Body() body: { moduleId: string; message?: string }
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.licensingService.requestModule(tenantId, {
            moduleId: body.moduleId,
            message: body.message,
            userId: req.user.id,
        });
    }

    // ========== PLAN UPGRADE ==========

    @Post('me/upgrade-plan')
    @Roles('LAB_ADMIN')
    async upgradePlan(
        @Request() req: any,
        @Body() body: { plan: string }
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.licensingService.upgradePlan(tenantId, body.plan);
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
    @ApiOperation({ summary: 'Create a new tenant', description: 'Creates a new laboratory tenant with an admin user' })
    @ApiResponse({ status: 201, description: 'Tenant created successfully' })
    async create(@Body() createTenantDto: CreateTenantDto) {
        return this.tenantsService.createTenantWithAdmin(createTenantDto);
    }

    @Get()
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'List all tenants', description: 'Returns all registered tenants with user counts and subscription info' })
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
    @ApiOperation({ summary: 'Delete a tenant', description: 'Permanently deletes a tenant and all associated data' })
    @ApiParam({ name: 'id', description: 'Tenant ID' })
    @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
    async deleteTenant(@Param('id') id: string) {
        return this.tenantsService.delete(id);
    }

    // ========== LICENSE CODE MANAGEMENT (Super Admin) ==========

    @Post('admin/licenses')
    @Roles('SUPER_ADMIN', 'PLATFORM_SALES')
    async generateLicenseCode(
        @Request() req: any,
        @Body() body: { features: string[]; tenantId?: string; note?: string }
    ) {
        return this.licensingService.generateLicenseCode({
            features: body.features,
            generatedBy: req.user.id,
            tenantId: body.tenantId,
            note: body.note,
        });
    }

    @Get('admin/licenses')
    @Roles('SUPER_ADMIN', 'PLATFORM_SALES')
    async listLicenseCodes(
        @Query('status') status?: string,
        @Query('feature') feature?: string,
    ) {
        return this.licensingService.listLicenseCodes({ status, feature });
    }

    @Delete('admin/licenses/:id')
    @Roles('SUPER_ADMIN')
    async revokeLicenseCode(@Param('id') id: string) {
        return this.licensingService.revokeLicenseCode(id);
    }
}
