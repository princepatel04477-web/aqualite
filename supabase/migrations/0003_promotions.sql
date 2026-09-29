-- Promotions & coupons (S09). Applies on top of 0001_catalog_orders.sql.
-- The running prototype evaluates these rules in lib/pricing/promotions.ts;
-- this file is the source of truth for the Supabase cutover, including a
-- quote_cart() implementation with the same semantics (pro-rata per-line
-- allocation, remainder to the largest line, GST on the discounted price).

create type promotion_kind as enum ('coupon', 'automatic');
create type discount_type as enum ('percent', 'flat', 'free_shipping');
create type promotion_scope as enum ('all', 'categories', 'products', 'collections');

create table promotions (
  id uuid primary key default gen_random_uuid(),
  kind promotion_kind not null,
  -- Upper-case, unique, required for coupons; always null for automatic promos.
  code text unique check (code is null or (code = upper(code) and length(code) between 3 and 24)),
  name text not null check (length(name) between 1 and 80),
  discount_type discount_type not null,
  -- percent → basis points (10% = 1000, 0 < v <= 10000); flat → paise (> 0);
  -- free_shipping → 0 (shipping saved is the discount).
  value int not null default 0 check (value >= 0),
  min_subtotal_paise int not null default 0 check (min_subtotal_paise >= 0),
  max_discount_paise int check (max_discount_paise is null or max_discount_paise > 0),
  applies_to promotion_scope not null default 'all',
  target_ids text[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz,
  usage_limit_total int check (usage_limit_total is null or usage_limit_total > 0),
  usage_limit_per_customer int check (usage_limit_per_customer is null or usage_limit_per_customer > 0),
  first_order_only boolean not null default false,
  stackable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (
    (kind = 'coupon' and code is not null) or
    (kind = 'automatic' and code is null)
  ),
  check (
    (discount_type = 'percent' and value > 0 and value <= 10000) or
    (discount_type = 'flat' and value > 0) or
    (discount_type = 'free_shipping' and value = 0)
  ),
  check (applies_to = 'all' or cardinality(target_ids) > 0)
);

create index promotions_active_window_idx on promotions (starts_at, ends_at) where is_active;
create index promotions_kind_idx on promotions (kind);

-- One redemption per promotion per order. released_at marks a cancellation or
-- refund that freed the usage slot again. customer_key is the user id, or
-- lower(email) for guests.
create table promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  customer_key text not null,
  discount_paise int not null check (discount_paise >= 0),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (promotion_id, order_id)
);

create index promotion_redemptions_usage_idx on promotion_redemptions (promotion_id) where released_at is null;
create index promotion_redemptions_customer_idx on promotion_redemptions (promotion_id, customer_key) where released_at is null;

-- Order-level promotion snapshot (amounts are re-validated server-side; the
-- client total is never trusted).
alter table orders
  add column discount_paise int not null default 0 check (discount_paise >= 0),
  add column promotion_id uuid references promotions(id),
  add column promotion_code text,
  add column promotion_name text,
  add column promotion_kind promotion_kind;

-- Per-line snapshot: gross line total, discount allocation, tax on the
-- discounted price. (The prototype stores order items inside the order row;
-- this table is the cutover home for the same snapshot.)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id text not null,
  sku text not null,
  product_name text not null,
  colorway_name text not null,
  size_uk numeric(3,1) not null,
  qty int not null check (qty > 0),
  unit_price_paise int not null check (unit_price_paise >= 0),
  line_total_paise int not null check (line_total_paise >= 0),
  discount_paise int not null default 0 check (discount_paise >= 0),
  tax_rate_bps int not null,
  tax_paise int not null check (tax_paise >= 0)
);

create index order_items_order_idx on order_items (order_id);

alter table promotions enable row level security;
alter table promotion_redemptions enable row level security;
alter table order_items enable row level security;

create policy promotions_public_read on promotions for select using (true);
create policy promotion_redemptions_deny on promotion_redemptions for select using (false);
create policy order_items_deny on order_items for select using (false);

