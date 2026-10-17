'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { hhmm, money, shortDate } from '@/lib/format';
import { isoWeekday, taipeiNow } from '@/lib/pickup';
import type { ClosedDate, OrderWithItems, StoreSettings } from '@/lib/types';
import { useFeed } from '@/components/admin/AdminShell';
import { Calendar } from '@/components/Calendar';

const WEEKDAYS = [
  [1, '一'], [2, '二'], [3, '三'], [4, '四'], [5, '五'], [6, '六'], [7, '日'],
] as const;

export default function SettingsPage() {
  const feed = useFeed();
  const supabase = supabaseBrowser();
  const today = taipeiNow().date;
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [closed, setClosed] = useState<ClosedDate[]>([]);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ date: string; orders: OrderWithItems[] } | null>(null);
  const [reason, setReason] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInput = useRef<HTMLInputElement>(null);

  const loadClosed = useCallback(async () => {
    const { data } = await supabase.from('closed_dates').select('*').gte('date', today).order('date');
    setClosed((data ?? []) as ClosedDate[]);
  }, [supabase, today]);

  useEffect(() => {
    void supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        const s = data as StoreSettings;
        setSettings({ ...s, open_time: hhmm(s.open_time), close_time: hhmm(s.close_time) });
      });
    void loadClosed();
  }, [supabase, loadClosed]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    async function saveQr(file: File | null) {
    if (!settings) return;
    let url: string | null = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) return feed.toast('圖片太大，請小於 5MB');
      setUploadingQr(true);
      const path = `shop/linepay-qr-${Date.now()}.${file.name.split('.').pop() || 'png'}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
      setUploadingQr(false);
      if (error) return feed.toast(`上傳失敗：${error.message}`);
      url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('store_settings').update({ linepay_qr_url: url }).eq('id', 1);
    if (error) return feed.toast(`儲存失敗：${error.message}`);
    setSettings({ ...settings, linepay_qr_url: url });
    feed.toast(url ? 'LINE Pay 收款碼已更新' : '已移除收款碼，結帳頁將不提供 LINE Pay');
  }

  if (!settings) return;
    if (settings.open_weekdays.length === 0) return feed.toast('至少要選一天營業取貨日');
    if (settings.open_time >= settings.close_time) return feed.toast('結束時間要晚於開始時間');
    setSaving(true);
    const { id: _id, ...rest } = settings as StoreSettings & { id?: number };
    const { error } = await supabase.from('store_settings').update(rest).eq('id', 1);
    setSaving(false);
    feed.toast(error ? `儲存失敗：${error.message}` : '營業設定已儲存');
  }

  async function clickDate(date: string) {
    const existing = closed.find((c) => c.date === date);
    if (existing) {
      if (!confirm(`取消 ${shortDate(date)} 的公休？`)) return;
      const { error } = await supabase.from('closed_dates').delete().eq('date', date);
      if (error) return feed.toast(`失敗：${error.message}`);
      feed.toast(`${shortDate(date)} 已恢復營業`);
      return loadClosed();
    }
    // Warn before closing a day that already has orders.
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('pickup_date', date).neq('order_status', 'cancelled').order('pickup_time');
    setReason('');
    setPending({ date, orders: (data ?? []) as OrderWithItems[] });
  }

  async function confirmClose() {
    if (!pending) return;
    const { error } = await supabase.from('closed_dates').insert({ date: pending.date, reason: reason.trim() });
    if (error) return feed.toast(`失敗：${error.message}`);
    feed.toast(`${shortDate(pending.date)} 已設為公休`);
    setPending(null);
    void loadClosed();
  }

  async function saveQr(file: File | null) {
    if (!settings) return;
    let url: string | null = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) return feed.toast('圖片太大，請小於 5MB');
      setUploadingQr(true);
      const path = `shop/linepay-qr-${Date.now()}.${file.name.split('.').pop() || 'png'}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
      setUploadingQr(false);
      if (error) return feed.toast(`上傳失敗：${error.message}`);
      url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('store_settings').update({ linepay_qr_url: url }).eq('id', 1);
    if (error) return feed.toast(`儲存失敗：${error.message}`);
    setSettings({ ...settings, linepay_qr_url: url });
    feed.toast(url ? 'LINE Pay 收款碼已更新' : '已移除收款碼，結帳頁將不提供 LINE Pay');
  }

  if (!settings) return <p className="py-10 text-center text-muted">載入中…</p>;
  const closedMap = new Map(closed.map((c) => [c.date, c]));
  const field = 'mt-1 w-full rounded-xl border border-line bg-white px-3 py-2';
  const lastMonth = new Date(Date.now() + 8 * 3600e3 + 180 * 86400e3).toISOString().slice(0, 7);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-brick">營業設定</h1>

      <section className="rounded-2xl bg-paper p-4 shadow-sm">
        <h2 className="font-bold">公休日</h2>
        <p className="mb-3 text-sm text-muted">點日期設為公休，再點一次取消。公休日客人無法選為取貨日。</p>
        <Calendar
          initialMonth={today.slice(0, 7)}
          minMonth={today.slice(0, 7)}
          maxMonth={lastMonth}
          onSelect={clickDate}
          day={(d) => {
            const c = closedMap.get(d);
            const open = settings.open_weekdays.includes(isoWeekday(d));
            return {
              disabled: d < today,
              note: c ? c.reason || '公休' : d === today ? '今天' : undefined,
              className: c ? 'bg-brick font-bold text-white' : d < today ? '' : open ? 'bg-blush-light/60 hover:bg-blush' : 'text-muted/60 hover:bg-cream',
            };
          }}
        />
        <p className="mt-2 text-xs text-muted">粉色：營業取貨日　紅色：公休　灰字：非營業日</p>
        {closed.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {closed.map((c) => (
              <li key={c.date} className="flex justify-between rounded-lg bg-cream px-3 py-1.5">
                <span>
                  {shortDate(c.date)} {c.reason && <span className="text-muted">・{c.reason}</span>}
                </span>
                <button type="button" onClick={() => clickDate(c.date)} className="text-xs text-brick underline">
                  取消公休
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-paper p-4 shadow-sm">
        <h2 className="font-bold">LINE Pay 收款碼</h2>
        <p className="mb-3 text-sm text-muted">客人選 LINE Pay 下單後，訂單頁會顯示這張收款碼。收到款項後，請在訂單頁按「標記已收到 LINE Pay」。</p>
        {settings.linepay_qr_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.linepay_qr_url} alt="LINE Pay 收款碼" className="mx-auto w-48 rounded-xl border border-line bg-white p-2" />
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">尚未上傳收款碼，結帳頁的 LINE Pay 選項目前無法選擇。</p>
        )}
        <input
          ref={qrInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void saveQr(f);
          }}
        />
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={uploadingQr} onClick={() => qrInput.current?.click()} className="flex-1 rounded-full bg-[#06c755] py-2.5 font-bold text-white disabled:opacity-50">
            {uploadingQr ? '上傳中…' : settings.linepay_qr_url ? '更換收款碼' : '上傳收款碼圖片'}
          </button>
          {settings.linepay_qr_url && (
            <button type="button" onClick={() => confirm('移除後客人將無法選擇 LINE Pay，確定嗎？') && void saveQr(null)} className="rounded-full border border-line px-4 text-sm text-muted">
              移除
            </button>
          )}
        </div>
      </section>

      <form onSubmit={saveSettings} className="space-y-4 rounded-2xl bg-paper p-4 shadow-sm">
        <h2 className="font-bold">營業取貨時間</h2>
        <div>
          <p className="text-sm">營業取貨日</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WEEKDAYS.map(([n, label]) => {
              const on = settings.open_weekdays.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSettings({ ...settings, open_weekdays: on ? settings.open_weekdays.filter((d) => d !== n) : [...settings.open_weekdays, n].sort() })
                  }
                  className={`size-10 rounded-full border font-bold ${on ? 'border-brick bg-brick text-white' : 'border-line bg-white text-muted'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            開始時間
            <input type="time" step={1800} value={settings.open_time} onChange={(e) => setSettings({ ...settings, open_time: e.target.value })} className={field} />
          </label>
          <label className="text-sm">
            結束時間
            <input type="time" step={1800} value={settings.close_time} onChange={(e) => setSettings({ ...settings, close_time: e.target.value })} className={field} />
          </label>
          <label className="text-sm">
            當天現貨最快幾分鐘後可取
            <input type="number" min={0} step={15} value={settings.same_day_buffer_minutes} onChange={(e) => setSettings({ ...settings, same_day_buffer_minutes: Number(e.target.value) })} className={field} />
          </label>
          <label className="text-sm">
            最遠可預訂天數
            <input type="number" min={1} max={90} value={settings.max_days_ahead} onChange={(e) => setSettings({ ...settings, max_days_ahead: Number(e.target.value) })} className={field} />
          </label>
        </div>
        <p className="text-xs text-muted">取貨時段每 {settings.slot_minutes} 分鐘一格，最後一格為結束前 {settings.slot_minutes} 分鐘。</p>
        <button disabled={saving} className="w-full rounded-full bg-brick py-3 font-bold text-white disabled:bg-blush">
          {saving ? '儲存中…' : '儲存營業設定'}
        </button>
      </form>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 sm:place-items-center" onClick={() => setPending(null)}>
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 sm:max-w-md sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">將 {shortDate(pending.date)} 設為公休</h3>
            {pending.orders.length > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-bold">⚠️ 這天已有 {pending.orders.length} 筆訂單要取貨，設為公休不會自動取消它們，請記得聯繫客人改期：</p>
                <ul className="mt-2 space-y-1">
                  {pending.orders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/admin/orders/${o.id}`} className="underline">
                        {hhmm(o.pickup_time)} {o.customer_name} {o.phone}
                      </Link>{' '}
                      {money(o.total_amount)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className="mt-3 block text-sm">
              原因（選填，前台不會顯示）
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例：店休、進貨" className={field} />
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setPending(null)} className="flex-1 rounded-full border border-line py-2.5">
                取消
              </button>
              <button type="button" onClick={confirmClose} className="flex-1 rounded-full bg-brick py-2.5 font-bold text-white">
                {pending.orders.length ? '仍要設為公休' : '設為公休'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
