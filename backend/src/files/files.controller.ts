import {
    Controller,
    Get,
    Param,
    Res,
    Req,
    UseGuards,
    NotFoundException,
    StreamableFile,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards';
import { TenantedPrismaService } from '../prisma/tenanted-prisma.factory';

/**
 * FilesController
 * 
 * Secure file download endpoint that enforces tenant isolation.
 * CRITICAL: Never stream files without first verifying tenant ownership.
 */
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
    private readonly logger = new Logger(FilesController.name);
    private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

    constructor(
        private readonly tenantedPrisma: TenantedPrismaService,
    ) { }

    /**
     * Download a document file
     * 
     * Security Flow:
     * 1. Query DB with tenant filter (automatic via TenantedPrismaService)
     * 2. If document not found → 404 (don't reveal existence)
     * 3. Verify file exists on disk
     * 4. Stream file to client
     */
    @Get(':id/download')
    async downloadFile(
        @Param('id') id: string,
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        // 1. Query with tenant scoping (automatic)
        const document = await this.tenantedPrisma.client.document.findFirst({
            where: { id },
            select: {
                id: true,
                fileKey: true,
                mimeType: true,
                patientFirstName: true,
                patientLastName: true,
            },
        });

        // 2. Not found = 404 (don't reveal it exists for other tenant)
        if (!document) {
            this.logger.warn(`File access denied: ${id} for tenant ${this.tenantedPrisma.tenantId}`);
            throw new NotFoundException('Document not found');
        }

        // 3. Resolve file path
        const filePath = path.isAbsolute(document.fileKey)
            ? document.fileKey
            : path.join(this.uploadDir, document.fileKey);

        if (!existsSync(filePath)) {
            this.logger.error(`File missing on disk: ${filePath}`);
            throw new NotFoundException('File not found on storage');
        }

        // 4. Get file stats
        const fileStats = await stat(filePath);

        // 5. Set response headers
        const fileName = `${document.patientLastName || 'results'}_results.pdf`;
        res.set({
            'Content-Type': document.mimeType || 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': fileStats.size,
            'Cache-Control': 'private, no-cache',
        });

        // 6. Stream file
        const fileStream = createReadStream(filePath);
        return new StreamableFile(fileStream);
    }

    /**
     * View file inline (for PDF preview)
     */
    @Get(':id/view')
    async viewFile(
        @Param('id') id: string,
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const document = await this.tenantedPrisma.client.document.findFirst({
            where: { id },
            select: {
                id: true,
                fileKey: true,
                mimeType: true,
            },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        const filePath = path.isAbsolute(document.fileKey)
            ? document.fileKey
            : path.join(this.uploadDir, document.fileKey);

        if (!existsSync(filePath)) {
            throw new NotFoundException('File not found on storage');
        }

        const fileStats = await stat(filePath);

        res.set({
            'Content-Type': document.mimeType || 'application/pdf',
            'Content-Disposition': 'inline',
            'Content-Length': fileStats.size,
            'Cache-Control': 'private, max-age=3600',
        });

        const fileStream = createReadStream(filePath);
        return new StreamableFile(fileStream);
    }
}
