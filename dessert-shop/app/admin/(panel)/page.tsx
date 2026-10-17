'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { money, shortDate } from '@/lib/format';
import { taipeiNow } from '@/lib/pickup';
import type { OrderWithItems, Product } from '@/lib/types';
import { useFeed } from '@/components/admin/AdminShell';
import { fetchOrders, markRead } from '@/components/admin/orders';
import { ResponsiveOrders } from '@/components/admin/OrderViews';
import { isSoldOutToday } from '@/components/Badges';

export default function Overview() {
  const feed = useFeed();
  const today = taipeiNow().date;
  const [fresh, setFresh] = useState<OrderWithItems[]>([]);
  const [todays, setTodays] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      await supabaseBrowser().rpc('expire_linepay_orders');
      const [unread, pickups, prods] = await Promise.all([
        fetchOrders((q) => q.eq('is_read', false).neq('order_status', 'cancelled').order('created_at', { ascending: false })),
        fetchOrders((q) => q.eq('pickup_date', today).neq('order_status', 'cancelled').order('pickup_time')),
        supabaseBrowser().from('products').select('*').order('sort_order'),
      ]);
      setFresh(unread);
      setTodays(pickups);
      setProducts((prods.data ?? []) as Product[]);
      setLoaded(true);
    })();
  }, [feed.version, today]);

  async function readAll() {
    await markRead(fresh.map((o) => o.id));
    setFresh([]);
    feed.refreshUnread();
  }

  const inStock = products.filter((p) => p.stock_status === 'in_stock');
  const soldOut = products.filter((p) => isSoldOutToday(p, today));
  const left = todays.filter((o) => o.order_status !== 'completed');
  const cashDue = todays.filter((o) => o.payment_method === 'cash' && o.payment_status === 'unpaid').reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brick">今日總覽・{shortDate(today)}</h1>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="今日取貨" value={`${todays.length} 筆`} />
        <Stat label="尚未取貨" value={`${left.length} 筆`} />
        <Stat label="待收現金" value={money(cashDue)} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            新訂單 {fresh.length > 0 && <span className="ml-1 rounded-full bg-brick px-2 text-sm text-white">{fresh.length}</span>}
          </h2>
          {fresh.length > 0 && (
            <button type="button" onClick={readAll} className="rounded-full border border-blush px-3 py-1 text-sm text-brick">
              全部標為已讀
            </button>
          )}
        </div>
        {loaded && (fresh.length ? <ResponsiveOrders orders={fresh} /> : <p className="rounded-2xl bg-paper py-5 text-center text-sm text-muted">目前沒有未讀的新訂單</p>)}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">今天要取貨</h2>
        {loaded && <ResponsiveOrders orders={todays} showDate={false} />}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">今日現貨</h2>
          <Link href="/admin/products" className="text-sm text-brick underline">
            更新商品狀態 →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {inStock.map((p) => (
            <li key={p.id} className="flex justify-between rounded-xl bg-paper px-3 py-2 text-sm">
              <span>{p.name}</span>
              <b className={p.stock_qty !== null && p.stock_qty <= 2 ? 'text-brick' : ''}>{p.stock_qty === null ? '不限量' : `剩 ${p.stock_qty}`}</b>
            </li>
          ))}
          {soldOut.map((p) => (
            <li key={p.id} className="flex justify-between rounded-xl bg-stone-200 px-3 py-2 text-sm text-stone-600">
              <span>{p.name}</span>
              <b>已售完</b>
            </li>
          ))}
          {loaded && inStock.length + soldOut.length === 0 && <li className="col-span-full text-sm text-muted">今天還沒有設定現貨商品</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper p-3 shadow-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold text-brick">{value}</p>
    </div>
  );
}