-- ---------------------------------------------------------------------------
-- quote_cart(p_items, p_code, p_email, p_user) — server-side cart quote.
-- p_items: jsonb array of
--   { "line_id": str, "product_id": str, "category": slug, "collection_slugs": [slug],
--     "qty": int, "unit_price_paise": int }
-- Returns
--   { "lines": [{ line_id, line_total_paise, discount_paise, discounted_unit_price_paise,
--                 tax_rate_bps, tax_paise, is_short? }],
--     "subtotal_paise", "discount_total_paise", "shipping_paise", "tax_paise", "total_paise",
--     "promo": { promotion_id, kind, code, name, discount_paise, free_shipping } | null,
--     "auto_promo": { … } | null,
--     "rejection": { "code": EXPIRED|NOT_STARTED|MIN_NOT_MET|USAGE_EXHAUSTED|NOT_ELIGIBLE|ALREADY_USED } | null }
-- Shipping rules are read from the caller's settings by the application; this
-- function returns product-level numbers plus a free_shipping flag. Automatic
-- selection picks the highest-discount eligible automatic promotion; a coupon
-- and an automatic promotion combine only when both are stackable, otherwise
-- the larger discount wins (coupon wins ties).
-- ---------------------------------------------------------------------------
create or replace function quote_cart(
  p_items jsonb,
  p_code text default null,
  p_email text default null,
  p_user uuid default null
) returns jsonb
language plpgsql
stable
as $$
declare
  v_now timestamptz := now();
  v_customer text := coalesce(p_user::text, lower(coalesce(p_email, '')));
  v_subtotal int := 0;
  v_line record;
  v_promo promotions%rowtype;
  v_best promotions%rowtype;
  v_coupon promotions%rowtype;
  v_coupon_found boolean := false;
  v_coupon_rejection text := null;
  v_auto_rejection text := null;
  v_best_discount int := 0;
  v_discount int := 0;
  v_coupon_discount int := 0;
  v_auto_discount int := 0;
  v_eligible int;
  v_usage int;
  v_customer_usage int;
  v_customer_orders int;
  v_target_hit boolean;
  v_lines jsonb := '[]'::jsonb;
  v_alloc jsonb;
  v_total_discount int := 0;
  v_auto_free boolean := false;
  v_coupon_free boolean := false;
  v_rejection text := null;
