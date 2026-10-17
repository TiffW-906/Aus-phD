'use client';
import { useCallback, useEffect, useState } from 'react';
import { CartProvider } from '@/lib/cart';
import { CATEGORIES, SHOP, TEMP_LABELS } from '@/lib/constants';
import type { ClosedDate, Product, StoreSettings } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { CartButton, CartDrawer } from './CartDrawer';
import { isSoldOutToday } from './Badges';
import { useToast } from './Toast';
import { ShopFooter } from './ShopInfo';

type Props = { products: Product[]; settings: StoreSettings; closedDates: ClosedDate[]; today: string };

export function Storefront(props: Props) {
  return (
    <CartProvider products={props.products}>
      <Shop {...props} />
    </CartProvider>
  );
}

function Shop({ products, settings, closedDates, today }: Props) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>('today');
  const toast = useToast();
  const close = useCallback(() => setOpen(false), []);

  const todayItems = products.filter((p) => p.stock_status === 'in_stock' || isSoldOutToday(p, today));
  const listed = products.filter((p) => p.stock_status !== 'unavailable');
  const sections = [
    ...(todayItems.length ? [{ id: 'today', name: '今日現貨', en: 'Today', items: todayItems }] : []),
    ...CATEGORIES.map((c) => ({ ...c, items: listed.filter((p) => p.category === c.id) })).filter((s) => s.items.length),
  ];

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveCat(e.target.id.replace('sec-', ''))),
      { rootMargin: '-90px 0px -70% 0px' }
    );
    document.querySelectorAll('section[id^="sec-"]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <header className="relative overflow-hidden border-b border-line bg-paper px-4 pt-10 pb-8">
        <div aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full bg-blush/60" />
        <div aria-hidden className="absolute -bottom-24 -left-10 size-48 rounded-full bg-blush-light" />
        <div className="relative mx-auto max-w-5xl">
          <p className="tracking-[0.4em] text-brick">Wu.D dessert</p>
          <h1 className="text-7xl leading-none font-bold tracking-tight text-brick sm:text-8xl">MENU</h1>
          <p className="mt-3 text-muted">工作室自取・{SHOP.address}</p>
        </div>
      </header>

      <p className="bg-brick px-4 py-2 text-center text-sm text-white">
        需要寄送或訂購整模蛋糕／餐盒／禮盒，請洽 LINE{' '}
        <a href={SHOP.lineUrl} target="_blank" rel="noopener" className="font-bold underline">
          {SHOP.lineId}
        </a>
      </p>

      <nav aria-label="商品分類" className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-line bg-cream/95 px-4 py-3 backdrop-blur">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#sec-${s.id}`}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
              activeCat === s.id ? 'border-brick bg-brick text-white' : 'border-blush bg-paper text-brick'
            }`}
          >
            {s.name}
          </a>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-4 pb-10">
        {sections.map((s) => (
          <section key={s.id} id={`sec-${s.id}`} className="scroll-mt-16 pt-7">
            <h2 className="mb-4 flex items-baseline gap-2 border-b-2 border-brick pb-1.5 text-2xl font-bold text-brick">
              {s.name} <small className="text-sm font-medium text-muted">{s.en}</small>
            </h2>
            {s.id === 'today' && <p className="-mt-2 mb-3 text-sm text-muted">現貨最快今天就能取貨（下單 1 小時後）</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {s.items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  soldOut={s.id === 'today' && isSoldOutToday(p, today)}
                  onMessage={toast.show}
                />
              ))}
            </div>
          </section>
        ))}
        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {Object.values(TEMP_LABELS).map((t) => t && <span key={t.label}>{t.icon} {t.label}</span>)}
        </p>
      </main>

      <ShopFooter settings={settings} />
      <CartButton onClick={() => setOpen(true)} />
      <CartDrawer open={open} onClose={close} settings={settings} closedDates={closedDates} />
      {toast.node}
    </>
  );
}
