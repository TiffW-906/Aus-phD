import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseService } from '@/lib/supabase/server';
import { loadStore } from '@/lib/store';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, SHOP } from '@/lib/constants';
import { hhmm, money, shortDate } from '@/lib/format';
import type { OrderWithItems } from '@/lib/types';
import { PickupInfo } from '@/components/ShopInfo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '訂單明細｜Wu.D dessert', robots: { index: false } };

const PAYMENT_MESSAGES: Record<string, { tone: 'ok' | 'bad'; text: string }> = {
  success: { tone: 'ok', text: 'LINE Pay 付款成功，訂單已成立！' },
  cancelled: { tone: 'bad', text: '你取消了 LINE Pay 付款，這張訂單已取消。如仍需要，請重新下單。' },
  failed: { tone: 'bad', text: 'LINE Pay 付款失敗，這張訂單已取消，請重新下單或改選現場付現。' },
  expired: { tone: 'bad', text: '付款逾時，這張訂單已取消且未扣款，請重新下單。' },
  error: { tone: 'bad', text: '暫時無法確認付款結果，請稍後重新整理此頁，或 LINE 聯繫我們。' },
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { orderNo } = await params;
  const { payment } = await searchParams;
  const db = supabaseService();
  await db.rpc('expire_linepay_orders');
  const [{ data }, { settings }] = await Promise.all([
    db.from('orders').select('*, order_items(*)').eq('order_no', orderNo).maybeSingle(),
    loadStore(),
  ]);
  if (!data) notFound();
  const order = data as OrderWithItems;
  const cancelled = order.order_status === 'cancelled';
  const awaitingLinePay = order.payment_method === 'linepay' && order.payment_status === 'unpaid' && !cancelled;
  const message = payment ? PAYMENT_MESSAGES[payment] : undefined;
  const payByQr = awaitingLinePay && !order.linepay_transaction_id && settings.linepay_qr_url;

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 pb-16">
      <Link href="/" className="text-sm tracking-[0.3em] text-brick">
        Wu.D dessert
      </Link>

      <div className="mt-4 rounded-2xl bg-paper p-5 text-center shadow-[0_6px_20px_rgba(120,60,55,0.08)]">
        <div className={`mx-auto grid size-16 place-items-center rounded-full text-3xl text-white ${cancelled ? 'bg-muted' : 'bg-brick'}`}>
          {cancelled ? '✕' : '✓'}
        </div>
        <h1 className="mt-3 text-2xl font-bold">{cancelled ? '訂單已取消' : awaitingLinePay ? '等待付款' : '訂單已送出'}</h1>
        <p className="mt-2 text-sm text-muted">訂單編號</p>
        <p className="font-mono text-2xl font-bold tracking-wider text-brick">{order.order_no}</p>
        <p className="mt-1 text-xs text-muted">請截圖保存此頁，取貨時出示訂單編號</p>
      </div>

      {message && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-brick/10 text-brick'}`}>
          {message.text}
        </p>
      )}
      {cancelled && !message && order.cancel_reason && (
        <p className="mt-4 rounded-xl bg-brick/10 px-4 py-3 text-sm font-bold text-brick">取消原因：{order.cancel_reason}</p>
      )}
      {awaitingLinePay && order.linepay_payment_url && (
        <a href={order.linepay_payment_url} className="mt-4 block rounded-full bg-[#06c755] py-3 text-center font-bold text-white">
          前往 LINE Pay 完成付款
        </a>
      )}

      {payByQr && (
        <section className="mt-4 rounded-2xl border-2 border-[#06c755] bg-paper p-5 text-center">
          <h2 className="text-lg font-bold">請用 LINE Pay 付款 {money(order.total_amount)}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.linepay_qr_url!} alt="Wu.D dessert LINE Pay 收款碼" className="mx-auto mt-3 w-60 max-w-full rounded-xl bg-white p-2" />
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-left text-sm">
            <li>用 LINE 的「掃描」掃這個收款碼（用同一支手機時，先截圖，再於掃描畫面選擇相簿中的圖片）</li>
            <li>
              輸入金額 <b>{money(order.total_amount)}</b> 並完成付款
            </li>
            <li>
              付款後，把付款截圖和訂單編號 <b className="font-mono">{order.order_no}</b> 傳到 LINE{' '}
              <a href={SHOP.lineUrl} target="_blank" rel="noopener" className="font-bold text-brick">
                {SHOP.lineId}
              </a>
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted">店家確認收款後，此頁的付款狀態會改為「已付款」</p>
          <a href={SHOP.lineUrl} target="_blank" rel="noopener" className="mt-3 block rounded-full bg-[#06c755] py-3 font-bold text-white">
            付款後傳截圖給我們
          </a>
        </section>
      )}

      <section className="mt-4 space-y-3 rounded-2xl bg-paper p-5 shadow-[0_6px_20px_rgba(120,60,55,0.08)]">
        <Row label="取貨時間">
          <b className="text-lg">
            {shortDate(order.pickup_date)} {hhmm(order.pickup_time)}
          </b>
        </Row>
        <Row label="訂單狀態">{ORDER_STATUS_LABELS[order.order_status]}</Row>
        <Row label="付款">
          {PAYMENT_METHOD_LABELS[order.payment_method]}・
          <span className={order.payment_status === 'paid' ? 'font-bold text-emerald-700' : ''}>{PAYMENT_STATUS_LABELS[order.payment_status]}</span>
          {order.payment_method === 'cash' && order.payment_status === 'unpaid' && !cancelled && <span className="text-muted">（取貨時付現）</span>}
        </Row>
        <Row label="訂購人">{order.customer_name}</Row>

        <ul className="divide-y divide-dashed divide-line border-t border-line pt-2 text-sm">
          {order.order_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.product_name}
                {i.flavor && <span className="text-muted">・{i.flavor}</span>} × {i.quantity}
              </span>
              <span>{money(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span>總計</span>
          <strong className="text-2xl text-brick">{money(order.total_amount)}</strong>
        </div>
      </section>

      <PickupInfo settings={settings} className="mt-4" />

      <p className="mt-6 text-center text-sm text-muted">
        有任何問題請 LINE{' '}
        <a href={SHOP.lineUrl} target="_blank" rel="noopener" className="font-bold text-brick">
          {SHOP.lineId}
        </a>
      </p>
      <Link href="/" className="mt-4 block text-center text-sm text-brick underline">
        回到菜單
      </Link>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
