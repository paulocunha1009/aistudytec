begin;

create or replace function public.hook_restrict_signup_to_grants(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(
    btrim(
      coalesce(
        event -> 'user' ->> 'email',
        event -> 'user' -> 'user_metadata' ->> 'email',
        event -> 'user' -> 'raw_user_meta_data' ->> 'email'
      )
    )
  );
begin
  if normalized_email is not null
     and normalized_email <> ''
     and exists (
       select 1
         from public.access_grants
        where lower(email) = normalized_email
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

alter function public.hook_restrict_signup_to_grants(jsonb) owner to postgres;
grant execute on function public.hook_restrict_signup_to_grants(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_to_grants(jsonb)
  from public, anon, authenticated;

comment on function public.hook_restrict_signup_to_grants(jsonb) is
  'Before User Created Hook: valida autorização por e-mail em contexto protegido, sem depender das políticas RLS da sessão interna do Auth.';

commit;
