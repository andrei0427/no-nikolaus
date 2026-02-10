import webpush from 'web-push';
import type { Request, Response } from 'express';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

export async function handleSendPush(req: Request, res: Response) {
  const { subscription, terminal, ferryName } = req.body;

  if (!subscription || !terminal || !ferryName) {
    res.status(400).json({ error: 'Missing subscription, terminal, or ferryName' });
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
    console.log(`[Push] Sending to ${terminal} for ${ferryName}, endpoint: ${subscription.endpoint}`);
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
    res.status(500).json({ error: 'Failed to send push notification' });
  }
}

export async function handlePredictionFeedback(req: Request, res: Response) {
  const { terminal, ferryName, correct } = req.body;

  if (!terminal || !ferryName || typeof correct !== 'boolean') {
    res.status(400).json({ error: 'Missing terminal, ferryName, or correct' });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram not configured, skipping feedback forwarding');
    res.json({ ok: true, telegram: false });
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
    const resp = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      }
    );

    if (!resp.ok) {
      console.error('Telegram API error:', await resp.text());
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram send error:', err);
    res.status(500).json({ error: 'Failed to send Telegram message' });
  }
}
