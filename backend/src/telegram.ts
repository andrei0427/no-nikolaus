const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const recentMessages = new Map<string, number>();
const DEDUP_INTERVAL_MS = 60_000;

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!botToken || !chatId) return;

  const now = Date.now();
  const lastSent = recentMessages.get(message);
  if (lastSent && now - lastSent < DEDUP_INTERVAL_MS) return;
  recentMessages.set(message, now);

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
      console.error('Telegram alert API error:', resp.status, await resp.text());
    }
  } catch (err) {
    console.error('Telegram alert send error:', err);
  }
}

export function sendTelegramMessage(text: string): Promise<Response> {
  return fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
}

export function isTelegramConfigured(): boolean {
  return !!(botToken && chatId);
}
