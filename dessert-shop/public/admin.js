const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => `$${Number(n).toLocaleString('zh-TW')}`;
const FULFILLMENT = { pickup: '工作室自取', seven: '7-11 店到店', tcat: '黑貓宅配' };
const PAYMENT = { linepay: 'LINE Pay', cash: '現金' };
const PW_KEY = 'wud-admin-pw';

let password = '';
let orders = [];
let statuses = {};

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${password}`, ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); throw new Error('請重新登入'); }
  if (!res.ok) throw new Error(body.error || '操作失敗');
  return body;
}

/* ---------- Auth ---------- */
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  password = e.target.password.value;
  $('#login-error').textContent = '';
  try {
    await load();
    try { sessionStorage.setItem(PW_KEY, password); } catch { /* ignore */ }
    showAdmin();
  } catch {
    $('#login-error').textContent = '密碼錯誤';
  }
});
function showAdmin() { $('#login').hidden = true; $('#admin').hidden = false; }
function logout() {
  password = '';
  try { sessionStorage.removeItem(PW_KEY); } catch { /* ignore */ }
  $('#admin').hidden = true;
  $('#login').hidden = false;
}
$('#logout').addEventListener('click', logout);

/* ---------- Data ---------- */
const filters = $('#filters');
async function load() {
  const params = new URLSearchParams();
  for (const [k, v] of new FormData(filters)) if (v) params.set(k, v);
  const body = await api(`/api/admin/orders?${params}`);
  orders = body.orders;
  if (!Object.keys(statuses).length) {
    statuses = body.statuses;
    filters.status.insertAdjacentHTML('beforeend',
      Object.entries(statuses).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(''));
  }
  render();
}

let debounce;
filters.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => load().catch((e) => toast(e.message)), 300); });
filters.addEventListener('submit', (e) => e.preventDefault());
filters.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
  const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const week = new Date(Date.now() + 8 * 3600e3 + 6 * 86400e3).toISOString().slice(0, 10);
  if (b.dataset.quick === 'clear') filters.reset();
  else { filters.from.value = today; filters.to.value = b.dataset.quick === 'today' ? today : week; }
  load().catch((e) => toast(e.message));
}));
$('#refresh').addEventListener('click', () => load().then(() => toast('已更新')).catch((e) => toast(e.message)));

/* ---------- Render ---------- */
const total = (o) => o.subtotal + (o.shipping_fee || 0);
const fmtTime = (iso) => new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function render() {
  const active = orders.filter((o) => o.status !== 'cancelled');
  $('#stats').innerHTML = [
    ['訂單數（不含取消）', active.length],
    ['待確認', orders.filter((o) => o.status === 'pending').length],
    ['待付款', orders.filter((o) => o.status === 'awaiting_payment').length],
    ['金額合計', money(active.reduce((s, o) => s + total(o), 0))],
  ].map(([label, v]) => `<div class="stat"><span>${label}</span><strong>${v}</strong></div>`).join('');

  $('#orders').innerHTML = orders.length ? orders.map(orderHtml).join('') : '<p class="empty">沒有符合條件的訂單</p>';

  const prep = new Map();
  for (const o of active) for (const i of o.items) {
    const key = `${i.name}|${i.flavor}`;
    prep.set(key, (prep.get(key) || 0) + i.qty);
  }
  $('#prep').innerHTML = [...prep].sort().map(([k, qty]) => {
    const [name, flavor] = k.split('|');
    return `<tr><td>${esc(name)}</td><td>${esc(flavor || '—')}</td><td>${qty}</td></tr>`;
  }).join('') || '<tr><td colspan="3" class="empty">無資料</td></tr>';
}

function orderHtml(o) {
  const where = o.fulfillment === 'pickup' ? `自取 ${o.pickup_time || ''}` : `${FULFILLMENT[o.fulfillment]}`;
  return `<details class="order" data-status="${o.status}" data-id="${esc(o.id)}">
    <summary>
      <div><div class="oid">${esc(o.id)}</div><small class="meta">${fmtTime(o.created_at)} 下單</small></div>
      <div class="who">${esc(o.customer_name)}・${esc(o.phone)}<small>取貨 ${esc(o.pickup_date)}｜${esc(where)}｜${PAYMENT[o.payment]}</small></div>
      <span class="pill">${esc(statuses[o.status] || o.status)}</span>
      <div class="amount">${money(total(o))}</div>
    </summary>
    <div class="order-body">
      <div>
        <table>
          <thead><tr><th>品項</th><th>口味</th><th class="num">單價</th><th class="num">數量</th><th class="num">小計</th></tr></thead>
          <tbody>${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.flavor || '—')}</td><td class="num">${i.price}</td><td class="num">${i.qty}</td><td class="num">${i.price * i.qty}</td></tr>`).join('')}</tbody>
          <tfoot>
            <tr><td colspan="4">商品小計</td><td class="num">${o.subtotal}</td></tr>
            <tr><td colspan="4">運費</td><td class="num">${o.shipping_fee ?? (o.fulfillment === 'pickup' ? 0 : '未設定')}</td></tr>
            <tr><th colspan="4">總計</th><th class="num">${total(o)}</th></tr>
          </tfoot>
        </table>
        <dl class="info">
          <dt>LINE 名稱</dt><dd>${esc(o.line_name || '—')}</dd>
          ${o.address ? `<dt>${o.fulfillment === 'seven' ? '7-11 門市' : '地址'}</dt><dd>${esc(o.address)}</dd>` : ''}
          <dt>客人備註</dt><dd>${esc(o.note || '—')}</dd>
        </dl>
      </div>
      <form class="edit">
        <label class="field"><span>訂單狀態</span><select name="status">${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        ${o.fulfillment === 'pickup' ? '' : `<label class="field"><span>運費</span><input name="shippingFee" type="number" min="0" step="1" value="${o.shipping_fee ?? ''}"></label>`}
        <label class="field"><span>內部備註（客人看不到）</span><textarea name="adminNote" rows="3">${esc(o.admin_note)}</textarea></label>
        <button class="btn primary" type="submit">儲存</button>
      </form>
    </div>
  </details>`;
}

