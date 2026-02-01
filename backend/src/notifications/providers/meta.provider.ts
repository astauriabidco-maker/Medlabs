import { Logger } from '@nestjs/common';
import axios from 'axios';
import { IWhatsAppProvider } from './IWhatsAppProvider';

/**
 * Meta WhatsApp Business Cloud API Provider
 * Uses the Graph API to send template messages
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
    private readonly logger = new Logger(MetaWhatsAppProvider.name);
    private readonly META_API_VERSION = 'v21.0';
    private readonly META_API_BASE = `https://graph.facebook.com/${this.META_API_VERSION}`;

    constructor(
        private readonly phoneNumberId: string,
        private readonly accessToken: string,
        private readonly labName: string,
    ) { }

    getProviderName(): string {
        return 'META';
    }

    /**
     * Format Cameroonian phone number to international format
     */
    private formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');

        if (cleaned.startsWith('6') && cleaned.length === 9) {
            cleaned = '237' + cleaned;
        } else if (cleaned.startsWith('+237')) {
            cleaned = cleaned.substring(1);
        }

        return cleaned;
    }

    async sendPdfLink(
        to: string,
        patientName: string,
        labName: string,
        documentUrl: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const formattedPhone = this.formatPhoneNumber(to);

        try {
            const response = await axios.post(
                `${this.META_API_BASE}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedPhone,
                    type: 'template',
                    template: {
                        name: 'result_available',
                        language: { code: 'fr' },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: patientName },
                                    { type: 'text', text: labName },
                                ],
                            },
                            {
                                type: 'button',
                                sub_type: 'url',
                                index: 0,
                                parameters: [
                                    { type: 'text', text: documentUrl.split('/').pop() || '' },
                                ],
                            },
                        ],
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const messageId = response.data?.messages?.[0]?.id;
            this.logger.log(`[Meta] Message sent to ${formattedPhone}: ${messageId}`);
            return { success: true, messageId };
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.message;
            this.logger.error(`[Meta] Failed to send message: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    }

    async sendTestMessage(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const formattedPhone = this.formatPhoneNumber(to);

        try {
            const response = await axios.post(
                `${this.META_API_BASE}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedPhone,
                    type: 'template',
                    template: {
                        name: 'hello_world',
                        language: { code: 'en_US' },
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const messageId = response.data?.messages?.[0]?.id;
            this.logger.log(`[Meta] Test message sent to ${formattedPhone}: ${messageId}`);
            return { success: true, messageId };
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.message;
            this.logger.error(`[Meta] Failed to send test: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    }
}
