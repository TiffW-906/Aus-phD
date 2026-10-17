export type Category = 'main' | 'bread' | 'drink' | 'cookie';
export type TempType = 'frozen' | 'fresh' | 'made_to_order' | 'none';
export type StockStatus = 'in_stock' | 'preorder' | 'unavailable';
export type PaymentMethod = 'linepay' | 'cash';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  unit_note: string;
  temp_type: TempType;
  flavors: string[];
  image_url: string | null;
  stock_status: StockStatus;
  stock_qty: number | null;
  lead_days: number;
  sold_out_fallback: 'preorder' | 'unavailable';
  sold_out_at: string | null;
  sort_order: number;
};

export type StoreSettings = {
  open_weekdays: number[];
  open_time: string;
  close_time: string;
  slot_minutes: number;
  same_day_buffer_minutes: number;
  max_days_ahead: number;
  linepay_timeout_minutes: number;
};

export type ClosedDate = { date: string; reason: string };

export type Order = {
  id: string;
  order_no: string;
  customer_name: string;
  phone: string;
  line_name: string;
  pickup_date: string;
  pickup_time: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  total_amount: number;
  note: string;
  linepay_transaction_id: string | null;
  linepay_payment_url: string | null;
  is_read: boolean;
  cancel_reason: string | null;
  paid_at: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  flavor: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  was_in_stock: boolean;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };
