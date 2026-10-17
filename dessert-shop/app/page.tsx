import { Storefront } from '@/components/Storefront';
import { loadStore } from '@/lib/store';
import { taipeiNow } from '@/lib/pickup';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { products, settings, closedDates } = await loadStore();
  return <Storefront products={products} settings={settings} closedDates={closedDates} today={taipeiNow().date} />;
}
