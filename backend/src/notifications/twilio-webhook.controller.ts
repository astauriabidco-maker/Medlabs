import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../auth/guards';
import { WhatsAppService } from './whatsapp.service';

type WebhookStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'queued';
type TwilioCallbackBody = Record<string, string | undefined>;

/**
 * Twilio Webhook Controller
 * Handles status updates from Twilio for WhatsApp messages
 *
 * Note: Twilio sends data as application/x-www-form-urlencoded
 */
@Controller('api/webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  private getAuthToken(): string | undefined {
    return process.env.TWILIO_AUTH_TOKEN;
  }

  private getWebhookUrl(req: Request): string {
    return (
      process.env.TWILIO_WEBHOOK_URL ||
      `${req.protocol}://${req.get('host')}${req.originalUrl}`
    );
  }

  private verifySignature(req: Request): boolean {
    const authToken = this.getAuthToken();
    if (!authToken) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          '[Twilio Webhook] Missing TWILIO_AUTH_TOKEN in production',
        );
        return false;
      }
      this.logger.warn(
        '[Twilio Webhook] Signature verification skipped: no auth token configured',
      );
      return true;
    }

    const signature = req.header('x-twilio-signature');
    if (!signature) return false;

    const params =
      req.body && typeof req.body === 'object'
        ? (req.body as TwilioCallbackBody)
        : {};
    const payload = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => `${acc}${key}${params[key]}`,
        this.getWebhookUrl(req),
      );
    const expected = createHmac('sha1', authToken)
      .update(payload)
      .digest('base64');
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  /**
   * Handle Twilio status callback
   * Endpoint: POST /api/webhooks/twilio
   *
   * Twilio sends updates for: queued, sent, delivered, read, failed, undelivered
   */
  @Public()
  @Post()
  handleStatusCallback(@Req() req: Request, @Res() res: Response) {
    if (!this.verifySignature(req)) {
      this.logger.warn('[Twilio Webhook] Invalid signature');
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    // Immediately respond to Twilio
    res.status(HttpStatus.OK).send('OK');

    // Process asynchronously
    void this.processCallback(req.body as TwilioCallbackBody);
  }

  private async processCallback(body: TwilioCallbackBody) {
    try {
      const messageSid = body.MessageSid;
      const status = body.MessageStatus;

      if (!messageSid || !status) {
        this.logger.warn(
          '[Twilio Webhook] Missing MessageSid or MessageStatus',
        );
        return;
      }

      this.logger.log(
        `[Twilio Webhook] MessageSid: ${messageSid}, Status: ${status}`,
      );

      // Map Twilio status to our internal status
      const statusMap: Record<string, WebhookStatus> = {
        queued: 'queued',
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
        undelivered: 'failed',
      };

      const mappedStatus = statusMap[status];
      if (mappedStatus) {
        await this.whatsAppService.updateStatusFromWebhook(
          messageSid,
          mappedStatus,
        );
      }
    } catch (error) {
      this.logger.error(
        `[Twilio Webhook] Error processing callback: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
