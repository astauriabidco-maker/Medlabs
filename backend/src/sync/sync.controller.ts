import {
    Controller,
    Post,
    Get,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { FeatureGuard, RequireFeature } from '../auth/feature.guard';
import { ApiKeyAuthGuard } from '../auth/api-key.guard';
import { ResultsService } from '../results/results.service';

interface SyncUploadDto {
    patientName: string;
    patientEmail?: string;
    patientPhone: string;
    patientDob?: string;
    folderRef: string;
}

interface SyncUploadResponse {
    success: boolean;
    documentId?: string;
    accessCode?: string;
    error?: string;
    timestamp: string;
}

/**
 * Sync Controller for Windows Automation Agent
 * Two authentication modes:
 * 1. /upload - JWT authenticated (for web users)
 * 2. /bot - API Key authenticated (for Windows automation)
 */
@Controller('sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly resultsService: ResultsService) { }

    /**
     * Upload a result PDF from authenticated web user
     * Uses JWT authentication
     */
    @Post('upload')
    @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    @RequireFeature('AUTO_SYNC')
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @User() user: any,
        @UploadedFile() file: any,
        @Body() dto: SyncUploadDto,
    ): Promise<SyncUploadResponse> {
        return this.processUpload(file, dto, user.tenantId, user.sub);
    }

    /**
     * Upload a result PDF from Windows automation bot
     * Uses API Key authentication (x-api-key header)
     */
    @Post('bot')
    @UseGuards(ApiKeyAuthGuard, FeatureGuard)
    @RequireFeature('AUTO_SYNC')
    @UseInterceptors(FileInterceptor('file'))
    async botUpload(
        @Req() req: Request,
        @UploadedFile() file: any,
        @Body() dto: SyncUploadDto,
    ): Promise<SyncUploadResponse> {
        const user = (req as any).user;
        return this.processUpload(file, dto, user.tenantId, 'windows-bot');
    }

    /**
     * Health check for the sync service (JWT auth)
     */
    @Post('ping')
    @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    @RequireFeature('AUTO_SYNC')
    async ping(@User() user: any): Promise<{ status: string; tenantId: string; timestamp: string }> {
        return {
            status: 'ok',
            tenantId: user.tenantId,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Health check for API key auth (for Windows bot to test connection)
     */
    @Get('health')
    @UseGuards(ApiKeyAuthGuard, FeatureGuard)
    @RequireFeature('AUTO_SYNC')
    async health(@Req() req: Request): Promise<{ status: string; tenant: string; timestamp: string }> {
        const tenant = (req as any).tenant;
        return {
            status: 'ok',
            tenant: tenant.name,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Common upload processing logic
     */
    private async processUpload(
        file: any,
        dto: SyncUploadDto,
        tenantId: string,
        uploadedBy: string,
    ): Promise<SyncUploadResponse> {
        const timestamp = new Date().toISOString();

        try {
            // Validate file
            if (!file) {
                throw new BadRequestException('No PDF file provided');
            }

            // Validate DTO
            if (!dto.folderRef || !dto.patientPhone || !dto.patientName) {
                throw new BadRequestException('folderRef, patientPhone, and patientName are required');
            }

            // Validate file type
            if (file.mimetype !== 'application/pdf') {
                throw new BadRequestException('Only PDF files are accepted');
            }

            this.logger.log(`[SYNC] Upload request from ${uploadedBy} for folder ${dto.folderRef}`);

            // Use existing ResultsService to process the upload
            const result = await this.resultsService.create(
                {
                    patientName: dto.patientName,
                    patientEmail: dto.patientEmail || `${dto.patientPhone.replace(/\D/g, '')}@sync.medlab.local`,
                    patientPhone: dto.patientPhone,
                    patientDob: dto.patientDob || '',
                    folderRef: dto.folderRef,
                },
                file,
                tenantId,
                uploadedBy,
            );

            this.logger.log(`[SYNC] Upload successful - Document: ${result.documentId}`);

            return {
                success: true,
                documentId: result.documentId,
                accessCode: result.accessCode,
                timestamp,
            };
        } catch (error: any) {
            this.logger.error(`[SYNC] Upload failed: ${error.message}`);

            return {
                success: false,
                error: error.message || 'Upload failed',
                timestamp,
            };
        }
    }
}
