begin;

select plan(2);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values (
  '20000000-0000-0000-0000-000000000061', 'authenticated', 'authenticated',
  'teacher-gate@test.invalid', '', now(), '{"name":"Professor Gate"}', '{}', now(), now()
);
update public.profiles set role = 'teacher', status = 'active'
where id = '20000000-0000-0000-0000-000000000061';

insert into public.classes (id, name, code, teacher_id)
values ('10000000-0000-0000-0000-000000000061', 'Turma Gate', 'GATE0061', '20000000-0000-0000-0000-000000000061');
insert into public.topics (id, class_id, teacher_id, title, origin, status)
values ('50000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061',
  '20000000-0000-0000-0000-000000000061', 'Tópico incompleto', 'teacher', 'draft');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000061","role":"authenticated","aal":"aal1"}', true);

select throws_like(
  $$ select public.publish_teacher_topic('50000000-0000-0000-0000-000000000061') $$,
  '%Conteúdo incompleto para publicação%',
  'tópico incompleto não é publicado'
);

select results_eq(
  $$ select status::text from public.topics where id = '50000000-0000-0000-0000-000000000061' $$,
  array['draft'::text],
  'gate preserva tópico como rascunho'
);

reset role;
select * from finish();
rollback;
