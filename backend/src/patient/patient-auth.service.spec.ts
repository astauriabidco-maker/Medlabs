/**
 * Patient Auth Service Unit Tests
 * Tests OTP request, verification, rate limiting, and phone normalization
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PatientAuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';
import { createMockPrismaService, createMockJwtService } from '../test/mocks';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

// Mock notification service
const createMockNotificationService = () => ({
    sendWhatsApp: jest.fn().mockResolvedValue({ success: true }),
    sendSms: jest.fn().mockResolvedValue({ success: true }),
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
});

// Test session factory
const createTestSession = (overrides: Record<string, any> = {}) => ({
    id: 'session-123',
    phoneNumber: '+237612345678',
    tenantId: 'tenant-456',
    otpHash: '$2b$10$hashedotp',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    attempts: 0,
    verified: false,
    createdAt: new Date(),
    ...overrides,
});

describe('PatientAuthService', () => {
    let service: PatientAuthService;
    let prisma: ReturnType<typeof createMockPrismaService>;
    let jwtService: ReturnType<typeof createMockJwtService>;
    let notificationService: ReturnType<typeof createMockNotificationService>;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        jwtService = createMockJwtService();
        notificationService = createMockNotificationService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PatientAuthService,
                { provide: PrismaService, useValue: prisma },
                { provide: JwtService, useValue: jwtService },
                { provide: DynamicNotificationService, useValue: notificationService },
            ],
        }).compile();

        service = module.get<PatientAuthService>(PatientAuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('requestOtp', () => {
        it('should generate OTP, hash it, and send via WhatsApp', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 0 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedotp');

            const result = await service.requestOtp('612345678', 'tenant-456');

            expect(result.success).toBe(true);
            expect(result.message).toContain('SMS');
            expect(notificationService.sendWhatsApp).toHaveBeenCalled();
            expect(prisma.patientSession.create).toHaveBeenCalled();
        });

        it('should fallback to SMS if WhatsApp fails', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 0 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedotp');
            notificationService.sendWhatsApp.mockResolvedValue({ success: false });

            await service.requestOtp('+237612345678', 'tenant-456');

            expect(notificationService.sendSms).toHaveBeenCalled();
        });

        it('should throw BadRequestException when rate limit exceeded', async () => {
            prisma.patientSession.count.mockResolvedValue(3); // Max requests = 3

            await expect(
                service.requestOtp('+237612345678', 'tenant-456')
            ).rejects.toThrow(BadRequestException);
        });

        it('should delete existing sessions before creating new one', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 1 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedotp');

            await service.requestOtp('+237612345678', 'tenant-456');

            expect(prisma.patientSession.deleteMany).toHaveBeenCalledWith({
                where: {
                    phoneNumber: '+237612345678',
                    tenantId: 'tenant-456',
                },
            });
        });

        it('should normalize Cameroon phone numbers', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 0 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedotp');

            await service.requestOtp('612345678', 'tenant-456'); // Without country code

            expect(prisma.patientSession.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        phoneNumber: '+237612345678', // Normalized
                    }),
                })
            );
        });
    });

    describe('verifyOtp', () => {
        it('should return JWT token for valid OTP', async () => {
            prisma.patientSession.findFirst.mockResolvedValue(createTestSession());
            prisma.patientSession.update.mockResolvedValue(createTestSession({ verified: true }));
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.verifyOtp('+237612345678', '1234', 'tenant-456');

            expect(result.token).toBe('mock-jwt-token');
            expect(result.expiresIn).toBe(24 * 60 * 60); // 24 hours
        });

        it('should throw UnauthorizedException when no session found', async () => {
            prisma.patientSession.findFirst.mockResolvedValue(null);

            await expect(
                service.verifyOtp('+237612345678', '1234', 'tenant-456')
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for expired OTP', async () => {
            prisma.patientSession.findFirst.mockResolvedValue(
                createTestSession({ expiresAt: new Date(Date.now() - 1000) }) // Expired
            );
            prisma.patientSession.delete.mockResolvedValue({});

            await expect(
                service.verifyOtp('+237612345678', '1234', 'tenant-456')
            ).rejects.toThrow(UnauthorizedException);

            expect(prisma.patientSession.delete).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException after max attempts exceeded', async () => {
            prisma.patientSession.findFirst.mockResolvedValue(
                createTestSession({ attempts: 5 }) // Max = 5
            );
            prisma.patientSession.delete.mockResolvedValue({});

            await expect(
                service.verifyOtp('+237612345678', '1234', 'tenant-456')
            ).rejects.toThrow(UnauthorizedException);

            expect(prisma.patientSession.delete).toHaveBeenCalled();
        });

        it('should increment attempts on wrong code', async () => {
            prisma.patientSession.findFirst.mockResolvedValue(createTestSession({ attempts: 2 }));
            prisma.patientSession.update.mockResolvedValue(createTestSession({ attempts: 3 }));
            (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Wrong code

            await expect(
                service.verifyOtp('+237612345678', 'wrong', 'tenant-456')
            ).rejects.toThrow(UnauthorizedException);

            expect(prisma.patientSession.update).toHaveBeenCalledWith({
                where: { id: 'session-123' },
                data: { attempts: { increment: 1 } },
            });
        });

        it('should mark session as verified on success', async () => {
            prisma.patientSession.findFirst.mockResolvedValue(createTestSession());
            prisma.patientSession.update.mockResolvedValue(createTestSession({ verified: true }));
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await service.verifyOtp('+237612345678', '1234', 'tenant-456');

            expect(prisma.patientSession.update).toHaveBeenCalledWith({
                where: { id: 'session-123' },
                data: { verified: true },
            });
        });
    });

    describe('Phone Number Normalization', () => {
        it('should add +237 prefix for local Cameroon numbers', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 0 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

            await service.requestOtp('699887766', 'tenant-456');

            expect(prisma.patientSession.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        phoneNumber: '+237699887766',
                    }),
                })
            );
        });

        it('should handle already formatted numbers', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 0 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

            await service.requestOtp('+237612345678', 'tenant-456');

            expect(prisma.patientSession.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        phoneNumber: '+237612345678',
                    }),
                })
            );
        });

        it('should remove non-digit characters', async () => {
            prisma.patientSession.count.mockResolvedValue(0);
            prisma.patientSession.deleteMany.mockResolvedValue({ count: 0 });
            prisma.patientSession.create.mockResolvedValue(createTestSession());
            (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

            await service.requestOtp('6 12-34.56 78', 'tenant-456');

            expect(prisma.patientSession.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        phoneNumber: '+237612345678',
                    }),
                })
            );
        });
    });
});
