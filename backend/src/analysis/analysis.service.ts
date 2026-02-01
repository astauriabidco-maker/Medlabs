import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';
const pdfParse = require('pdf-parse');

@Injectable()
export class AnalysisService {
    private readonly logger = new Logger(AnalysisService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: DynamicNotificationService,
    ) { }

    /**
     * Analyze a document for critical values based on tenant rules
     * Called after document upload
     */
    async analyzeDocument(documentId: string, pdfBuffer: Buffer): Promise<void> {
        try {
            // Get document with tenant info
            const document = await this.prisma.document.findUnique({
                where: { id: documentId },
                include: {
                    tenant: {
                        select: {
                            id: true,
                            biologistPhone: true,
                            name: true,
                        }
                    }
                },
            });

            if (!document) {
                this.logger.warn(`Document ${documentId} not found for analysis`);
                return;
            }

            // Extract text from PDF
            const text = await this.extractTextFromPdf(pdfBuffer);
            if (!text || text.trim().length === 0) {
                this.logger.debug(`No text extracted from document ${documentId}`);
                return;
            }

            // Normalize text for comparison
            const normalizedText = this.normalizeText(text);

            // Get active rules for this tenant
            const rules = await this.prisma.criticalRule.findMany({
                where: {
                    tenantId: document.tenantId,
                    isActive: true,
                },
            });

            if (rules.length === 0) {
                this.logger.debug(`No active rules for tenant ${document.tenantId}`);
                return;
            }

            // Check each rule
            for (const rule of rules) {
                const isMatch = this.checkRuleMatch(normalizedText, rule.keywords, rule.mustContainAll);

                if (isMatch) {
                    this.logger.warn(`CRITICAL VALUE DETECTED: Document ${documentId} matches rule "${rule.name}"`);

                    // Flag document as critical
                    await this.prisma.document.update({
                        where: { id: documentId },
                        data: { isCritical: true },
                    });

                    // Alert biologist
                    await this.alertBiologist(document, rule, document.tenant);

                    // Create audit log
                    await this.prisma.auditLog.create({
                        data: {
                            tenantId: document.tenantId,
                            action: 'UPDATE_SETTINGS',
                            description: `CRITICAL: Document flagged by rule "${rule.name}"`,
                            resourceId: documentId,
                        },
                    });

                    // Only trigger one alert per document (first matching rule)
                    break;
                }
            }
        } catch (error) {
            this.logger.error(`Failed to analyze document ${documentId}:`, error);
            // Don't throw - this is a non-blocking operation
        }
    }

    /**
     * Extract text content from PDF buffer
     */
    private async extractTextFromPdf(buffer: Buffer): Promise<string> {
        try {
            const data = await pdfParse(buffer);
            return data.text || '';
        } catch (error) {
            this.logger.error('Failed to parse PDF:', error);
            return '';
        }
    }

    /**
     * Normalize text: lowercase, remove accents, normalize whitespace
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Check if text matches rule keywords
     */
    private checkRuleMatch(normalizedText: string, keywords: string[], mustContainAll: boolean): boolean {
        const normalizedKeywords = keywords.map(k => this.normalizeText(k));

        if (mustContainAll) {
            // ALL keywords must be present
            return normalizedKeywords.every(keyword => normalizedText.includes(keyword));
        } else {
            // AT LEAST ONE keyword must be present
            return normalizedKeywords.some(keyword => normalizedText.includes(keyword));
        }
    }

    /**
     * Send alert to biologist
     */
    private async alertBiologist(
        document: any,
        rule: any,
        tenant: { id: string; biologistPhone: string | null; name: string },
    ): Promise<void> {
        if (!tenant.biologistPhone) {
            this.logger.warn(`No biologist phone configured for tenant ${tenant.id}`);
            return;
        }

        const patientName = `${document.patientFirstName || ''} ${document.patientLastName || ''}`.trim();
        const message = `🚨 ALERTE CRITIQUE - ${tenant.name}\n\n` +
            `Règle: ${rule.name}\n` +
            `Patient: ${patientName}\n` +
            `Dossier: ${document.folderRef}\n\n` +
            `${rule.alertMessage}\n\n` +
            `Connectez-vous pour valider ce résultat.`;

        try {
            // Try WhatsApp first, then fallback to SMS
            const result = await this.notificationService.sendWhatsApp(
                tenant.id,
                tenant.biologistPhone,
                message,
            );

            if (!result.success) {
                // Fallback to SMS
                await this.notificationService.sendSms(
                    tenant.id,
                    tenant.biologistPhone,
                    message,
                );
            }

            this.logger.log(`Critical alert sent to biologist at ${tenant.biologistPhone}`);
        } catch (error) {
            this.logger.error(`Failed to send biologist alert:`, error);
        }
    }
}
