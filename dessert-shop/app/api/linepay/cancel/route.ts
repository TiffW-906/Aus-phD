import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/server';
import { cancelOrder } from '@/lib/orders';

// The customer backed out of the LINE Pay page: cancel the unpaid order and release its stock.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderNo = url.searchParams.get('orderNo') ?? '';
  const { data: order } = await supabaseService()
    .from('orders')
    .select('id, payment_method, payment_status')
    .eq('order_no', orderNo)
    .maybeSingle();
  if (!order) return NextResponse.redirect(new URL('/', url));
  if (order.payment_method === 'linepay' && order.payment_status === 'unpaid') {
    await cancelOrder(order.id, '客人取消 LINE Pay 付款');
  }
  return NextResponse.redirect(new URL(`/order/${encodeURIComponent(orderNo)}?payment=cancelled`, url));
}
