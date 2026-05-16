import {
  Controller,
  Get,
  UseGuards,
  Request as RequestDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
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
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(
    tenantIdOrSlug: string,
  ): Promise<string | null> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tenantIdOrSlug,
      );
    if (isUuid) return tenantIdOrSlug;

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantIdOrSlug },
      select: { id: true },
    });

    return tenant?.id || null;
  }

  /**
   * Get patient's document history
   * GET /api/patient/documents
   * Protected by PatientAuthGuard
   */
  @Get('documents')
  @UseGuards(PatientAuthGuard)
  async getDocuments(@RequestDecorator() req: PatientRequest) {
    const { phone, tenantId } = req.patient;

    const resolvedTenantId = await this.resolveTenantId(tenantId);
    if (!resolvedTenantId) {
      return { documents: [], message: 'Tenant not found' };
    }

    // Query documents for this phone number and tenant
    // Force filter by phone from JWT to prevent manipulation
    const documents = await this.prisma.document.findMany({
      where: {
        patientPhone: phone,
        tenantId: resolvedTenantId,
        status: { in: ['UPLOADED', 'NOTIFIED', 'DELIVERED', 'OPENED'] },
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
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
      documents: documents.map((doc) => ({
        id: doc.id,
        patientName:
          `${doc.patientFirstName || ''} ${doc.patientLastName}`.trim(),
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
  async getProfile(@RequestDecorator() req: PatientRequest) {
    const { phone, tenantId } = req.patient;
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    // Get the most recent document to extract patient info
    const latestDoc = await this.prisma.document.findFirst({
      where: {
        patientPhone: phone,
        ...(resolvedTenantId ? { tenantId: resolvedTenantId } : {}),
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
      },
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
