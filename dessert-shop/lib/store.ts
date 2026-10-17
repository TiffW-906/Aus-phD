import 'server-only';
import { supabaseService } from './supabase/server';
import { taipeiNow } from './pickup';
import type { ClosedDate, Product, StoreSettings } from './types';

/** Products, settings and upcoming closed dates, read fresh on every request. */
export async function loadStore() {
  const db = supabaseService();
  const today = taipeiNow().date;
  const [products, settings, closed] = await Promise.all([
    db.from('products').select('*').order('sort_order'),
    db.from('store_settings').select('*').eq('id', 1).single(),
    db.from('closed_dates').select('*').gte('date', today).order('date'),
  ]);
  const error = products.error || settings.error || closed.error;
  if (error) throw new Error(`Supabase: ${error.message}`);
  const s = settings.data as StoreSettings & { id: number };
  return {
    products: products.data as Product[],
    settings: { ...s, open_time: s.open_time.slice(0, 5), close_time: s.close_time.slice(0, 5) } as StoreSettings,
    closedDates: closed.data as ClosedDate[],
  };
}
