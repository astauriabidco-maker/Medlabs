import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PatientAuthGuard } from './patient-auth.guard';

interface PatientRequest extends Request {
    patient: {
        phone: string;
        tenantId: string;
    };
}

@Controller('patient')
export class PatientHistoryController {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get patient's document history
     * GET /api/patient/documents
     * Protected by PatientAuthGuard
     */
    @Get('documents')
    @UseGuards(PatientAuthGuard)
    async getDocuments(@Request() req: PatientRequest) {
        const { phone, tenantId } = req.patient;

        // First, resolve tenantId from slug if it's a slug
        let resolvedTenantId = tenantId;

        // Check if tenantId is a UUID or a slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);

        if (!isUuid) {
            // It's a slug, resolve to tenant ID
            const tenant = await this.prisma.tenant.findUnique({
                where: { slug: tenantId },
                select: { id: true },
            });

            if (!tenant) {
                return { documents: [], message: 'Tenant not found' };
            }

            resolvedTenantId = tenant.id;
        }

        // Query documents for this phone number and tenant
        // Force filter by phone from JWT to prevent manipulation
        const documents = await this.prisma.document.findMany({
            where: {
                patientPhone: phone,
                tenantId: resolvedTenantId,
                status: { in: ['UPLOADED', 'NOTIFIED', 'DELIVERED', 'OPENED'] },
            },
            select: {
                id: true,
                patientFirstName: true,
                patientLastName: true,
                createdAt: true,
                status: true,
                accessKey: true,
                mimeType: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map to safe response format
        return {
            documents: documents.map(doc => ({
                id: doc.id,
                patientName: `${doc.patientFirstName || ''} ${doc.patientLastName}`.trim(),
                date: doc.createdAt.toISOString(),
                status: doc.status,
                mimeType: doc.mimeType,
                downloadUrl: `/api/guest/download/${doc.accessKey}`,
            })),
            total: documents.length,
        };
    }

    /**
     * Get patient profile info
     * GET /api/patient/profile
     */
    @Get('profile')
    @UseGuards(PatientAuthGuard)
    async getProfile(@Request() req: PatientRequest) {
        const { phone, tenantId } = req.patient;

        // Get the most recent document to extract patient info
        const latestDoc = await this.prisma.document.findFirst({
            where: { patientPhone: phone },
            orderBy: { createdAt: 'desc' },
            select: {
                patientFirstName: true,
                patientLastName: true,
                patientEmail: true,
            },
        });

        return {
            phone,
            firstName: latestDoc?.patientFirstName || null,
            lastName: latestDoc?.patientLastName || null,
            email: latestDoc?.patientEmail || null,
        };
    }
}
