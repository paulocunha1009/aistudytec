begin;

select plan(6);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000071', 'authenticated', 'authenticated',
   'student-quiz@test.invalid', '', now(), '{"name":"Aluno Quiz"}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000072', 'authenticated', 'authenticated',
   'outsider-quiz@test.invalid', '', now(), '{"name":"Aluno Externo"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000071', 'authenticated', 'authenticated',
   'teacher-quiz@test.invalid', '', now(), '{"name":"Professor Quiz"}', '{}', now(), now());

update public.profiles set status = 'active';
update public.profiles set role = 'teacher'
where id = '20000000-0000-0000-0000-000000000071';

insert into public.classes (id, name, code, teacher_id)
values ('40000000-0000-0000-0000-000000000071', 'Turma Quiz', 'QUIZ0071',
  '20000000-0000-0000-0000-000000000071');
insert into public.class_memberships (class_id, student_id)
values ('40000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071');
insert into public.topics (id, class_id, teacher_id, title, origin, status, published_at)
values ('50000000-0000-0000-0000-000000000071', '40000000-0000-0000-0000-000000000071',
  '20000000-0000-0000-0000-000000000071', 'Quiz seguro', 'teacher', 'published', now());
insert into public.quiz_questions (id, topic_id, question, options, skill, order_index) values
  ('60000000-0000-0000-0000-000000000071', '50000000-0000-0000-0000-000000000071',
   'Questão um?', '["A","B"]', 'hardware', 0),
  ('60000000-0000-0000-0000-000000000072', '50000000-0000-0000-0000-000000000071',
   'Questão dois?', '["A","B"]', 'hardware', 1);
insert into public.quiz_answer_keys (question_id, correct_option) values
  ('60000000-0000-0000-0000-000000000071', 'A'),
  ('60000000-0000-0000-0000-000000000072', 'B');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000071","role":"authenticated","aal":"aal1"}', true);

select is(
  (public.submit_published_topic_quiz(
    '50000000-0000-0000-0000-000000000071',
    '[{"questionId":"60000000-0000-0000-0000-000000000071","selectedOption":"A"},
      {"questionId":"60000000-0000-0000-0000-000000000072","selectedOption":"A"}]'::jsonb
  ) ->> 'percentage')::integer,
  50,
  'corrige respostas exclusivamente no servidor'
);
select results_eq(
  $$ select score from public.quiz_attempts where student_id = '10000000-0000-0000-0000-000000000071' $$,
  array[1],
  'registra pontuação da tentativa'
);
select results_eq(
  $$ select total_count from public.skill_mastery where skill = 'hardware' $$,
  array[2],
  'acumula evidências por habilidade'
);
select results_eq(
  $$ select count(*)::bigint from public.quiz_answer_keys $$,
  array[0::bigint],
  'gabarito permanece invisível ao aluno'
);
select results_eq(
  $$ select count(*)::bigint from public.audit_events where action = 'quiz.completed' $$,
  array[0::bigint],
  'auditoria permanece invisível ao aluno'
);

select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000072","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.submit_published_topic_quiz(
    '50000000-0000-0000-0000-000000000071',
    '[{"questionId":"60000000-0000-0000-0000-000000000071","selectedOption":"A"},
      {"questionId":"60000000-0000-0000-0000-000000000072","selectedOption":"B"}]'::jsonb
  ) $$,
  '42501',
  'Aluno não pertence à turma deste tópico',
  'aluno externo não pode enviar o quiz'
);

reset role;
select * from finish();
rollback;
