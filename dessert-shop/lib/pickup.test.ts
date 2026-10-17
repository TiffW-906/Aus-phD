import { describe, expect, it } from 'vitest';
import { pickupWindow, slotsFor, validatePickup } from './pickup';
import type { StoreSettings } from './types';

const settings: StoreSettings = {
  open_weekdays: [1, 2, 3, 4],
  open_time: '12:00',
  close_time: '19:00',
  slot_minutes: 30,
  same_day_buffer_minutes: 60,
  max_days_ahead: 30,
  linepay_timeout_minutes: 20,
  linepay_qr_url: null,
};
// Monday 2026-10-19 13:10 in Taipei.
const monday = new Date('2026-10-19T05:10:00Z');
const stock = { id: 's', name: '可可布朗尼', stock_status: 'in_stock' as const, lead_days: 3, temp_type: 'fresh' as const };
const cookie = { id: 'c', name: '曲奇餅乾', stock_status: 'preorder' as const, lead_days: 3, temp_type: 'made_to_order' as const };
const none = new Set<string>();

describe('slots', () => {
  it('runs every 30 minutes from opening to the last slot before closing', () => {
    const all = slotsFor('2026-10-20', settings, monday);
    expect(all[0]).toBe('12:00');
    expect(all.at(-1)).toBe('18:30');
    expect(all).toHaveLength(14);
  });
  it('only offers same-day slots at least an hour from now', () => {
    expect(slotsFor('2026-10-19', settings, monday)[0]).toBe('14:30');
  });
});

describe('pickup window', () => {
  it('lets in-stock carts pick up today', () => {
    const w = pickupWindow([stock], settings, none, monday);
    expect(w.earliest).toBe('2026-10-19');
    expect(w.explanation).toContain('皆為現貨');
  });
  it('uses the latest product requirement and explains it', () => {
    const w = pickupWindow([stock, cookie], settings, none, monday);
    expect(w.earliest).toBe('2026-10-22');
    expect(w.explanation).toBe('購物車內有接單製作的「曲奇餅乾」，最快 10/22（四） 可取貨');
  });
  it('skips closed dates and non-business weekdays', () => {
    const w = pickupWindow([cookie], settings, new Set(['2026-10-22']), monday);
    // 10/23–25 are Fri–Sun.
    expect(w.earliest).toBe('2026-10-26');
    expect(w.explanation).toContain('已避開');
    expect(w.dates).not.toContain('2026-10-24');
  });
  it('rolls to the next business day once today has no slots left', () => {
    const late = new Date('2026-10-19T10:40:00Z'); // 18:40 Taipei
    expect(pickupWindow([stock], settings, none, late).earliest).toBe('2026-10-20');
  });
  it('stops at max_days_ahead', () => {
    const w = pickupWindow([stock], settings, none, monday);
    expect(w.dates.at(-1)! <= '2026-11-18').toBe(true);
  });
});

describe('validatePickup', () => {
  it('rejects dates before the requirement, closed days and past slots', () => {
    expect(validatePickup('2026-10-20', '13:00', [cookie], settings, none, monday)).toContain('無法取貨');
    expect(validatePickup('2026-10-22', '13:00', [cookie], settings, new Set(['2026-10-22']), monday)).toBeTruthy();
    expect(validatePickup('2026-10-19', '13:30', [stock], settings, none, monday)).toContain('時段');
    expect(validatePickup('2026-10-19', '14:30', [stock], settings, none, monday)).toBeNull();
    expect(validatePickup('2026-10-22', '18:30', [cookie], settings, none, monday)).toBeNull();
  });
});
