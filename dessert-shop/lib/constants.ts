import type { Category, OrderStatus, PaymentMethod, PaymentStatus, StockStatus, TempType } from './types';

export const SHOP = {
  name: 'Wu.D dessert',
  address: '宜蘭市延平路39巷13號',
  lineId: '@327uqhcn',
  lineUrl: 'https://line.me/R/ti/p/@327uqhcn',
  instagram: 'https://www.instagram.com/wu.d_dessert/',
};

export const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.address)}`;

export const CATEGORIES: { id: Category; name: string; en: string }[] = [
  { id: 'main', name: '主要商品', en: 'Main Products' },
  { id: 'bread', name: '麵包', en: 'Breads' },
  { id: 'drink', name: '罐裝冷飲', en: 'Drinks' },
  { id: 'cookie', name: '常溫餅乾', en: 'Cookies' },
];

export const TEMP_LABELS: Record<TempType, { icon: string; label: string; short: string } | null> = {
  frozen: { icon: '❄', label: '冷凍商品', short: '冷凍' },
  fresh: { icon: '☀', label: '當日出爐為常溫，否則冷凍供應', short: '當日常溫' },
  made_to_order: { icon: '🚚', label: '接單製作', short: '接單製作' },
  none: null,
};

export const STOCK_LABELS: Record<StockStatus, string> = {
  in_stock: '現貨',
  preorder: '可預訂',
  unavailable: '暫停',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  linepay: 'LINE Pay',
  cash: '現場付現',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: '未付款',
  paid: '已付款',
  refunded: '已退款',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待確認',
  confirmed: '已確認',
  ready: '可取貨',
  completed: '已完成',
  cancelled: '已取消',
};