$('#orders').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const id = form.closest('.order').dataset.id;
  const data = Object.fromEntries(new FormData(form));
  try {
    const { order } = await api(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
    orders = orders.map((o) => (o.id === id ? order : o));
    render();
    document.querySelector(`.order[data-id="${CSS.escape(id)}"]`)?.setAttribute('open', '');
    toast('已儲存');
  } catch (err) { toast(err.message); }
});

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
  $('#tab-orders').hidden = t.dataset.tab !== 'orders';
  $('#tab-prep').hidden = t.dataset.tab !== 'prep';
}));

/* ---------- CSV ---------- */
$('#export').addEventListener('click', () => {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['訂單編號', '下單時間', '狀態', '姓名', '電話', 'LINE', '取貨方式', '取貨日', '時段', '地址/門市', '付款', '品項', '口味', '單價', '數量', '品項小計', '商品小計', '運費', '總計', '客人備註', '內部備註'];
  const rows = [];
  for (const o of orders) for (const i of o.items) {
    rows.push([o.id, fmtTime(o.created_at), statuses[o.status], o.customer_name, o.phone, o.line_name, FULFILLMENT[o.fulfillment], o.pickup_date, o.pickup_time, o.address, PAYMENT[o.payment], i.name, i.flavor, i.price, i.qty, i.price * i.qty, o.subtotal, o.shipping_fee ?? '', total(o), o.note, o.admin_note]);
  }
  const csv = '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `wud-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- Boot ---------- */
try { password = sessionStorage.getItem(PW_KEY) || ''; } catch { password = ''; }
if (password) load().then(showAdmin).catch(() => logout());
