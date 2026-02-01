import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);

    // Twilio WhatsApp Sandbox number (dev) or Lab's Business Number (prod)
    private readonly whatsappSender = 'whatsapp:+14155238886';

    /**
     * Send result notification via WhatsApp
     * In dev mode, this just logs the message
     * In production, would use Twilio's WhatsApp API
     */
    async sendResultNotification(
        phoneNumber: string,
        patientName: string,
        link: string,
    ): Promise<boolean> {
        // Format recipient for WhatsApp (e.g., whatsapp:+237612345678)
        const recipient = `whatsapp:${phoneNumber}`;

        // Template message (WhatsApp requires approved templates in production)
        const message = `Bonjour ${patientName}, vos résultats médicaux sont disponibles. Consultez-les ici : ${link}`;

        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[WHATSAPP MOCK] From: ${this.whatsappSender}`);
            this.logger.log(`[WHATSAPP MOCK] To: ${recipient}`);
            this.logger.log(`[WHATSAPP MOCK] Message: ${message}`);
            return true;
        }

        // TODO: Production Twilio integration
        // const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        // await client.messages.create({
        //     from: this.whatsappSender,
        //     to: recipient,
        //     body: message,
        // });

        this.logger.warn(`WhatsApp provider not integrated. Message to ${recipient} was NOT sent.`);
        return false;
    }

    /**
     * Send access code reminder via WhatsApp
     */
    async sendAccessCodeReminder(
        phoneNumber: string,
        patientName: string,
        accessCode: string,
    ): Promise<boolean> {
        const recipient = `whatsapp:${phoneNumber}`;
        const message = `Bonjour ${patientName}, votre code d'accès aux résultats est : ${accessCode}`;

        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[WHATSAPP MOCK] To: ${recipient} | Code: ${accessCode}`);
            return true;
        }

        this.logger.warn(`WhatsApp provider not integrated. Code to ${recipient} was NOT sent.`);
        return false;
    }
}
