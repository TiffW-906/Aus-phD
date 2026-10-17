// Order validation shared by the Worker and the tests. Prices always come from
// menu.json on the server, never from what the browser sends.

export const FULFILLMENTS = { pickup: '工作室自取', seven: '7-11 店到店', tcat: '黑貓宅配' };
export const PAYMENTS = { linepay: 'LINE Pay', cash: '自取現金付款' };
export const STATUSES = {
  pending: '待確認',
  awaiting_payment: '待付款',
  paid: '已付款',
  ready: '可取貨／已出貨',
  done: '已完成',
  cancelled: '已取消',
};

const MAX_QTY = 99;
const MAX_LINES = 40;

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function taipeiDate(date = new Date()) {
  return new Date(date.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function flavorsOf(product) {
  if (product.flavors) return product.flavors;
  if (product.flavorGroups) return product.flavorGroups.flatMap((g) => g.flavors);
  return [];
}

// Returns { order } or { error } with a message meant for the customer.
export function validateOrder(input, menu, now = new Date()) {
  if (!input || typeof input !== 'object') return { error: '訂單格式錯誤' };
  if (text(input.website, 100)) return { error: '訂單格式錯誤' };

  const products = new Map(menu.products.map((p) => [p.id, p]));
  if (!Array.isArray(input.items) || input.items.length === 0) return { error: '購物車是空的' };
  if (input.items.length > MAX_LINES) return { error: '品項太多，請分開下單或直接聯繫店家' };

  const merged = new Map();
  for (const raw of input.items) {
    const product = products.get(raw?.id);
    if (!product) return { error: '有商品已下架，請重新整理頁面' };
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return { error: `「${product.name}」數量不正確` };
    const options = flavorsOf(product);
    const flavor = options.length ? text(raw.flavor, 40) : '';
    if (options.length && !options.includes(flavor)) return { error: `請選擇「${product.name}」的口味` };
    const key = `${product.id}|${flavor}`;
    const line = merged.get(key) || { id: product.id, name: product.name, flavor, price: product.price, qty: 0 };
    line.qty += qty;
    if (line.qty > MAX_QTY) return { error: `「${product.name}」數量不正確` };
    merged.set(key, line);
  }
  const items = [...merged.values()];
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const customerName = text(input.customerName, 40);
  const phone = text(input.phone, 20).replace(/[\s-]/g, '');
  const lineName = text(input.lineName, 60);
  if (!customerName) return { error: '請填寫訂購人姓名' };
  if (!/^\+?\d{8,15}$/.test(phone)) return { error: '請填寫正確的手機號碼' };

  const fulfillment = input.fulfillment;
  if (!FULFILLMENTS[fulfillment]) return { error: '請選擇取貨方式' };
  const address = text(input.address, 200);
  if (fulfillment === 'seven' && !address) return { error: '請填寫 7-11 門市名稱或店號' };
  if (fulfillment === 'tcat' && !address) return { error: '請填寫宅配地址' };

  const payment = input.payment;
  if (!PAYMENTS[payment]) return { error: '請選擇付款方式' };
  if (payment === 'cash' && fulfillment !== 'pickup') return { error: '現金付款僅限工作室自取' };

  const pickupDate = text(input.pickupDate, 10);
  const earliest = addDays(taipeiDate(now), menu.shop.leadDays ?? 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return { error: '請選擇希望取貨／到貨日期' };
  if (pickupDate < earliest) return { error: `最早可選 ${earliest}` };
  if (pickupDate > addDays(earliest, 90)) return { error: '日期請選擇 90 天內' };

  return {
    order: {
      customerName,
      phone,
      lineName,
      fulfillment,
      pickupDate,
      pickupTime: fulfillment === 'pickup' ? text(input.pickupTime, 20) : '',
      address: fulfillment === 'pickup' ? '' : address,
      payment,
      items,
      subtotal,
      note: text(input.note, 500),
    },
  };
}

export function newOrderId(now = new Date()) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `WD${taipeiDate(now).slice(2).replaceAll('-', '')}-${suffix}`;
}
