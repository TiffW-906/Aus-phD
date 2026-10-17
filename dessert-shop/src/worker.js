import menu from '../public/menu.json';
import { STATUSES, newOrderId, validateOrder } from './orders.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function isAdmin(request, env) {
  const expected = env.ADMIN_PASSWORD;
  const given = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!expected || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual
    ? crypto.subtle.timingSafeEqual(a, b)
    : new Uint8Array(a).every((v, i) => v === new Uint8Array(b)[i]);
}

function rowToOrder(row) {
  const { items_json, ...rest } = row;
  return { ...rest, items: JSON.parse(items_json) };
}

async function createOrder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '訂單格式錯誤' }, 400);
  }
  const { order, error } = validateOrder(body, menu);
  if (error) return json({ error }, 400);

  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newOrderId();
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO orders (id, created_at, status, customer_name, phone, line_name, fulfillment,
        pickup_date, pickup_time, address, payment, items_json, subtotal, note, updated_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, now, order.customerName, order.phone, order.lineName, order.fulfillment, order.pickupDate,
        order.pickupTime, order.address, order.payment, JSON.stringify(order.items), order.subtotal, order.note, now)
      .run();
    if (result.meta.changes === 1) return json({ id, subtotal: order.subtotal, items: order.items }, 201);
  }
  return json({ error: '系統忙碌，請稍後再試' }, 503);
}

async function listOrders(url, env) {
  const where = [];
  const args = [];
  const status = url.searchParams.get('status');
  if (status && STATUSES[status]) { where.push('status = ?'); args.push(status); }
  const from = url.searchParams.get('from');
  if (from) { where.push('pickup_date >= ?'); args.push(from); }
  const to = url.searchParams.get('to');
  if (to) { where.push('pickup_date <= ?'); args.push(to); }
  const q = url.searchParams.get('q');
  if (q) {
    where.push('(id LIKE ? OR customer_name LIKE ? OR phone LIKE ? OR line_name LIKE ?)');
    args.push(...Array(4).fill(`%${q}%`));
  }
  const sql = `SELECT * FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY created_at DESC LIMIT 1000`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ orders: results.map(rowToOrder), statuses: STATUSES });
}

async function updateOrder(id, request, env) {
  const body = await request.json().catch(() => ({}));
  const sets = [];
  const args = [];
  if (body.status !== undefined) {
    if (!STATUSES[body.status]) return json({ error: '狀態不正確' }, 400);
    sets.push('status = ?'); args.push(body.status);
  }
  if (body.adminNote !== undefined) { sets.push('admin_note = ?'); args.push(String(body.adminNote).slice(0, 1000)); }
  if (body.shippingFee !== undefined) {
    const fee = body.shippingFee === null || body.shippingFee === '' ? null : Number(body.shippingFee);
    if (fee !== null && (!Number.isInteger(fee) || fee < 0)) return json({ error: '運費不正確' }, 400);
    sets.push('shipping_fee = ?'); args.push(fee);
  }
  if (!sets.length) return json({ error: '沒有要更新的欄位' }, 400);
  sets.push('updated_at = ?'); args.push(new Date().toISOString());
  const row = await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ? RETURNING *`)
    .bind(...args, id).first();
  return row ? json({ order: rowToOrder(row) }) : json({ error: '找不到訂單' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    try {
      if (pathname === '/api/orders' && request.method === 'POST') return await createOrder(request, env);
      if (pathname.startsWith('/api/admin/')) {
        if (!(await isAdmin(request, env))) return json({ error: '密碼錯誤' }, 401);
        if (pathname === '/api/admin/orders' && request.method === 'GET') return await listOrders(url, env);
        const match = pathname.match(/^\/api\/admin\/orders\/([\w-]+)$/);
        if (match && request.method === 'PATCH') return await updateOrder(match[1], request, env);
      }
      if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return json({ error: '系統錯誤，請稍後再試' }, 500);
    }
  },
};
