begin;

select plan(25);

-- Personas isoladas e determinísticas. A transação é revertida ao final.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'student1@test.invalid', '', now(), '{"name":"Estudante Um"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'student2@test.invalid', '', now(), '{"name":"Estudante Dois"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'teacher1@test.invalid', '', now(), '{"name":"Professor Um"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'teacher2@test.invalid', '', now(), '{"name":"Professor Dois"}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'master@test.invalid', '', now(), '{"name":"Master"}', '{}', now(), now());

update public.profiles set status = 'active';
update public.profiles set role = 'teacher' where id in (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);
update public.profiles set role = 'master' where id = '30000000-0000-0000-0000-000000000001';

insert into public.classes (id, name, code, teacher_id)
values ('40000000-0000-0000-0000-000000000001', 'Turma RLS', 'RLS001', '20000000-0000-0000-0000-000000000001');

insert into public.class_memberships (class_id, student_id)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

insert into public.topics (id, class_id, teacher_id, title, origin, status, published_at) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Tema publicado', 'teacher', 'published', now()),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Tema rascunho', 'teacher', 'draft', null);

insert into public.quiz_questions (id, topic_id, question, options, skill)
values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Questão protegida?', '["A","B"]', 'segurança');
insert into public.quiz_answer_keys (question_id, correct_option)
values ('60000000-0000-0000-0000-000000000001', 'A');

insert into public.generation_jobs (id, requested_by, operation, idempotency_key, request_hash, request_payload)
values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'topic', 'rls-job', 'hash', '{}');

insert into public.audit_events (id, actor_id, actor_role, action, resource_type, outcome)
values ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'teacher', 'test', 'topic', 'success');

-- Anônimo não recebe sequer privilégio SQL nas tabelas da aplicação.
set local role anon;
select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  'permission denied for table profiles',
  'anônimo não lê perfis'
);
reset role;

-- Estudante matriculado: somente o próprio domínio e conteúdo publicado da turma.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select results_eq($$ select count(*)::bigint from public.profiles $$, array[1::bigint], 'estudante lê somente o próprio perfil');
select results_eq($$ select count(*)::bigint from public.classes $$, array[1::bigint], 'estudante lê a turma em que está ativo');
select results_eq($$ select count(*)::bigint from public.topics where status = 'published' $$, array[1::bigint], 'estudante lê tema publicado da turma');
select results_eq($$ select count(*)::bigint from public.topics where status = 'draft' $$, array[0::bigint], 'estudante não lê rascunho docente');
select results_eq($$ select count(*)::bigint from public.quiz_answer_keys $$, array[0::bigint], 'estudante não lê gabarito');
select results_eq($$ select count(*)::bigint from public.audit_events $$, array[0::bigint], 'estudante não lê auditoria');
select results_eq($$ select count(*)::bigint from public.generation_jobs $$, array[0::bigint], 'estudante não lê job de outro usuário');
reset role;

-- Professor proprietário: acessa sua turma e curadoria, mas nunca auditoria master.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select results_eq($$ select count(*)::bigint from public.classes $$, array[1::bigint], 'professor proprietário lê sua turma');
select results_eq($$ select count(*)::bigint from public.profiles where role = 'student' $$, array[1::bigint], 'professor proprietário lê somente estudante matriculado');
select results_eq($$ select count(*)::bigint from public.topics $$, array[2::bigint], 'professor proprietário lê publicado e rascunho próprios');
select results_eq($$ select count(*)::bigint from public.quiz_answer_keys $$, array[1::bigint], 'professor proprietário lê gabarito para curadoria');
select results_eq($$ select count(*)::bigint from public.audit_events $$, array[0::bigint], 'professor não lê auditoria');
reset role;

-- Outro professor: não herda acesso à turma ou aos dados do proprietário.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select results_eq($$ select count(*)::bigint from public.classes $$, array[0::bigint], 'outro professor não lê turma alheia');
select results_eq($$ select count(*)::bigint from public.profiles where role = 'student' $$, array[0::bigint], 'outro professor não lê estudantes alheios');
select results_eq($$ select count(*)::bigint from public.topics $$, array[0::bigint], 'outro professor não lê temas alheios');
select results_eq($$ select count(*)::bigint from public.quiz_answer_keys $$, array[0::bigint], 'outro professor não lê gabarito alheio');
reset role;

-- Master em aal1 conserva apenas o acesso de autoatendimento.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select results_eq($$ select count(*)::bigint from public.profiles $$, array[1::bigint], 'master aal1 lê somente o próprio perfil');
select results_eq($$ select count(*)::bigint from public.classes $$, array[0::bigint], 'master aal1 não lê turmas administrativamente');
select results_eq($$ select count(*)::bigint from public.quiz_answer_keys $$, array[0::bigint], 'master aal1 não lê gabaritos administrativamente');
select results_eq($$ select count(*)::bigint from public.audit_events $$, array[0::bigint], 'master aal1 não lê auditoria');
reset role;

-- O mesmo master, após MFA aal2, recebe as políticas administrativas.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select results_eq($$ select count(*)::bigint from public.profiles $$, array[5::bigint], 'master aal2 lê todos os perfis');
select results_eq($$ select count(*)::bigint from public.classes $$, array[1::bigint], 'master aal2 lê todas as turmas');
select results_eq($$ select count(*)::bigint from public.quiz_answer_keys $$, array[1::bigint], 'master aal2 lê gabaritos');
select results_eq($$ select count(*)::bigint from public.audit_events $$, array[1::bigint], 'master aal2 lê auditoria');
reset role;

select * from finish();
rollback;
