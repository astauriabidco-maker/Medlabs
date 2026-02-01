import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WhatsAppNotificationStatus, WhatsAppProvider } from '@prisma/client';
import { IWhatsAppProvider, MetaWhatsAppProvider, TwilioWhatsAppProvider } from './providers';

/**
 * WhatsApp Service with Strategy Pattern
 * Supports multiple providers: Meta Cloud API (default) and Twilio (fallback)
 */
@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Factory method to create the appropriate provider based on tenant configuration
     */
    private createProvider(tenant: any): IWhatsAppProvider | null {
        if (tenant.whatsappProvider === WhatsAppProvider.TWILIO) {
            // Twilio provider
            if (!tenant.twilioAccountSid || !tenant.twilioAuthToken || !tenant.twilioWhatsappNumber) {
                this.logger.warn(`[WhatsApp] Tenant ${tenant.id} has incomplete Twilio config`);
                return null;
            }
            return new TwilioWhatsAppProvider(
                tenant.twilioAccountSid,
                tenant.twilioAuthToken,
                tenant.twilioWhatsappNumber,
            );
        } else {
            // Meta provider (default)
            if (!tenant.whatsappAccessToken || !tenant.whatsappPhoneNumberId) {
                this.logger.warn(`[WhatsApp] Tenant ${tenant.id} has no Meta WhatsApp credentials`);
                return null;
            }
            return new MetaWhatsAppProvider(
                tenant.whatsappPhoneNumberId,
                tenant.whatsappAccessToken,
                tenant.name,
            );
        }
    }

    /**
     * Send result notification via WhatsApp (uses configured provider)
     */
    async sendResultLink(
        tenantId: string,
        documentId: string,
        patientName: string,
        patientPhone: string,
        documentUrl: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            return { success: false, error: 'Tenant not found' };
        }

        const provider = this.createProvider(tenant);
        if (!provider) {
            return { success: false, error: 'WhatsApp not configured for this tenant' };
        }

        this.logger.log(`[WhatsApp] Using ${provider.getProviderName()} provider for tenant ${tenantId}`);

        const result = await provider.sendPdfLink(patientPhone, patientName, tenant.name, documentUrl);

        if (result.success && result.messageId) {
            // Update document with WhatsApp tracking info
            await this.prisma.document.update({
                where: { id: documentId },
                data: {
                    whatsappStatus: WhatsAppNotificationStatus.SENT,
                    whatsappMessageId: result.messageId,
                    whatsappSentAt: new Date(),
                },
            });
            this.logger.log(`[WhatsApp] Message sent to ${patientPhone}, messageId: ${result.messageId}`);
        } else {
            // Update document status to FAILED
            await this.prisma.document.update({
                where: { id: documentId },
                data: {
                    whatsappStatus: WhatsAppNotificationStatus.FAILED,
                },
            });
        }

        return result;
    }

    /**
     * Send a test message (uses configured provider)
     */
    async sendTestMessage(
        tenantId: string,
        testPhone: string,
    ): Promise<{ success: boolean; error?: string }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            return { success: false, error: 'Tenant not found' };
        }

        const provider = this.createProvider(tenant);
        if (!provider) {
            return { success: false, error: 'WhatsApp not configured' };
        }

        this.logger.log(`[WhatsApp] Sending test via ${provider.getProviderName()} to ${testPhone}`);
        return provider.sendTestMessage(testPhone);
    }

    /**
     * Update document status from webhook (works for both Meta and Twilio)
     * Status values: sent, delivered, read, failed
     */
    async updateStatusFromWebhook(
        messageId: string,
        status: 'sent' | 'delivered' | 'read' | 'failed' | 'queued',
    ): Promise<void> {
        // Map webhook status to our enum
        const statusMap: Record<string, WhatsAppNotificationStatus> = {
            queued: WhatsAppNotificationStatus.PENDING,
            sent: WhatsAppNotificationStatus.SENT,
            delivered: WhatsAppNotificationStatus.DELIVERED,
            read: WhatsAppNotificationStatus.READ,
            failed: WhatsAppNotificationStatus.FAILED,
        };

        const newStatus = statusMap[status];
        if (!newStatus) return;

        // Find document by messageId (works for both Meta messageId and Twilio SID)
        const document = await this.prisma.document.findFirst({
            where: { whatsappMessageId: messageId },
        });

        if (!document) {
            this.logger.warn(`[WhatsApp Webhook] No document found for messageId: ${messageId}`);
            return;
        }

        // Status progression check (don't go backwards)
        const statusPriority: Record<WhatsAppNotificationStatus, number> = {
            [WhatsAppNotificationStatus.PENDING]: 0,
            [WhatsAppNotificationStatus.SENT]: 1,
            [WhatsAppNotificationStatus.DELIVERED]: 2,
            [WhatsAppNotificationStatus.READ]: 3,
            [WhatsAppNotificationStatus.FAILED]: 99,
        };

        const currentPriority = statusPriority[document.whatsappStatus || WhatsAppNotificationStatus.PENDING];
        const newPriority = statusPriority[newStatus];

        if (newPriority > currentPriority) {
            await this.prisma.document.update({
                where: { id: document.id },
                data: { whatsappStatus: newStatus },
            });
            this.logger.log(`[WhatsApp Webhook] Updated document ${document.id} status to ${status}`);
        }
    }

    /**
     * Legacy method for backward compatibility
     * Used by results.service.ts - logs only in dev, returns false if not configured
     */
    async sendResultNotification(
        phoneNumber: string,
        patientName: string,
        link: string,
    ): Promise<boolean> {
        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[WHATSAPP MOCK] To: ${phoneNumber} | Patient: ${patientName} | Link: ${link}`);
            return true;
        }
        this.logger.warn(`[WhatsApp] Legacy method called - use sendResultLink with tenant context`);
        return false;
    }
}
