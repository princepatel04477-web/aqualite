-- Aqualite hero showcase (H01). Apply after 0001_catalog_orders.sql.
-- The running prototype keeps the same rows in the local engine
-- (lib/store/engine.ts, seeded from content/hero.ts); this file is the
-- source of truth for the Supabase cutover.

create table hero_slides (
  id uuid primary key default gen_random_uuid(),
  sort int not null default 0,
  is_active boolean not null default true,
  product_id uuid not null references products(id),
  colorway_id uuid not null references product_colorways(id),
  eyebrow text not null,
  headline_before text not null default '',
  headline_italic text not null,
  headline_after text not null default '',
  lead text not null check (char_length(lead) between 20 and 220),
  glow_hex text not null check (glow_hex ~ '^#[0-9A-Fa-f]{6}$'),
  image_desktop_path text not null,
  image_mobile_path text not null,
  image_alt text not null check (char_length(image_alt) between 8 and 200),
  focal_x numeric(4, 3) not null default 0.5 check (focal_x >= 0 and focal_x <= 1),
  focal_y numeric(4, 3) not null default 0.45 check (focal_y >= 0 and focal_y <= 1),
  shoe_mask_path text,
  cta_primary_label text not null,
  cta_primary_href text not null check (cta_primary_href like '/%'),
  cta_secondary_label text not null,
  cta_secondary_href text not null check (cta_secondary_href like '/%'),
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create index hero_slides_active_sort on hero_slides (is_active, sort);

alter table hero_slides enable row level security;

-- Admin role for RLS. Sessions come from Supabase Auth (auth.uid()).
create table if not exists user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'customer'
);

create or replace function is_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles r
    where r.user_id = auth.uid() and r.role = 'admin'
  );
$$;

create policy hero_slides_public_read on hero_slides
  for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy hero_slides_admin_write on hero_slides
  for all
  using (is_admin())
  with check (is_admin());

-- At most six active slides, enforced next to the data.
create or replace function enforce_hero_slide_limit() returns trigger
language plpgsql
as $$
begin
  if new.is_active and (
    select count(*) from hero_slides
    where is_active and id <> new.id
  ) >= 6 then
    raise exception 'At most six hero slides can be active.';
  end if;
  return new;
end;
$$;

create trigger hero_slides_active_limit
  before insert or update on hero_slides
  for each row execute function enforce_hero_slide_limit();
