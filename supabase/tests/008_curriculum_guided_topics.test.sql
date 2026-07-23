begin;

select plan(3);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values (
  '20000000-0000-0000-0000-000000000041', 'authenticated', 'authenticated',
  'teacher-topic@test.invalid', '', now(), '{"name":"Professor Tópico"}', '{}', now(), now()
);
update public.profiles set role = 'teacher', status = 'active'
where id = '20000000-0000-0000-0000-000000000041';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000041","role":"authenticated","aal":"aal1"}', true);

select public.create_class(
  'Turma Tópicos', null, '1',
  array[(select id from public.curriculum_components where name = 'Informática Básica')],
  array[
    (select id from public.curriculum_descriptors where code = 'D01'),
    (select id from public.curriculum_descriptors where code = 'D02')
  ]
);

select lives_ok(
  $$ select public.create_teacher_topic(
    (select id from public.classes where name = 'Turma Tópicos'),
    'Fundamentos de hardware',
    '1',
    array[(select id from public.curriculum_descriptors where code = 'D01')]
  ) $$,
  'professor cria tópico com descritor do blueprint'
);

select results_eq(
  $$ select count(*)::bigint
     from public.topic_curriculum_descriptors link
     join public.topics topic on topic.id = link.topic_id
     where topic.title = 'Fundamentos de hardware' $$,
  array[1::bigint],
  'descritor é persistido no tópico'
);

select throws_ok(
  $$ select public.create_teacher_topic(
    (select id from public.classes where name = 'Turma Tópicos'),
    'Descritor inválido',
    '1',
    array[(select id from public.curriculum_descriptors where code = 'D11')]
  ) $$,
  '22023',
  'Os descritores do tópico devem pertencer ao blueprint da turma',
  'descritor fora do blueprint é rejeitado'
);

reset role;
select * from finish();
rollback;
