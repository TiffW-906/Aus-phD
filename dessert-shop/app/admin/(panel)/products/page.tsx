'use client';
import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATEGORIES, STOCK_LABELS, TEMP_LABELS } from '@/lib/constants';
import { money } from '@/lib/format';
import { taipeiNow } from '@/lib/pickup';
import type { Product, StockStatus } from '@/lib/types';
import { useFeed } from '@/components/admin/AdminShell';
import { ProductImage } from '@/components/ProductImage';
import { isSoldOutToday } from '@/components/Badges';
import { squareImage } from '@/components/admin/image';

export default function ProductsPage() {
  const feed = useFeed();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    void supabaseBrowser()
      .from('products')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setProducts((data ?? []) as Product[]));
    // Orders change stock, so reload on every order event too.
  }, [feed.version]);

  const replace = (p: Product) => setProducts((list) => list.map((x) => (x.id === p.id ? p : x)));
  const counts = { in_stock: 0, preorder: 0, unavailable: 0 };
  products.forEach((p) => counts[p.stock_status]++);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brick">商品狀態</h1>
        <p className="text-sm text-muted">
          現貨 {counts.in_stock}・可預訂 {counts.preorder}・暫停 {counts.unavailable}　每次點選會立即儲存
        </p>
      </div>
      {CATEGORIES.map((c) => (
        <section key={c.id}>
          <h2 className="mb-2 font-bold text-brick">{c.name}</h2>
          <ul className="space-y-2">
            {products
              .filter((p) => p.category === c.id)
              .map((p) => (
                <ProductRow key={p.id} product={p} onSaved={replace} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ProductRow({ product, onSaved }: { product: Product; onSaved: (p: Product) => void }) {
  const feed = useFeed();
  const supabase = supabaseBrowser();
  const [qtyText, setQtyText] = useState(product.stock_qty?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const today = taipeiNow().date;

  useEffect(() => setQtyText(product.stock_qty?.toString() ?? ''), [product.stock_qty]);

  async function save(patch: Partial<Product>) {
    setSaving(true);
    const { data, error } = await supabase.from('products').update(patch).eq('id', product.id).select().single();
    setSaving(false);
    if (error) return feed.toast(`儲存失敗：${error.message}`);
    onSaved(data as Product);
    const next = data as Product;
    if (patch.stock_status === 'in_stock' || patch.stock_qty !== undefined) {
      if (next.stock_status !== 'in_stock') feed.toast(`「${product.name}」數量為 0，已轉為${STOCK_LABELS[next.stock_status]}`);
    }
  }

  function setStatus(status: StockStatus) {
    if (status === product.stock_status) return;
    // Coming back into stock with a leftover 0 would immediately sell out again.
    const patch: Partial<Product> = { stock_status: status };
    if (status === 'in_stock' && product.stock_qty === 0) patch.stock_qty = null;
    void save(patch);
  }

  function commitQty(text: string) {
    const qty = text.trim() === '' ? null : Math.max(0, Math.floor(Number(text)));
    if (qty !== null && Number.isNaN(qty)) return setQtyText(product.stock_qty?.toString() ?? '');
    if (qty !== product.stock_qty) void save({ stock_qty: qty });
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const blob = await squareImage(file);
      const path = `${product.id}/${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      await save({ image_url: data.publicUrl });
      feed.toast('照片已更新');
    } catch (err) {
      feed.toast(`上傳失敗：${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  const soldOut = isSoldOutToday(product, today);
  const temp = TEMP_LABELS[product.temp_type];
  const seg = (active: boolean, tone: string) =>
    `flex-1 rounded-full py-2 text-sm font-bold transition ${active ? tone : 'text-muted'}`;
  const chip = (active: boolean) => `rounded-full border px-3 py-1 text-sm ${active ? 'border-brick bg-brick text-white' : 'border-line bg-white'}`;

  return (
    <li className={`rounded-2xl bg-paper p-3 shadow-sm ${product.stock_status === 'unavailable' ? 'opacity-70' : ''}`}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="relative w-16 shrink-0 overflow-hidden rounded-xl sm:w-20"
          aria-label={`更換「${product.name}」照片`}
        >
          <ProductImage product={product} small />
          <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[10px] text-white">{uploading ? '上傳中…' : '換照片'}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void upload(f);
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate font-bold">
              {product.name}
              {product.unit_note && <span className="text-sm font-normal text-muted">（{product.unit_note}）</span>}
            </p>
            <span className="ml-auto shrink-0 text-sm text-brick">{money(product.price)}</span>
          </div>
          <p className="text-xs text-muted">
            {temp ? `${temp.icon} ${temp.short}` : ''}
            {soldOut && <b className="ml-1 text-brick">今日已售完</b>}
            {saving && <span className="ml-1">儲存中…</span>}
          </p>
          <div className="mt-2 flex rounded-full bg-cream p-1">
            <button type="button" onClick={() => setStatus('in_stock')} className={seg(product.stock_status === 'in_stock', 'bg-brick text-white shadow')}>
              現貨
            </button>
            <button type="button" onClick={() => setStatus('preorder')} className={seg(product.stock_status === 'preorder', 'bg-white text-brick shadow')}>
              可預訂
            </button>
            <button type="button" onClick={() => setStatus('unavailable')} className={seg(product.stock_status === 'unavailable', 'bg-stone-500 text-white shadow')}>
              暫停
            </button>
          </div>
        </div>
      </div>

      {product.stock_status === 'in_stock' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">剩餘數量</span>
          <div className="inline-flex items-center rounded-full border border-line bg-white">
            <button type="button" className="size-9 text-lg text-brick" onClick={() => commitQty(String(Math.max(0, (product.stock_qty ?? 1) - 1)))} aria-label="減少">
              −
            </button>
            <input
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value.replace(/\D/g, ''))}
              onBlur={(e) => commitQty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              inputMode="numeric"
              placeholder="不限"
              className="w-12 bg-transparent text-center font-bold outline-none"
              aria-label="剩餘數量"
            />
            <button type="button" className="size-9 text-lg text-brick" onClick={() => commitQty(String((product.stock_qty ?? 0) + 1))} aria-label="增加">
              +
            </button>
          </div>
          {product.stock_qty !== null && (
            <button type="button" onClick={() => commitQty('')} className="text-xs text-muted underline">
              改為不限量
            </button>
          )}
          <label className="ml-auto flex items-center gap-1 text-xs text-muted">
            售完後
            <select
              value={product.sold_out_fallback}
              onChange={(e) => void save({ sold_out_fallback: e.target.value as Product['sold_out_fallback'] })}
              className="rounded-lg border border-line bg-white px-1.5 py-1 text-xs"
            >
              <option value="preorder">轉可預訂</option>
              <option value="unavailable">轉暫停</option>
            </select>
          </label>
        </div>
      )}
      {product.stock_status === 'preorder' && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted">預訂天數</span>
          {[3, 4, 5].map((d) => (
            <button key={d} type="button" onClick={() => d !== product.lead_days && void save({ lead_days: d })} className={chip(product.lead_days === d)}>
              {d} 天
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
