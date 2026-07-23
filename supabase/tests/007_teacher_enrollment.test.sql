begin;

select plan(9);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('20000000-0000-0000-0000-000000000041', 'authenticated', 'authenticated', 'teacher-enroll@test.invalid', '', now(), '{"name":"Professor Matrícula"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000042', 'authenticated', 'authenticated', 'teacher-outsider@test.invalid', '', now(), '{"name":"Professor Externo"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000041', 'authenticated', 'authenticated', 'student-enroll@test.invalid', '', now(), '{"name":"Aluno Matrícula"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000042', 'authenticated', 'authenticated', 'student-disabled@test.invalid', '', now(), '{"name":"Aluno Desativado"}', '{}', now(), now());

update public.profiles set status = 'active';
update public.profiles set role = 'teacher' where id in (
  '20000000-0000-0000-0000-000000000041',
  '20000000-0000-0000-0000-000000000042'
);
update public.profiles set status = 'disabled' where id = '10000000-0000-0000-0000-000000000042';

insert into public.classes (id, name, code, teacher_id)
values (
  '40000000-0000-0000-0000-000000000041',
  'Turma Matrícula',
  'ENROLL41',
  '20000000-0000-0000-0000-000000000041'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000041","role":"authenticated","aal":"aal1"}', true);
select lives_ok(
  $$ select public.enroll_student_by_email(
       '40000000-0000-0000-0000-000000000041',
       'STUDENT-ENROLL@test.invalid'
     ) $$,
  'proprietário matricula aluno ativo por e-mail normalizado'
);
select results_eq(
  $$ select count(*)::bigint from public.class_memberships
      where class_id = '40000000-0000-0000-0000-000000000041' and left_at is null $$,
  array[1::bigint],
  'matrícula ativa foi criada'
);
select results_eq(
  $$ select count(*)::bigint from public.audit_events where action = 'class.student_enrolled' $$,
  array[1::bigint],
  'matrícula gera auditoria'
);
select throws_ok(
  $$ select public.enroll_student_by_email(
       '40000000-0000-0000-0000-000000000041',
       'student-disabled@test.invalid'
     ) $$,
  'P0002',
  'Aluno elegível não encontrado',
  'perfil desativado não é matriculado'
);
select lives_ok(
  $$ select public.remove_student_from_class(
       '40000000-0000-0000-0000-000000000041',
       '10000000-0000-0000-0000-000000000041'
     ) $$,
  'proprietário encerra matrícula'
);
select results_eq(
  $$ select count(*)::bigint from public.class_memberships
      where class_id = '40000000-0000-0000-0000-000000000041' and left_at is null $$,
  array[0::bigint],
  'remoção preserva registro e encerra vínculo'
);
select lives_ok(
  $$ select public.enroll_student_by_email(
       '40000000-0000-0000-0000-000000000041',
       'student-enroll@test.invalid'
     ) $$,
  'rematrícula reativa o vínculo existente'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000042","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.enroll_student_by_email(
       '40000000-0000-0000-0000-000000000041',
       'student-enroll@test.invalid'
     ) $$,
  '42501',
  'Você não pode administrar esta turma',
  'outro professor não administra a turma'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000041","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.enroll_student_by_email(
       '40000000-0000-0000-0000-000000000041',
       'student-enroll@test.invalid'
     ) $$,
  '42501',
  'Você não pode administrar esta turma',
  'aluno não administra matrícula'
);
reset role;

select * from finish();
rollback;
