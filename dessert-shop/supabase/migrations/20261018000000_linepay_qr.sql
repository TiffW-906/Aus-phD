-- LINE Pay via the shop's own payment QR code (no merchant API keys):
-- the customer scans the code and the seller marks the order as paid by hand.

alter table public.store_settings add column linepay_qr_url text;

-- Only orders that went through the LINE Pay API (they have a transaction id) expire
-- automatically; QR-code orders wait for the seller to confirm the payment.
create or replace function public.expire_linepay_orders() returns integer
language sql security definer set search_path = ''
as $$
  with expired as (
    update public.orders o
    set order_status = 'cancelled', cancel_reason = 'LINE Pay 逾時未付款'
    from public.store_settings s
    where s.id = 1 and o.payment_method = 'linepay' and o.payment_status = 'unpaid'
      and o.order_status = 'pending' and o.linepay_transaction_id is not null
      and o.created_at < now() - make_interval(mins => s.linepay_timeout_minutes)
    returning 1
  )
  select count(*)::int from expired
$$;
