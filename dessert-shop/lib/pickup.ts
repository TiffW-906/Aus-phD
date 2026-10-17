// Pickup date/slot rules (CLAUDE.md「取貨規則」). Used by the storefront to build the
// calendar and by the order API to re-validate, so both always agree.
// Dates are "YYYY-MM-DD" strings in Asia/Taipei; times are "HH:MM".
import type { Product, StoreSettings } from './types';
import { shortDate } from './format';

export type PickupProduct = Pick<Product, 'id' | 'name' | 'stock_status' | 'lead_days' | 'temp_type'>;

const TAIPEI_OFFSET_MS = 8 * 3600 * 1000;

export function taipeiNow(now: Date = new Date()) {
  const t = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  return { date: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = Monday … 7 = Sunday */
export function isoWeekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Slot start times for a date; today's slots start at least `same_day_buffer_minutes` from now. */
export function slotsFor(date: string, settings: StoreSettings, now: Date = new Date()) {
  const open = toMinutes(settings.open_time);
  const close = toMinutes(settings.close_time);
  const { date: today, minutes } = taipeiNow(now);
  const slots: string[] = [];
  for (let m = open; m + settings.slot_minutes <= close; m += settings.slot_minutes) {
    if (date === today && m < minutes + settings.same_day_buffer_minutes) continue;
    slots.push(fromMinutes(m));
  }
  return slots;
}

export function isOpenDay(date: string, settings: StoreSettings, closed: Set<string>) {
  return settings.open_weekdays.includes(isoWeekday(date)) && !closed.has(date);
}

/** Earliest date each product allows, ignoring business days. */
export function productEarliest(product: PickupProduct, today: string) {
  return product.stock_status === 'in_stock' ? today : addDays(today, product.lead_days);
}

/** The product that pushes the pickup date furthest out, and that date. */
export function cartRequirement(products: PickupProduct[], today: string) {
  let date = today;
  let limiting: PickupProduct | null = null;
  for (const p of products) {
    const d = productEarliest(p, today);
    if (d > date || (limiting === null && p.stock_status !== 'in_stock')) {
      date = d;
      limiting = p;
    }
  }
  return { date, limiting };
}

export type PickupWindow = {
  /** Every date the customer may pick. */
  dates: string[];
  earliest: string | null;
  /** Human-readable reason for the earliest date. */
  explanation: string;
};

export function pickupWindow(
  products: PickupProduct[],
  settings: StoreSettings,
  closed: Set<string>,
  now: Date = new Date()
): PickupWindow {
  const { date: today } = taipeiNow(now);
  const last = addDays(today, settings.max_days_ahead);
  const { date: required, limiting } = cartRequirement(products, today);

  const dates: string[] = [];
  for (let d = required; d <= last; d = addDays(d, 1)) {
    if (isOpenDay(d, settings, closed) && slotsFor(d, settings, now).length > 0) dates.push(d);
  }
  const earliest = dates[0] ?? null;

  let explanation: string;
  if (!earliest) {
    explanation = `${settings.max_days_ahead} 天內沒有可取貨的日期，請 LINE 聯繫我們`;
  } else {
    const when = earliest === today ? '今天' : shortDate(earliest);
    if (limiting) {
      const kind = limiting.temp_type === 'made_to_order' ? '接單製作' : `需預訂 ${limiting.lead_days} 天`;
      explanation = `購物車內有${kind}的「${limiting.name}」，最快 ${when} 可取貨`;
    } else {
      explanation = `購物車內皆為現貨，最快 ${when} 可取貨`;
    }
    if (earliest !== required) explanation += '（已避開非營業日與公休日）';
  }
  return { dates, earliest, explanation };
}

/** Returns an error message, or null when the slot is allowed. */
export function validatePickup(
  date: string,
  time: string,
  products: PickupProduct[],
  settings: StoreSettings,
  closed: Set<string>,
  now: Date = new Date()
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '請選擇取貨日期';
  if (!/^\d{2}:\d{2}$/.test(time)) return '請選擇取貨時段';
  const window = pickupWindow(products, settings, closed, now);
  if (!window.dates.includes(date)) {
    return window.earliest ? `${shortDate(date)} 無法取貨。${window.explanation}` : window.explanation;
  }
  if (!slotsFor(date, settings, now).includes(time)) return `${time} 這個時段無法選擇，請重新選擇時段`;
  return null;
}
