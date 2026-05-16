import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

interface CreatePartnerRequestDto {
  laboratoryName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  estimatedVolume?: string;
  message?: string;
}

@Controller('partner-requests')
export class PartnerRequestsController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000, blockDuration: 10 * 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async createRequest(@Body() dto: CreatePartnerRequestDto) {
    // Store the partner request
    const partnerRequest = await this.prisma.partnerRequest.create({
      data: {
        laboratoryName: dto.laboratoryName,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        estimatedVolume: dto.estimatedVolume || null,
        message: dto.message || null,
        status: 'PENDING',
      },
    });

    // Log the audit event (action, description, actorId, tenantId, resourceId)
    await this.audit.log(
      'PARTNER_REQUEST_CREATED' as any,
      `New partner request from ${dto.laboratoryName} (${dto.city})`,
      undefined,
      undefined,
      partnerRequest.id,
    );

    return {
      success: true,
      id: partnerRequest.id,
      message: 'Partner request submitted successfully',
    };
  }
}
