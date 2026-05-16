import { createHmac } from 'crypto';
import type { Request, Response } from 'express';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { WhatsAppService } from './whatsapp.service';

type MockResponse = Response & {
  status: jest.Mock;
  send: jest.Mock;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('TwilioWebhookController', () => {
  const originalEnv = process.env;
  const updateStatusFromWebhook = jest.fn().mockResolvedValue(undefined);
  const whatsappService = {
    updateStatusFromWebhook,
  } as unknown as WhatsAppService;

  let controller: TwilioWebhookController;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.TWILIO_AUTH_TOKEN = 'twilio-auth-token';
    process.env.TWILIO_WEBHOOK_URL =
      'https://api.medlabs.test/api/webhooks/twilio';
    jest.clearAllMocks();
    controller = new TwilioWebhookController(whatsappService);
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

  function createRequest(
    body: Record<string, string>,
    signature?: string,
  ): Request {
    return {
      body,
      protocol: 'https',
      originalUrl: '/api/webhooks/twilio',
      get: jest.fn((name: string) =>
        name.toLowerCase() === 'host' ? 'api.medlabs.test' : undefined,
      ),
      header: jest.fn((name: string) =>
        name.toLowerCase() === 'x-twilio-signature' ? signature : undefined,
      ),
    } as unknown as Request;
  }

  function signTwilioPayload(body: Record<string, string>): string {
    const payload = Object.keys(body)
      .sort()
      .reduce(
        (acc, key) => `${acc}${key}${body[key]}`,
        process.env.TWILIO_WEBHOOK_URL!,
      );

    return createHmac('sha1', process.env.TWILIO_AUTH_TOKEN!)
      .update(payload)
      .digest('base64');
  }

  const body = {
    MessageSid: 'SM123',
    MessageStatus: 'read',
  };

  it('accepts a valid x-twilio-signature and updates status', async () => {
    const req = createRequest(body, signTwilioPayload(body));
    const res = createResponse();

    controller.handleStatusCallback(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
    expect(updateStatusFromWebhook).toHaveBeenCalledWith('SM123', 'read');
  });

  it('rejects an invalid x-twilio-signature without updating status', async () => {
    const req = createRequest(body, 'invalid-signature');
    const res = createResponse();

    controller.handleStatusCallback(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
    expect(updateStatusFromWebhook).not.toHaveBeenCalled();
  });

  it('rejects production webhooks when no Twilio auth token is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TWILIO_AUTH_TOKEN;

    const req = createRequest(body);
    const res = createResponse();

    controller.handleStatusCallback(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
    expect(updateStatusFromWebhook).not.toHaveBeenCalled();
  });

  it('maps undelivered callbacks to failed status', async () => {
    const failedBody = {
      MessageSid: 'SM456',
      MessageStatus: 'undelivered',
    };
    const req = createRequest(failedBody, signTwilioPayload(failedBody));
    const res = createResponse();

    controller.handleStatusCallback(req, res);
    await flushPromises();

    expect(updateStatusFromWebhook).toHaveBeenCalledWith('SM456', 'failed');
  });
});
