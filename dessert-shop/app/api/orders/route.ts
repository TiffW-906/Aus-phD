import { NextResponse } from 'next/server';
import { loadStore } from '@/lib/store';
import { validatePickup } from '@/lib/pickup';
import { supabaseService } from '@/lib/supabase/server';
import { cancelOrder, newOrderNo, placeOrderError } from '@/lib/orders';
import { linePayConfigured, requestPayment } from '@/lib/linepay';
import type { PaymentMethod } from '@/lib/types';

type Body = {
  customerName?: unknown;
  phone?: unknown;
  lineName?: unknown;
  pickupDate?: unknown;
  pickupTime?: unknown;
  paymentMethod?: unknown;
  note?: unknown;
  website?: unknown;
  items?: { productId?: unknown; flavor?: unknown; quantity?: unknown }[];
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || str(body.website, 100)) return fail('訂單格式錯誤');

  const customerName = str(body.customerName, 40);
  const phone = str(body.phone, 20).replace(/[\s-]/g, '');
  const lineName = str(body.lineName, 60);
  const note = str(body.note, 500);
  const pickupDate = str(body.pickupDate, 10);
  const pickupTime = str(body.pickupTime, 5);
  const paymentMethod = body.paymentMethod as PaymentMethod;
  if (!customerName) return fail('請填寫姓名');
  if (!/^09\d{8}$/.test(phone)) return fail('請填寫正確的手機號碼（09 開頭共 10 碼）');
  if (paymentMethod !== 'linepay' && paymentMethod !== 'cash') return fail('請選擇付款方式');
  if (paymentMethod === 'linepay' && !linePayConfigured()) return fail('LINE Pay 暫時無法使用，請改選現場付現', 503);

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) return fail('購物車是空的');
  if (rawItems.length > 40) return fail('品項太多，請分開下單或 LINE 聯繫我們');

  const db = supabaseService();
  await db.rpc('expire_linepay_orders');
  const { products, settings, closedDates } = await loadStore();
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = [];
  for (const raw of rawItems) {
    const product = byId.get(str(raw.productId, 60));
    if (!product) return fail('有商品已下架，請從購物車移除');
    if (product.stock_status === 'unavailable') {
      return fail(product.sold_out_at ? `「${product.name}」已售完，請從購物車移除` : `「${product.name}」目前暫停供應，請從購物車移除`);
    }
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail(`「${product.name}」數量不正確`);
    items.push({ product_id: product.id, flavor: str(raw.flavor, 40), quantity, expected_status: product.stock_status });
  }

  // Server-side re-check of the pickup slot against current product status, business days and closures.
  const cartProducts = [...new Set(items.map((i) => i.product_id))].map((id) => byId.get(id)!);
  const pickupError = validatePickup(pickupDate, pickupTime, cartProducts, settings, new Set(closedDates.map((c) => c.date)));
  if (pickupError) return fail(pickupError);

  // place_order locks the products, recomputes prices from the database and deducts stock atomically.
  let placed: { id: string; order_no: string; total_amount: number; items: { product_name: string; flavor: string; unit_price: number; quantity: number }[] } | null = null;
  for (let attempt = 0; attempt < 3 && !placed; attempt++) {
    const { data, error } = await db.rpc('place_order', {
      p_order: {
        order_no: newOrderNo(),
        customer_name: customerName,
        phone,
        line_name: lineName,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        payment_method: paymentMethod,
        note,
        items,
      },
    });
    if (!error) placed = data;
    else if (error.code !== '23505') {
      const message = placeOrderError(error.message);
      if (message) return fail(message, 409);
      console.error('place_order failed', error);
      return fail('系統忙碌，請稍後再試', 500);
    }
  }
  if (!placed) return fail('系統忙碌，請稍後再試', 500);

  if (paymentMethod === 'cash') return NextResponse.json({ orderNo: placed.order_no });

  const site = process.env.SITE_URL || new URL(request.url).origin;
  try {
    const payment = await requestPayment({
      orderNo: placed.order_no,
      amount: placed.total_amount,
      items: placed.items.map((i) => ({
        name: i.flavor ? `${i.product_name}（${i.flavor}）` : i.product_name,
        quantity: i.quantity,
        price: i.unit_price,
      })),
      confirmUrl: `${site}/api/linepay/confirm`,
      cancelUrl: `${site}/api/linepay/cancel?orderNo=${encodeURIComponent(placed.order_no)}`,
    });
    await db
      .from('orders')
      .update({ linepay_transaction_id: payment.transactionId, linepay_payment_url: payment.paymentUrl })
      .eq('id', placed.id);
    return NextResponse.json({ orderNo: placed.order_no, paymentUrl: payment.paymentUrl });
  } catch (err) {
    console.error('LINE Pay request failed', err);
    await cancelOrder(placed.id, 'LINE Pay 付款請求失敗');
    return fail('LINE Pay 暫時無法使用，請稍後再試或改選現場付現', 502);
  }
}
