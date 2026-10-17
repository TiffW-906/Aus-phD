'use client';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { ProductImage } from './ProductImage';
import { StockBadge, TempBadge } from './Badges';
import { Stepper } from './Stepper';

export function ProductCard({ product, soldOut, onMessage }: { product: Product; soldOut?: boolean; onMessage: (m: string) => void }) {
  const cart = useCart();
  const [flavor, setFlavor] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [shake, setShake] = useState(false);
  const room = cart.maxFor(product);
  const disabled = soldOut || room <= 0;

  function add() {
    if (product.flavors.length && !flavor) {
      onMessage('請先選擇口味');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const warning = cart.add(product.id, flavor, qty);
    onMessage(warning ?? `已加入 ${product.name}${flavor ? `・${flavor}` : ''} × ${qty}`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
    setQty(1);
  }

  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_6px_20px_rgba(120,60,55,0.10)] ${soldOut ? 'opacity-60' : ''}`}>
      <div className="relative">
        <ProductImage product={product} />
        <div className="absolute inset-x-2 top-2 flex flex-wrap justify-between gap-1">
          <StockBadge product={product} soldOut={soldOut} />
          <TempBadge product={product} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="font-bold leading-snug">
            {product.name}
            {product.unit_note && <span className="ml-1 text-sm font-normal text-muted">（{product.unit_note}）</span>}
          </h3>
          <p className="text-lg font-bold text-brick">{money(product.price)}</p>
        </div>
        {product.flavors.length > 0 && !soldOut && (
          <div className={shake ? 'animate-bump' : ''}>
            <p className="mb-1 text-xs text-muted">選擇口味</p>
            <div className="flex flex-wrap gap-1.5">
              {product.flavors.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={flavor === f}
                  onClick={() => setFlavor(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    flavor === f ? 'border-brick bg-brick text-white' : 'border-line bg-white hover:border-blush'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
          {!disabled && <Stepper value={qty} min={1} max={Math.min(room, 99)} onChange={setQty} />}
          <button
            type="button"
            disabled={disabled}
            onClick={add}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-bold text-white transition active:scale-95 disabled:bg-blush disabled:text-white/90 ${
              added ? 'bg-emerald-700' : 'bg-brick hover:bg-brick-dark'
            }`}
          >
            {soldOut ? '今日已售完' : room <= 0 ? '已達現貨上限' : added ? '✓ 已加入' : '加入購物車'}
          </button>
        </div>
      </div>
    </article>
  );
}
