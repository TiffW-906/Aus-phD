'use client';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { OrderWithItems } from '@/lib/types';

export async function fetchOrders(build: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>) {
  const { data, error } = await build(baseQuery());
  if (error) throw error;
  return data as OrderWithItems[];
}

function baseQuery() {
  return supabaseBrowser().from('orders').select('*, order_items(*)');
}

export async function markRead(ids: string[]) {
  if (ids.length) await supabaseBrowser().from('orders').update({ is_read: true }).in('id', ids);
}
