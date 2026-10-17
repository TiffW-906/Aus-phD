'use client';
import { useEffect, useState } from 'react';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { dateTime, hhmm, money } from '@/lib/format';
import { addDays, taipeiNow } from '@/lib/pickup';
import type { OrderWithItems } from '@/lib/types';
import { useFeed } from '@/components/admin/AdminShell';
import { fetchOrders } from '@/components/admin/orders';
import { ResponsiveOrders } from '@/components/admin/OrderViews';

type Filters = { from: string; to: string; method: string; payment: string; status: string; q: string };
const EMPTY: Filters = { from: '', to: '', method: '', payment: '', status: '', q: '' };

export default function OrdersPage() {
  const feed = useFeed();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const { from, to, method, payment, status, q } = filters;
      const term = q.trim().replace(/[,%()]/g, '');
      const list = await fetchOrders((query) => {
        if (from) query = query.gte('pickup_date', from);
        if (to) query = query.lte('pickup_date', to);
        if (method) query = query.eq('payment_method', method);
        if (payment) query = query.eq('payment_status', payment);
        if (status) query = query.eq('order_status', status);
        if (term) query = query.or(`order_no.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%,line_name.ilike.%${term}%`);
        return query.order('created_at', { ascending: false }).limit(500);
      });
      setOrders(list);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [filters, feed.version]);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const today = taipeiNow().date;
  const active = orders.filter((o) => o.order_status !== 'cancelled');
  const field = 'w-full rounded-xl border border-line bg-white px-2.5 py-2 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brick">訂單</h1>
        <button type="button" onClick={() => exportCsv(orders)} className="rounded-full border border-blush px-3 py-1.5 text-sm text-brick">
          匯出 CSV（備份）
        </button>
      </div>

      <div className="space-y-2 rounded-2xl bg-paper p-3 shadow-sm">
        <input value={filters.q} onChange={set('q')} type="search" placeholder="搜尋編號、姓名、電話、LINE" className={field} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <label className="text-xs text-muted">
            取貨日 從<input type="date" value={filters.from} onChange={set('from')} className={field} />
          </label>
          <label className="text-xs text-muted">
            到<input type="date" value={filters.to} onChange={set('to')} className={field} />
          </label>
          <label className="text-xs text-muted">
            付款方式
            <select value={filters.method} onChange={set('method')} className={field}>
              <option value="">全部</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted">
            付款狀態
            <select value={filters.payment} onChange={set('payment')} className={field}>
              <option value="">全部</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs text-muted md:col-span-1">
            訂單狀態
            <select value={filters.status} onChange={set('status')} className={field}>
              <option value="">全部</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['今天取貨', { from: today, to: today }],
            ['明天', { from: addDays(today, 1), to: addDays(today, 1) }],
            ['7 天內', { from: today, to: addDays(today, 6) }],
          ].map(([label, range]) => (
            <button key={label as string} type="button" onClick={() => setFilters((f) => ({ ...f, ...(range as object) }))} className="rounded-full border border-line bg-white px-3 py-1 text-xs">
              {label as string}
            </button>
          ))}
          <button type="button" onClick={() => setFilters(EMPTY)} className="rounded-full px-3 py-1 text-xs text-muted underline">
            清除條件
          </button>
        </div>
      </div>

      <p className="text-sm text-muted">
        共 {orders.length} 筆（不含取消 {active.length} 筆，金額 {money(active.reduce((s, o) => s + o.total_amount, 0))}）
        {loading && '・載入中…'}
      </p>
      <ResponsiveOrders orders={orders} />
    </div>
  );
}

function exportCsv(orders: OrderWithItems[]) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['訂單編號', '下單時間', '取貨日', '取貨時段', '姓名', '手機', 'LINE', '付款方式', '付款狀態', '訂單狀態', '品項', '口味', '單價', '數量', '小計', '訂單總額', '備註'];
  const rows = orders.flatMap((o) =>
    o.order_items.map((i) => [
      o.order_no, dateTime(o.created_at), o.pickup_date, hhmm(o.pickup_time), o.customer_name, o.phone, o.line_name,
      PAYMENT_METHOD_LABELS[o.payment_method], PAYMENT_STATUS_LABELS[o.payment_status], ORDER_STATUS_LABELS[o.order_status],
      i.product_name, i.flavor, i.unit_price, i.quantity, i.subtotal, o.total_amount, o.note,
    ])
  );
  // BOM so Excel opens the Chinese text correctly.
  const csv = '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `wud-orders-${taipeiNow().date}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
