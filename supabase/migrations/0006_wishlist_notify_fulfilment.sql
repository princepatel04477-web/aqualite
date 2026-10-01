-- R02/R05: Wishlist, stock notifications, and order shipment tracking columns.

alter table orders
  add column if not exists tracking_carrier text,
  add column if not exists tracking_number text,
  add column if not exists paid_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references products(id) on delete cascade,
  colorway_id uuid not null references product_colorways(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, colorway_id)
);

create table if not exists stock_notifications (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  email text not null,
  user_id uuid,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (variant_id, email)
);

alter table wishlist_items enable row level security;
alter table stock_notifications enable row level security;
