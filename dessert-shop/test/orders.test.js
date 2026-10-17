import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateOrder, newOrderId } from '../src/orders.js';

const menu = JSON.parse(readFileSync(new URL('../public/menu.json', import.meta.url)));
const now = new Date('2026-10-17T04:00:00Z');
const base = {
  customerName: '王小明', phone: '0912-345-678', fulfillment: 'pickup', payment: 'cash', pickupDate: '2026-10-20',
  items: [{ id: 'dacquoise', flavor: '宇治抹茶', qty: 2 }, { id: 'brownie', qty: 1 }, { id: 'dacquoise', flavor: '宇治抹茶', qty: 1 }],
};

test('prices come from the menu and duplicate lines merge', () => {
  const { order, error } = validateOrder({ ...base, items: [...base.items, { id: 'brownie', qty: 1, price: 1 }] }, menu, now);
  assert.equal(error, undefined);
  assert.equal(order.subtotal, 3 * 100 + 2 * 150);
  assert.equal(order.items.length, 2);
  assert.equal(order.phone, '0912345678');
});

test('cash is only allowed for pickup', () => {
  assert.match(validateOrder({ ...base, fulfillment: 'seven', address: '鑫台北' }, menu, now).error, /現金/);
  assert.ok(validateOrder({ ...base, fulfillment: 'seven', address: '鑫台北', payment: 'linepay' }, menu, now).order);
});

test('rejects bad flavors, quantities, dates and missing addresses', () => {
  assert.ok(validateOrder({ ...base, items: [{ id: 'dacquoise', qty: 1 }] }, menu, now).error);
  assert.ok(validateOrder({ ...base, items: [{ id: 'dacquoise', flavor: '榴槤', qty: 1 }] }, menu, now).error);
  assert.ok(validateOrder({ ...base, items: [{ id: 'brownie', qty: 0 }] }, menu, now).error);
  assert.ok(validateOrder({ ...base, items: [{ id: 'nope', qty: 1 }] }, menu, now).error);
  assert.ok(validateOrder({ ...base, pickupDate: '2026-10-18' }, menu, now).error);
  assert.ok(validateOrder({ ...base, fulfillment: 'tcat', payment: 'linepay' }, menu, now).error);
  assert.ok(validateOrder({ ...base, website: 'spam' }, menu, now).error);
});

test('order ids use the Taipei date', () => {
  assert.match(newOrderId(new Date('2026-10-17T20:00:00Z')), /^WD261018-[A-Z2-9]{4}$/);
});
