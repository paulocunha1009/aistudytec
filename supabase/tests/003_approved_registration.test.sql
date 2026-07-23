begin;

select plan(12);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values (
  '30000000-0000-0000-0000-000000000009',
  'authenticated',
  'authenticated',
  'master-registration@test.invalid',
  '',
  now(),
  '{"name":"Master Cadastro"}',
  '{}',
  now(),
  now()
);

update public.profiles
set role = 'master', status = 'active'
where id = '30000000-0000-0000-0000-000000000009';

select is(
  public.hook_restrict_signup_to_grants(
    '{"user":{"email":"unauthorized@test.invalid"}}'::jsonb
  ) #>> '{error,code}',
  'access_not_authorized',
  'hook rejeita cadastro sem autorização prévia'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000009","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$ insert into public.access_grants (email, role, granted_by)
     values (
       'student-approved@test.invalid',
       'student',
       '30000000-0000-0000-0000-000000000009'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "access_grants"',
  'master aal1 não autoriza cadastro'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000009","role":"authenticated","aal":"aal2"}',
  true
);
insert into public.access_grants (email, role, granted_by)
values (
  'student-approved@test.invalid',
  'student',
  '30000000-0000-0000-0000-000000000009'
);
reset role;

select results_eq(
  $$ select count(*)::bigint from public.access_grants
     where email = 'student-approved@test.invalid' and status = 'pending' $$,
  array[1::bigint],
  'master aal2 cria autorização pendente'
);

select is(
  public.hook_restrict_signup_to_grants(
    '{"user":{"email":"STUDENT-APPROVED@test.invalid"}}'::jsonb
  ),
  '{}'::jsonb,
  'hook aceita e-mail previamente autorizado sem diferenciar maiúsculas'
);

select is(
  public.hook_restrict_signup_to_grants(
    '{"user":{"user_metadata":{"email":"STUDENT-APPROVED@test.invalid"}}}'::jsonb
  ),
  '{}'::jsonb,
  'hook aceita e-mail fornecido nos metadados do provedor OAuth'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000010',
  'authenticated',
  'authenticated',
  'student-approved@test.invalid',
  '',
  now(),
  '{"full_name":"Estudante Autorizado"}',
  '{"provider":"google"}',
  now(),
  now()
);

select results_eq(
  $$ select role::text from public.profiles
     where id = '10000000-0000-0000-0000-000000000010' $$,
  array['student'::text],
  'cadastro autorizado recebe o papel previamente definido'
);
select results_eq(
  $$ select status::text from public.profiles
     where id = '10000000-0000-0000-0000-000000000010' $$,
  array['active'::text],
  'cadastro autorizado nasce ativo'
);
select results_eq(
  $$ select status::text from public.access_grants
     where email = 'student-approved@test.invalid' $$,
  array['consumed'::text],
  'autorização é consumida uma única vez'
);
select results_eq(
  $$ select consumed_by from public.access_grants
     where email = 'student-approved@test.invalid' $$,
  array['10000000-0000-0000-0000-000000000010'::uuid],
  'autorização registra a identidade consumidora'
);
select results_eq(
  $$ select count(*)::bigint from public.audit_events
     where action = 'identity.access_grant.created' $$,
  array[1::bigint],
  'criação da autorização é auditada'
);
select results_eq(
  $$ select count(*)::bigint from public.audit_events
     where action = 'identity.access_grant.consumed' $$,
  array[1::bigint],
  'consumo da autorização é auditado'
);

select throws_ok(
  $$ insert into public.access_grants (email, role, granted_by)
     values (
       'other-master@test.invalid',
       'master',
       '30000000-0000-0000-0000-000000000009'
     ) $$,
  '23514',
  'new row for relation "access_grants" violates check constraint "access_grants_role_not_master"',
  'papel master nunca é concedido por autorização comum'
);

select * from finish();
rollback;
