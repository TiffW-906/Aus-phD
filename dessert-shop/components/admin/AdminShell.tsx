'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';

type Feed = {
  /** Increments whenever any order is inserted or changed; pages refetch when it moves. */
  version: number;
  unread: number;
  refreshUnread: () => void;
  toast: (m: string) => void;
};
const FeedContext = createContext<Feed | null>(null);
export const useFeed = () => {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeed outside AdminShell');
  return ctx;
};

const SOUND_KEY = 'wud-admin-sound';
const NAV = [
  { href: '/admin', label: '今日', icon: '🏠' },
  { href: '/admin/orders', label: '訂單', icon: '🧾' },
  { href: '/admin/products', label: '商品', icon: '🍰' },
  { href: '/admin/settings', label: '設定', icon: '📅' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const pathname = usePathname();
  const [version, setVersion] = useState(0);
  const [unread, setUnread] = useState(0);
  const [sound, setSound] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const toast = useToast();

  const refreshUnread = useCallback(async () => {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('order_status', 'cancelled');
    setUnread(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    try {
      setSound(localStorage.getItem(SOUND_KEY) !== 'off');
    } catch {
      // ignore
    }
    // Browsers only allow audio after a tap, so unlock it on the first interaction.
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  const chime = useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }, []);

  const soundRef = useRef(sound);
  soundRef.current = sound;

  useEffect(() => {
    void refreshUnread();
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: RealtimePostgresChangesPayload<{ order_no: string; customer_name: string }>) => {
        setVersion((v) => v + 1);
        void refreshUnread();
        if (payload.eventType === 'INSERT') {
          const o = payload.new;
          toast.show(`🔔 新訂單 ${o.order_no}（${o.customer_name}）`);
          if (soundRef.current) chime();
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, refreshUnread, chime, toast.show]);

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Wu.D 後台` : 'Wu.D 後台';
  }, [unread, pathname]);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      // ignore
    }
    if (next) chime();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <FeedContext.Provider value={{ version, unread, refreshUnread, toast: toast.show }}>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/admin" className="font-bold text-brick">
            Wu.D 後台
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${isActive(n.href) ? 'bg-brick text-white' : 'text-ink hover:bg-blush-light'}`}
              >
                {n.label}
                {n.href === '/admin' && unread > 0 && <Dot n={unread} />}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={toggleSound} className="rounded-full px-2.5 py-1.5 text-sm hover:bg-blush-light" aria-pressed={sound}>
              {sound ? '🔔 聲音開' : '🔕 聲音關'}
            </button>
            <Link href="/" target="_blank" className="hidden rounded-full px-2.5 py-1.5 text-sm hover:bg-blush-light sm:inline">
              前台
            </Link>
            <button type="button" onClick={logout} className="rounded-full px-2.5 py-1.5 text-sm text-muted hover:bg-blush-light">
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 pt-4 pb-28 sm:px-4 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`relative flex flex-col items-center py-2 text-xs ${isActive(n.href) ? 'font-bold text-brick' : 'text-muted'}`}>
            <span className="text-xl">{n.icon}</span>
            {n.label}
            {n.href === '/admin' && unread > 0 && (
              <span className="absolute top-1 right-[calc(50%-22px)] grid h-5 min-w-5 place-items-center rounded-full bg-brick px-1 text-[11px] text-white">{unread}</span>
            )}
          </Link>
        ))}
      </nav>
      {toast.node}
    </FeedContext.Provider>
  );
}

function Dot({ n }: { n: number }) {
  return <span className="ml-1 rounded-full bg-white px-1.5 text-xs font-bold text-brick">{n}</span>;
}
