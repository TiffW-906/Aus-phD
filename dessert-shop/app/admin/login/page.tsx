'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    if (error) {
      setError('帳號或密碼錯誤');
      setBusy(false);
      return;
    }
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      await supabase.auth.signOut();
      setError('這個帳號沒有後台權限');
      setBusy(false);
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  const input = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-brick';
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-paper p-6 shadow-lg">
        <div>
          <p className="tracking-[0.3em] text-brick">Wu.D dessert</p>
          <h1 className="text-2xl font-bold text-brick">後台登入</h1>
        </div>
        <label className="block text-sm">
          Email
          <input name="email" type="email" required autoComplete="username" className={`mt-1 ${input}`} />
        </label>
        <label className="block text-sm">
          密碼
          <input name="password" type="password" required autoComplete="current-password" className={`mt-1 ${input}`} />
        </label>
        {error && <p className="text-sm font-bold text-brick">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-brick py-3 font-bold text-white disabled:bg-blush">
          {busy ? '登入中…' : '登入'}
        </button>
      </form>
    </main>
  );
}
