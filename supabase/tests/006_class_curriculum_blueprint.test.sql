begin;

select plan(5);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values (
  '20000000-0000-0000-0000-000000000031',
  'authenticated',
  'authenticated',
  'teacher-blueprint@test.invalid',
  '',
  now(),
  '{"name":"Professor Blueprint"}',
  '{}',
  now(),
  now()
);
update public.profiles
set role = 'teacher', status = 'active'
where id = '20000000-0000-0000-0000-000000000031';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000031","role":"authenticated","aal":"aal1"}', true);

select lives_ok(
  $$ select public.create_class(
       'Banco de Dados Aplicado',
       'Persistência',
       '2',
       array[(select id from public.curriculum_components where name = 'Banco de Dados')],
       array[
         (select id from public.curriculum_descriptors where code = 'D20'),
         (select id from public.curriculum_descriptors where code = 'D22')
       ]
     ) $$,
  'professor cria turma com blueprint curricular'
);

select results_eq(
  $$ select count(*)::bigint
       from public.class_curriculum_components link
       join public.classes class on class.id = link.class_id
      where class.name = 'Banco de Dados Aplicado' $$,
  array[1::bigint],
  'componente foi vinculado à turma'
);

select results_eq(
  $$ select count(*)::bigint
       from public.class_curriculum_descriptors link
       join public.classes class on class.id = link.class_id
      where class.name = 'Banco de Dados Aplicado' $$,
  array[2::bigint],
  'descritores selecionados foram vinculados'
);

select results_eq(
  $$ select array_agg(distinct competency.code order by competency.code)
       from public.class_curriculum_descriptors link
       join public.classes class on class.id = link.class_id
       join public.curriculum_descriptors descriptor on descriptor.id = link.descriptor_id
       join public.curriculum_competencies competency on competency.id = descriptor.competency_id
      where class.name = 'Banco de Dados Aplicado' $$,
  array['C05'::text],
  'competência é derivada dos descritores selecionados'
);

select throws_ok(
  $$ select public.create_class(
       'Blueprint Inválido',
       null,
       'any',
       array[(select id from public.curriculum_components where name = 'Banco de Dados')],
       array[(select id from public.curriculum_descriptors where code = 'D11')]
     ) $$,
  '22023',
  'Descritores devem pertencer aos componentes selecionados e não podem se repetir',
  'banco rejeita descritor de outro componente'
);

reset role;
select * from finish();
rollback;
