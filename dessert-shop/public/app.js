const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => `$${n.toLocaleString('zh-TW')}`;

const FULFILLMENT = [
  { id: 'pickup', name: '工作室自取', desc: '可現金或 LINE Pay' },
  { id: 'seven', name: '7-11 店到店', desc: '運費另計' },
  { id: 'tcat', name: '黑貓宅配', desc: '運費另計' },
];
const PAYMENT = [
  { id: 'linepay', name: 'LINE Pay', desc: '下單後傳送付款連結' },
  { id: 'cash', name: '現金付款', desc: '僅限工作室自取' },
];
const CART_KEY = 'wud-cart-v1';

let menu;
let cart = [];
let step = 'cart';

function loadCart() {
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
  cart = cart.filter((line) => menu.products.some((p) => p.id === line.id));
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private mode: cart lives in memory */ }
}
const product = (id) => menu.products.find((p) => p.id === id);
const flavorsOf = (p) => p.flavors || (p.flavorGroups ? p.flavorGroups.flatMap((g) => g.flavors) : []);

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

/* ---------- Menu ---------- */
function renderMenu() {
  $('#cat-nav').innerHTML = menu.categories
    .map((c) => `<a href="#cat-${c.id}" data-cat="${c.id}">${esc(c.name)}</a>`).join('');

  $('#menu').innerHTML = menu.categories.map((c) => {
    const items = menu.products.filter((p) => p.category === c.id);
    return `<section class="category" id="cat-${c.id}">
      <h2>${esc(c.name)} <small>${esc(c.en)}</small></h2>
      <div class="grid">${items.map(cardHtml).join('')}</div>
    </section>`;
  }).join('');

  $('#legend').innerHTML = Object.values(menu.tags).map((t) => `<span>${t.icon} ${esc(t.label)}</span>`).join('');
  $('#line-id').textContent = menu.shop.lineId;
  $('#line-link').href = menu.shop.lineUrl;

  document.querySelectorAll('.card').forEach(bindCard);
  observeCategories();
}

function cardHtml(p) {
  const tag = p.tag && menu.tags[p.tag];
  const img = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
    : `<span class="placeholder" aria-hidden="true">${esc(p.name.slice(0, 1))}</span>`;
  const chip = (f) => `<button type="button" class="chip" aria-pressed="false" data-flavor="${esc(f)}">${esc(f)}</button>`;
  let flavors = '';
  if (p.flavorGroups) {
    flavors = `<p class="flavor-label">選擇口味</p>` + p.flavorGroups.map((g) =>
      `<p class="flavor-group-name">${esc(g.name)}</p><div class="chips">${g.flavors.map(chip).join('')}</div>`).join('');
  } else if (p.flavors) {
    flavors = `<p class="flavor-label">選擇口味</p><div class="chips">${p.flavors.map(chip).join('')}</div>`;
  }
  return `<article class="card" data-id="${p.id}">
    <div class="card-img">${img}${tag ? `<span class="tag">${tag.icon} ${esc(tag.label.split('，')[0])}</span>` : ''}</div>
    <div class="card-body">
      <div class="card-title"><h3>${esc(p.name)}</h3><span class="price">${money(p.price)}</span></div>
      ${flavors}
      <div class="card-actions">
        <div class="stepper"><button type="button" data-d="-1" aria-label="減少" disabled>−</button><span>1</span><button type="button" data-d="1" aria-label="增加">+</button></div>
        <button type="button" class="btn primary add">加入購物車</button>
      </div>
    </div>
  </article>`;
}

function bindCard(card) {
  const p = product(card.dataset.id);
  let qty = 1;
  let flavor = '';
  const qtyEl = card.querySelector('.stepper span');
  const minus = card.querySelector('[data-d="-1"]');
  card.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
    card.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', 'true');
    flavor = chip.dataset.flavor;
  }));
  card.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => {
    qty = Math.min(99, Math.max(1, qty + Number(b.dataset.d)));
    qtyEl.textContent = qty;
    minus.disabled = qty <= 1;
  }));
  const addBtn = card.querySelector('.add');
  addBtn.addEventListener('click', () => {
    if (flavorsOf(p).length && !flavor) {
      toast('請先選擇口味');
      card.querySelector('.chips').classList.add('bump');
      setTimeout(() => card.querySelector('.chips').classList.remove('bump'), 400);
      return;
    }
    addToCart(p.id, flavor, qty);
    addBtn.textContent = '✓ 已加入';
    addBtn.classList.add('added');
    setTimeout(() => { addBtn.textContent = '加入購物車'; addBtn.classList.remove('added'); }, 1200);
    qty = 1; qtyEl.textContent = 1; minus.disabled = true;
  });
}

