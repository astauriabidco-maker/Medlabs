/**
 * Results Service Unit Tests
 * Tests for medical results upload, retrieval, and notification flows
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ResultsService } from './results.service';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { SmsService } from '../notifications/sms.service';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { MagicLinkService } from '../auth/magic-link.service';
import { AnalysisService } from '../analysis/analysis.service';
import { createMockPrismaService } from '../test/mocks';

// Mock services
const createMockStorageService = () => ({
    uploadFile: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
});

const createMockSmsService = () => ({
    sendResultNotification: jest.fn().mockResolvedValue(true),
    sendOtp: jest.fn().mockResolvedValue(true),
});

const createMockWhatsAppService = () => ({
    sendResultNotification: jest.fn().mockResolvedValue(true),
});

const createMockMagicLinkService = () => ({
    generateLink: jest.fn().mockResolvedValue('https://medlab.cm/access/abc123'),
});

const createMockAnalysisService = () => ({
    analyzeDocument: jest.fn().mockResolvedValue({ isCritical: false }),
});

const createMockEmailServiceForResults = () => ({
    sendResultNotification: jest.fn().mockResolvedValue(undefined),
});

// Helper to create valid PDF buffer
const createValidPdfBuffer = () => {
    const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
    const pdfContent = Buffer.from('-1.4\n%test pdf content');
    return Buffer.concat([pdfMagic, pdfContent]);
};

// Test document factory
const createTestDocument = (overrides: Record<string, any> = {}) => ({
    id: 'doc-123',
    tenantId: 'tenant-456',
    folderRef: 'LAB-2024-001',
    fileKey: 'tenants/tenant-456/2024/uuid.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    patientPhone: '+237612345678',
    patientEmail: 'patient@test.cm',
    patientFirstName: 'Jean',
    patientLastName: 'Dupont',
    patientDob: new Date('1990-01-15'),
    accessCode: 'X4-92',
    status: 'UPLOADED',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    ...overrides,
});

describe('ResultsService', () => {
    let service: ResultsService;
    let prisma: ReturnType<typeof createMockPrismaService>;
    let storageService: ReturnType<typeof createMockStorageService>;
    let smsService: ReturnType<typeof createMockSmsService>;
    let whatsAppService: ReturnType<typeof createMockWhatsAppService>;
    let magicLinkService: ReturnType<typeof createMockMagicLinkService>;
    let analysisService: ReturnType<typeof createMockAnalysisService>;
    let emailService: ReturnType<typeof createMockEmailServiceForResults>;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        storageService = createMockStorageService();
        smsService = createMockSmsService();
        whatsAppService = createMockWhatsAppService();
        magicLinkService = createMockMagicLinkService();
        analysisService = createMockAnalysisService();
        emailService = createMockEmailServiceForResults();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResultsService,
                { provide: PrismaService, useValue: prisma },
                { provide: StorageService, useValue: storageService },
                { provide: SmsService, useValue: smsService },
                { provide: EmailService, useValue: emailService },
                { provide: WhatsAppService, useValue: whatsAppService },
                { provide: MagicLinkService, useValue: magicLinkService },
                { provide: AnalysisService, useValue: analysisService },
            ],
        }).compile();

        service = module.get<ResultsService>(ResultsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const validDto = {
            folderRef: 'LAB-2024-002',
            patientPhone: '+237612345678',
            patientEmail: 'patient@test.cm',
            patientName: 'Jean Dupont',
            patientDob: '1990-01-15',
        };

        const validFile: Express.Multer.File = {
            buffer: createValidPdfBuffer(),
            mimetype: 'application/pdf',
            size: 1024,
            fieldname: 'file',
            originalname: 'result.pdf',
            encoding: '7bit',
            destination: '',
            filename: '',
            path: '',
            stream: null as any,
        };

        it('should upload result and return documentId with accessCode', async () => {
            prisma.document.findFirst.mockResolvedValue(null); // No duplicate
            prisma.document.create.mockResolvedValue(createTestDocument({ id: 'new-doc-id' }));
            prisma.document.findUnique.mockResolvedValue(createTestDocument({ id: 'new-doc-id' }));
            prisma.document.update.mockResolvedValue(createTestDocument({ status: 'NOTIFIED' }));

            const result = await service.create(validDto, validFile, 'tenant-456', 'user-789');

            expect(result.documentId).toBe('new-doc-id');
            expect(result.accessCode).toBeDefined();
            expect(result.message).toContain('uploaded');
            expect(storageService.uploadFile).toHaveBeenCalled();
        });

        it('should throw BadRequestException when no file provided', async () => {
            await expect(
                service.create(validDto, null as any, 'tenant-456', 'user-789')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException for non-PDF mimetype', async () => {
            const invalidFile = { ...validFile, mimetype: 'image/png' };

            await expect(
                service.create(validDto, invalidFile, 'tenant-456', 'user-789')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException for invalid PDF magic bytes', async () => {
            const invalidPdfFile = {
                ...validFile,
                buffer: Buffer.from('not a pdf file'),
            };

            await expect(
                service.create(validDto, invalidPdfFile, 'tenant-456', 'user-789')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw ConflictException for duplicate folderRef', async () => {
            prisma.document.findFirst.mockResolvedValue(createTestDocument());

            await expect(
                service.create(validDto, validFile, 'tenant-456', 'user-789')
            ).rejects.toThrow(ConflictException);
        });

        it('should trigger analysis service asynchronously', async () => {
            prisma.document.findFirst.mockResolvedValue(null);
            prisma.document.create.mockResolvedValue(createTestDocument());
            prisma.document.findUnique.mockResolvedValue(createTestDocument());
            prisma.document.update.mockResolvedValue(createTestDocument());

            await service.create(validDto, validFile, 'tenant-456', 'user-789');

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(analysisService.analyzeDocument).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return paginated results for tenant', async () => {
            const docs = [createTestDocument(), createTestDocument({ id: 'doc-456' })];
            prisma.document.findMany.mockResolvedValue(docs);
            prisma.document.count.mockResolvedValue(2);

            const result = await service.findAll('tenant-456', '', 1);

            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toBe(2);
            expect(result.meta.page).toBe(1);
            expect(prisma.document.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { tenantId: 'tenant-456' },
                    skip: 0,
                    take: 10,
                })
            );
        });

        it('should filter by search term', async () => {
            prisma.document.findMany.mockResolvedValue([]);
            prisma.document.count.mockResolvedValue(0);

            await service.findAll('tenant-456', 'Dupont', 1);

            expect(prisma.document.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            { patientLastName: { contains: 'Dupont', mode: 'insensitive' } },
                        ]),
                    }),
                })
            );
        });

        it('should handle pagination correctly', async () => {
            prisma.document.findMany.mockResolvedValue([]);
            prisma.document.count.mockResolvedValue(25);

            const result = await service.findAll('tenant-456', '', 3);

            expect(result.meta.lastPage).toBe(3);
            expect(prisma.document.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 20 })
            );
        });
    });

    describe('getPreviewUrl', () => {
        it('should return presigned URL for valid document', async () => {
            prisma.document.findFirst.mockResolvedValue(createTestDocument());

            const result = await service.getPreviewUrl('tenant-456', 'doc-123');

            expect(result.url).toBe('https://s3.example.com/presigned-url');
            expect(storageService.getPresignedUrl).toHaveBeenCalled();
        });

        it('should throw NotFoundException for non-existent document', async () => {
            prisma.document.findFirst.mockResolvedValue(null);

            await expect(
                service.getPreviewUrl('tenant-456', 'nonexistent')
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException for expired document', async () => {
            prisma.document.findFirst.mockResolvedValue(
                createTestDocument({ status: 'EXPIRED' })
            );

            await expect(
                service.getPreviewUrl('tenant-456', 'doc-123')
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('resendResult', () => {
        it('should resend notification and create audit log', async () => {
            const doc = createTestDocument();
            prisma.document.findFirst.mockResolvedValue(doc);
            prisma.document.findUnique.mockResolvedValue(doc);
            prisma.document.update.mockResolvedValue({ ...doc, status: 'NOTIFIED' });
            prisma.auditLog.create.mockResolvedValue({});

            const result = await service.resendResult('tenant-456', 'doc-123', '+237699999999', 'user-789');

            expect(result.message).toContain('resent');
            expect(prisma.auditLog.create).toHaveBeenCalled();
        });

        it('should update phone number if different', async () => {
            const doc = createTestDocument({ patientPhone: '+237600000000' });
            prisma.document.findFirst.mockResolvedValue(doc);
            prisma.document.findUnique.mockResolvedValue(doc);
            prisma.document.update.mockResolvedValue(doc);
            prisma.auditLog.create.mockResolvedValue({});

            await service.resendResult('tenant-456', 'doc-123', '+237699999999', 'user-789');

            expect(prisma.document.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { patientPhone: '+237699999999' },
                })
            );
        });

        it('should throw ConflictException for expired document', async () => {
            prisma.document.findFirst.mockResolvedValue(
                createTestDocument({ status: 'EXPIRED' })
            );

            await expect(
                service.resendResult('tenant-456', 'doc-123', '+237699999999', 'user-789')
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('resendAccessCode', () => {
        it('should send access code via SMS', async () => {
            const doc = createTestDocument({ accessCode: 'A1-23' });
            prisma.document.findFirst.mockResolvedValue(doc);

            const result = await service.resendAccessCode('tenant-456', 'doc-123');

            expect(result.message).toContain('SMS');
            expect(smsService.sendOtp).toHaveBeenCalledWith(doc.patientPhone, 'A1-23');
        });

        it('should throw BadRequestException if no access code', async () => {
            prisma.document.findFirst.mockResolvedValue(
                createTestDocument({ accessCode: null })
            );

            await expect(
                service.resendAccessCode('tenant-456', 'doc-123')
            ).rejects.toThrow(BadRequestException);
        });

        it('should mask phone number in response', async () => {
            const doc = createTestDocument({ patientPhone: '+237612345678' });
            prisma.document.findFirst.mockResolvedValue(doc);

            const result = await service.resendAccessCode('tenant-456', 'doc-123');

            expect(result.maskedPhone).toContain('****');
            expect(result.maskedPhone).not.toBe(doc.patientPhone);
        });
    });

    describe('remove', () => {
        it('should delete document successfully', async () => {
            prisma.document.findFirst.mockResolvedValue(createTestDocument());
            prisma.document.delete.mockResolvedValue(createTestDocument());

            const result = await service.remove('tenant-456', 'doc-123');

            expect(result.message).toContain('deleted');
            expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-123' } });
        });

        it('should throw NotFoundException for non-existent document', async () => {
            prisma.document.findFirst.mockResolvedValue(null);

            await expect(
                service.remove('tenant-456', 'nonexistent')
            ).rejects.toThrow(NotFoundException);
        });

        it('should allow Super Admin to delete without tenantId check', async () => {
            prisma.document.findFirst.mockResolvedValue(createTestDocument());
            prisma.document.delete.mockResolvedValue(createTestDocument());

            await service.remove(null as any, 'doc-123');

            expect(prisma.document.findFirst).toHaveBeenCalledWith({
                where: { id: 'doc-123' }, // No tenantId filter
            });
        });
    });
});
