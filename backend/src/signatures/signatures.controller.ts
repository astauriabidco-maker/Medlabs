import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Signatures')
@ApiBearerAuth()
@Controller('signatures')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SignaturesController {
    constructor(private readonly signaturesService: SignaturesService) { }

    /**
     * Sign a document electronically
     */
    @Post('sign/:documentId')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'MANAGER')
    @ApiOperation({ summary: 'Sign a document electronically' })
    signDocument(
        @User() user: any,
        @Param('documentId') documentId: string,
        @Body() body?: { pin?: string },
    ) {
        return this.signaturesService.signDocument(user.tenantId, documentId, user.id, body?.pin);
    }

    /**
     * Verify a document signature
     */
    @Get('verify/:documentId')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'MANAGER', 'BUSINESS_MANAGER')
    @ApiOperation({ summary: 'Verify a document signature' })
    verifySignature(
        @User() user: any,
        @Param('documentId') documentId: string,
    ) {
        return this.signaturesService.verifySignature(user.tenantId, documentId);
    }

    /**
     * Get signature history for a document
     */
    @Get('history/:documentId')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'MANAGER', 'BUSINESS_MANAGER')
    @ApiOperation({ summary: 'Get signature history for a document' })
    getSignatureHistory(
        @User() user: any,
        @Param('documentId') documentId: string,
    ) {
        return this.signaturesService.getSignatureHistory(user.tenantId, documentId);
    }
}
