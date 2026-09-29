-- Relational cutover schema. Current Workers production uses the D1 store_state
-- engine; its matching mutations and effective-price clock live in lib/store.
alter table products add column if not exists hsn text not null default '';
alter table products add column if not exists keywords text[] not null default '{}';
alter table products add column if not exists seo_title text not null default '';
alter table products add column if not exists seo_description text not null default '';
alter table products add column if not exists search_vector tsvector generated always as (
  setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(keywords,' ')), 'B') ||
  setweight(to_tsvector('simple', coalesce(description,'')), 'C')
) stored;
create index if not exists products_search_vector_idx on products using gin(search_vector);
alter table products add column if not exists quality_score int not null default 0 check (quality_score between 0 and 100);
alter table product_variants add column if not exists sale_price_paise int;
alter table product_variants add column if not exists sale_starts_at timestamptz;
alter table product_variants add column if not exists sale_ends_at timestamptz;
alter table product_variants add column if not exists cost_paise int check (cost_paise >= 0);
alter table product_variants add column if not exists updated_at timestamptz not null default now();
alter table product_variants add constraint sale_offer_valid check (
  (sale_price_paise is null and sale_starts_at is null and sale_ends_at is null)
  or (sale_price_paise > 0 and sale_price_paise <= price_paise and sale_starts_at is not null and sale_ends_at is not null and sale_starts_at < sale_ends_at)
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  colorway_id uuid not null references product_colorways(id) on delete cascade,
  src text not null, alt text not null default '',
  role text not null check (role in ('primary','secondary','detail','sole','on_foot')),
  width int not null check (width > 0), height int not null check (height > 0),
  sort int not null default 0
);
create index if not exists product_images_color on product_images(colorway_id, sort);
create unique index if not exists product_images_primary on product_images(colorway_id) where role = 'primary';

create table if not exists size_chart_presets (
  gender gender not null, size_uk numeric(3,1) not null,
  primary key (gender, size_uk)
);
insert into size_chart_presets(gender,size_uk) values
  ('men',6),('men',7),('men',8),('men',9),('men',10),('men',11),
  ('women',3),('women',4),('women',5),('women',6),('women',7),('women',8),
  ('kids',10),('kids',11),('kids',12),('kids',13),('kids',1),('kids',2),('kids',3),('kids',4),('kids',5),
  ('unisex',6),('unisex',7),('unisex',8),('unisex',9),('unisex',10),('unisex',11)
on conflict do nothing;

create table if not exists seller_product_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  is_active boolean not null default false check (not is_active),
  updated_at timestamptz not null default now()
);
create index if not exists seller_product_drafts_owner on seller_product_drafts(owner_id, updated_at desc);
create table if not exists inventory_planning_settings (
  id boolean primary key default true check(id),
  lead_time_days int not null default 10 check(lead_time_days between 1 and 180),
  target_cover_days int not null default 30 check(target_cover_days between 1 and 365)
);
insert into inventory_planning_settings(id) values(true) on conflict do nothing;
create table if not exists inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id),
  delta int not null, reason text not null,
  actor text not null, order_id uuid references orders(id), note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists inventory_ledger_variant_time on inventory_ledger(variant_id,created_at desc);
create table if not exists price_change_log (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id),
  actor text not null,
  before_offer jsonb not null, after_offer jsonb not null,
  changed_at timestamptz not null default now()
);
create index if not exists price_change_log_recent on price_change_log(changed_at desc);

create table if not exists hub_revalidation_queue (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  product_slug text not null,
  boundary_at timestamptz not null,
  processed_at timestamptz,
  unique(variant_id,boundary_at)
);
create index if not exists hub_revalidation_due on hub_revalidation_queue(boundary_at) where processed_at is null;

create or replace function hub_effective_price(v product_variants, at_time timestamptz default now()) returns int
language sql stable as $$
  select case when v.sale_price_paise is not null
    and at_time >= v.sale_starts_at and at_time < v.sale_ends_at
    then v.sale_price_paise else v.price_paise end;
$$;

create or replace function hub_log_offer() returns trigger language plpgsql as $$
declare product_slug text;
begin
  if (old.price_paise,old.mrp_paise,old.sale_price_paise,old.sale_starts_at,old.sale_ends_at,old.cost_paise)
    is distinct from
    (new.price_paise,new.mrp_paise,new.sale_price_paise,new.sale_starts_at,new.sale_ends_at,new.cost_paise) then
    new.updated_at := now();
    insert into price_change_log(variant_id,actor,before_offer,after_offer)
      values(old.id,coalesce(auth.uid()::text,'system'),
        jsonb_build_object('price',old.price_paise,'mrp',old.mrp_paise,'sale',old.sale_price_paise,'starts',old.sale_starts_at,'ends',old.sale_ends_at,'cost',old.cost_paise),
        jsonb_build_object('price',new.price_paise,'mrp',new.mrp_paise,'sale',new.sale_price_paise,'starts',new.sale_starts_at,'ends',new.sale_ends_at,'cost',new.cost_paise));
    select p.slug into product_slug from product_colorways c join products p on p.id=c.product_id where c.id=new.colorway_id;
    insert into hub_revalidation_queue(variant_id,product_slug,boundary_at)
    select new.id,product_slug,t from (values(new.sale_starts_at),(new.sale_ends_at)) as boundaries(t)
    where t is not null on conflict do nothing;
    insert into hub_revalidation_queue(variant_id,product_slug,boundary_at)
      values(new.id,product_slug,now()) on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger product_variant_offer_audit before update of price_paise,mrp_paise,sale_price_paise,sale_starts_at,sale_ends_at,cost_paise
  on product_variants for each row execute function hub_log_offer();