begin
  for v_line in
    select
      elem->>'line_id' as line_id,
      elem->>'product_id' as product_id,
      elem->>'category' as category,
      coalesce(elem->'collection_slugs', '[]'::jsonb) as collection_slugs,
      (elem->>'qty')::int as qty,
      (elem->>'unit_price_paise')::int as unit_price_paise
    from jsonb_array_elements(p_items) as elem
  loop
    v_subtotal := v_subtotal + v_line.qty * v_line.unit_price_paise;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'line_id', v_line.line_id,
      'product_id', v_line.product_id,
      'category', v_line.category,
      'collection_slugs', v_line.collection_slugs,
      'qty', v_line.qty,
      'unit_price_paise', v_line.unit_price_paise,
      'line_total_paise', v_line.qty * v_line.unit_price_paise,
      'discount_paise', 0
    ));
  end loop;

  -- First-order check is shared by every candidate.
  select count(*) into v_customer_orders
  from orders
  where (p_user is not null and user_id = p_user)
     or (p_user is null and p_email is not null and lower(email) = lower(p_email))
    and status not in ('cancelled', 'payment_failed');

  -- Best eligible automatic promotion.
  if v_subtotal > 0 then
    for v_promo in
      select * from promotions
      where kind = 'automatic' and is_active
        and starts_at <= v_now
        and (ends_at is null or ends_at > v_now)
    loop
      v_target_hit := v_promo.applies_to = 'all';
      if v_promo.applies_to = 'products' then
        select bool_or(elem->>'product_id' = any (v_promo.target_ids))
          into v_target_hit from jsonb_array_elements(p_items) as elem;
      elsif v_promo.applies_to = 'categories' then
        select bool_or(elem->>'category' = any (v_promo.target_ids))
          into v_target_hit from jsonb_array_elements(p_items) as elem;
      elsif v_promo.applies_to = 'collections' then
        select bool_or((select bool_or(t.value = any (v_promo.target_ids))
                        from jsonb_array_elements_text(elem->'collection_slugs') as t))
          into v_target_hit from jsonb_array_elements(p_items) as elem;
      end if;
      if not coalesce(v_target_hit, false) then continue; end if;
      if v_subtotal < v_promo.min_subtotal_paise then continue; end if;

      select coalesce(sum(
        case
          when v_promo.applies_to = 'all'
            or (v_promo.applies_to = 'products' and elem->>'product_id' = any (v_promo.target_ids))
            or (v_promo.applies_to = 'categories' and elem->>'category' = any (v_promo.target_ids))
            or (v_promo.applies_to = 'collections' and
                (select bool_or(t.value = any (v_promo.target_ids))
                 from jsonb_array_elements_text(elem->'collection_slugs') as t))
          then (elem->>'qty')::int * (elem->>'unit_price_paise')::int
          else 0 end), 0)
        into v_eligible from jsonb_array_elements(p_items) as elem;
      if v_eligible <= 0 then continue; end if;

      if v_promo.usage_limit_total is not null then
        select count(*) into v_usage from promotion_redemptions
          where promotion_id = v_promo.id and released_at is null;
        if v_usage >= v_promo.usage_limit_total then continue; end if;
      end if;
      if v_promo.usage_limit_per_customer is not null then
        select count(*) into v_customer_usage from promotion_redemptions
          where promotion_id = v_promo.id and released_at is null
            and customer_key = v_customer;
        if v_customer_usage >= v_promo.usage_limit_per_customer then continue; end if;
      end if;
      if v_promo.first_order_only and v_customer_orders > 0 then continue; end if;

      v_discount := case v_promo.discount_type
        when 'percent' then (v_eligible * v_promo.value + 5000) / 10000
        when 'flat' then least(v_promo.value, v_eligible)
        else 0
      end;
      if v_promo.max_discount_paise is not null then
        v_discount := least(v_discount, v_promo.max_discount_paise);
      end if;
      if v_promo.discount_type = 'free_shipping' then
        v_discount := 0; -- shipping savings are applied by the caller
      end if;
      if v_discount > v_best_discount or (v_discount = v_best_discount and v_promo.discount_type = 'free_shipping') then
        v_best := v_promo;
        v_best_discount := v_discount;
      end if;
    end loop;
  end if;

  -- Coupon evaluation (at most one).
  if p_code is not null then
    select * into v_coupon from promotions
      where kind = 'coupon' and code = upper(trim(p_code));
    if not found then
      v_coupon_rejection := 'NOT_ELIGIBLE';
    else
      v_coupon_found := true;
      if v_coupon.ends_at is not null and v_coupon.ends_at <= v_now then
        v_coupon_rejection := 'EXPIRED';
      elsif v_coupon.starts_at > v_now then
        v_coupon_rejection := 'NOT_STARTED';
      elsif not v_coupon.is_active then
        v_coupon_rejection := 'NOT_ELIGIBLE';
      elsif v_subtotal < v_coupon.min_subtotal_paise then
        v_coupon_rejection := 'MIN_NOT_MET';
      else
        v_target_hit := v_coupon.applies_to = 'all';
        if v_coupon.applies_to = 'products' then
          select bool_or(elem->>'product_id' = any (v_coupon.target_ids))
            into v_target_hit from jsonb_array_elements(p_items) as elem;
        elsif v_coupon.applies_to = 'categories' then
          select bool_or(elem->>'category' = any (v_coupon.target_ids))
            into v_target_hit from jsonb_array_elements(p_items) as elem;
        elsif v_coupon.applies_to = 'collections' then
          select bool_or((select bool_or(t.value = any (v_coupon.target_ids))
                          from jsonb_array_elements_text(elem->'collection_slugs') as t))
            into v_target_hit from jsonb_array_elements(p_items) as elem;
        end if;
        if not coalesce(v_target_hit, false) then
          v_coupon_rejection := 'NOT_ELIGIBLE';
        else
          select coalesce(sum(
            case
              when v_coupon.applies_to = 'all'
                or (v_coupon.applies_to = 'products' and elem->>'product_id' = any (v_coupon.target_ids))
                or (v_coupon.applies_to = 'categories' and elem->>'category' = any (v_coupon.target_ids))
                or (v_coupon.applies_to = 'collections' and
                    (select bool_or(t.value = any (v_coupon.target_ids))
                     from jsonb_array_elements_text(elem->'collection_slugs') as t))
              then (elem->>'qty')::int * (elem->>'unit_price_paise')::int
              else 0 end), 0)
            into v_eligible from jsonb_array_elements(p_items) as elem;
          if v_eligible <= 0 then
            v_coupon_rejection := 'NOT_ELIGIBLE';
          else
            if v_coupon.usage_limit_total is not null then
              select count(*) into v_usage from promotion_redemptions
                where promotion_id = v_coupon.id and released_at is null;
              if v_usage >= v_coupon.usage_limit_total then
                v_coupon_rejection := 'USAGE_EXHAUSTED';
              end if;
            end if;
            if v_coupon_rejection is null and v_coupon.usage_limit_per_customer is not null then
              select count(*) into v_customer_usage from promotion_redemptions
                where promotion_id = v_coupon.id and released_at is null
                  and customer_key = v_customer;
              if v_customer_usage >= v_coupon.usage_limit_per_customer then
                v_coupon_rejection := 'ALREADY_USED';
              end if;
            end if;
            if v_coupon_rejection is null and v_coupon.first_order_only and v_customer_orders > 0 then
              v_coupon_rejection := 'ALREADY_USED';
            end if;
            if v_coupon_rejection is null then
              v_coupon_discount := case v_coupon.discount_type
                when 'percent' then (v_eligible * v_coupon.value + 5000) / 10000
                when 'flat' then least(v_coupon.value, v_eligible)
                else 0
              end;
              if v_coupon.max_discount_paise is not null then
                v_coupon_discount := least(v_coupon_discount, v_coupon.max_discount_paise);
              end if;
            end if;
          end if;
        end if;
      end if;
    end if;
  end if;

  -- Stacking: both only when both are stackable; otherwise the larger wins
  -- (coupon wins ties).
  if v_coupon_found and v_coupon_rejection is null and v_best.id is not null then
    if not (v_coupon.stackable and v_best.stackable) then
      if v_coupon_discount >= v_best_discount then
        v_best := null;
        v_best_discount := 0;
      else
        v_coupon_discount := 0;
        v_coupon_rejection := 'NOT_ELIGIBLE'; -- displaced by a better automatic promo
      end if;
    end if;
  end if;

  v_coupon_free := v_coupon_found and v_coupon_rejection is null and v_coupon.discount_type = 'free_shipping';
  v_auto_free := v_best.id is not null and v_best.discount_type = 'free_shipping';
  v_rejection := v_coupon_rejection;

  -- Pro-rata allocation over eligible lines, remainder to the largest line.
  v_alloc := quote_cart_allocate(
    case when v_coupon_found and v_coupon_rejection is null then v_coupon else null end,
    case when v_best.id is not null then v_best else null end,
    p_items,
    v_lines
  );

  select coalesce(sum((elem->>'discount_paise')::int), 0) into v_total_discount
    from jsonb_array_elements(v_alloc) as elem;

  return jsonb_build_object(
    'lines', v_alloc,
    'subtotal_paise', v_subtotal,
    'discount_total_paise', v_total_discount,
    'free_shipping', v_coupon_free or v_auto_free,
    'promo', case when v_coupon_found and v_coupon_rejection is null and not v_coupon_free then
      jsonb_build_object('promotion_id', v_coupon.id, 'kind', 'coupon', 'code', v_coupon.code,
        'name', v_coupon.name, 'discount_paise', v_coupon_discount, 'free_shipping', false)
      when v_coupon_free then
      jsonb_build_object('promotion_id', v_coupon.id, 'kind', 'coupon', 'code', v_coupon.code,
        'name', v_coupon.name, 'discount_paise', 0, 'free_shipping', true)
      else null end,
    'auto_promo', case when v_best.id is not null and not v_auto_free then
      jsonb_build_object('promotion_id', v_best.id, 'kind', 'automatic', 'code', null,
        'name', v_best.name, 'discount_paise', v_best_discount, 'free_shipping', false)
      when v_auto_free then
      jsonb_build_object('promotion_id', v_best.id, 'kind', 'automatic', 'code', null,
        'name', v_best.name, 'discount_paise', 0, 'free_shipping', true)
      else null end,
    'rejection', case when v_rejection is not null
      then jsonb_build_object('code', v_rejection) else null end
  );
