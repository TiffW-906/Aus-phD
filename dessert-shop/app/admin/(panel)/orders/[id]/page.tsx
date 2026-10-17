'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { dateTime, hhmm, money, shortDate } from '@/lib/format';
import type { OrderStatus, OrderWithItems } from '@/lib/types';
import { useFeed } from '@/components/admin/AdminShell';
import { PaymentPill, StatusPill } from '@/components/admin/OrderViews';

const FLOW: OrderStatus[] = ['pending', 'confirmed', 'ready', 'completed'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const feed = useFeed();
  const supabase = supabaseBrowser();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
    if (!data) return setMissing(true);
    setOrder(data as OrderWithItems);
  }, [supabase, id]);

  useEffect(() => {
    void load();
  }, [load, feed.version]);

  // Opening an order marks it as read.
  useEffect(() => {
    if (order && !order.is_read) {
      void supabase.from('orders').update({ is_read: true }).eq('id', order.id).then(() => feed.refreshUnread());
    }
  }, [order, supabase, feed]);

  async function update(patch: Record<string, unknown>, message: string) {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    setBusy(false);
    if (error) return feed.toast(`更新失敗：${error.message}`);
    feed.toast(message);
    await load();
  }

  if (missing) return <p className="py-10 text-center text-muted">找不到這筆訂單</p>;
  if (!order) return <p className="py-10 text-center text-muted">載入中…</p>;

  const cancelled = order.order_status === 'cancelled';
  const btn = 'rounded-full px-4 py-2.5 text-sm font-bold disabled:opacity-50';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/orders" className="text-sm text-muted">
        ← 訂單列表
      </Link>
      <div className="rounded-2xl bg-paper p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-bold text-brick">{order.order_no}</h1>
          <StatusPill status={order.order_status} />
          <PaymentPill order={order} />
        </div>
        <p className="mt-1 text-xs text-muted">下單時間 {dateTime(order.created_at)}</p>
        <p className="mt-3 text-2xl font-bold">
          取貨 {shortDate(order.pickup_date)} {hhmm(order.pickup_time)}
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">姓名</dt>
          <dd>{order.customer_name}</dd>
          <dt className="text-muted">手機</dt>
          <dd>
            <a href={`tel:${order.phone}`} className="text-brick underline">
              {order.phone}
            </a>
          </dd>
          <dt className="text-muted">LINE</dt>
          <dd>{order.line_name || '—'}</dd>
          <dt className="text-muted">備註</dt>
          <dd className="whitespace-pre-wrap">{order.note || '—'}</dd>
          {order.linepay_transaction_id && (
            <>
              <dt className="text-muted">LINE Pay 交易</dt>
              <dd className="font-mono text-xs">{order.linepay_transaction_id}</dd>
            </>
          )}
          {order.paid_at && (
            <>
              <dt className="text-muted">收款時間</dt>
              <dd>{dateTime(order.paid_at)}</dd>
            </>
          )}
          {order.cancel_reason && (
            <>
              <dt className="text-muted">取消原因</dt>
              <dd className="text-brick">{order.cancel_reason}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-2xl bg-paper p-4 shadow-sm">
        <h2 className="mb-2 font-bold">明細</h2>
        <ul className="divide-y divide-dashed divide-line text-sm">
          {order.order_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                <b>{i.product_name}</b>
                {i.flavor && <span className="text-muted">・{i.flavor}</span>}
                <span className="text-muted">
                  {' '}
                  {money(i.unit_price)} × {i.quantity}
                </span>
                {i.was_in_stock && <span className="ml-1 rounded bg-blush-light px-1 text-xs text-brick">現貨</span>}
              </span>
              <span className="font-medium">{money(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-line pt-2">
          <span>總計</span>
          <b className="text-xl text-brick">{money(order.total_amount)}</b>
        </div>
      </div>

      {!cancelled && (
        <div className="space-y-3 rounded-2xl bg-paper p-4 shadow-sm">
          <h2 className="font-bold">更新訂單</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLOW.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || order.order_status === s}
                onClick={() => update({ order_status: s }, `已改為「${ORDER_STATUS_LABELS[s]}」`)}
                className={`${btn} ${order.order_status === s ? 'bg-brick text-white disabled:opacity-100' : 'border border-line bg-white'}`}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {order.payment_status === 'unpaid' && order.payment_method === 'cash' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => update({ payment_status: 'paid', paid_at: new Date().toISOString() }, '已標記收到現金')}
              className={`${btn} w-full bg-emerald-700 text-white`}
            >
              💵 標記已收現金 {money(order.total_amount)}
            </button>
          )}
          {order.payment_status === 'paid' && order.payment_method === 'cash' && (
            <button type="button" disabled={busy} onClick={() => update({ payment_status: 'unpaid', paid_at: null }, '已改回未付款')} className="text-sm text-muted underline">
              改回未付款
            </button>
          )}
          {order.payment_method === 'linepay' && order.payment_status === 'unpaid' && (
            <p className="text-sm text-muted">等待客人完成 LINE Pay 付款，逾時未付會自動取消並釋放現貨。</p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const reason = prompt('確定要取消這筆訂單嗎？現貨數量會自動補回。\n可填寫取消原因：', '店家取消');
              if (reason !== null) void update({ order_status: 'cancelled', cancel_reason: reason || '店家取消' }, '訂單已取消，現貨已補回');
            }}
            className="w-full rounded-full border border-brick/40 py-2.5 text-sm text-brick"
          >
            取消訂單
          </button>
          {order.payment_status === 'paid' && order.payment_method === 'linepay' && (
            <p className="text-xs text-muted">LINE Pay 已付款的訂單若要取消，請到 LINE Pay 商家後台退款，再按下方「標記已退款」。</p>
          )}
        </div>
      )}
      {cancelled && order.payment_status === 'paid' && (
        <button type="button" disabled={busy} onClick={() => update({ payment_status: 'refunded' }, '已標記退款')} className={`${btn} w-full border border-line bg-white`}>
          標記已退款
        </button>
      )}
    </div>
  );
}