function observeCategories() {
  const links = [...document.querySelectorAll('#cat-nav a')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.dataset.cat === e.target.id.slice(4)));
    });
  }, { rootMargin: '-80px 0px -70% 0px' });
  document.querySelectorAll('.category').forEach((s) => io.observe(s));
}

/* ---------- Cart ---------- */
function addToCart(id, flavor, qty) {
  const line = cart.find((l) => l.id === id && l.flavor === flavor);
  if (line) line.qty = Math.min(99, line.qty + qty);
  else cart.push({ id, flavor, qty });
  saveCart();
  renderCart();
  const fab = $('#cart-fab');
  fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
  toast(`已加入 ${product(id).name}${flavor ? `・${flavor}` : ''} × ${qty}`);
}

const subtotal = () => cart.reduce((s, l) => s + product(l.id).price * l.qty, 0);
const count = () => cart.reduce((s, l) => s + l.qty, 0);

function renderCart() {
  $('#cart-badge').textContent = count();
  $('#cart-fab-total').textContent = money(subtotal());
  $('#cart-total').textContent = money(subtotal());
  $('#cart-empty').hidden = cart.length > 0;
  $('#cart-list').innerHTML = cart.map((l, i) => {
    const p = product(l.id);
    return `<li class="cart-item">
      <div><div class="cart-item-name">${esc(p.name)}</div>${l.flavor ? `<div class="cart-item-flavor">口味：${esc(l.flavor)}</div>` : ''}</div>
      <div class="cart-item-price">${money(p.price * l.qty)}</div>
      <div class="cart-item-controls">
        <div class="stepper"><button type="button" data-i="${i}" data-d="-1" aria-label="減少">−</button><span>${l.qty}</span><button type="button" data-i="${i}" data-d="1" aria-label="增加">+</button></div>
        <button type="button" class="link-btn" data-remove="${i}">移除</button>
      </div>
    </li>`;
  }).join('');
  if (step === 'cart') $('#btn-next').disabled = cart.length === 0;
}

$('#cart-list').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.remove !== undefined) cart.splice(Number(b.dataset.remove), 1);
  else if (b.dataset.d) {
    const line = cart[Number(b.dataset.i)];
    line.qty = Math.min(99, line.qty + Number(b.dataset.d));
    if (line.qty < 1) cart.splice(Number(b.dataset.i), 1);
  }
  saveCart();
  renderCart();
});

/* ---------- Drawer & steps ---------- */
function openDrawer() {
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#overlay').hidden = true;
  document.body.style.overflow = '';
  if (step === 'done') setStep('cart');
}
$('#cart-fab').addEventListener('click', openDrawer);
$('#drawer-close').addEventListener('click', closeDrawer);
$('#overlay').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

function setStep(next) {
  step = next;
  $('#view-cart').hidden = step !== 'cart';
  $('#view-checkout').hidden = step !== 'checkout';
  $('#view-done').hidden = step !== 'done';
  $('#drawer-foot').hidden = step === 'done';
  $('#btn-back').hidden = step !== 'checkout';
  $('#drawer-title').textContent = { cart: '購物車', checkout: '結帳', done: '完成' }[step];
  document.querySelectorAll('.step').forEach((s) => s.classList.toggle('active', s.dataset.step === step));
  const nextBtn = $('#btn-next');
  nextBtn.textContent = step === 'cart' ? '前往結帳' : '送出訂單';
  nextBtn.disabled = step === 'cart' && cart.length === 0;
  $('#form-error').textContent = '';
  updateCheckout();
}

$('#btn-back').addEventListener('click', () => setStep('cart'));
$('#btn-next').addEventListener('click', () => (step === 'cart' ? setStep('checkout') : submitOrder()));

/* ---------- Checkout ---------- */
const form = $('#view-checkout');

function choiceHtml(name, opts) {
  return opts.map((o, i) => `<label class="choice"><input type="radio" name="${name}" value="${o.id}" ${i === 0 ? 'checked' : ''}>
    <strong>${esc(o.name)}</strong><small>${esc(o.desc)}</small></label>`).join('');
}

