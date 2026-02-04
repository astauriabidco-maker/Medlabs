/**
 * Campay Service Unit Tests
 * Tests payment initiation, status checking, and webhook processing
 */
import { Test, TestingModule } from '@nestjs/testing';
import { CampayService } from './campay.service';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock PrismaService
const createMockPrismaService = () => ({
    tenant: {
        findUnique: jest.fn(),
    },
    document: {
        findUnique: jest.fn(),
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
});

describe('CampayService', () => {
    let service: CampayService;
    let prisma: ReturnType<typeof createMockPrismaService>;

    beforeEach(async () => {
        prisma = createMockPrismaService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CampayService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CampayService>(CampayService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Note: detectProvider and formatPhone are private methods
    // They are tested indirectly through public methods like initiatePayment

    describe('authenticate', () => {
        it('should fetch token from Campay API', async () => {
            prisma.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                campayUsername: 'test_user',
                campayPassword: 'test_pass',
            });

            mockedAxios.post.mockResolvedValue({
                data: { token: 'abc123', expires_in: 3600 },
            });

            const token = await service.authenticate('tenant-1');

            expect(token).toBe('abc123');
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/token/'),
                { username: 'test_user', password: 'test_pass' },
                { headers: { 'Content-Type': 'application/json' } },
            );
        });

        it('should return cached token if not expired', async () => {
            // First call - fetch new token
            prisma.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                campayUsername: 'test_user',
                campayPassword: 'test_pass',
            });

            mockedAxios.post.mockResolvedValue({
                data: { token: 'cached_token', expires_in: 3600 },
            });

            await service.authenticate('tenant-1');

            // Second call - should return cached
            const token = await service.authenticate('tenant-1');

            expect(token).toBe('cached_token');
            // Should only be called once (first time)
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should throw error if tenant has no credentials', async () => {
            prisma.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                campayUsername: null,
                campayPassword: null,
            });

            await expect(service.authenticate('tenant-1')).rejects.toThrow();
        });
    });

    describe('initiatePayment', () => {
        beforeEach(() => {
            // Setup default mocks
            prisma.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                campayUsername: 'test_user',
                campayPassword: 'test_pass',
            });
            mockedAxios.post.mockResolvedValue({
                data: { token: 'auth_token', expires_in: 3600 },
            });
        });

        it('should initiate payment and create transaction record', async () => {
            prisma.document.findUnique.mockResolvedValue({
                id: 'doc-1',
                tenantId: 'tenant-1',
            });

            mockedAxios.post
                .mockResolvedValueOnce({ data: { token: 'auth_token', expires_in: 3600 } })
                .mockResolvedValueOnce({
                    data: {
                        reference: 'REF123',
                        ussd_code: '*126*1*1#',
                        status: 'PENDING',
                    },
                });

            prisma.transaction.create.mockResolvedValue({
                id: 'txn-1',
                reference: 'REF123',
            });

            const result = await service.initiatePayment(
                'tenant-1',
                'doc-1',
                5000,
                '690123456',
                'Test payment',
            );

            expect(result.reference).toBe('REF123');
            // Verify transaction was created
            expect(prisma.transaction.create).toHaveBeenCalled();
        });

        it('should format phone number before API call', async () => {
            prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', tenantId: 'tenant-1' });
            mockedAxios.post
                .mockResolvedValueOnce({ data: { token: 'auth_token', expires_in: 3600 } })
                .mockResolvedValueOnce({ data: { reference: 'REF123' } });
            prisma.transaction.create.mockResolvedValue({ id: 'txn-1' });

            await service.initiatePayment('tenant-1', 'doc-1', 1000, '6 90 12 34 56');

            // Should have formatted the phone
            expect(mockedAxios.post).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    from: '237690123456',
                }),
                expect.any(Object),
            );
        });
    });

    describe('checkStatus', () => {
        it('should fetch transaction status from API', async () => {
            prisma.tenant.findUnique.mockResolvedValue({
                id: 'tenant-1',
                campayUsername: 'test_user',
                campayPassword: 'test_pass',
            });
            mockedAxios.post.mockResolvedValue({ data: { token: 'auth_token', expires_in: 3600 } });
            mockedAxios.get.mockResolvedValue({
                data: {
                    reference: 'REF123',
                    status: 'SUCCESSFUL',
                    amount: 5000,
                    currency: 'XAF',
                },
            });

            const status = await service.checkStatus('tenant-1', 'REF123');

            expect(status.status).toBe('SUCCESSFUL');
            expect(status.amount).toBe(5000);
        });
    });

    describe('processWebhook', () => {
        it('should update transaction on successful payment', async () => {
            prisma.transaction.findFirst.mockResolvedValue({
                id: 'txn-1',
                reference: 'REF123',
                documentId: 'doc-1',
                tenantId: 'tenant-1',
                status: 'PENDING',
            });
            prisma.transaction.update.mockResolvedValue({ id: 'txn-1' });
            prisma.document.update.mockResolvedValue({ id: 'doc-1' });
            prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

            await service.processWebhook({
                reference: 'REF123',
                status: 'SUCCESSFUL',
                amount: 5000,
            });

            // Transaction should be updated
            expect(prisma.transaction.update).toHaveBeenCalled();
        });

        it('should update transaction on failed payment', async () => {
            prisma.transaction.findFirst.mockResolvedValue({
                id: 'txn-1',
                reference: 'REF123',
                tenantId: 'tenant-1',
                status: 'PENDING',
            });
            prisma.transaction.update.mockResolvedValue({ id: 'txn-1' });
            prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

            await service.processWebhook({
                reference: 'REF123',
                status: 'FAILED',
            });

            // Transaction should be updated with failed status
            expect(prisma.transaction.update).toHaveBeenCalled();
        });

        it('should ignore unknown transactions', async () => {
            prisma.transaction.findFirst.mockResolvedValue(null);

            await service.processWebhook({
                reference: 'UNKNOWN_REF',
                status: 'SUCCESSFUL',
            });

            expect(prisma.transaction.update).not.toHaveBeenCalled();
        });
    });
});
