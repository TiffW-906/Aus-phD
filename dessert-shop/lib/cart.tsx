'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from './types';

export type CartLine = { productId: string; flavor: string; quantity: number };
/** `index` is the position in the stored cart; pass it to setQuantity/remove. */
type ResolvedLine = CartLine & { index: number; product: Product };

type CartValue = {
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  /** Bumped on every add, so the floating button can animate. */
  addedAt: number;
  add: (productId: string, flavor: string, quantity: number) => string | null;
  setQuantity: (index: number, quantity: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  /** Products in the cart that can no longer be ordered. */
  unavailable: string[];
  maxFor: (product: Product, excludeIndex?: number) => number;
};

const KEY = 'wud-cart-v2';
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  const [raw, setRaw] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addedAt, setAddedAt] = useState(0);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(saved)) setRaw(saved);
    } catch {
      // Storage blocked: the cart simply lives in memory.
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(raw));
    } catch {
      // ignore
    }
  }, [raw, loaded]);

  const lines = useMemo(
    () => raw.flatMap((l, index) => (byId.has(l.productId) ? [{ ...l, index, product: byId.get(l.productId)! }] : [])),
    [raw, byId]
  );

  // In-stock items with a set quantity can't exceed what is left (shared across flavours).
  const maxFor = useCallback(
    (product: Product, excludeIndex?: number) => {
      if (product.stock_status !== 'in_stock' || product.stock_qty === null) return 99;
      const used = raw.reduce(
        (sum, l, i) => (l.productId === product.id && i !== excludeIndex ? sum + l.quantity : sum),
        0
      );
      return Math.max(0, product.stock_qty - used);
    },
    [raw]
  );

  const add = useCallback(
    (productId: string, flavor: string, quantity: number) => {
      const product = byId.get(productId);
      if (!product) return '商品已下架';
      const room = maxFor(product);
      if (room <= 0) return `「${product.name}」現貨已全部在購物車裡了`;
      const qty = Math.min(quantity, room);
      setRaw((prev) => {
        const i = prev.findIndex((l) => l.productId === productId && l.flavor === flavor);
        if (i === -1) return [...prev, { productId, flavor, quantity: qty }];
        return prev.map((l, j) => (j === i ? { ...l, quantity: Math.min(99, l.quantity + qty) } : l));
      });
      setAddedAt(Date.now());
      return qty < quantity ? `現貨只剩 ${room} 件，已幫你加入 ${qty} 件` : null;
    },
    [byId, maxFor]
  );

  const value: CartValue = {
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: lines.reduce((s, l) => s + l.product.price * l.quantity, 0),
    addedAt,
    add,
    setQuantity: (index, quantity) =>
      setRaw((prev) => {
        const product = byId.get(prev[index]?.productId);
        if (!product) return prev;
        const q = Math.min(quantity, maxFor(product, index), 99);
        return q < 1 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, quantity: q } : l));
      }),
    remove: (index) => setRaw((prev) => prev.filter((_, i) => i !== index)),
    clear: () => setRaw([]),
    unavailable: lines.filter((l) => l.product.stock_status === 'unavailable').map((l) => l.product.name),
    maxFor,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart outside CartProvider');
  return ctx;
}
