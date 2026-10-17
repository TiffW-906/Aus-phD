import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/server';
import { confirmPayment } from '@/lib/linepay';
import { cancelOrder } from '@/lib/orders';

// LINE Pay sends the customer back here after they approve the payment.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const transactionId = url.searchParams.get('transactionId') ?? '';
  const orderNo = url.searchParams.get('orderId') ?? '';
  const back = (status?: string) =>
    NextResponse.redirect(new URL(`/order/${encodeURIComponent(orderNo)}${status ? `?payment=${status}` : ''}`, url));

  const db = supabaseService();
  const { data: order } = await db.from('orders').select('*').eq('order_no', orderNo).maybeSingle();
  if (!order || !transactionId || order.linepay_transaction_id !== transactionId) {
    return NextResponse.redirect(new URL('/', url));
  }
  if (order.payment_status === 'paid') return back();
  // Expired orders already released their stock; without Confirm the customer is not charged.
  if (order.order_status === 'cancelled') return back('expired');

  // Confirm with the amount stored on the order, which the server computed from database prices.
  let result;
  try {
    result = await confirmPayment(transactionId, order.total_amount);
  } catch (err) {
    console.error('LINE Pay confirm failed', err);
    return back('error');
  }
  if (result.returnCode === '0000') {
    await db
      .from('orders')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('payment_status', 'unpaid');
    return back('success');
  }
  console.error('LINE Pay confirm rejected', result.returnCode, result.returnMessage);
  await cancelOrder(order.id, `LINE Pay 付款失敗（${result.returnCode}）`);
  return back('failed');
}
