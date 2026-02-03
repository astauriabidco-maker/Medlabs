/**
 * Auth Service Unit Tests
 * Tests authentication, login, password reset, and impersonation flows
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../audit/audit.service';
import {
    createMockPrismaService,
    createMockJwtService,
    createMockEmailService,
    createMockAuditService,
    createTestUser,
} from '../test/mocks';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;
    let prisma: ReturnType<typeof createMockPrismaService>;
    let jwtService: ReturnType<typeof createMockJwtService>;
    let emailService: ReturnType<typeof createMockEmailService>;
    let auditService: ReturnType<typeof createMockAuditService>;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        jwtService = createMockJwtService();
        emailService = createMockEmailService();
        auditService = createMockAuditService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: prisma },
                { provide: JwtService, useValue: jwtService },
                { provide: EmailService, useValue: emailService },
                { provide: AuditService, useValue: auditService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        it('should return user without password when credentials are valid', async () => {
            const testUser = createTestUser({ passwordHash: 'hashed_password' });
            prisma.user.findUnique.mockResolvedValue(testUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser('test@medlab.cm', 'correct_password');

            expect(result).toBeDefined();
            expect(result.email).toBe('test@medlab.cm');
            expect(result.passwordHash).toBeUndefined();
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@medlab.cm' }
            });
        });

        it('should return null when user is not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const result = await service.validateUser('notfound@medlab.cm', 'password');

            expect(result).toBeNull();
        });

        it('should return null when password is incorrect', async () => {
            const testUser = createTestUser();
            prisma.user.findUnique.mockResolvedValue(testUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await service.validateUser('test@medlab.cm', 'wrong_password');

            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should return access token and user info on successful login', async () => {
            const testUser = createTestUser();
            prisma.user.update.mockResolvedValue(testUser);

            const result = await service.login(testUser);

            expect(result.access_token).toBe('mock-jwt-token');
            expect(result.user.email).toBe(testUser.email);
            expect(result.user.role).toBe(testUser.role);
            expect(auditService.logLogin).toHaveBeenCalledWith(
                testUser.email,
                testUser.id,
                true,
                undefined
            );
        });

        it('should update lastLoginAt timestamp', async () => {
            const testUser = createTestUser();
            prisma.user.update.mockResolvedValue(testUser);

            await service.login(testUser);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: testUser.id },
                data: expect.objectContaining({ lastLoginAt: expect.any(Date) })
            });
        });
    });

    describe('requestPasswordReset', () => {
        it('should send reset email when user exists', async () => {
            const testUser = createTestUser();
            prisma.user.findUnique.mockResolvedValue(testUser);

            const result = await service.requestPasswordReset('test@medlab.cm');

            expect(emailService.sendPasswordReset).toHaveBeenCalled();
            expect(result.message).toContain('If an account exists');
        });

        it('should return success message even when user does not exist (security)', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const result = await service.requestPasswordReset('notfound@medlab.cm');

            expect(result.message).toContain('If an account exists');
            expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        it('should update password with valid token', async () => {
            const testUser = createTestUser();
            jwtService.verify.mockReturnValue({
                sub: testUser.id,
                email: testUser.email,
                type: 'RESET_PASSWORD'
            });
            prisma.user.findUnique.mockResolvedValue(testUser);
            prisma.user.update.mockResolvedValue(testUser);
            (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');

            const result = await service.resetPassword('valid-token', 'newPassword123');

            expect(result.message).toBe('Password updated successfully');
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: testUser.id },
                data: { passwordHash: 'new_hashed_password' }
            });
            expect(auditService.log).toHaveBeenCalledWith(
                'PASSWORD_RESET',
                expect.any(String),
                testUser.id,
                testUser.tenantId
            );
        });

        it('should throw error for invalid token type', async () => {
            jwtService.verify.mockReturnValue({
                sub: 'user-id',
                type: 'ACCESS_TOKEN' // Wrong type
            });

            await expect(
                service.resetPassword('invalid-token', 'newPassword')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('impersonate', () => {
        it('should generate impersonation token for existing user', async () => {
            const targetUser = createTestUser({ id: 'target-123', email: 'target@medlab.cm' });
            prisma.user.findUnique.mockResolvedValue(targetUser);

            const result = await service.impersonate('target-123', 'admin-456');

            expect(result.access_token).toBe('mock-jwt-token');
            expect(result.user.isImpersonated).toBe(true);
            expect(auditService.logImpersonation).toHaveBeenCalledWith(
                'admin-456',
                targetUser.email,
                targetUser.id,
                true
            );
        });

        it('should throw NotFoundException when target user does not exist', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                service.impersonate('nonexistent', 'admin-456')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('unimpersonate', () => {
        it('should return to admin session', async () => {
            const adminUser = createTestUser({
                id: 'admin-456',
                role: 'SUPER_ADMIN',
                email: 'admin@medlab.cm'
            });
            prisma.user.findUnique.mockResolvedValue(adminUser);
            prisma.user.update.mockResolvedValue(adminUser);

            const result = await service.unimpersonate('admin-456');

            expect(result.access_token).toBe('mock-jwt-token');
            expect(auditService.logImpersonation).toHaveBeenCalledWith(
                'admin-456',
                adminUser.email,
                'admin-456',
                false
            );
        });

        it('should throw UnauthorizedException for non-admin user', async () => {
            const regularUser = createTestUser({ role: 'TECHNICIAN' });
            prisma.user.findUnique.mockResolvedValue(regularUser);

            await expect(
                service.unimpersonate('user-123')
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
