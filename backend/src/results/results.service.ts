import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateResultDto } from './dto/create-result.dto';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';
import { SmsService } from '../notifications/sms.service';
import { EmailService } from '../notifications/email.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { MagicLinkService } from '../auth/magic-link.service';
import { AnalysisService } from '../analysis/analysis.service';
import { v4 as uuidv4 } from 'uuid';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ResultsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly smsService: SmsService,
        private readonly emailService: EmailService,
        private readonly whatsAppService: WhatsAppService,
        private readonly magicLinkService: MagicLinkService,
        private readonly analysisService: AnalysisService,
    ) { }

    /**
     * Generate a unique short access code for physical receipt
     * Format: "X4-92" (letter+digit-twodigits)
     */
    private async generateAccessCode(tenantId: string): Promise<string> {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O to avoid confusion
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const letter = letters[Math.floor(Math.random() * letters.length)];
            const digit1 = Math.floor(Math.random() * 10);
            const digits2 = String(Math.floor(Math.random() * 100)).padStart(2, '0');
            const code = `${letter}${digit1}-${digits2}`;

            // Check uniqueness among active documents in this tenant
            const existing = await this.prisma.document.findFirst({
                where: {
                    tenantId,
                    accessCode: code,
                    status: { notIn: ['EXPIRED'] },
                },
            });

            if (!existing) return code;
        }

        // Fallback: use numeric code
        return String(Math.floor(Math.random() * 9000) + 1000);
    }

    async create(createResultDto: CreateResultDto, file: Express.Multer.File, tenantId: string, userId: string) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are allowed');
        }

        const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);
        if (!file.buffer || file.buffer.length < 4 || !file.buffer.slice(0, 4).equals(PDF_MAGIC)) {
            throw new BadRequestException('Invalid PDF file: file signature does not match PDF format');
        }

        const existingDoc = await this.prisma.document.findFirst({
            where: {
                tenantId: tenantId,
                folderRef: createResultDto.folderRef,
            },
        });

        if (existingDoc) {
            throw new ConflictException(`Folder Reference ${createResultDto.folderRef} already exists for this tenant.`);
        }

        const fileUuid = uuidv4();
        const year = new Date().getFullYear();
        const key = `tenants/${tenantId}/${year}/${fileUuid}.pdf`;

        await this.storage.uploadFile(file.buffer, key, file.mimetype);

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const nameParts = (createResultDto.patientName || '').trim().split(' ');
        const lastName = nameParts.pop() || 'Unknown';
        const firstName = nameParts.join(' ') || 'Unknown';

        // Generate unique access code for physical receipt
        const accessCode = await this.generateAccessCode(tenantId);

        const document = await this.prisma.document.create({
            data: {
                tenantId: tenantId,
                folderRef: createResultDto.folderRef,
                fileKey: key,
                fileSize: file.size,
                mimeType: file.mimetype,
                patientPhone: createResultDto.patientPhone,
                patientEmail: createResultDto.patientEmail,
                patientFirstName: firstName,
                patientLastName: lastName,
                patientDob: new Date(createResultDto.patientDob),
                uploadedById: userId,
                expiresAt: expiresAt,
                accessCode: accessCode,
                status: 'UPLOADED',
                prescriberName: createResultDto.prescriberName || null,  // BI Dashboard tracking
                civility: createResultDto.civility || null,  // Civilité patient
                sampleDate: createResultDto.sampleDate ? new Date(createResultDto.sampleDate) : null,  // Date de prélèvement
            },
        });

        // Trigger Notification (WhatsApp first)
        this.notifyPatient(document.id).catch(err => console.error('Failed to notify patient', err));

        // Analyze for critical values (async, non-blocking)
        this.analysisService.analyzeDocument(document.id, file.buffer)
            .catch(err => console.error('Critical analysis failed', err));

        return {
            message: 'Result uploaded and processed',
            documentId: document.id,
            accessCode: accessCode, // Return code for receipt printing
        };
    }

    async findAll(tenantId: string, search: string = '', page: number = 1) {
        const take = 10;
        const skip = (page - 1) * take;

        const where: any = {};
        if (tenantId) {
            where.tenantId = tenantId;
        }

        if (search) {
            where.OR = [
                { patientFirstName: { contains: search, mode: 'insensitive' } },
                { patientLastName: { contains: search, mode: 'insensitive' } },
                { folderRef: { contains: search, mode: 'insensitive' } },
                { patientPhone: { contains: search } },
            ];
        }

        const [results, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    createdAt: true,
                    patientFirstName: true,
                    patientLastName: true,
                    patientPhone: true,
                    folderRef: true,
                    status: true,
                    isCritical: true,
                }
            }),
            this.prisma.document.count({ where }),
        ]);

        const mappedResults = results.map(r => ({
            ...r,
            patientName: `${r.patientFirstName} ${r.patientLastName}`.trim(),
        }));

        return {
            data: mappedResults,
            meta: { total, page, lastPage: Math.ceil(total / take) }
        };
    }

    async getPreviewUrl(tenantId: string, resultId: string) {
        const doc = await this.prisma.document.findFirst({
            where: { id: resultId, tenantId },
        });

        if (!doc) throw new NotFoundException('Document not found');

        if (doc.status === 'EXPIRED') {
            throw new ConflictException('Document has been permanently deleted due to retention policy.');
        }

        const url = await this.storage.getPresignedUrl(doc.fileKey);
        return { url };
    }

    async resendResult(tenantId: string, resultId: string, newPhone: string, userId: string) {
        const doc = await this.prisma.document.findFirst({
            where: { id: resultId, tenantId },
        });

        if (!doc) throw new NotFoundException('Document not found');

        if (doc.status === 'EXPIRED') {
            throw new ConflictException('Cannot resend result: Document has been deleted due to retention policy.');
        }

        if (newPhone && newPhone !== doc.patientPhone) {
            await this.prisma.document.update({
                where: { id: resultId },
                data: { patientPhone: newPhone },
            });
        }

        // Re-trigger notification
        await this.notifyPatient(resultId);

        // Audit Log
        await this.prisma.auditLog.create({
            data: {
                tenantId,
                action: AuditAction.UPDATE_SETTINGS,
                description: `Resent notification to ${newPhone} for Document ${doc.folderRef}`,
                resourceId: resultId,
                actorId: userId,
            },
        });

        return { message: 'Notification resent successfully' };
    }

    private async notifyPatient(documentId: string) {
        const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) return;

        const magicLink = await this.magicLinkService.generateLink(documentId);
        const patientName = `${doc.patientFirstName} ${doc.patientLastName}`.trim();
        const dateStr = doc.createdAt.toLocaleDateString('fr-FR');

        // 1. Try WhatsApp first (primary channel)
        const whatsAppSent = await this.whatsAppService.sendResultNotification(
            doc.patientPhone,
            patientName,
            magicLink
        );

        // 2. Fallback to SMS if WhatsApp fails
        if (!whatsAppSent) {
            await this.smsService.sendResultNotification(
                doc.patientPhone,
                patientName,
                doc.folderRef,
                magicLink
            );
        }

        // 3. Send Email (if available)
        if (doc.patientEmail) {
            await this.emailService.sendResultNotification({
                to: doc.patientEmail,
                patientName,
                folderRef: doc.folderRef,
                date: dateStr,
                magicLink,
                tenantId: doc.tenantId,
            });
        }

        // Update Status
        await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'NOTIFIED' }
        });
    }

    /**
     * Send access code via SMS (fallback for lost receipts)
     */
    async resendAccessCode(tenantId: string, resultId: string) {
        const doc = await this.prisma.document.findFirst({
            where: { id: resultId, tenantId },
        });

        if (!doc) throw new NotFoundException('Document not found');
        if (!doc.accessCode) throw new BadRequestException('No access code available for this document');

        const patientName = `${doc.patientFirstName} ${doc.patientLastName}`.trim();

        // Send access code via SMS (not WhatsApp, as per requirement)
        await this.smsService.sendOtp(doc.patientPhone, doc.accessCode);

        return {
            message: 'Access code sent via SMS',
            maskedPhone: doc.patientPhone.slice(0, 7) + '****' + doc.patientPhone.slice(-2),
        };
    }

    async remove(tenantId: string, id: string) {
        // If tenantId is null (Super Admin), we skip the check
        const where: any = { id };
        if (tenantId) {
            where.tenantId = tenantId;
        }

        const doc = await this.prisma.document.findFirst({ where });

        if (!doc) throw new NotFoundException('Document not found');

        await this.prisma.document.delete({
            where: { id }
        });

        // TODO: Delete file from S3
        return { message: 'Document deleted successfully' };
    }
}
