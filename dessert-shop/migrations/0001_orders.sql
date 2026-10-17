CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line_name TEXT NOT NULL DEFAULT '',
  fulfillment TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  pickup_time TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  shipping_fee INTEGER,
  note TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
CREATE INDEX orders_created_at ON orders (created_at);
CREATE INDEX orders_pickup_date ON orders (pickup_date);
