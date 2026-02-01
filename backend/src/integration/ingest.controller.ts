import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Request,
    UseGuards,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ApiKeyAuthGuard } from '../auth/api-key.guard';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

interface IngestDto {
    format: 'JSON' | 'HL7';
    data: any;
}

@Controller('connect')
export class IngestController {
    constructor(private readonly integrationService: IntegrationService) { }

    /**
     * Ingest data from external LIS
     * POST /api/connect/ingest
     * Protected by API Key (from syncApiKey field)
     */
    @Post('ingest')
    @UseGuards(ApiKeyAuthGuard)
    @HttpCode(HttpStatus.OK)
    async ingest(@Request() req: any, @Body() body: IngestDto) {
        const tenantId = req.tenant?.id;

        if (!tenantId) {
            return {
                status: 'error',
                message: 'Invalid API key - tenant not found',
            };
        }

        if (!body.format || !body.data) {
            return {
                status: 'error',
                message: 'Missing required fields: format and data',
            };
        }

        const validFormats = ['JSON', 'HL7'];
        if (!validFormats.includes(body.format)) {
            return {
                status: 'error',
                message: 'Invalid format. Must be "JSON" or "HL7"',
            };
        }

        const result = await this.integrationService.ingest(
            tenantId,
            body.format,
            body.data
        );

        return {
            status: result.status.toLowerCase(),
            documentId: result.documentId,
            message: result.message,
        };
    }

    /**
     * Get integration logs
     * GET /api/connect/logs
     */
    @Get('logs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN')
    async getLogs(@Request() req: any, @Query('limit') limit?: string) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return [];
        }

        const logs = await this.integrationService.getLogs(
            tenantId,
            limit ? parseInt(limit, 10) : 50
        );

        return logs.map((log: any) => ({
            id: log.id,
            createdAt: log.createdAt,
            format: log.format,
            status: log.status,
            errorMessage: log.errorMessage,
            documentId: log.documentId,
            patientPhone: log.patientPhone,
            // Don't expose full payload for security
            payloadPreview: log.payload?.substring(0, 100) + (log.payload?.length > 100 ? '...' : ''),
        }));
    }

    /**
     * Get integration status
     * GET /api/connect/status
     */
    @Get('status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN')
    async getStatus(@Request() req: any) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { enabled: false };
        }

        const tenant = await this.integrationService['prisma'].tenant.findUnique({
            where: { id: tenantId },
            select: {
                hl7IntegrationEnabled: true,
                syncApiKey: true,
            },
        });

        return {
            enabled: tenant?.hl7IntegrationEnabled || false,
            hasApiKey: !!tenant?.syncApiKey,
            endpoint: '/api/connect/ingest',
        };
    }

    /**
     * Toggle integration enabled/disabled
     * PATCH /api/connect/toggle
     */
    @Patch('toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN')
    async toggle(@Request() req: any, @Body() body: { enabled: boolean }) {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return { success: false, message: 'Tenant not found' };
        }

        const result = await this.integrationService.toggleIntegration(
            tenantId,
            body.enabled
        );

        return {
            success: true,
            enabled: result.hl7IntegrationEnabled,
        };
    }

    /**
     * Get API documentation
     * GET /api/connect/docs
     */
    @Get('docs')
    async getDocs() {
        return {
            version: '1.0',
            endpoints: [
                {
                    method: 'POST',
                    path: '/api/connect/ingest',
                    description: 'Ingest lab results from LIS',
                    authentication: 'API Key (X-API-Key header)',
                    body: {
                        format: 'JSON | HL7',
                        data: 'object | string',
                    },
                },
            ],
            jsonSchema: {
                patient: {
                    name: 'string (required)',
                    phone: 'string (required for notifications)',
                    dateOfBirth: 'string (optional, DD/MM/YYYY)',
                },
                results: [
                    {
                        test: 'string - Test name',
                        value: 'string - Result value',
                        unit: 'string - Unit of measurement',
                        range: 'string - Reference range',
                        isAbnormal: 'boolean (optional)',
                    },
                ],
            },
            hl7Support: {
                messageType: 'ORU^R01',
                segments: ['MSH', 'PID', 'OBX'],
                notes: 'Standard HL7 v2.x delimiters (|^~\\&)',
            },
            example: {
                format: 'JSON',
                data: {
                    patient: {
                        name: 'Jean Dupont',
                        phone: '+237699123456',
                    },
                    results: [
                        {
                            test: 'Glycémie à jeun',
                            value: '1.05',
                            unit: 'g/L',
                            range: '0.70 - 1.10',
                            isAbnormal: false,
                        },
                        {
                            test: 'Hémoglobine',
                            value: '15.2',
                            unit: 'g/dL',
                            range: '12.0 - 16.0',
                            isAbnormal: false,
                        },
                    ],
                },
            },
        };
    }
}
