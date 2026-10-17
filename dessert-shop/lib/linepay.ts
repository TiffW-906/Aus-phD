import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';

// LINE Pay Online API v3. Keys stay on the server (no NEXT_PUBLIC_ prefix).
// LINEPAY_API_BASE overrides the endpoint for local testing against a mock.
function config() {
  const channelId = process.env.LINEPAY_CHANNEL_ID;
  const secret = process.env.LINEPAY_CHANNEL_SECRET;
  if (!channelId || !secret) return null;
  const base =
    process.env.LINEPAY_API_BASE ||
    (process.env.LINEPAY_ENV === 'production' ? 'https://api-pay.line.me' : 'https://sandbox-api-pay.line.me');
  return { channelId, secret, base };
}

export const linePayConfigured = () => config() !== null;

/**
 * How customers pay with LINE Pay: through the API (merchant keys set), by scanning the
 * shop's QR code (uploaded in /admin/settings, seller confirms by hand), or not at all.
 */
export type LinePayMode = 'api' | 'qr' | 'off';
export function linePayMode(settings: { linepay_qr_url: string | null }): LinePayMode {
  if (linePayConfigured()) return 'api';
  return settings.linepay_qr_url ? 'qr' : 'off';
}

export function signature(secret: string, path: string, body: string, nonce: string) {
  return createHmac('sha256', secret).update(secret + path + body + nonce).digest('base64');
}

/** transactionId is a 19-digit number; keep it as a string so JSON.parse does not round it. */
export function parseLinePayJson(text: string) {
  return JSON.parse(text.replace(/"transactionId"\s*:\s*(\d+)/g, '"transactionId":"$1"'));
}

type LinePayResponse = { returnCode: string; returnMessage: string; info?: Record<string, unknown> };

async function post(path: string, payload: unknown): Promise<LinePayResponse> {
  const cfg = config();
  if (!cfg) throw new Error('LINE Pay 尚未設定');
  const body = JSON.stringify(payload);
  const nonce = randomUUID();
  const res = await fetch(cfg.base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': cfg.channelId,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': signature(cfg.secret, path, body, nonce),
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  return parseLinePayJson(await res.text());
}

export type LinePayItem = { name: string; quantity: number; price: number };

export async function requestPayment(opts: {
  orderNo: string;
  amount: number;
  items: LinePayItem[];
  confirmUrl: string;
  cancelUrl: string;
}) {
  const res = await post('/v3/payments/request', {
    amount: opts.amount,
    currency: 'TWD',
    orderId: opts.orderNo,
    packages: [{ id: 'wud', amount: opts.amount, name: 'Wu.D dessert', products: opts.items }],
    redirectUrls: { confirmUrl: opts.confirmUrl, cancelUrl: opts.cancelUrl },
  });
  if (res.returnCode !== '0000') throw new Error(`LINE Pay ${res.returnCode}: ${res.returnMessage}`);
  const info = res.info as { transactionId: string; paymentUrl: { web: string } };
  return { transactionId: info.transactionId, paymentUrl: info.paymentUrl.web };
}

export async function confirmPayment(transactionId: string, amount: number) {
  return post(`/v3/payments/${transactionId}/confirm`, { amount, currency: 'TWD' });
}
