-- Analytics, settlements and buyer messages (S10). Applies on top of
-- 0003_promotions.sql. The running prototype keeps these in the local engine
-- (lib/store/engine); this file is the source of truth for the Supabase
-- cutover.

create type analytics_event_type as enum ('page_view', 'add_to_cart', 'begin_checkout', 'purchase');
create type device_class as enum ('mobile', 'tablet', 'desktop');
create type thread_status as enum ('open', 'waiting', 'closed');
create type message_direction as enum ('in', 'out');

-- ---------------------------------------------------------------------------
-- 1. First-party traffic. No IP is stored — ip_hash is HMAC(daily salt, ip)
--    and exists only for dedupe and rate limiting.
-- ---------------------------------------------------------------------------
create table events (
  id text not null,
  at timestamptz not null default now(),
  type analytics_event_type not null,
  session_id text not null,
  path text not null,
  product_id text,
  referrer_host text,
  device device_class not null,
  ip_hash text not null,
  order_id uuid references orders(id),
  value_paise int not null default 0,
  primary key (id, at)
) partition by range (at);

create table events_2026_09 partition of events
  for values from ('2026-09-01') to ('2026-10-01');
create table events_2026_10 partition of events
  for values from ('2026-10-01') to ('2026-11-01');
create table events_2026_11 partition of events
  for values from ('2026-11-01') to ('2026-12-01');
create table events_2026_12 partition of events
  for values from ('2026-12-01') to ('2027-01-01');

create index events_type_at_idx on events (type, at);
create index events_session_idx on events (session_id, at);

-- Nightly rollup (cron). PDP sessions count distinct session ids per product.
create table daily_product_stats (
  day date not null,
  product_id text not null,
  page_views int not null default 0,
  pdp_sessions int not null default 0,
  add_to_carts int not null default 0,
  begin_checkouts int not null default 0,
  purchases int not null default 0,
  units int not null default 0,
  sales_paise int not null default 0,
  primary key (day, product_id)
);

create or replace function rollup_daily_product_stats(p_day date) returns void
language sql
as $$
  insert into daily_product_stats (
    day, product_id, page_views, pdp_sessions, add_to_carts,
    begin_checkouts, purchases, units, sales_paise
  )
  select
    p_day,
    coalesce(product_id, ''),
    count(*) filter (where type = 'page_view'),
    count(distinct session_id) filter (where type = 'page_view' and product_id is not null),
    count(*) filter (where type = 'add_to_cart'),
    count(*) filter (where type = 'begin_checkout'),
    count(*) filter (where type = 'purchase'),
    0, 0
  from events
  where at >= p_day::timestamptz and at < (p_day + 1)::timestamptz
  group by coalesce(product_id, '')
  on conflict (day, product_id) do update set
    page_views = excluded.page_views,
    pdp_sessions = excluded.pdp_sessions,
    add_to_carts = excluded.add_to_carts,
    begin_checkouts = excluded.begin_checkouts,
    purchases = excluded.purchases;
$$;

-- ---------------------------------------------------------------------------
-- 2. Razorpay settlement reconciliation + COD collection tracking.
-- ---------------------------------------------------------------------------
create table settlements (
  id text primary key,               -- Razorpay settlement id
  utr text unique not null,
  settled_on date not null,
  gross_paise int not null,
  fee_paise int not null,
  gst_on_fee_paise int not null,
  net_paise int not null,
  status text not null default 'processed',
  created_at timestamptz not null default now()
);

create table settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id text not null references settlements(id) on delete cascade,
  payment_id text not null,
  order_id uuid references orders(id),
  amount_paise int not null,
  fee_paise int not null,
  gst_on_fee_paise int not null,
  net_paise int not null,
  unique (settlement_id, payment_id)
);

create index settlement_items_payment_idx on settlement_items (payment_id);
create index settlement_items_order_idx on settlement_items (order_id);

create table cod_collections (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  amount_paise int not null default 0,
  status text not null default 'to_collect', -- to_collect | collected
  courier_note text not null default '',
  collected_at timestamptz,
  unique (period_start, period_end)
);

create table hub_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,               -- settlement_mismatch | low_rating | sla
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Buyer messages: contact form + order-linked threads, Resend inbound.
-- ---------------------------------------------------------------------------
create table message_threads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  customer_email text not null,
  subject text not null,
  status thread_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index message_threads_status_idx on message_threads (status, last_message_at);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  direction message_direction not null,
  body text not null,
  attachments jsonb not null default '[]',
  sent_via text not null default 'form',   -- form | resend | webhook
  sent_at timestamptz not null default now()
);

create index messages_thread_idx on messages (thread_id, sent_at);

create table saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  body text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Account health targets and nightly snapshots.
-- ---------------------------------------------------------------------------
create table health_targets (
  metric text primary key,
  target_bps int not null,          -- rate targets in basis points of orders
  target_hours int,                 -- response-time target, where applicable
  updated_at timestamptz not null default now()
);

insert into health_targets (metric, target_bps, target_hours) values
  ('order_defect_rate', 100, null),          -- < 1%
  ('late_shipment_rate', 400, null),         -- < 4%
  ('pre_fulfilment_cancellation_rate', 250, null), -- < 2.5%
  ('valid_tracking_rate', 9500, null),       -- > 95%
  ('return_rate', 500, null),                -- < 5%
  ('message_response_time', 0, 24);          -- median under 24h

create table health_snapshots (
  id uuid primary key default gen_random_uuid(),
  computed_at timestamptz not null default now(),
  metrics jsonb not null
);

alter table events enable row level security;
alter table daily_product_stats enable row level security;
alter table settlements enable row level security;
alter table settlement_items enable row level security;
alter table cod_collections enable row level security;
alter table hub_notifications enable row level security;
alter table message_threads enable row level security;
alter table messages enable row level security;
alter table saved_replies enable row level security;
alter table health_targets enable row level security;
alter table health_snapshots enable row level security;

create policy events_deny on events for select using (false);
create policy stats_deny on daily_product_stats for select using (false);
create policy settlements_deny on settlements for select using (false);
create policy settlement_items_deny on settlement_items for select using (false);
create policy cod_deny on cod_collections for select using (false);
create policy notifications_deny on hub_notifications for select using (false);
create policy threads_deny on message_threads for select using (false);
create policy messages_deny on messages for select using (false);
create policy replies_deny on saved_replies for select using (false);
create policy targets_deny on health_targets for select using (false);
create policy snapshots_deny on health_snapshots for select using (false);
