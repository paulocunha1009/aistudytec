begin;

select plan(14);

select has_table('public', 'profiles', 'profiles existe');
select has_table('public', 'classes', 'classes existe');
select has_table('public', 'class_memberships', 'associação aluno-turma existe');
select has_table('public', 'topics', 'topics existe');
select has_table('public', 'quiz_questions', 'questões existe');
select has_table('public', 'quiz_answer_keys', 'gabarito privado existe');
select has_table('public', 'skill_mastery', 'domínio por habilidade existe');
select has_table('public', 'review_queue', 'fila de revisão existe');
select has_table('public', 'generation_jobs', 'jobs persistentes existem');
select has_table('public', 'audit_events', 'auditoria existe');
select col_is_pk('public', 'profiles', 'id', 'perfil usa auth user como identidade');
select fk_ok('public', 'profiles', 'id', 'auth', 'users', 'id', 'perfil referencia auth.users');
select policies_are(
  'public',
  'quiz_answer_keys',
  array['answer_keys_curator_only'],
  'gabarito possui somente policy de curadoria'
);
select is_empty(
  $$ select id from public.profiles where role = 'master' $$,
  'migration e seed não criam master'
);

select * from finish();
rollback;
