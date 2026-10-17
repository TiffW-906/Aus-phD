import { TEMP_LABELS } from '@/lib/constants';
import type { Product } from '@/lib/types';

export function isSoldOutToday(product: Product, today: string) {
  if (product.stock_status === 'in_stock' || !product.sold_out_at) return false;
  const soldOn = new Date(new Date(product.sold_out_at).getTime() + 8 * 3600e3).toISOString().slice(0, 10);
  return soldOn === today;
}

export function StockBadge({ product, soldOut }: { product: Product; soldOut?: boolean }) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold';
  if (soldOut) return <span className={`${base} bg-ink/70 text-white`}>今日已售完</span>;
  if (product.stock_status === 'in_stock') {
    return (
      <span className={`${base} bg-brick text-white`}>
        今日現貨{product.stock_qty !== null ? `・剩 ${product.stock_qty}` : ''}
      </span>
    );
  }
  return <span className={`${base} bg-blush-light text-brick-dark`}>需預訂 {product.lead_days} 天</span>;
}

export function TempBadge({ product }: { product: Product }) {
  const t = TEMP_LABELS[product.temp_type];
  if (!t) return null;
  return (
    <span title={t.label} className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs text-brick">
      {t.icon} {t.short}
    </span>
  );
}