create or replace function hub_listing_score(pid uuid) returns int
language sql stable as $$
  select case when not exists (select 1 from product_colorways c where c.product_id=pid)
    then 0 else
  (case when not exists (
      select 1 from product_colorways c where c.product_id=pid
        and (select count(*) from product_images i where i.colorway_id=c.id) < 4
    ) then 30 else 0 end) +
  (case when exists (select 1 from product_images i join product_colorways c on c.id=i.colorway_id where c.product_id=pid)
     and not exists (select 1 from product_images i join product_colorways c on c.id=i.colorway_id where c.product_id=pid and btrim(i.alt)='') then 10 else 0 end) +
  (case when (select char_length(btrim(description)) >= 300 from products where id=pid) then 15 else 0 end) +
  (case when (select coalesce(array_length(features,1),0) >= 3 from products where id=pid) then 10 else 0 end) +
  (case when (select coalesce(array_length(keywords,1),0) > 0 from products where id=pid) then 10 else 0 end) +
  (case when not exists (
    select 1 from product_colorways c join products p on p.id=c.product_id
    join size_chart_presets s on s.gender=p.gender
    where p.id=pid and not exists (select 1 from product_variants v where v.colorway_id=c.id and v.size_uk=s.size_uk)
  ) then 15 else 0 end) +
  (case when not exists (
    select 1 from product_colorways c where c.product_id=pid and
      (not exists (select 1 from product_variants v where v.colorway_id=c.id) or
       exists (select 1 from product_variants v where v.colorway_id=c.id and (v.price_paise<=0 or v.price_paise>v.mrp_paise)))
  ) then 10 else 0 end)
  end;
$$;

create or replace function hub_refresh_quality() returns trigger language plpgsql as $$
declare pid uuid; cid uuid;
begin
  if tg_table_name='products' then pid:=coalesce(new.id,old.id);
  elsif tg_table_name='product_colorways' then
    if tg_op='DELETE' then pid:=old.product_id; else pid:=new.product_id; end if;
  else
    if tg_op='DELETE' then cid:=old.colorway_id; else cid:=new.colorway_id; end if;
    select product_id into pid from product_colorways where id=cid;
  end if;
  if pid is not null then update products set quality_score=hub_listing_score(pid) where id=pid; end if;
  return null;
end; $$;
create trigger quality_on_product after insert or update of description,features,keywords,gender on products for each row execute function hub_refresh_quality();
create trigger quality_on_colorway after insert or update or delete on product_colorways for each row execute function hub_refresh_quality();
create trigger quality_on_variant after insert or update or delete on product_variants for each row execute function hub_refresh_quality();
create trigger quality_on_image after insert or update or delete on product_images for each row execute function hub_refresh_quality();
update products set quality_score=hub_listing_score(id);

alter table product_images enable row level security;
alter table seller_product_drafts enable row level security;
alter table inventory_planning_settings enable row level security;
alter table inventory_ledger enable row level security;
alter table price_change_log enable row level security;
alter table hub_revalidation_queue enable row level security;
create policy seller_products_all on products for all using(is_admin()) with check(is_admin());
create policy seller_colors_all on product_colorways for all using(is_admin()) with check(is_admin());
create policy seller_variants_all on product_variants for all using(is_admin()) with check(is_admin());
create policy seller_images_all on product_images for all using(is_admin()) with check(is_admin());
create policy public_images_read on product_images for select using(exists(
  select 1 from product_colorways c join products p on p.id=c.product_id where c.id=colorway_id and p.is_active
));
create policy seller_drafts_owner on seller_product_drafts for all using(is_admin() and owner_id=auth.uid()) with check(is_admin() and owner_id=auth.uid());
create policy seller_planning_all on inventory_planning_settings for all using(is_admin()) with check(is_admin());
create policy seller_ledger_read on inventory_ledger for select using(is_admin());
create policy seller_price_log_read on price_change_log for select using(is_admin());
-- No client policy on the revalidation queue. It is processed by a service role.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('catalog','catalog',true,12582912,array['image/webp'])
  on conflict(id) do nothing;

-- Queue sale boundary invalidations at minute granularity. Exact prices still
-- use hub_effective_price()/effectivePrice() on every request and order.
create extension if not exists pg_cron with schema extensions;
select cron.schedule('hub-sale-boundaries', '* * * * *', $job$
  insert into public.hub_revalidation_queue(variant_id,product_slug,boundary_at)
  select v.id,p.slug,t.boundary_at
  from public.product_variants v
  join public.product_colorways c on c.id=v.colorway_id
  join public.products p on p.id=c.product_id
  cross join lateral (values(v.sale_starts_at),(v.sale_ends_at)) t(boundary_at)
  where t.boundary_at > now()-interval '2 minutes' and t.boundary_at <= now()
  on conflict do nothing;
$job$);
