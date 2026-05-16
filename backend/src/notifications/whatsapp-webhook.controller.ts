import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Req,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { WhatsAppService } from './whatsapp.service';
import { Public } from '../auth/guards';

type WebhookStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'queued';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

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

  constructor(private readonly whatsappService: WhatsAppService) {}

  private getAppSecret(): string | undefined {
    return process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private isWebhookStatus(status: unknown): status is WebhookStatus {
    return (
      status === 'sent' ||
      status === 'delivered' ||
      status === 'read' ||
      status === 'failed' ||
      status === 'queued'
    );
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private verifySignature(req: RawBodyRequest): boolean {
    const secret = this.getAppSecret();
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          '[WhatsApp Webhook] Missing WHATSAPP_APP_SECRET/META_APP_SECRET in production',
        );
        return false;
      }
      this.logger.warn(
        '[WhatsApp Webhook] Signature verification skipped: no app secret configured',
      );
      return true;
    }

    const signature = req.header('x-hub-signature-256');
    if (!signature?.startsWith('sha256=')) {
      return false;
    }

    const rawBody = req.rawBody;
    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error(
        '[WhatsApp Webhook] Raw body unavailable for signature verification',
      );
      return false;
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature.slice('sha256='.length);
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

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
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (
      expectedToken &&
      mode === 'subscribe' &&
      verifyToken === expectedToken
    ) {
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
  receiveWebhook(
    @Req() req: RawBodyRequest,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    if (!this.verifySignature(req)) {
      this.logger.warn('[WhatsApp Webhook] Invalid signature');
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    // Always respond quickly with 200 OK to acknowledge receipt
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    // Process the webhook asynchronously
    void this.processWebhookAsync(body);
  }

  private async processWebhookAsync(body: unknown): Promise<void> {
    try {
      // Meta webhook structure:
      // body.entry[].changes[].value.statuses[] or .messages[]
      const entries = this.asArray(this.asRecord(body).entry);

      for (const entry of entries) {
        const changes = this.asArray(this.asRecord(entry).changes);

        for (const change of changes) {
          const value = this.asRecord(this.asRecord(change).value);

          // Handle status updates
          const statuses = this.asArray(value.statuses);
          for (const statusUpdate of statuses) {
            const statusRecord = this.asRecord(statusUpdate);
            const messageId = statusRecord.id;
            const status = statusRecord.status;

            if (typeof messageId === 'string' && this.isWebhookStatus(status)) {
              this.logger.log(
                `[WhatsApp Webhook] Status update: ${messageId} -> ${status}`,
              );
              await this.whatsappService.updateStatusFromWebhook(
                messageId,
                status,
              );
            }
          }

          // Handle incoming messages (optional - for future interactive features)
          const messages = this.asArray(value.messages);
          for (const message of messages) {
            const messageRecord = this.asRecord(message);
            const text = this.asRecord(messageRecord.text);
            this.logger.log(
              `[WhatsApp Webhook] Incoming message from ${this.asString(messageRecord.from)}: ${this.asString(text.body)}`,
            );
            // Future: Handle patient replies
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `[WhatsApp Webhook] Error processing: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
