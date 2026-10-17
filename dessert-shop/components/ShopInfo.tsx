import { MAP_URL, SHOP } from '@/lib/constants';
import { weekdaysText } from '@/lib/format';
import type { StoreSettings } from '@/lib/types';

export const hoursText = (s: StoreSettings) => `${weekdaysText(s.open_weekdays)} ${s.open_time.slice(0, 5)}–${s.close_time.slice(0, 5)}`;

/** Pickup address, hours and a Google Maps link (no API key needed). */
export function PickupInfo({ settings, className = '' }: { settings: StoreSettings; className?: string }) {
  return (
    <div className={`rounded-2xl bg-blush-light p-4 text-sm ${className}`}>
      <p className="font-bold text-brick-dark">取貨地點</p>
      <p className="mt-1">{SHOP.address}</p>
      <p className="mt-1 text-muted">營業取貨：{hoursText(settings)}</p>
      <a href={MAP_URL} target="_blank" rel="noopener" className="mt-2 inline-block font-bold text-brick underline">
        📍 Google 地圖導航
      </a>
    </div>
  );
}

export function ShopFooter({ settings }: { settings: StoreSettings }) {
  return (
    <footer className="px-4 pt-6 pb-28 text-center text-sm text-muted">
      <p>
        {SHOP.address}・
        <a href={MAP_URL} target="_blank" rel="noopener" className="text-brick underline">
          地圖
        </a>
      </p>
      <p>營業取貨：{hoursText(settings)}</p>
      <p className="mt-2">
        LINE{' '}
        <a href={SHOP.lineUrl} target="_blank" rel="noopener" className="font-bold text-brick">
          {SHOP.lineId}
        </a>
        ・IG{' '}
        <a href={SHOP.instagram} target="_blank" rel="noopener" className="text-brick">
          wu.d_dessert
        </a>
      </p>
    </footer>
  );
}
