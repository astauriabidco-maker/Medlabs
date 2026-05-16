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
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards';

interface InitiatePaymentDto {
  documentId: string;
  paymentAccessToken: string;
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

type WebhookStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getPatientSecret(): string {
    const secret = process.env.PATIENT_JWT_SECRET;
    if (!secret) {
      throw new Error('CRITICAL: PATIENT_JWT_SECRET is not configured.');
    }
    return secret;
  }

  private verifyPaymentAccessToken(documentId: string, token?: string): void {
    if (!token) {
      throw new UnauthorizedException('Payment access token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.getPatientSecret(),
      });
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired payment access token',
      );
    }

    if (payload.type !== 'patient_payment' || payload.sub !== documentId) {
      throw new ForbiddenException(
        'Payment token does not match this document',
      );
    }
  }

  private getWebhookSecret(provider?: string): string | undefined {
    const providerKey = provider
      ? `${provider.toUpperCase()}_WEBHOOK_SECRET`
      : undefined;
    return (
      (providerKey ? process.env[providerKey] : undefined) ||
      process.env.PAYMENT_WEBHOOK_SECRET
    );
  }

  private buildWebhookSignaturePayload(payload: WebhookPayload): string {
    const reference =
      payload.reference || payload.payToken || payload.externalId || '';
    const externalRef =
      payload.external_reference || payload.orderId || payload.externalId || '';
    return [
      reference,
      payload.status || '',
      payload.amount ?? '',
      payload.currency || '',
      payload.operator || '',
      externalRef,
    ].join('.');
  }

  private getRequestId(req?: any): string | undefined {
    const value = req?.requestId || req?.headers?.['x-request-id'];
    return Array.isArray(value) ? value[0] : value;
  }

  private verifyWebhookSignature(
    payload: WebhookPayload,
    provider: string,
    signature?: string,
  ): void {
    const secret = this.getWebhookSecret(provider);

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException(
          `Missing webhook secret for ${provider}`,
        );
      }
      this.logger.warn(
        `Webhook signature verification skipped for ${provider}: no secret configured`,
      );
      return;
    }

    if (!signature) {
      throw new UnauthorizedException('Missing payment webhook signature');
    }

    const normalizedSignature = signature.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : signature;
    const expected = createHmac('sha256', secret)
      .update(this.buildWebhookSignaturePayload(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(normalizedSignature, 'hex');

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException('Invalid payment webhook signature');
    }
  }

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
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 5 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  async initiatePayment(@Body() dto: InitiatePaymentDto, @Req() req?: any) {
    const { documentId, phoneNumber, paymentAccessToken } = dto;
    this.verifyPaymentAccessToken(documentId, paymentAccessToken);
    const requestId = this.getRequestId(req);

    // Get the document with tenant
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
        status: { not: 'EXPIRED' },
      },
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
      throw new BadRequestException(
        `${provider.displayName} not configured for this laboratory`,
      );
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

    this.logger.log({
      event: 'payment_initiated',
      requestId,
      provider: provider.providerName,
      tenantId: document.tenantId,
      documentId: document.id,
      reference: result.reference,
      amount: doc.price,
      currency: 'XAF',
    });

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
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: WebhookPayload, @Req() req?: any) {
    const requestId = this.getRequestId(req);

    // Normalize reference from different providers
    const reference =
      payload.reference || payload.payToken || payload.externalId;
    const externalRef =
      payload.external_reference || payload.orderId || payload.externalId;

    if (!reference) {
      this.logger.warn({
        event: 'payment_webhook_missing_reference',
        requestId,
      });
      return { received: true };
    }

    // Find the transaction
    const transaction = await this.prisma.transaction.findFirst({
      where: { externalRef: reference },
      include: { document: true },
    });

    if (!transaction) {
      this.logger.warn({
        event: 'payment_webhook_unknown_transaction',
        requestId,
        reference,
      });
      return { received: true };
    }

    this.logger.log({
      event: 'payment_webhook_received',
      requestId,
      provider: transaction.provider,
      tenantId: transaction.tenantId,
      documentId: transaction.documentId,
      reference,
      status: payload.status,
    });

    const signature =
      req?.headers?.['x-medlab-signature'] ||
      req?.headers?.['x-payment-signature'] ||
      req?.headers?.['x-campay-signature'] ||
      req?.headers?.['x-orange-signature'] ||
      req?.headers?.['x-mtn-signature'];
    this.verifyWebhookSignature(
      payload,
      transaction.provider,
      Array.isArray(signature) ? signature[0] : signature,
    );

    // Normalize status from different providers
    let normalizedStatus: WebhookStatus = 'PENDING';
    const statusUpper = payload.status?.toUpperCase();

    if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(statusUpper)) {
      normalizedStatus = 'SUCCESS';
    } else if (
      ['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(statusUpper)
    ) {
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

      this.logger.log({
        event: 'payment_marked_paid',
        requestId,
        provider: transaction.provider,
        tenantId: transaction.tenantId,
        documentId: transaction.documentId,
        reference,
        amount: transaction.amount,
      });
    }

    return { received: true };
  }

  /**
   * Check payment status for a document
   */
  @Get('status/:documentId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async checkStatus(@Param('documentId') documentId: string, @Req() req: any) {
    const token =
      req.query?.paymentAccessToken || req.headers?.['x-payment-access-token'];
    this.verifyPaymentAccessToken(
      documentId,
      Array.isArray(token) ? token[0] : token,
    );

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
        status: { not: 'EXPIRED' },
      },
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
      transactionStatus: transaction?.status || null,
    };
  }

  /**
   * Verify a transaction with the payment provider
   */
  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  async verifyTransaction(
    @Param('reference') reference: string,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    // Find transaction to get the provider used
    const transaction = await this.prisma.transaction.findFirst({
      where: { externalRef: reference, tenantId },
      include: {
        tenant: true,
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    // Get the provider
    const provider = this.providerFactory.getProvider(
      transaction.tenant as any,
    );

    // Check status with provider
    const status = await provider.checkStatus(reference);

    // Process if status changed
    if (status.status === 'SUCCESS') {
      await this.handleWebhook(
        {
          reference: status.reference,
          status: status.status,
          amount: status.amount,
          external_reference: status.externalReference,
        },
        {
          headers: {
            'x-medlab-signature': this.signInternalWebhookStatus(
              status.reference,
              status.status,
              status.amount,
              status.externalReference,
              transaction.provider,
            ),
          },
        },
      );
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

  private signInternalWebhookStatus(
    reference: string,
    status: string,
    amount: number | undefined,
    externalReference: string | undefined,
    provider: string,
  ): string | undefined {
    const secret = this.getWebhookSecret(provider);
    if (!secret) return undefined;

    const payload: WebhookPayload = {
      reference,
      status,
      amount,
      external_reference: externalReference,
    };
    return createHmac('sha256', secret)
      .update(this.buildWebhookSignaturePayload(payload))
      .digest('hex');
  }
}
