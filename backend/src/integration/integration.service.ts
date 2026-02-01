import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';
import { parseHL7Message, isValidORUMessage, HL7Patient, HL7Observation } from './hl7-parser';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface JSONIngestionData {
    patient: {
        name: string;
        phone?: string;
        dateOfBirth?: string;
    };
    results: Array<{
        test: string;
        value: string;
        unit: string;
        range: string;
        isAbnormal?: boolean;
    }>;
}

interface IngestionResult {
    success: boolean;
    documentId?: string;
    status: 'SUCCESS' | 'ERROR' | 'PENDING_INFO';
    message: string;
}

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);
    private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

    constructor(
        private prisma: PrismaService,
        private pdfGenerator: PdfGeneratorService,
        private notificationService: DynamicNotificationService,
    ) { }

    /**
     * Process incoming data and create document
     */
    async ingest(
        tenantId: string,
        format: 'JSON' | 'HL7',
        rawData: string | object
    ): Promise<IngestionResult> {
        const payload = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

        try {
            // 1. Check if integration is enabled for this tenant
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    phoneNumber: true,
                    hl7IntegrationEnabled: true,
                    pdfTemplateHeader: true,
                },
            });

            if (!tenant) {
                return this.logAndReturn(tenantId, format, payload, 'ERROR', 'Tenant not found');
            }

            if (!tenant.hl7IntegrationEnabled) {
                return this.logAndReturn(tenantId, format, payload, 'ERROR', 'Integration not enabled for this tenant');
            }

            // 2. Parse the data based on format
            let patient: HL7Patient;
            let results: HL7Observation[];

            if (format === 'HL7') {
                if (typeof rawData !== 'string') {
                    return this.logAndReturn(tenantId, format, payload, 'ERROR', 'HL7 data must be a string');
                }

                if (!isValidORUMessage(rawData)) {
                    return this.logAndReturn(tenantId, format, payload, 'ERROR', 'Invalid HL7 ORU message format');
                }

                const parsed = parseHL7Message(rawData);
                patient = parsed.patient;
                results = parsed.observations;

                this.logger.log(`Parsed HL7 message: ${parsed.messageType} with ${results.length} observations`);
            } else {
                // JSON format
                const jsonData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData as JSONIngestionData;

                if (!jsonData.patient || !jsonData.results) {
                    return this.logAndReturn(tenantId, format, payload, 'ERROR', 'Invalid JSON structure: missing patient or results');
                }

                patient = {
                    name: jsonData.patient.name,
                    phone: jsonData.patient.phone,
                    dateOfBirth: jsonData.patient.dateOfBirth,
                };
                results = (jsonData.results as Array<{
                    test: string;
                    value: string;
                    unit: string;
                    range: string;
                    isAbnormal?: boolean;
                }>).map((r) => ({
                    test: r.test,
                    value: r.value,
                    unit: r.unit,
                    range: r.range,
                    isAbnormal: r.isAbnormal,
                }));
            }

            // 3. Check if phone number is present
            if (!patient.phone) {
                const log = await this.createLog(tenantId, format, payload, 'PENDING_INFO', 'Phone number missing - cannot send notification');
                return {
                    success: true,
                    status: 'PENDING_INFO',
                    message: 'Document created but notification pending - phone number required',
                };
            }

            // 4. Normalize phone number
            const normalizedPhone = this.normalizePhone(patient.phone);

            // 5. Find or create patient record
            let patientRecord = await (this.prisma as any).patient?.findFirst({
                where: { phone: normalizedPhone, tenantId },
            });

            if (!patientRecord) {
                // Create basic patient record if patient model exists
                try {
                    patientRecord = await (this.prisma as any).patient?.create({
                        data: {
                            tenantId,
                            phone: normalizedPhone,
                            name: patient.name,
                        },
                    });
                } catch (e) {
                    // Patient model might not exist, continue without it
                    this.logger.warn('Patient model not available, continuing without patient record');
                }
            }

            // 6. Generate PDF
            this.logger.log(`Generating PDF for ${patient.name} with ${results.length} results`);
            const pdfBuffer = await this.pdfGenerator.generateReport(
                patient,
                results,
                {
                    name: tenant.name,
                    address: tenant.address || undefined,
                    phone: tenant.phoneNumber || undefined,
                    pdfTemplateHeader: tenant.pdfTemplateHeader || undefined,
                }
            );

            // 7. Save PDF to storage
            const fileName = `${crypto.randomBytes(16).toString('hex')}.pdf`;
            const tenantDir = path.join(this.uploadDir, tenantId);
            await fs.mkdir(tenantDir, { recursive: true });
            const filePath = path.join(tenantDir, fileName);
            await fs.writeFile(filePath, pdfBuffer);

            // 8. Create document record
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days default

            const accessCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 char code

            // Parse name into first and last
            const nameParts = patient.name?.split(' ') || [''];
            const patientFirstName = nameParts.slice(1).join(' ') || undefined;
            const patientLastName = nameParts[0] || patient.name || 'N/A';

            const document = await this.prisma.document.create({
                data: {
                    tenantId,
                    folderRef: `INT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
                    fileKey: filePath,
                    patientPhone: normalizedPhone,
                    patientFirstName: patientFirstName,
                    patientLastName: patientLastName,
                    patientEmail: `noreply@${tenantId}.medlabs.cm`,
                    mimeType: 'application/pdf',
                    fileSize: pdfBuffer.length,
                    accessCode,
                    expiresAt,
                    status: 'UPLOADED',
                },
            });

            this.logger.log(`Document created: ${document.id}`);

            // 9. Send WhatsApp notification
            try {
                await this.notificationService.sendWhatsApp(
                    tenantId,
                    normalizedPhone,
                    `📋 Vos résultats d'analyses sont disponibles!\n\n${tenant.name}\n\n🔐 Code d'accès: ${accessCode}\n\nConsultez-les sur notre portail patient.`
                );

                await this.prisma.document.update({
                    where: { id: document.id },
                    data: { status: 'NOTIFIED' },
                });
            } catch (notifError: any) {
                this.logger.error(`Notification failed: ${notifError.message}`);
            }

            // 10. Log success
            await this.createLog(tenantId, format, payload, 'SUCCESS', undefined, document.id, normalizedPhone);

            return {
                success: true,
                documentId: document.id,
                status: 'SUCCESS',
                message: 'Document created and notification sent',
            };

        } catch (error: any) {
            this.logger.error(`Ingestion failed: ${error.message}`);
            return this.logAndReturn(tenantId, format, payload, 'ERROR', error.message);
        }
    }

    /**
     * Get integration logs for a tenant
     */
    async getLogs(tenantId: string, limit: number = 50) {
        return (this.prisma as any).integrationLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Toggle integration status
     */
    async toggleIntegration(tenantId: string, enabled: boolean) {
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { hl7IntegrationEnabled: enabled },
            select: { hl7IntegrationEnabled: true },
        });
    }

    /**
     * Create an integration log entry
     */
    private async createLog(
        tenantId: string,
        format: string,
        payload: string,
        status: 'SUCCESS' | 'ERROR' | 'PENDING_INFO',
        errorMessage?: string,
        documentId?: string,
        patientPhone?: string
    ) {
        return (this.prisma as any).integrationLog.create({
            data: {
                tenantId,
                format,
                payload: payload.substring(0, 10000), // Limit payload size
                status,
                errorMessage,
                documentId,
                patientPhone,
            },
        });
    }

    /**
     * Log error and return result
     */
    private async logAndReturn(
        tenantId: string,
        format: string,
        payload: string,
        status: 'SUCCESS' | 'ERROR' | 'PENDING_INFO',
        message: string
    ): Promise<IngestionResult> {
        await this.createLog(tenantId, format, payload, status, status === 'ERROR' ? message : undefined);
        return {
            success: status === 'SUCCESS',
            status,
            message,
        };
    }

    /**
     * Normalize phone number to international format
     */
    private normalizePhone(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');

        // Cameroon numbers
        if (cleaned.startsWith('237')) {
            return `+${cleaned}`;
        }
        if (cleaned.length === 9 && (cleaned.startsWith('6') || cleaned.startsWith('2'))) {
            return `+237${cleaned}`;
        }

        return phone.startsWith('+') ? phone : `+${cleaned}`;
    }
}
