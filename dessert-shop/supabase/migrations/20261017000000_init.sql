-- Wu.D dessert ordering schema. Times are interpreted in Asia/Taipei.

create table public.products (
  id text primary key,
  name text not null,
  category text not null check (category in ('main', 'bread', 'drink', 'cookie')),
  price integer not null check (price >= 0),
  unit_note text not null default '',
  temp_type text not null default 'none' check (temp_type in ('frozen', 'fresh', 'made_to_order', 'none')),
  flavors text[] not null default '{}',
  image_url text,
  stock_status text not null default 'preorder' check (stock_status in ('in_stock', 'preorder', 'unavailable')),
  stock_qty integer check (stock_qty is null or stock_qty >= 0),
  lead_days integer not null default 3 check (lead_days between 3 and 5),
  sold_out_fallback text not null default 'preorder' check (sold_out_fallback in ('preorder', 'unavailable')),
  -- Set when in-stock quantity runs out, so the storefront can show 今日已售完.
  sold_out_at timestamptz,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_name text not null,
  phone text not null,
  line_name text not null default '',
  pickup_date date not null,
  pickup_time time not null,
  payment_method text not null check (payment_method in ('linepay', 'cash')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  order_status text not null default 'pending'
    check (order_status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
  total_amount integer not null check (total_amount >= 0),
  note text not null default '',
  linepay_transaction_id text,
  linepay_payment_url text,
  is_read boolean not null default false,
  cancel_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_pickup_date_idx on public.orders (pickup_date);
create index orders_created_at_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text references public.products (id) on delete set null,
  product_name text not null,
  flavor text not null default '',
  unit_price integer not null,
  quantity integer not null check (quantity between 1 and 99),
  subtotal integer not null,
  was_in_stock boolean not null default false,
  -- How much was taken from products.stock_qty, so a cancellation puts back exactly that.
  stock_deducted integer not null default 0
);
create index order_items_order_id_idx on public.order_items (order_id);

create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  open_weekdays integer[] not null default '{1,2,3,4}',
  open_time time not null default '12:00',
  close_time time not null default '19:00',
  slot_minutes integer not null default 30 check (slot_minutes between 10 and 120),
  same_day_buffer_minutes integer not null default 60 check (same_day_buffer_minutes >= 0),
  max_days_ahead integer not null default 30 check (max_days_ahead between 1 and 90),
  linepay_timeout_minutes integer not null default 20 check (linepay_timeout_minutes between 5 and 120),
  check (open_time < close_time)
);
insert into public.store_settings (id) values (1);

create table public.closed_dates (
  date date primary key,
  reason text not null default ''
);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

create function public.taipei_today() returns date
language sql stable
as $$ select (now() at time zone 'Asia/Taipei')::date $$;

-- In-stock quantity hitting zero switches the product to its sold-out fallback.
create function public.products_before_update() returns trigger
language plpgsql
as $$
begin
  if new.stock_status = 'in_stock' and new.stock_qty is not null and new.stock_qty <= 0 then
    new.stock_status := new.sold_out_fallback;
    new.sold_out_at := now();
  elsif new.stock_status = 'in_stock' then
    new.sold_out_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger products_before_update before update on public.products
  for each row execute function public.products_before_update();

-- Cancelled orders are final, and cancelling puts in-stock quantities back.
create function public.orders_before_update() returns trigger
language plpgsql
as $$
begin
  if old.order_status = 'cancelled' and new.order_status <> 'cancelled' then
    raise exception 'ORDER_CANCELLED';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger orders_before_update before update on public.orders
  for each row execute function public.orders_before_update();

create function public.orders_after_cancel() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  item record;
begin
  for item in
    select product_id, sum(stock_deducted)::int as qty
    from public.order_items
    where order_id = new.id and stock_deducted > 0 and product_id is not null
    group by product_id order by product_id
  loop
    update public.products p
    set stock_qty = p.stock_qty + item.qty,
        -- Only undo an automatic sell-out from today; a manual change by the seller wins.
        stock_status = case
          when p.stock_status <> 'in_stock' and p.sold_out_at is not null
            and (p.sold_out_at at time zone 'Asia/Taipei')::date = public.taipei_today()
          then 'in_stock' else p.stock_status end
    where p.id = item.product_id and p.stock_qty is not null;
  end loop;
  update public.order_items set stock_deducted = 0 where order_id = new.id;
  return null;
end $$;
create trigger orders_after_cancel after update of order_status on public.orders
  for each row when (new.order_status = 'cancelled' and old.order_status <> 'cancelled')
  execute function public.orders_after_cancel();

-- ---------------------------------------------------------------- place_order
-- Called only by the server (service role) after it has validated the pickup slot.
-- Locks the products, re-reads prices, checks stock and writes the order in one transaction.
-- p_order: { order_no, customer_name, phone, line_name, pickup_date, pickup_time,
--            payment_method, note, items: [{ product_id, flavor, quantity, expected_status }] }
create function public.place_order(p_order jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  line jsonb;
  prod public.products;
  wanted record;
  v_order_id uuid;
  v_total integer := 0;
  v_qty integer;
  v_flavor text;
  v_deduct integer;
  v_remaining jsonb := '{}';
begin
  if jsonb_typeof(p_order -> 'items') <> 'array' or jsonb_array_length(p_order -> 'items') = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Lock every product once, in a fixed order, and check total quantity per product.
  for wanted in
    select l ->> 'product_id' as product_id,
           sum((l ->> 'quantity')::int)::int as qty,
           min(l ->> 'expected_status') as expected_status
    from jsonb_array_elements(p_order -> 'items') l
    group by 1 order by 1
  loop
    select * into prod from public.products where id = wanted.product_id for update;
    if not found or prod.stock_status = 'unavailable' then
      raise exception 'UNAVAILABLE|%', coalesce(prod.name, wanted.product_id);
    end if;
    if prod.stock_status <> wanted.expected_status then
      raise exception 'STATUS_CHANGED|%', prod.name;
    end if;
    if prod.stock_status = 'in_stock' and prod.stock_qty is not null then
      if wanted.qty > prod.stock_qty then
        raise exception 'OUT_OF_STOCK|%|%', prod.name, prod.stock_qty;
      end if;
      v_remaining := v_remaining || jsonb_build_object(prod.id, prod.stock_qty);
    end if;
  end loop;

  insert into public.orders (order_no, customer_name, phone, line_name, pickup_date, pickup_time,
                             payment_method, note, total_amount)
  values (p_order ->> 'order_no', p_order ->> 'customer_name', p_order ->> 'phone',
          coalesce(p_order ->> 'line_name', ''), (p_order ->> 'pickup_date')::date,
          (p_order ->> 'pickup_time')::time, p_order ->> 'payment_method',
          coalesce(p_order ->> 'note', ''), 0)
  returning id into v_order_id;

  for line in select * from jsonb_array_elements(p_order -> 'items')
  loop
    select * into prod from public.products where id = line ->> 'product_id';
    v_qty := (line ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'BAD_QUANTITY|%', prod.name;
    end if;
    v_flavor := coalesce(line ->> 'flavor', '');
    if cardinality(prod.flavors) > 0 and not (v_flavor = any (prod.flavors)) then
      raise exception 'BAD_FLAVOR|%', prod.name;
    elsif cardinality(prod.flavors) = 0 then
      v_flavor := '';
    end if;

    v_deduct := case when v_remaining ? prod.id then v_qty else 0 end;
    insert into public.order_items (order_id, product_id, product_name, flavor, unit_price, quantity,
                                    subtotal, was_in_stock, stock_deducted)
    values (v_order_id, prod.id, prod.name, v_flavor, prod.price, v_qty, prod.price * v_qty,
            prod.stock_status = 'in_stock', v_deduct);
    v_total := v_total + prod.price * v_qty;

    if v_deduct > 0 then
      update public.products set stock_qty = stock_qty - v_deduct where id = prod.id;
    end if;
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'order_no', p_order ->> 'order_no',
    'total_amount', v_total,
    'items', (select jsonb_agg(jsonb_build_object('product_name', product_name, 'flavor', flavor,
                'unit_price', unit_price, 'quantity', quantity, 'subtotal', subtotal))
              from public.order_items where order_id = v_order_id)
  );
end $$;

-- Releases stock held by LINE Pay orders that were never paid.
create function public.expire_linepay_orders() returns integer
language sql security definer set search_path = ''
as $$
  with expired as (
    update public.orders o
    set order_status = 'cancelled', cancel_reason = 'LINE Pay 逾時未付款'
    from public.store_settings s
    where s.id = 1 and o.payment_method = 'linepay' and o.payment_status = 'unpaid'
      and o.order_status = 'pending'
      and o.created_at < now() - make_interval(mins => s.linepay_timeout_minutes)
    returning 1
  )
  select count(*)::int from expired
$$;

-- ---------------------------------------------------------------- access

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.closed_dates enable row level security;
alter table public.admin_users enable row level security;

create policy "products are public" on public.products for select using (true);
create policy "admins manage products" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settings are public" on public.store_settings for select using (true);
create policy "admins update settings" on public.store_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "closed dates are public" on public.closed_dates for select using (true);
create policy "admins manage closed dates" on public.closed_dates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());
create policy "admins update orders" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admins read order items" on public.order_items for select to authenticated
  using (public.is_admin());

create policy "admins see themselves" on public.admin_users for select to authenticated
  using (user_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.products, public.store_settings, public.closed_dates to anon, authenticated;
grant update on public.products, public.store_settings, public.orders to authenticated;
grant insert, delete on public.closed_dates to authenticated;
grant update on public.closed_dates to authenticated;
grant select on public.orders, public.order_items, public.admin_users to authenticated;

revoke execute on function public.place_order(jsonb) from public, anon, authenticated;
revoke execute on function public.expire_linepay_orders() from public, anon;
grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.expire_linepay_orders() to service_role, authenticated;

-- New orders show up in the admin pages without a refresh.
alter publication supabase_realtime add table public.orders;

-- Product photos.
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
