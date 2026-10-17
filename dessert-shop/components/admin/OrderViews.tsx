'use client';
import Link from 'next/link';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { dateTime, hhmm, money, shortDate } from '@/lib/format';
import type { OrderStatus, OrderWithItems, PaymentStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  ready: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-stone-200 text-stone-600',
};
const PAY_TONE: Record<PaymentStatus, string> = {
  unpaid: 'bg-brick/10 text-brick',
  paid: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-stone-200 text-stone-600',
};
const pill = 'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold';

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`${pill} ${STATUS_TONE[status]}`}>{ORDER_STATUS_LABELS[status]}</span>;
}
export function PaymentPill({ order }: { order: OrderWithItems }) {
  return (
    <span className={`${pill} ${PAY_TONE[order.payment_status]}`}>
      {PAYMENT_METHOD_LABELS[order.payment_method]}・{PAYMENT_STATUS_LABELS[order.payment_status]}
    </span>
  );
}
export function NewBadge() {
  return <span className={`${pill} bg-brick text-white`}>新</span>;
}

export const itemsSummary = (o: OrderWithItems) =>
  o.order_items.map((i) => `${i.product_name}${i.flavor ? `(${i.flavor})` : ''}×${i.quantity}`).join('、');

/** Card list for phones. */
export function OrderCards({ orders, showDate = true }: { orders: OrderWithItems[]; showDate?: boolean }) {
  return (
    <ul className="space-y-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/admin/orders/${o.id}`}
            className={`block rounded-2xl border-l-4 bg-paper p-3 shadow-sm ${o.is_read ? 'border-line' : 'border-brick'} ${o.order_status === 'cancelled' ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-2">
              {!o.is_read && o.order_status !== 'cancelled' && <NewBadge />}
              <b className="text-lg tabular-nums">
                {showDate && `${shortDate(o.pickup_date)} `}
                {hhmm(o.pickup_time)}
              </b>
              <span className="ml-auto font-bold text-brick">{money(o.total_amount)}</span>
            </div>
            <p className="mt-1">
              {o.customer_name} <span className="text-sm text-muted">{o.phone}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{itemsSummary(o)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusPill status={o.order_status} />
              <PaymentPill order={o} />
              <span className="ml-auto font-mono text-xs text-muted">{o.order_no}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Table for wider screens. */
export function OrderTable({ orders }: { orders: OrderWithItems[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-paper shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-blush-light text-left text-brick-dark">
          <tr>
            {['', '取貨', '訂購人', '品項', '金額', '付款', '狀態', '下單時間', '編號'].map((h) => (
              <th key={h} className="px-3 py-2 font-bold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className={`border-t border-line hover:bg-cream ${o.order_status === 'cancelled' ? 'opacity-60' : ''}`}>
              <td className="px-3 py-2">{!o.is_read && o.order_status !== 'cancelled' && <NewBadge />}</td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                <Link href={`/admin/orders/${o.id}`} className="font-bold hover:underline">
                  {shortDate(o.pickup_date)} {hhmm(o.pickup_time)}
                </Link>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {o.customer_name}
                <div className="text-xs text-muted">{o.phone}</div>
              </td>
              <td className="max-w-72 px-3 py-2 text-muted">{itemsSummary(o)}</td>
              <td className="px-3 py-2 text-right font-bold whitespace-nowrap">{money(o.total_amount)}</td>
              <td className="px-3 py-2">
                <PaymentPill order={o} />
              </td>
              <td className="px-3 py-2">
                <StatusPill status={o.order_status} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-muted">{dateTime(o.created_at)}</td>
              <td className="px-3 py-2">
                <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-brick hover:underline">
                  {o.order_no}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResponsiveOrders({ orders, showDate }: { orders: OrderWithItems[]; showDate?: boolean }) {
  if (orders.length === 0) return <p className="rounded-2xl bg-paper py-8 text-center text-muted">沒有訂單</p>;
  return (
    <>
      <div className="md:hidden">
        <OrderCards orders={orders} showDate={showDate} />
      </div>
      <div className="hidden md:block">
        <OrderTable orders={orders} />
      </div>
    </>
  );
}
