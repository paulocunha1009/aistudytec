begin;

-- A versão remota de 20260723000100 foi registrada antes de estas funções
-- entrarem no arquivo local. Migrações publicadas são imutáveis, portanto
-- restauramos os objetos ausentes em uma nova versão.
create or replace function public.hook_restrict_signup_to_grants(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(event -> 'user' ->> 'email'));
begin
  if normalized_email is not null and exists (
    select 1
      from public.access_grants
     where email = normalized_email
       and status = 'pending'
       and expires_at > now()
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'code', 'access_not_authorized',
      'message', 'Seu acesso ainda não foi autorizado pelo administrador.'
    )
  );
end;
$$;

create or replace function public.apply_access_grant_to_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_grant public.access_grants%rowtype;
begin
  select *
    into approved_grant
    from public.access_grants
   where email = lower(btrim(new.email))
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then
    return new;
  end if;

  update public.profiles
     set role = approved_grant.role,
         status = 'active'
   where id = new.id;

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

drop trigger if exists profiles_apply_access_grant on public.profiles;
create trigger profiles_apply_access_grant
after insert on public.profiles
for each row execute function public.apply_access_grant_to_new_profile();

grant usage on schema public to supabase_auth_admin;
grant select on public.access_grants to supabase_auth_admin;
grant execute on function public.hook_restrict_signup_to_grants(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_to_grants(jsonb)
  from public, anon, authenticated;

comment on function public.hook_restrict_signup_to_grants(jsonb) is
  'Before User Created Hook: rejeita cadastro OAuth sem autorização pendente e válida.';

commit;
