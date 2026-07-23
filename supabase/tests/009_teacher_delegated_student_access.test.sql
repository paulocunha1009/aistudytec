begin;

select plan(4);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
('20000000-0000-0000-0000-000000000051', 'authenticated', 'authenticated', 'teacher-delegate@test.invalid', '', now(), '{"name":"Professor Delegado"}', '{}', now(), now()),
('20000000-0000-0000-0000-000000000052', 'authenticated', 'authenticated', 'other-teacher@test.invalid', '', now(), '{"name":"Outro Professor"}', '{}', now(), now());
update public.profiles set role = 'teacher', status = 'active'
where id in ('20000000-0000-0000-0000-000000000051', '20000000-0000-0000-0000-000000000052');

insert into public.classes (id, name, code, teacher_id)
values ('10000000-0000-0000-0000-000000000051', 'Turma Delegada', 'DELEG051', '20000000-0000-0000-0000-000000000051');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000051","role":"authenticated","aal":"aal1"}', true);

select lives_ok(
  $$ select public.authorize_or_enroll_class_student(
    '10000000-0000-0000-0000-000000000051',
    'novo-aluno@test.invalid',
    now() + interval '7 days'
  ) $$,
  'professor autoriza aluno para turma própria'
);

select results_eq(
  $$ select role::text from public.access_grants where email = 'novo-aluno@test.invalid' $$,
  array['student'::text],
  'autorização docente nasce obrigatoriamente como aluno'
);

select results_eq(
  $$ select class_id from public.access_grants where email = 'novo-aluno@test.invalid' $$,
  array['10000000-0000-0000-0000-000000000051'::uuid],
  'autorização fica vinculada à turma'
);

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000052","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.authorize_or_enroll_class_student(
    '10000000-0000-0000-0000-000000000051',
    'invasao@test.invalid',
    now() + interval '7 days'
  ) $$,
  '42501',
  'Você não pode administrar esta turma',
  'outro professor não autoriza aluno em turma alheia'
);

reset role;
select * from finish();
rollback;
