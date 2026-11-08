create or replace function public.confirm_external_payment(_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _order public.orders;
  _payment public.payments;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;

  select orders.* into _order
  from public.orders as orders
  where orders.id = _order_id
  for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if _order.cancelled_at is not null then
    raise exception 'This order was cancelled and cannot be confirmed';
  end if;

  select payments.* into _payment
  from public.payments as payments
  where payments.order_id = _order_id
  for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if _payment.status = 'verified' and _order.status = 'confirmed' then
    return;
  end if;
  if _payment.status <> 'unverified' then
    raise exception 'Payment is not awaiting confirmation';
  end if;
  if _payment.submitted_at is not null
    or nullif(trim(coalesce(_payment.transaction_ref, '')), '') is not null then
    raise exception 'Payment details were submitted; review the submitted reference instead';
  end if;
  if _order.status not in ('pending', 'confirmed') then
    raise exception 'This order cannot be confirmed';
  end if;

  update public.payments
  set status = 'verified',
      reviewed_at = now(),
      review_note = case
        when _order.status = 'confirmed'
          then 'Payment status reconciled by owner; order was already confirmed'
        else 'Payment confirmed by owner outside the app; no reference was submitted'
      end
  where id = _payment.id;

  update public.orders
  set status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, now())
  where id = _order_id
    and cancelled_at is null;
end;
$$;

revoke all on function public.confirm_external_payment(uuid) from public, anon;
grant execute on function public.confirm_external_payment(uuid) to authenticated;
