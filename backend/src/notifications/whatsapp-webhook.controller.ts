import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    Res,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../auth/guards';

/**
 * Webhook Controller for WhatsApp Business Cloud API (Meta)
 * 
 * Meta sends:
 * - GET request for verification (when setting up webhook)
 * - POST request for status updates (sent, delivered, read, failed)
 */
@Controller('api/webhooks/whatsapp')
export class WhatsAppWebhookController {
    private readonly logger = new Logger(WhatsAppWebhookController.name);

    constructor(private readonly whatsappService: WhatsAppService) { }

    /**
     * Webhook Verification (GET)
     * Meta calls this when you configure the webhook URL
     */
    @Public()
    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') verifyToken: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'medlab_whatsapp_secret';

        if (mode === 'subscribe' && verifyToken === expectedToken) {
            this.logger.log('[WhatsApp Webhook] Verification successful');
            return res.status(HttpStatus.OK).send(challenge);
        }

        this.logger.warn('[WhatsApp Webhook] Verification failed');
        return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }

    /**
     * Receive Webhook Events (POST)
     * Meta sends status updates here: sent, delivered, read, failed
     */
    @Public()
    @Post()
    async receiveWebhook(
        @Body() body: any,
        @Res() res: Response,
    ) {
        // Always respond quickly with 200 OK to acknowledge receipt
        res.status(HttpStatus.OK).send('EVENT_RECEIVED');

        // Process the webhook asynchronously
        this.processWebhookAsync(body);
    }

    private async processWebhookAsync(body: any): Promise<void> {
        try {
            // Meta webhook structure:
            // body.entry[].changes[].value.statuses[] or .messages[]
            const entries = body?.entry || [];

            for (const entry of entries) {
                const changes = entry?.changes || [];

                for (const change of changes) {
                    const value = change?.value;
                    if (!value) continue;

                    // Handle status updates
                    const statuses = value?.statuses || [];
                    for (const statusUpdate of statuses) {
                        const messageId = statusUpdate?.id;
                        const status = statusUpdate?.status; // 'sent', 'delivered', 'read', 'failed'

                        if (messageId && status) {
                            this.logger.log(`[WhatsApp Webhook] Status update: ${messageId} -> ${status}`);
                            await this.whatsappService.updateStatusFromWebhook(messageId, status);
                        }
                    }

                    // Handle incoming messages (optional - for future interactive features)
                    const messages = value?.messages || [];
                    for (const message of messages) {
                        this.logger.log(`[WhatsApp Webhook] Incoming message from ${message?.from}: ${message?.text?.body}`);
                        // Future: Handle patient replies
                    }
                }
            }
        } catch (error) {
            this.logger.error(`[WhatsApp Webhook] Error processing: ${error.message}`);
        }
    }
}
