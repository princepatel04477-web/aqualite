-- Seller Hub reporting schema for the relational Supabase cutover.
-- The deployed Workers store currently reads the D1 JSON engine; the TS
-- metrics adapter reads that same live state until order_items is migrated.
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  quantity int not null check (quantity > 0),
  unit_price_paise int not null check (unit_price_paise >= 0),
  line_total_paise int not null check (line_total_paise >= 0)
);
create index if not exists hub_order_items_order on order_items(order_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider_payment_id text unique,
  amount_paise int not null check (amount_paise >= 0),
  status payment_status not null,
  captured_at timestamptz
);
create index if not exists hub_payments_order on payments(order_id);

create table if not exists seller_widget_layouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now()
);
alter table order_items enable row level security;
alter table payments enable row level security;
alter table seller_widget_layouts enable row level security;
create policy seller_widget_layout_owner on seller_widget_layouts for all
  using (is_admin() and user_id = auth.uid())
  with check (is_admin() and user_id = auth.uid());
create policy seller_order_items_admin on order_items for select using (is_admin());
create policy seller_payments_admin on payments for select using (is_admin());

-- An immutable wall-clock day identifier. All windows are half-open [from, to)
-- in the seller's local calendar, never a UTC midnight grouping.
create or replace function hub_ist_day(moment timestamptz) returns date
language sql immutable parallel safe set search_path = public
as $$ select (moment at time zone 'Asia/Kolkata')::date $$;

create or replace function hub_sales_window(from_day date, to_day date)
returns table (revenue_paise bigint, units bigint, orders_count bigint, aov_paise bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorised' using errcode = '42501'; end if;
  return query
  with eligible as (
    select o.id
    from orders o
    where o.status in ('paid', 'cod_confirmed', 'packed', 'shipped', 'delivered', 'return_requested', 'returned')
      and coalesce(
        (select min(p.captured_at) from payments p where p.order_id = o.id and p.status = 'captured'),
        o.created_at
      ) >= (from_day::timestamp at time zone 'Asia/Kolkata')
      and coalesce(
        (select min(p.captured_at) from payments p where p.order_id = o.id and p.status = 'captured'),
        o.created_at
      ) < (to_day::timestamp at time zone 'Asia/Kolkata')
  ), aggregate_rows as (
    select coalesce(sum(i.line_total_paise), 0)::bigint as revenue,
           coalesce(sum(i.quantity), 0)::bigint as qty
    from eligible e join order_items i on i.order_id = e.id
  )
  select a.revenue, a.qty, (select count(*) from eligible)::bigint,
         case when (select count(*) from eligible) = 0 then 0::bigint
              else round(a.revenue::numeric / (select count(*) from eligible))::bigint end
  from aggregate_rows a;
end;
$$;

create or replace function hub_open_orders()
returns table (pending_payment bigint, unshipped bigint, cod_to_confirm bigint, needs_attention bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not is_admin() then raise exception 'Not authorised' using errcode = '42501'; end if;
  return query select
    count(*) filter (where o.status = 'pending_payment'),
    count(*) filter (where o.status in ('paid', 'cod_confirmed', 'packed')),
    count(*) filter (where o.status = 'cod_confirmed'),
    count(*) filter (where o.needs_attention)
  from orders o;
end;
$$;

revoke all on function hub_sales_window(date, date) from public;
revoke all on function hub_open_orders() from public;
grant execute on function hub_sales_window(date, date) to authenticated;
grant execute on function hub_open_orders() to authenticated;
