import webpush from 'web-push';
import type { Request, Response } from 'express';
import { sendTelegramAlert, sendTelegramMessage, isTelegramConfigured } from './telegram.js';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

const VALID_TERMINALS = ['cirkewwa', 'mgarr'];

export function isValidSubscription(sub: unknown): sub is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!sub || typeof sub !== 'object') return false;
  const s = sub as Record<string, unknown>;
  if (typeof s.endpoint !== 'string' || !s.endpoint.startsWith('https://')) return false;
  if (!s.keys || typeof s.keys !== 'object') return false;
  const k = s.keys as Record<string, unknown>;
  return typeof k.p256dh === 'string' && typeof k.auth === 'string';
}

export async function handleSendPush(req: Request, res: Response) {
  const { subscription, terminal, ferryName } = req.body;

  console.log(req.body)

  if (!subscription || !terminal || !ferryName) {
    res.status(400).json({ error: 'Missing subscription, terminal, or ferryName' });
    return;
  }

  if (!isValidSubscription(subscription)) {
    res.status(400).json({ error: 'Invalid subscription format' });
    return;
  }

  if (!VALID_TERMINALS.includes(terminal)) {
    res.status(400).json({ error: 'Invalid terminal' });
    return;
  }

  if (typeof ferryName !== 'string' || ferryName.length > 50) {
    res.status(400).json({ error: 'Invalid ferryName' });
    return;
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    res.status(500).json({ error: 'VAPID keys not configured' });
    return;
  }

  const payload = JSON.stringify({
    title: 'Ferry Prediction Check',
    body: `We predicted you'd get ${ferryName} — did we get it right?`,
    terminal,
    ferryName,
  });

  try {
    console.log(`[Push] Sending to ${terminal} for ${ferryName}`);
    const result = await webpush.sendNotification(subscription, payload);
    console.log(`[Push] Sent successfully, status: ${result.statusCode}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      res.status(410).json({ error: 'Subscription expired' });
      return;
    }
    console.error('Push send error:', err);
    sendTelegramAlert(`Push send error: ${err}`);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
}

export async function handlePredictionFeedback(req: Request, res: Response) {
  const { terminal, ferryName, correct } = req.body;

  if (!terminal || !ferryName || typeof correct !== 'boolean') {
    res.status(400).json({ error: 'Missing terminal, ferryName, or correct' });
    return;
  }

  if (!isTelegramConfigured()) {
    console.warn('Telegram not configured, skipping feedback forwarding');
    res.json({ ok: true, telegram: false });
    return;
  }

  if (!VALID_TERMINALS.includes(terminal)) {
    res.status(400).json({ error: 'Invalid terminal' });
    return;
  }

  if (typeof ferryName !== 'string' || ferryName.length > 50) {
    res.status(400).json({ error: 'Invalid ferryName' });
    return;
  }

  const icon = correct ? '✅' : '❌';
  const terminalName = terminal === 'cirkewwa' ? 'Ċirkewwa' : 'Mġarr';
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Malta' });

  const message = [
    `${icon} Ferry Prediction Feedback`,
    `Terminal: ${terminalName}`,
    `Predicted: ${ferryName}`,
    `Correct: ${correct ? 'Yes' : 'No'}`,
    `Time: ${now}`,
  ].join('\n');

  try {
    const resp = await sendTelegramMessage(message);

    if (!resp.ok) {
      sendTelegramAlert(`Feedback Telegram error: ${resp.status}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram send error:', err);
    sendTelegramAlert(`Feedback Telegram error: ${err}`);
    res.status(500).json({ error: 'Failed to send Telegram message' });
  }
}
