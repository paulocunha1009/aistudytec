begin;

select plan(8);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('20000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'teacher-owner@test.invalid', '', now(), '{"name":"Professor Proprietário"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'teacher-other@test.invalid', '', now(), '{"name":"Outro Professor"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'student-class@test.invalid', '', now(), '{"name":"Estudante"}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'master-class@test.invalid', '', now(), '{"name":"Master"}', '{}', now(), now());

update public.profiles set status = 'active';
update public.profiles set role = 'teacher' where id in (
  '20000000-0000-0000-0000-000000000011',
  '20000000-0000-0000-0000-000000000012'
);
update public.profiles set role = 'master' where id = '30000000-0000-0000-0000-000000000011';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal1"}', true);
select lives_ok(
  $$ select public.create_class('Turma PostgreSQL', 'Tecnologia', '2') $$,
  'professor ativo cria turma pelo contrato'
);
select results_eq(
  $$ select teacher_id from public.classes where name = 'Turma PostgreSQL' $$,
  array['20000000-0000-0000-0000-000000000011'::uuid],
  'proprietário é derivado da sessão'
);
select results_eq(
  $$ select count(*)::bigint from public.classes where code ~ '^[A-F0-9]{8}$' $$,
  array[1::bigint],
  'código seguro é gerado no banco'
);
select results_eq(
  $$ select count(*)::bigint from public.audit_events where action = 'class.created' $$,
  array[1::bigint],
  'criação gera auditoria'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000012","role":"authenticated","aal":"aal1"}', true);
select results_eq(
  $$ select count(*)::bigint from public.classes $$,
  array[0::bigint],
  'outro professor não lê turma alheia'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.create_class('Turma indevida', null, 'any') $$,
  '42501',
  'Apenas professor ativo ou master com MFA pode criar turma',
  'estudante não cria turma'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.create_class('Turma master aal1', null, 'any') $$,
  '42501',
  'Apenas professor ativo ou master com MFA pode criar turma',
  'master aal1 não cria turma'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$ select public.create_class('Turma master aal2', null, 'any') $$,
  'master aal2 cria turma administrativa'
);
reset role;

select * from finish();
rollback;
