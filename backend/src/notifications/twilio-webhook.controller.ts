import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/guards';
import { WhatsAppService } from './whatsapp.service';

/**
 * Twilio Webhook Controller
 * Handles status updates from Twilio for WhatsApp messages
 * 
 * Note: Twilio sends data as application/x-www-form-urlencoded
 */
@Controller('api/webhooks/twilio')
export class TwilioWebhookController {
    private readonly logger = new Logger(TwilioWebhookController.name);

    constructor(private readonly whatsAppService: WhatsAppService) { }

    /**
     * Handle Twilio status callback
     * Endpoint: POST /api/webhooks/twilio
     * 
     * Twilio sends updates for: queued, sent, delivered, read, failed, undelivered
     */
    @Public()
    @Post()
    async handleStatusCallback(@Req() req: Request, @Res() res: Response) {
        // Immediately respond to Twilio
        res.status(HttpStatus.OK).send('OK');

        // Process asynchronously
        this.processCallback(req.body);
    }

    private async processCallback(body: any) {
        try {
            const messageSid = body.MessageSid;
            const status = body.MessageStatus;

            if (!messageSid || !status) {
                this.logger.warn('[Twilio Webhook] Missing MessageSid or MessageStatus');
                return;
            }

            this.logger.log(`[Twilio Webhook] MessageSid: ${messageSid}, Status: ${status}`);

            // Map Twilio status to our internal status
            const statusMap: Record<string, 'sent' | 'delivered' | 'read' | 'failed' | 'queued'> = {
                queued: 'queued',
                sent: 'sent',
                delivered: 'delivered',
                read: 'read',
                failed: 'failed',
                undelivered: 'failed',
            };

            const mappedStatus = statusMap[status];
            if (mappedStatus) {
                await this.whatsAppService.updateStatusFromWebhook(messageSid, mappedStatus);
            }
        } catch (error: any) {
            this.logger.error(`[Twilio Webhook] Error processing callback: ${error.message}`);
        }
    }
}
