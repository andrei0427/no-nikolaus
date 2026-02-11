import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock hoisting — set env vars first
vi.hoisted(() => {
  process.env.VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  process.env.VAPID_EMAIL = 'mailto:test@example.com';
});

// Mock web-push before importing the handler
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// Mock telegram module
vi.mock('./telegram.js', () => ({
  sendTelegramAlert: vi.fn(),
  sendTelegramMessage: vi.fn(),
  isTelegramConfigured: vi.fn(),
}));

import webpush from 'web-push';
import { handleSendPush, handlePredictionFeedback } from './pushHandler.js';
import { sendTelegramMessage, isTelegramConfigured } from './telegram.js';

function mockReqRes(body: Record<string, unknown>) {
  const req = { body } as never;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as never;
  return { req, res };
}

describe('handleSendPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when subscription is missing', async () => {
    const { req, res } = mockReqRes({ terminal: 'cirkewwa', ferryName: 'MV Malita' });
    await handleSendPush(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when terminal is missing', async () => {
    const { req, res } = mockReqRes({ subscription: {}, ferryName: 'MV Malita' });
    await handleSendPush(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('sends push notification successfully', async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({ statusCode: 201 } as never);

    const { req, res } = mockReqRes({
      subscription: { endpoint: 'https://example.com/push' },
      terminal: 'cirkewwa',
      ferryName: 'MV Malita',
    });
    await handleSendPush(req, res);
    expect(webpush.sendNotification).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('returns 410 when subscription is expired', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });

    const { req, res } = mockReqRes({
      subscription: { endpoint: 'https://example.com/push' },
      terminal: 'cirkewwa',
      ferryName: 'MV Malita',
    });
    await handleSendPush(req, res);
    expect(res.status).toHaveBeenCalledWith(410);
  });
});

describe('handlePredictionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when fields are missing', async () => {
    const { req, res } = mockReqRes({ terminal: 'cirkewwa' });
    await handlePredictionFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when correct is not boolean', async () => {
    const { req, res } = mockReqRes({
      terminal: 'cirkewwa',
      ferryName: 'MV Malita',
      correct: 'yes',
    });
    await handlePredictionFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('skips telegram when not configured', async () => {
    vi.mocked(isTelegramConfigured).mockReturnValue(false);

    const { req, res } = mockReqRes({
      terminal: 'cirkewwa',
      ferryName: 'MV Malita',
      correct: true,
    });
    await handlePredictionFeedback(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, telegram: false });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('sends telegram message for correct prediction', async () => {
    vi.mocked(isTelegramConfigured).mockReturnValue(true);
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true } as Response);

    const { req, res } = mockReqRes({
      terminal: 'cirkewwa',
      ferryName: 'MV Malita',
      correct: true,
    });
    await handlePredictionFeedback(req, res);

    const message = vi.mocked(sendTelegramMessage).mock.calls[0][0];
    expect(message).toContain('✅');
    expect(message).toContain('Ċirkewwa');
    expect(message).toContain('MV Malita');
    expect(message).toContain('Yes');
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('sends telegram message for incorrect prediction', async () => {
    vi.mocked(isTelegramConfigured).mockReturnValue(true);
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true } as Response);

    const { req, res } = mockReqRes({
      terminal: 'mgarr',
      ferryName: 'MV Gaudos',
      correct: false,
    });
    await handlePredictionFeedback(req, res);

    const message = vi.mocked(sendTelegramMessage).mock.calls[0][0];
    expect(message).toContain('❌');
    expect(message).toContain('Mġarr');
    expect(message).toContain('No');
  });
});
