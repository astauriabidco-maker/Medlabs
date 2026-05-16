import { createHmac } from 'crypto';
import type { Request, Response } from 'express';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WhatsAppService } from './whatsapp.service';

type MockResponse = Response & {
  status: jest.Mock;
  send: jest.Mock;
};

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('WhatsAppWebhookController', () => {
  const originalEnv = process.env;
  const updateStatusFromWebhook = jest.fn().mockResolvedValue(undefined);
  const whatsappService = {
    updateStatusFromWebhook,
  } as unknown as WhatsAppService;

  let controller: WhatsAppWebhookController;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.WHATSAPP_APP_SECRET = 'meta-webhook-secret';
    delete process.env.META_APP_SECRET;
    jest.clearAllMocks();
    controller = new WhatsAppWebhookController(whatsappService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createResponse(): MockResponse {
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    return res as unknown as MockResponse;
  }

  function createRequest(rawBody: Buffer, signature?: string): RawBodyRequest {
    return {
      rawBody,
      header: jest.fn((name: string) =>
        name.toLowerCase() === 'x-hub-signature-256' ? signature : undefined,
      ),
    } as unknown as RawBodyRequest;
  }

  function signMetaPayload(rawBody: Buffer): string {
    return `sha256=${createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
      .update(rawBody)
      .digest('hex')}`;
  }

  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [{ id: 'wamid.123', status: 'delivered' }],
            },
          },
        ],
      },
    ],
  };

  it('accepts a valid x-hub-signature-256 computed from rawBody and updates status', async () => {
    const rawBody = Buffer.from(JSON.stringify(body));
    const req = createRequest(rawBody, signMetaPayload(rawBody));
    const res = createResponse();

    controller.receiveWebhook(req, body, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');
    expect(updateStatusFromWebhook).toHaveBeenCalledWith(
      'wamid.123',
      'delivered',
    );
  });

  it('rejects an invalid x-hub-signature-256 without updating status', async () => {
    const rawBody = Buffer.from(JSON.stringify(body));
    const req = createRequest(rawBody, 'sha256=bad-signature');
    const res = createResponse();

    controller.receiveWebhook(req, body, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
    expect(updateStatusFromWebhook).not.toHaveBeenCalled();
  });

  it('rejects production webhooks when no Meta app secret is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.META_APP_SECRET;

    const rawBody = Buffer.from(JSON.stringify(body));
    const req = createRequest(rawBody);
    const res = createResponse();

    controller.receiveWebhook(req, body, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
    expect(updateStatusFromWebhook).not.toHaveBeenCalled();
  });
});
