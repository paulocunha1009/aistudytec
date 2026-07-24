begin;

select plan(5);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000081', 'authenticated', 'authenticated',
   'student-dashboard@test.invalid', '', now(), '{"name":"Aluno Painel"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000081', 'authenticated', 'authenticated',
   'teacher-dashboard@test.invalid', '', now(), '{"name":"Professor Painel"}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000082', 'authenticated', 'authenticated',
   'other-dashboard@test.invalid', '', now(), '{"name":"Outro Professor"}', '{}', now(), now());

update public.profiles set status = 'active';
update public.profiles set role = 'teacher'
where id in (
  '20000000-0000-0000-0000-000000000081',
  '20000000-0000-0000-0000-000000000082'
);

insert into public.classes (id, name, code, teacher_id)
values ('40000000-0000-0000-0000-000000000081', 'Turma Painel', 'PANE0081',
  '20000000-0000-0000-0000-000000000081');
insert into public.class_memberships (class_id, student_id)
values ('40000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081');
insert into public.topics (id, class_id, teacher_id, title, origin, status, published_at)
values ('50000000-0000-0000-0000-000000000081', '40000000-0000-0000-0000-000000000081',
  '20000000-0000-0000-0000-000000000081', 'Tema Painel', 'teacher', 'published', now());
insert into public.quiz_questions (id, topic_id, question, options, skill)
values ('60000000-0000-0000-0000-000000000081', '50000000-0000-0000-0000-000000000081',
  'Questão do painel?', '["A","B"]', 'hardware');
insert into public.quiz_question_descriptors (question_id, descriptor_id)
select '60000000-0000-0000-0000-000000000081', id
from public.curriculum_descriptors order by code limit 1;
insert into public.quiz_attempts (
  id, student_id, topic_id, class_id, score, total, percentage, completed_at
) values (
  '70000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081',
  '50000000-0000-0000-0000-000000000081', '40000000-0000-0000-0000-000000000081',
  1, 1, 100, now()
);
insert into public.quiz_attempt_answers (attempt_id, question_id, skill, selected_option, is_correct)
values ('70000000-0000-0000-0000-000000000081', '60000000-0000-0000-0000-000000000081',
  'hardware', 'A', true);
insert into public.skill_mastery (
  student_id, skill, topic_id, correct_count, total_count, mastery_pct, last_practiced_at
) values (
  '10000000-0000-0000-0000-000000000081', 'hardware',
  '50000000-0000-0000-0000-000000000081', 1, 1, 100, now()
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000081","role":"authenticated","aal":"aal1"}', true);

select is(
  (public.get_class_learning_dashboard('40000000-0000-0000-0000-000000000081')
    -> 'summary' ->> 'students')::integer,
  1,
  'professor proprietário recebe a quantidade de estudantes'
);
select is(
  (public.get_class_learning_dashboard('40000000-0000-0000-0000-000000000081')
    -> 'summary' ->> 'withoutAttempts')::integer,
  0,
  'painel reconhece tentativa concluída'
);
select is(
  (public.get_class_learning_dashboard('40000000-0000-0000-0000-000000000081')
    -> 'students' -> 0 ->> 'attempts')::integer,
  1,
  'aluno recebe somente evidência da turma'
);
select is(
  (public.get_class_learning_dashboard('40000000-0000-0000-0000-000000000081')
    -> 'descriptors' -> 0 ->> 'totalAnswers')::integer,
  1,
  'descritor agrega respostas reais'
);

select set_config('request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000082","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$ select public.get_class_learning_dashboard('40000000-0000-0000-0000-000000000081') $$,
  '42501',
  'Você não pode consultar esta turma',
  'outro professor não acessa o painel'
);

reset role;
select * from finish();
rollback;
