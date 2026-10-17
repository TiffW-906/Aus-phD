import 'server-only';
import { randomInt } from 'node:crypto';
import { supabaseService } from './supabase/server';
import { taipeiNow } from './pickup';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** WD261017-K7Q2MX: Taipei date plus a random suffix that is hard to guess (the order page is public). */
export function newOrderNo(now = new Date()) {
  const suffix = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `WD${taipeiNow(now).date.slice(2).replaceAll('-', '')}-${suffix}`;
}

/** Cancels an order; the database trigger puts any in-stock quantities back. */
export async function cancelOrder(orderId: string, reason: string) {
  await supabaseService()
    .from('orders')
    .update({ order_status: 'cancelled', cancel_reason: reason })
    .eq('id', orderId)
    .neq('order_status', 'cancelled');
}

/** Turns place_order() exceptions into messages for the customer. */
export function placeOrderError(message: string) {
  const [code, name, extra] = message.split('|');
  switch (code) {
    case 'OUT_OF_STOCK':
      return Number(extra) > 0 ? `「${name}」現貨只剩 ${extra} 件，請調整數量` : `「${name}」今日已售完`;
    case 'STATUS_CHANGED':
      return `「${name}」的供應狀態剛剛更新了，請重新確認購物車`;
    case 'UNAVAILABLE':
      return `「${name}」目前暫停供應，請從購物車移除`;
    case 'BAD_FLAVOR':
      return `請重新選擇「${name}」的口味`;
    case 'BAD_QUANTITY':
      return `「${name}」數量不正確`;
    case 'EMPTY_CART':
      return '購物車是空的';
    default:
      return null;
  }
}
