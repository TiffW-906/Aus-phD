'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import { pickupWindow } from '@/lib/pickup';
import type { ClosedDate, StoreSettings } from '@/lib/types';
import { Stepper } from './Stepper';

export function CartButton({ onClick }: { onClick: () => void }) {
  const { count, subtotal, addedAt } = useCart();
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (!addedAt) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(t);
  }, [addedAt]);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`購物車，${count} 件`}
      className={`fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-brick px-5 py-3 font-bold text-white shadow-[0_10px_30px_rgba(143,45,57,0.35)] ${bump ? 'animate-bump' : ''}`}
    >
      <span aria-hidden className="text-xl">🛒</span>
      <span>{money(subtotal)}</span>
      <span className="absolute -top-2 -right-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-brick bg-white px-1 text-xs text-brick">
        {count}
      </span>
    </button>
  );
}

export function CartDrawer({
  open,
  onClose,
  settings,
  closedDates,
}: {
  open: boolean;
  onClose: () => void;
  settings: StoreSettings;
  closedDates: ClosedDate[];
}) {
  const cart = useCart();
  const pickup = useMemo(
    () => pickupWindow(cart.lines.map((l) => l.product), settings, new Set(closedDates.map((c) => c.date))),
    [cart.lines, settings, closedDates]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-ink/35 transition ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside
        aria-label="購物車"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-300 ${open ? '' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-xl font-bold text-brick">購物車</h2>
          <button type="button" onClick={onClose} aria-label="關閉" className="px-2 text-xl text-muted">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {cart.lines.length === 0 ? (
            <p className="py-16 text-center text-muted">還沒有選購商品，挑一些甜點吧！</p>
          ) : (
            <ul>
              {cart.lines.map((l) => (
                <li key={`${l.productId}|${l.flavor}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 border-b border-dashed border-line py-3">
                  <div>
                    <p className="font-bold">{l.product.name}</p>
                    {l.flavor && <p className="text-sm text-muted">口味：{l.flavor}</p>}
                    {l.product.stock_status === 'unavailable' && <p className="text-sm font-bold text-brick">目前暫停供應，請移除</p>}
                  </div>
                  <p className="text-right font-bold text-brick">{money(l.product.price * l.quantity)}</p>
                  <div className="col-span-2 flex items-center justify-between">
                    <Stepper value={l.quantity} max={Math.min(99, cart.maxFor(l.product, l.index))} onChange={(v) => cart.setQuantity(l.index, v)} />
                    <button type="button" onClick={() => cart.remove(l.index)} className="text-sm text-muted underline">
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-line bg-white px-5 pt-3 pb-5">
          {cart.lines.length > 0 && (
            <p className="mb-2 rounded-xl bg-blush-light px-3 py-2 text-sm text-brick-dark">📅 {pickup.explanation}</p>
          )}
          <div className="flex items-baseline justify-between">
            <span>小計</span>
            <strong className="text-2xl text-brick">{money(cart.subtotal)}</strong>
          </div>
          <Link
            href="/checkout"
            aria-disabled={cart.lines.length === 0 || cart.unavailable.length > 0}
            className={`mt-3 block rounded-full py-3 text-center text-lg font-bold text-white ${
              cart.lines.length === 0 || cart.unavailable.length > 0 ? 'pointer-events-none bg-blush' : 'bg-brick hover:bg-brick-dark'
            }`}
          >
            前往結帳
          </Link>
        </div>
      </aside>
    </>
  );
}
