begin;

create type public.access_grant_status as enum ('pending', 'consumed', 'revoked', 'expired');

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  role public.app_role not null constraint access_grants_role_not_master
    check (role in ('student', 'teacher')),
  status public.access_grant_status not null default 'pending',
  granted_by uuid not null references public.profiles(id),
  consumed_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check (
    (status = 'pending' and consumed_at is null and revoked_at is null)
    or (status = 'consumed' and consumed_at is not null and consumed_by is not null and revoked_at is null)
    or (status = 'revoked' and consumed_at is null and revoked_at is not null)
    or (status = 'expired' and consumed_at is null and revoked_at is null)
  )
);

create unique index access_grants_pending_email_unique
on public.access_grants (lower(email))
where status = 'pending';

create index access_grants_status_expiry_idx
on public.access_grants (status, expires_at);

create or replace function public.audit_access_grant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_action text;
begin
  if tg_op = 'INSERT' then
    audit_action := 'identity.access_grant.created';
  elsif new.status = 'revoked' and old.status is distinct from new.status then
    audit_action := 'identity.access_grant.revoked';
  else
    return new;
  end if;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    (select auth.uid()),
    'master',
    audit_action,
    'access_grant',
    new.id,
    'success',
    jsonb_build_object('role', new.role, 'expiresAt', new.expires_at)
  );

  return new;
end;
$$;

create trigger access_grants_audit_change
after insert or update on public.access_grants
for each row execute function public.audit_access_grant_change();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(new.email));
  approved_grant public.access_grants%rowtype;
begin
  if normalized_email is null or normalized_email = '' then
    raise exception using
      errcode = 'P0001',
      message = 'access_not_authorized';
  end if;

  update public.access_grants
     set status = 'expired'
   where email = normalized_email
     and status = 'pending'
     and expires_at <= now();

  select *
    into approved_grant
    from public.access_grants
   where email = normalized_email
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'access_not_authorized';
  end if;

  insert into public.profiles (id, role, status, name, email)
  values (
    new.id,
    approved_grant.role,
    'active',
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(normalized_email, '@', 1)
    ),
    normalized_email
  );

  update public.access_grants
     set status = 'consumed',
         consumed_by = new.id,
         consumed_at = now()
   where id = approved_grant.id;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    approved_grant.granted_by,
    'master',
    'identity.access_grant.consumed',
    'profile',
    new.id,
    'success',
    jsonb_build_object('role', approved_grant.role, 'grantId', approved_grant.id)
  );

  return new;
end;
$$;

alter table public.access_grants enable row level security;

create policy access_grants_master_all
on public.access_grants
for all
to authenticated
using ((select public.is_master_aal2()))
with check ((select public.is_master_aal2()));

revoke all on public.access_grants from anon, authenticated;
grant select, insert, update, delete on public.access_grants to authenticated;

comment on table public.access_grants is
  'Autorizações de cadastro criadas exclusivamente por master em aal2; e-mail normalizado, papel sem master, validade e consumo único.';

commit;
