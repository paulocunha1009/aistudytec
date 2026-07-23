begin;

select plan(9);

select results_eq(
  $$ select count(*)::bigint from public.curriculum_catalogs where code = 'SIDEP-CE-TI-2026' $$,
  array[1::bigint],
  'catálogo foi importado uma única vez'
);
select results_eq(
  $$ select count(*)::bigint from public.curriculum_competencies where catalog_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[10::bigint],
  'dez competências importadas'
);
select results_eq(
  $$ select count(*)::bigint from public.curriculum_components where catalog_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[22::bigint],
  'vinte e dois componentes importados'
);
select results_eq(
  $$ select count(*)::bigint from public.curriculum_descriptors where catalog_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[40::bigint],
  'quarenta descritores importados'
);
select results_eq(
  $$ select count(*)::bigint from public.curriculum_component_descriptors $$,
  array[40::bigint],
  'todos os vínculos componente-descritor importados'
);
select results_eq(
  $$ select source_kind from public.curriculum_catalogs where code = 'SIDEP-CE-TI-2026' $$,
  array['internal_curated'::text],
  'fonte não é apresentada como oficial sem documento comprobatório'
);

set local role anon;
select throws_ok(
  $$ select * from public.curriculum_descriptors $$,
  '42501',
  'permission denied for table curriculum_descriptors',
  'catálogo não é público para anônimo'
);
reset role;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, created_at, updated_at
) values (
  '10000000-0000-0000-0000-000000000021',
  'authenticated',
  'authenticated',
  'curriculum-reader@test.invalid',
  '',
  now(),
  '{"name":"Leitor Curricular"}',
  '{}',
  now(),
  now()
);
update public.profiles set status = 'active' where id = '10000000-0000-0000-0000-000000000021';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000021","role":"authenticated","aal":"aal1"}', true);
select results_eq(
  $$ select count(*)::bigint from public.curriculum_descriptors $$,
  array[40::bigint],
  'usuário autenticado lê descritores'
);
select throws_ok(
  $$ insert into public.curriculum_components (catalog_id, name)
     values ('a1000000-0000-0000-0000-000000000001', 'Componente indevido') $$,
  '42501',
  'permission denied for table curriculum_components',
  'usuário autenticado não altera o catálogo'
);
reset role;

select * from finish();
rollback;
