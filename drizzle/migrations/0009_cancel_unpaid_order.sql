create or replace function public.cancel_unpaid_order(_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _order public.orders;
  _payment public.payments;
begin
  if auth.uid() is null then
    raise exception 'Sign in to cancel this order';
  end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _order_id
    and orders.user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if _order.cancelled_at is not null then
    raise exception 'This order is already cancelled';
  end if;
  if _order.status = 'confirmed' then
    raise exception 'A confirmed order cannot be cancelled here';
  end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.order_id = _order_id
    and payments.user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if _payment.submitted_at is not null or _payment.status = 'verified' then
    raise exception 'This order cannot be cancelled directly after payment proof is submitted';
  end if;

  update public.orders
  set cancelled_at = now()
  where id = _order_id
    and user_id = auth.uid()
    and cancelled_at is null;
end;
$$;

revoke all on function public.cancel_unpaid_order(uuid) from public, anon;
grant execute on function public.cancel_unpaid_order(uuid) to authenticated;
