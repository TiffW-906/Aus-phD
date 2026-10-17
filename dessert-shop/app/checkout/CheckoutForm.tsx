'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart';
import { money, shortDate } from '@/lib/format';
import { pickupWindow, slotsFor, taipeiNow } from '@/lib/pickup';
import type { ClosedDate, PaymentMethod, StoreSettings } from '@/lib/types';
import { Calendar } from '@/components/Calendar';
import { PickupInfo } from '@/components/ShopInfo';

const input = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-brick focus:ring-2 focus:ring-blush';

export function CheckoutForm({ settings, closedDates, linePayEnabled }: { settings: StoreSettings; closedDates: ClosedDate[]; linePayEnabled: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>(linePayEnabled ? 'linepay' : 'cash');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Dates depend on the clock, so compute them only in the browser (and refresh every minute).
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const closed = useMemo(() => new Set(closedDates.map((c) => c.date)), [closedDates]);
  const pickup = useMemo(
    () => (now ? pickupWindow(cart.lines.map((l) => l.product), settings, closed, now) : null),
    [cart.lines, settings, closed, now]
  );
  const slots = useMemo(() => (date && now ? slotsFor(date, settings, now) : []), [date, settings, now]);

  // Drop a chosen date/time that became invalid (cart changed, time passed).
  useEffect(() => {
    if (pickup && date && !pickup.dates.includes(date)) setDate('');
  }, [pickup, date]);
  useEffect(() => {
    if (time && !slots.includes(time)) setTime('');
  }, [slots, time]);

  if (done) return <Shell><p className="py-20 text-center text-muted">訂單處理中…</p></Shell>;

  if (cart.lines.length === 0) {
    return (
      <Shell>
        <p className="py-16 text-center text-muted">購物車是空的</p>
        <Link href="/" className="mx-auto block w-fit rounded-full bg-brick px-6 py-2.5 font-bold text-white">
          回到菜單
        </Link>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    if (!date) return setError('請選擇取貨日期');
    if (!time) return setError('請選擇取貨時段');
    if (cart.unavailable.length) return setError(`請先移除暫停供應的商品：${cart.unavailable.join('、')}`);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerName: form.get('customerName'),
          phone: form.get('phone'),
          lineName: form.get('lineName'),
          note: form.get('note'),
          website: form.get('website'),
          pickupDate: date,
          pickupTime: time,
          paymentMethod: payment,
          items: cart.lines.map((l) => ({ productId: l.productId, flavor: l.flavor, quantity: l.quantity })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || '送出失敗，請稍後再試');
      setDone(true);
      cart.clear();
      if (body.paymentUrl) window.location.href = body.paymentUrl;
      else router.push(`/order/${body.orderNo}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
      router.refresh();
    }
  }

  const today = now ? taipeiNow(now).date : '';
  const lastDate = pickup?.dates.at(-1);

  return (
    <Shell>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start" noValidate>
        <div className="space-y-6">
          <Card title="取貨日期與時段">
            {pickup && <p className="mb-3 rounded-xl bg-blush-light px-3 py-2 text-sm text-brick-dark">📅 {pickup.explanation}</p>}
            {pickup && pickup.earliest && (
              <Calendar
                initialMonth={pickup.earliest.slice(0, 7)}
                minMonth={today.slice(0, 7)}
                maxMonth={lastDate?.slice(0, 7)}
                onSelect={(d) => setDate(d)}
                day={(d) => {
                  const ok = pickup.dates.includes(d);
                  return {
                    disabled: !ok,
                    note: closed.has(d) ? '公休' : d === today ? '今天' : undefined,
                    className: d === date ? 'bg-brick font-bold text-white' : ok ? 'bg-blush-light/60 hover:bg-blush' : '',
                  };
                }}
              />
            )}
            {date && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">{shortDate(date)} 可選時段</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTime(s)}
                      aria-pressed={time === s}
                      className={`rounded-xl border py-2 text-sm tabular-nums ${time === s ? 'border-brick bg-brick font-bold text-white' : 'border-line bg-white hover:border-brick'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PickupInfo settings={settings} className="mt-4" />
          </Card>

          <Card title="訂購人資料">
            <div className="space-y-3">
              <Field label="姓名 *">
                <input name="customerName" required autoComplete="name" className={input} />
              </Field>
              <Field label="手機 *">
                <input name="phone" required inputMode="tel" autoComplete="tel" placeholder="0912345678" className={input} />
              </Field>
              <Field label="LINE 名稱（選填，方便聯繫）">
                <input name="lineName" className={input} />
              </Field>
              <Field label="備註">
                <textarea name="note" rows={3} placeholder="過敏原、生日卡片、特殊需求…" className={input} />
              </Field>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px]" />
            </div>
          </Card>

          <Card title="付款方式">
            <div className="grid gap-2 sm:grid-cols-2">
              <PayOption
                checked={payment === 'linepay'}
                disabled={!linePayEnabled}
                onChange={() => setPayment('linepay')}
                title="LINE Pay"
                desc={linePayEnabled ? '線上付款，完成後訂單即成立' : '暫時無法使用'}
              />
              <PayOption checked={payment === 'cash'} onChange={() => setPayment('cash')} title="現場自取付現金" desc="取貨時於工作室付款" />
            </div>
          </Card>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4">
          <Card title="訂單明細">
            <ul className="divide-y divide-dashed divide-line text-sm">
              {cart.lines.map((l) => (
                <li key={`${l.productId}|${l.flavor}`} className="flex justify-between gap-3 py-2">
                  <span>
                    {l.product.name}
                    {l.flavor && <span className="text-muted">・{l.flavor}</span>} × {l.quantity}
                    {l.product.stock_status === 'unavailable' && <b className="block text-brick">暫停供應，請回購物車移除</b>}
                  </span>
                  <span className="shrink-0 font-medium">{money(l.product.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
              <span>總計</span>
              <strong className="text-2xl text-brick">{money(cart.subtotal)}</strong>
            </div>
            <p className="mt-1 text-xs text-muted">金額以送出時的價格為準</p>
          </Card>
          {error && (
            <p role="alert" className="rounded-xl bg-brick/10 px-3 py-2 text-sm font-bold text-brick">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !pickup?.earliest}
            className="w-full rounded-full bg-brick py-3.5 text-lg font-bold text-white shadow-lg hover:bg-brick-dark disabled:bg-blush"
          >
            {submitting ? '送出中…' : payment === 'linepay' ? '前往 LINE Pay 付款' : '送出訂單'}
          </button>
          <Link href="/" className="block text-center text-sm text-muted underline">
            ← 繼續選購
          </Link>
        </aside>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <Link href="/" className="text-sm tracking-[0.3em] text-brick">
        Wu.D dessert
      </Link>
      <h1 className="mb-5 text-3xl font-bold text-brick">結帳</h1>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-paper p-4 shadow-[0_6px_20px_rgba(120,60,55,0.08)] sm:p-5">
      <h2 className="mb-3 text-lg font-bold text-brick">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function PayOption({ checked, disabled, onChange, title, desc }: { checked: boolean; disabled?: boolean; onChange: () => void; title: string; desc: string }) {
  return (
    <label
      className={`flex cursor-pointer flex-col rounded-xl border-2 px-4 py-3 ${checked ? 'border-brick bg-blush-light/50' : 'border-line bg-white'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input type="radio" name="payment" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <strong>{title}</strong>
      <span className="text-xs text-muted">{desc}</span>
    </label>
  );
}
