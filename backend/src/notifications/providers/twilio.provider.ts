import { Logger } from '@nestjs/common';
import Twilio from 'twilio';
import { IWhatsAppProvider } from './IWhatsAppProvider';

/**
 * Twilio WhatsApp Provider
 * Uses Twilio SDK for robust message delivery
 */
export class TwilioWhatsAppProvider implements IWhatsAppProvider {
    private readonly logger = new Logger(TwilioWhatsAppProvider.name);
    private readonly client: Twilio.Twilio;
    private readonly fromNumber: string;

    constructor(
        accountSid: string,
        authToken: string,
        whatsappNumber: string,
    ) {
        this.client = Twilio(accountSid, authToken);
        // Ensure the number has whatsapp: prefix
        this.fromNumber = whatsappNumber.startsWith('whatsapp:')
            ? whatsappNumber
            : `whatsapp:${whatsappNumber}`;
    }

    getProviderName(): string {
        return 'TWILIO';
    }

    /**
     * Format phone number for Twilio WhatsApp (whatsapp:+237XXXXXXXX)
     */
    private formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');

        // Handle Cameroon numbers
        if (cleaned.startsWith('6') && cleaned.length === 9) {
            cleaned = '237' + cleaned;
        }

        // Add + prefix if missing
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return `whatsapp:${cleaned}`;
    }

    async sendPdfLink(
        to: string,
        patientName: string,
        labName: string,
        documentUrl: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const formattedTo = this.formatPhoneNumber(to);

        try {
            const message = await this.client.messages.create({
                from: this.fromNumber,
                to: formattedTo,
                body: `Bonjour ${patientName}, votre résultat d'analyse chez ${labName} est disponible.\n\nCliquez ici pour le consulter: ${documentUrl}\n\nCe lien expire dans 24h.`,
            });

            this.logger.log(`[Twilio] Message sent to ${to}: ${message.sid}`);
            return { success: true, messageId: message.sid };
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown Twilio error';
            this.logger.error(`[Twilio] Failed to send message: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    }

    async sendTestMessage(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const formattedTo = this.formatPhoneNumber(to);

        try {
            const message = await this.client.messages.create({
                from: this.fromNumber,
                to: formattedTo,
                body: '✅ Test de configuration WhatsApp Twilio réussi! Vos notifications fonctionnent correctement.',
            });

            this.logger.log(`[Twilio] Test message sent to ${to}: ${message.sid}`);
            return { success: true, messageId: message.sid };
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown Twilio error';
            this.logger.error(`[Twilio] Failed to send test: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    }
}
