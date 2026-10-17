import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wu.D 後台', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentAdmin())) redirect('/admin/login');
  return <AdminShell>{children}</AdminShell>;
}
