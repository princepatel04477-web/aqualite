-- Seller Hub settings, membership, MFA posture and immutable audit trail.
create table if not exists public.seller_settings (
  id boolean primary key default true check (id),
  business jsonb not null default '{}'::jsonb,
  shipping jsonb not null default '{}'::jsonb,
  tax jsonb not null default '[]'::jsonb,
  returns jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  security jsonb not null default '{"hub_idle_hours":12}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.seller_settings(id) values (true) on conflict (id) do nothing;

create table if not exists public.seller_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','manager','finance','packer','viewer')),
  mfa_enrolled_at timestamptz,
  disabled_at timestamptz,
  last_active_at timestamptz,
  invited_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_email text not null default '',
  action text not null,
  entity text not null,
  entity_id text not null,
  before_diff jsonb not null default '{}'::jsonb,
  after_diff jsonb not null default '{}'::jsonb,
  ip_hash text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log(entity, entity_id);

create or replace function public.seller_is_member(required_roles text[] default array['owner','manager','finance','packer','viewer']) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.seller_members m where m.user_id = auth.uid() and m.disabled_at is null and m.role = any(required_roles));
$$;

create or replace function public.audit_settings_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log(actor_id, action, entity, entity_id, before_diff, after_diff)
  values (auth.uid(), 'settings.updated', 'seller_settings', 'global', to_jsonb(old), to_jsonb(new));
  return new;
end; $$;
drop trigger if exists seller_settings_audit on public.seller_settings;
create trigger seller_settings_audit after update on public.seller_settings for each row execute function public.audit_settings_change();

alter table public.seller_settings enable row level security;
alter table public.seller_members enable row level security;
alter table public.audit_log enable row level security;
create policy seller_settings_read on public.seller_settings for select using (seller_is_member());
create policy seller_settings_write on public.seller_settings for update using (seller_is_member(array['owner','manager','finance'])) with check (seller_is_member(array['owner','manager','finance']));
create policy seller_members_read on public.seller_members for select using (seller_is_member());
create policy seller_members_owner_write on public.seller_members for all using (seller_is_member(array['owner'])) with check (seller_is_member(array['owner']));
create policy audit_read on public.audit_log for select using (seller_is_member());
-- Audit rows are written by triggers/server actions only; clients cannot forge them.
revoke insert, update, delete on public.audit_log from authenticated;

comment on table public.seller_settings is 'Single source of truth for storefront, checkout, invoices and Seller Hub.';
comment on table public.audit_log is 'Readable before/after settings and operational change history.';
