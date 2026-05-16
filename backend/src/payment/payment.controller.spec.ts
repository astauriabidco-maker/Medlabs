import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { PaymentController } from './payment.controller';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PrismaService } from '../prisma.service';

describe('PaymentController patient payment access', () => {
  const provider = {
    displayName: 'Campay',
    providerName: 'CAMPAY',
    authenticate: jest.fn().mockResolvedValue(undefined),
    initiatePayment: jest.fn().mockResolvedValue({ reference: 'pay-ref-123' }),
  };

  const providerFactory = {
    getAvailableProviders: jest.fn(),
    getProvider: jest.fn().mockReturnValue(provider),
  } as unknown as PaymentProviderFactory;

  const prisma = {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwtService = {
    verify: jest.fn(),
  } as unknown as JwtService;

  let controller: PaymentController;

  beforeEach(() => {
    process.env.PATIENT_JWT_SECRET =
      'test-patient-secret-with-at-least-32-chars';
    process.env.PAYMENT_WEBHOOK_SECRET =
      'test-payment-webhook-secret-with-32-chars';
    jest.clearAllMocks();
    controller = new PaymentController(providerFactory, prisma, jwtService);
  });

  afterEach(() => {
    delete process.env.PAYMENT_WEBHOOK_SECRET;
  });

  it('rejects payment initiation without patient payment token', async () => {
    await expect(
      controller.initiatePayment({ documentId: 'doc-123' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('requires a valid token before initiating payment', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({
      sub: 'doc-123',
      type: 'patient_payment',
    });
    (prisma.document.findFirst as jest.Mock).mockResolvedValue({
      id: 'doc-123',
      tenantId: 'tenant-123',
      folderRef: 'LAB-001',
      patientPhone: '+237612345678',
      price: 2500,
      paymentStatus: 'UNPAID',
      tenant: {},
    });

    await controller.initiatePayment({
      documentId: 'doc-123',
      paymentAccessToken: 'patient-payment-token',
    });

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc-123',
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
        status: { not: 'EXPIRED' },
      },
      include: { tenant: true },
    });
    expect(prisma.transaction.create).toHaveBeenCalled();
  });

  it('rejects unsigned payment webhooks when a secret is configured', async () => {
    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: 'tx-123',
      tenantId: 'tenant-123',
      documentId: 'doc-123',
      provider: 'CAMPAY',
    });

    await expect(
      controller.handleWebhook(
        { reference: 'pay-ref-123', status: 'SUCCESS' },
        { headers: {} },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts signed payment webhooks before marking document paid', async () => {
    const payload = {
      reference: 'pay-ref-123',
      status: 'SUCCESS',
      amount: 2500,
      currency: 'XAF',
    };
    const signaturePayload = [
      'pay-ref-123',
      'SUCCESS',
      2500,
      'XAF',
      '',
      '',
    ].join('.');
    const signature = createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET!)
      .update(signaturePayload)
      .digest('hex');

    (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
      id: 'tx-123',
      tenantId: 'tenant-123',
      documentId: 'doc-123',
      provider: 'CAMPAY',
      amount: 2500,
    });

    await controller.handleWebhook(payload, {
      headers: { 'x-medlab-signature': signature },
    });

    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'tx-123' },
      data: { status: 'SUCCESS' },
    });
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-123' },
      data: { paymentStatus: 'PAID' },
    });
  });
});
