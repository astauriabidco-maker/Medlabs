import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards';

interface InitiatePaymentDto {
    documentId: string;
    phoneNumber?: string; // Optional, uses patient phone if not provided
}

interface WebhookPayload {
    reference: string;
    status: string;
    amount?: number;
    currency?: string;
    operator?: string;
    external_reference?: string;
    // MTN MoMo specific
    externalId?: string;
    // Orange Money specific
    orderId?: string;
    payToken?: string;
}

@Controller('payment')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        private readonly providerFactory: PaymentProviderFactory,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Get list of available payment providers
     */
    @Get('providers')
    getAvailableProviders() {
        return this.providerFactory.getAvailableProviders();
    }

    /**
     * Initiate a Mobile Money payment for a document
     */
    @Post('initiate')
    @HttpCode(HttpStatus.OK)
    async initiatePayment(@Body() dto: InitiatePaymentDto) {
        const { documentId, phoneNumber } = dto;

        // Get the document with tenant
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
            include: { tenant: true },
        });

        if (!document) {
            throw new BadRequestException('Document not found');
        }

        // Type assertion for fields that need Prisma regeneration
        const doc = document as any;

        if (doc.paymentStatus === 'PAID') {
            throw new BadRequestException('Document already paid');
        }

        if (doc.paymentStatus === 'FREE') {
            throw new BadRequestException('Document is free, no payment required');
        }

        if (!doc.price || doc.price <= 0) {
            throw new BadRequestException('Invalid document price');
        }

        // Get the payment provider for this tenant
        const provider = this.providerFactory.getProvider(document.tenant as any);

        // Validate provider has credentials configured
        try {
            await provider.authenticate();
        } catch {
            throw new BadRequestException(`${provider.displayName} not configured for this laboratory`);
        }

        // Use provided phone or patient phone
        const payerPhone = phoneNumber || document.patientPhone;
        if (!payerPhone) {
            throw new BadRequestException('Phone number required');
        }

        // Generate a unique reference for this transaction
        const transactionRef = `MEDLAB-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Initiate payment with the selected provider
        const result = await provider.initiatePayment(
            payerPhone,
            doc.price,
            transactionRef,
            `Résultat médical - ${document.folderRef}`,
        );

        // Create transaction record
        await this.prisma.transaction.create({
            data: {
                documentId: document.id,
                tenantId: document.tenantId,
                amount: doc.price,
                currency: 'XAF',
                provider: provider.providerName,
                phoneNumber: payerPhone,
                externalRef: result.reference,
                status: 'PENDING',
            },
        });

        this.logger.log(`Payment initiated via ${provider.displayName}: ${result.reference}`);

        return {
            success: true,
            provider: provider.providerName,
            message: 'Une demande de paiement a été envoyée à votre téléphone',
            reference: result.reference,
            ussdCode: result.ussdCode,
            amount: doc.price,
            currency: 'XAF',
        };
    }

    /**
     * Webhook endpoint for payment provider callbacks
     * Handles webhooks from Campay, Orange Money, and MTN MoMo
     */
    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() payload: WebhookPayload) {
        this.logger.log(`Received webhook: ${JSON.stringify(payload)}`);

        // Normalize reference from different providers
        const reference = payload.reference || payload.payToken || payload.externalId;
        const externalRef = payload.external_reference || payload.orderId || payload.externalId;

        if (!reference) {
            this.logger.warn('Webhook received without reference');
            return { received: true };
        }

        // Find the transaction
        const transaction = await this.prisma.transaction.findFirst({
            where: { externalRef: reference },
            include: { document: true },
        });

        if (!transaction) {
            this.logger.warn(`Transaction not found for reference: ${reference}`);
            return { received: true };
        }

        // Normalize status from different providers
        let normalizedStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
        const statusUpper = payload.status?.toUpperCase();

        if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(statusUpper)) {
            normalizedStatus = 'SUCCESS';
        } else if (['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(statusUpper)) {
            normalizedStatus = 'FAILED';
        }

        // Update transaction
        await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: normalizedStatus },
        });

        // If successful, update document payment status
        if (normalizedStatus === 'SUCCESS') {
            await (this.prisma.document as any).update({
                where: { id: transaction.documentId },
                data: { paymentStatus: 'PAID' },
            });

            // Create audit log
            await this.prisma.auditLog.create({
                data: {
                    tenantId: transaction.tenantId,
                    action: 'PAYMENT_RECEIVED',
                    resourceId: transaction.documentId,
                    description: `Payment of ${transaction.amount} XAF received via ${transaction.provider}`,
                },
            });

            this.logger.log(`Payment successful for document ${transaction.documentId}`);
        }

        return { received: true };
    }

    /**
     * Check payment status for a document
     */
    @Get('status/:documentId')
    async checkStatus(@Param('documentId') documentId: string) {
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new BadRequestException('Document not found');
        }

        // Type assertion
        const doc = document as any;

        // Get the latest transaction for this document
        const transaction = await this.prisma.transaction.findFirst({
            where: { documentId },
            orderBy: { createdAt: 'desc' },
        });

        return {
            documentId: document.id,
            price: doc.price || 0,
            paymentStatus: doc.paymentStatus || 'FREE',
            lastTransaction: transaction ? {
                id: transaction.id,
                status: transaction.status,
                reference: transaction.externalRef,
                provider: transaction.provider,
                createdAt: transaction.createdAt,
            } : null,
        };
    }

    /**
     * Verify a transaction with the payment provider
     */
    @Get('verify/:reference')
    @UseGuards(JwtAuthGuard)
    async verifyTransaction(@Param('reference') reference: string, @Req() req: any) {
        const tenantId = req.user.tenantId;

        if (!tenantId) {
            throw new BadRequestException('Tenant context required');
        }

        // Find transaction to get the provider used
        const transaction = await this.prisma.transaction.findFirst({
            where: { externalRef: reference },
            include: {
                tenant: true,
            },
        });

        if (!transaction) {
            throw new BadRequestException('Transaction not found');
        }

        // Get the provider
        const provider = this.providerFactory.getProvider(transaction.tenant as any);

        // Check status with provider
        const status = await provider.checkStatus(reference);

        // Process if status changed
        if (status.status === 'SUCCESS') {
            await this.handleWebhook({
                reference: status.reference,
                status: status.status,
                amount: status.amount,
                external_reference: status.externalReference,
            });
        }

        return {
            reference: status.reference,
            status: status.status,
            amount: status.amount,
            currency: status.currency,
            provider: provider.providerName,
        };
    }

    /**
     * Test connection with configured payment provider
     */
    @Post('test-connection')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async testConnection(@Req() req: any) {
        const tenantId = req.user.tenantId;

        if (!tenantId) {
            throw new BadRequestException('Tenant context required');
        }

        // Get tenant with payment config
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            throw new BadRequestException('Tenant not found');
        }

        try {
            const provider = this.providerFactory.getProvider(tenant as any);
            const success = await provider.testConnection();

            return {
                success,
                provider: provider.providerName,
                message: success ? 'Connection successful' : 'Authentication failed',
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection failed',
            };
        }
    }
}