function setupCheckout() {
  $('#fulfillment-choices').innerHTML = choiceHtml('fulfillment', FULFILLMENT);
  $('#payment-choices').innerHTML = choiceHtml('payment', PAYMENT);
  const now = new Date(Date.now() + 8 * 3600e3);
  now.setUTCDate(now.getUTCDate() + (menu.shop.leadDays || 0));
  form.pickupDate.min = now.toISOString().slice(0, 10);
  form.addEventListener('change', updateCheckout);
}

function updateCheckout() {
  const f = form.fulfillment.value;
  const cash = form.querySelector('input[name="payment"][value="cash"]');
  cash.disabled = f !== 'pickup';
  if (cash.disabled && cash.checked) form.querySelector('input[name="payment"][value="linepay"]').checked = true;

  $('#address-field').hidden = f === 'pickup';
  $('#time-field').hidden = f !== 'pickup';
  $('#address-label').textContent = f === 'seven' ? '7-11 門市名稱／店號 *' : '收件地址 *';
  form.address.placeholder = f === 'seven' ? '例：鑫台北門市（123456）' : '縣市、區、路名門牌';
  $('#fulfillment-hint').textContent = f === 'pickup' ? `取貨地點：${menu.shop.pickupAddress}` : menu.shop.shippingNote;
  $('#shipping-line').textContent = f === 'pickup' ? '' : '＋ 運費另計（店家確認後通知）';
  $('#payment-hint').textContent = form.payment.value === 'linepay'
    ? `送出訂單後，請加入官方 LINE ${menu.shop.lineId} 並傳送訂單編號，我們會回覆 LINE Pay 付款連結。`
    : '請於取貨時以現金付款，建議準備剛好的金額。';
}

async function submitOrder() {
  const btn = $('#btn-next');
  const err = $('#form-error');
  err.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  if (!data.pickupDate) { err.textContent = '請選擇希望取貨／到貨日期'; return; }
  if (!data.customerName.trim()) { err.textContent = '請填寫訂購人姓名'; return; }
  if (!data.phone.trim()) { err.textContent = '請填寫手機號碼'; return; }
  if (data.fulfillment !== 'pickup' && !data.address.trim()) { err.textContent = data.fulfillment === 'seven' ? '請填寫 7-11 門市' : '請填寫收件地址'; return; }

  btn.disabled = true;
  btn.textContent = '送出中…';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, items: cart }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || '送出失敗，請稍後再試');
    showDone(body, data);
    cart = [];
    saveCart();
    renderCart();
    form.reset();
    updateCheckout();
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.disabled = false;
    if (step === 'checkout') btn.textContent = '送出訂單';
  }
}

function showDone(result, data) {
  $('#done-id').textContent = result.id;
  const f = FULFILLMENT.find((x) => x.id === data.fulfillment).name;
  $('#done-summary').textContent = `${f}・${data.pickupDate}${data.pickupTime ? ` ${data.pickupTime}` : ''}・商品小計 ${money(result.subtotal)}${data.fulfillment === 'pickup' ? '' : '（運費另計）'}`;
  $('#done-next').innerHTML = data.payment === 'linepay'
    ? `<div class="next-box"><strong>接下來請完成 LINE Pay 付款</strong><ol>
        <li>加入官方 LINE ${esc(menu.shop.lineId)}</li>
        <li>傳送訂單編號 <b>${esc(result.id)}</b></li>
        <li>收到付款連結後完成 LINE Pay，訂單即成立</li></ol>
        <a class="line-btn" href="${esc(menu.shop.lineUrl)}" target="_blank" rel="noopener">開啟 LINE 傳送訂單編號</a></div>`
    : `<div class="next-box"><strong>取貨時現金付款</strong><p>請於約定時間至工作室取貨，並告知訂單編號。<br>取貨地點：${esc(menu.shop.pickupAddress)}</p>
        <a class="line-btn" href="${esc(menu.shop.lineUrl)}" target="_blank" rel="noopener">有問題？LINE 聯繫我們</a></div>`;
  setStep('done');
}

/* ---------- Boot ---------- */
(async () => {
  menu = await (await fetch('menu.json')).json();
  loadCart();
  renderMenu();
  setupCheckout();
  renderCart();
  setStep('cart');
})();
