-- Aqualite production schema (apply with Supabase). Rates must be confirmed
-- by Aqualite's CA before go-live; change rows, not application code.
-- The running prototype uses the local engine in lib/store until these
-- keys are real. Keep this file as the source of truth for that cutover.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type gender as enum ('men', 'women', 'kids', 'unisex');
create type order_status as enum (
  'pending_payment', 'paid', 'cod_confirmed', 'packed', 'shipped', 'delivered',
  'cancelled', 'payment_failed', 'return_requested', 'returned', 'refunded'
);
create type payment_method as enum ('razorpay', 'cod');
create type payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');
create type user_role as enum ('customer', 'admin');

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  gender gender,
  parent_id uuid references categories(id),
  sort int not null default 0,
  is_active boolean not null default true,
  description text not null default ''
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  category_id uuid not null references categories(id),
  gender gender not null,
  material_upper text not null default '',
  material_sole text not null default '',
  features text[] not null default '{}',
  care text not null default '',
  is_active boolean not null default true,
  is_new boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz
);

create table product_colorways (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  slug text not null,
  swatch_token text not null,
  color_family text not null,
  sort int not null default 0,
  unique (product_id, slug)
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  colorway_id uuid not null references product_colorways(id) on delete cascade,
  sku text unique not null,
  size_uk numeric(3,1) not null,
  size_eu int not null,
  size_us numeric(3,1) not null,
  foot_length_mm int not null,
  mrp_paise int not null check (mrp_paise > 0),
  price_paise int not null check (price_paise > 0 and price_paise <= mrp_paise),
  stock_on_hand int not null check (stock_on_hand >= 0),
  stock_reserved int not null default 0 check (stock_reserved >= 0),
  is_active boolean not null default true,
  unique (colorway_id, size_uk),
  check (stock_reserved <= stock_on_hand)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  user_id uuid,
  email text not null,
  phone text not null,
  status order_status not null,
  payment_method payment_method not null,
  shipping_address jsonb not null,
  subtotal_paise int not null,
  shipping_paise int not null,
  cod_fee_paise int not null default 0,
  tax_paise int not null,
  total_paise int not null,
  idempotency_key text unique not null,
  access_token text not null,
  razorpay_order_id text unique,
  reservation_expires_at timestamptz,
  needs_attention boolean not null default false,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table products enable row level security;
alter table product_colorways enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;

create policy catalog_read on products for select using (is_active);
create policy orders_deny on orders for select using (false);
