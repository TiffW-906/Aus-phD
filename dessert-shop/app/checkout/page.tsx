import type { Metadata } from 'next';
import { CartProvider } from '@/lib/cart';
import { loadStore } from '@/lib/store';
import { CheckoutForm } from './CheckoutForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '結帳｜Wu.D dessert' };

export default async function CheckoutPage() {
  const { products, settings, closedDates } = await loadStore();
  return (
    <CartProvider products={products}>
      <CheckoutForm settings={settings} closedDates={closedDates} linePayEnabled={!!process.env.LINEPAY_CHANNEL_ID} />
    </CartProvider>
  );
}