end;
$$;

-- Allocation helper: each promotion's discount is spread pro-rata over its
-- eligible lines by line total; the rounding remainder goes to the largest
-- line (first largest on ties). Promotions apply coupon-first, then the
-- automatic promotion on the remaining line amounts.
create or replace function quote_cart_allocate(
  p_coupon promotions,
  p_auto promotions,
  p_items jsonb,
  p_lines jsonb
) returns jsonb
language plpgsql
immutable
as $$
declare
  v_lines jsonb := p_lines;
  v_stage record;
  v_amount int;
  v_eligible_idx int[];
  v_eligible_total int := 0;
  v_i int;
  v_line jsonb;
  v_share int;
  v_allocated int := 0;
  v_largest_idx int := -1;
  v_largest_total int := -1;
  v_line_total int;
begin
  for v_stage in
    select * from (values
      (case when p_coupon is not null then p_coupon else null end),
      (case when p_auto is not null then p_auto else null end)
    ) as s(p)
    where s.p is not null
  loop
    v_eligible_idx := array[]::int[];
    v_eligible_total := 0;
    for v_i in 0 .. jsonb_array_length(v_lines) - 1 loop
      v_line := v_lines -> v_i;
      if v_stage.p.applies_to = 'all'
        or (v_stage.p.applies_to = 'products' and (v_line->>'product_id') = any (v_stage.p.target_ids))
        or (v_stage.p.applies_to = 'categories' and (v_line->>'category') = any (v_stage.p.target_ids))
        or (v_stage.p.applies_to = 'collections' and
            (select bool_or(t.value = any (v_stage.p.target_ids))
             from jsonb_array_elements_text(v_line->'collection_slugs') as t)) then
        v_line_total := (v_line->>'line_total_paise')::int - (v_line->>'discount_paise')::int;
        if v_line_total > 0 then
          v_eligible_idx := v_eligible_idx || v_i;
          v_eligible_total := v_eligible_total + v_line_total;
          if v_line_total > v_largest_total then
            v_largest_total := v_line_total;
            v_largest_idx := v_i;
          end if;
        end if;
      end if;
    end loop;
    if v_eligible_total <= 0 then continue; end if;

    v_amount := case v_stage.p.discount_type
      when 'percent' then (v_eligible_total * v_stage.p.value + 5000) / 10000
      when 'flat' then least(v_stage.p.value, v_eligible_total)
      else 0
    end;
    if v_stage.p.max_discount_paise is not null then
      v_amount := least(v_amount, v_stage.p.max_discount_paise);
    end if;
    if v_amount <= 0 then continue; end if;

    v_allocated := 0;
    foreach v_i in array v_eligible_idx loop
      v_line := v_lines -> v_i;
      v_line_total := (v_line->>'line_total_paise')::int - (v_line->>'discount_paise')::int;
      v_share := (v_amount * v_line_total) / v_eligible_total;
      v_lines := jsonb_set(v_lines, array[v_i::text, 'discount_paise'],
        to_jsonb((v_line->>'discount_paise')::int + v_share));
      v_allocated := v_allocated + v_share;
    end loop;
    if v_largest_idx >= 0 and v_allocated < v_amount then
      v_line := v_lines -> v_largest_idx;
      v_lines := jsonb_set(v_lines, array[v_largest_idx::text, 'discount_paise'],
        to_jsonb((v_line->>'discount_paise')::int + (v_amount - v_allocated)));
    end if;
    v_largest_total := -1;
    v_largest_idx := -1;
  end loop;

  -- Recompute tax on the discounted line price (slab on post-discount unit).
  for v_i in 0 .. jsonb_array_length(v_lines) - 1 loop
    v_line := v_lines -> v_i;
    v_line_total := (v_line->>'line_total_paise')::int - (v_line->>'discount_paise')::int;
    v_lines := jsonb_set(v_lines, array[v_i::text, 'discounted_unit_price_paise'],
      to_jsonb(case when (v_line->>'qty')::int > 0
        then v_line_total / (v_line->>'qty')::int else 0 end));
    v_lines := jsonb_set(v_lines, array[v_i::text, 'tax_rate_bps'],
      to_jsonb(case when v_line_total / greatest((v_line->>'qty')::int, 1) <= 250000 then 500 else 1800 end));
    v_lines := jsonb_set(v_lines, array[v_i::text, 'tax_paise'],
      to_jsonb((v_line_total * case when v_line_total / greatest((v_line->>'qty')::int, 1) <= 250000
        then 500 else 1800 end) / 10500));
  end loop;

  return v_lines;
end;
$$;
