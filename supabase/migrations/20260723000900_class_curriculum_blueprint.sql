begin;

create table public.class_curriculum_descriptors (
  class_id uuid not null references public.classes(id) on delete cascade,
  descriptor_id uuid not null references public.curriculum_descriptors(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (class_id, descriptor_id)
);

alter table public.class_curriculum_descriptors enable row level security;

create policy class_descriptor_read_related on public.class_curriculum_descriptors
for select to authenticated using (
  (select public.owns_class(class_id))
  or (select public.is_active_class_member(class_id))
  or (select public.is_master_aal2())
);
create policy class_descriptor_manage_owner on public.class_curriculum_descriptors
for all to authenticated
using ((select public.owns_class(class_id)) or (select public.is_master_aal2()))
with check ((select public.owns_class(class_id)) or (select public.is_master_aal2()));

revoke all on public.class_curriculum_descriptors from anon, authenticated;
grant select, insert, update, delete on public.class_curriculum_descriptors to authenticated;

drop function public.create_class(text, text, public.grade_year, uuid);

create or replace function public.create_class(
  p_name text,
  p_theme text default null,
  p_grade_year public.grade_year default 'any',
  p_curriculum_component_ids uuid[] default array[]::uuid[],
  p_curriculum_descriptor_ids uuid[] default array[]::uuid[]
)
returns public.classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  normalized_name text := btrim(p_name);
  normalized_theme text := nullif(btrim(p_theme), '');
  component_ids uuid[] := coalesce(p_curriculum_component_ids, array[]::uuid[]);
  descriptor_ids uuid[] := coalesce(p_curriculum_descriptor_ids, array[]::uuid[]);
  generated_code text;
  created_class public.classes%rowtype;
  attempt integer := 0;
begin
  if actor_id is null or not (
    actor_role = 'teacher'
    or (actor_role = 'master' and public.is_master_aal2())
  ) then
    raise exception using errcode = '42501', message = 'Apenas professor ativo ou master com MFA pode criar turma';
  end if;

  if char_length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Nome da turma deve ter entre 2 e 120 caracteres';
  end if;

  if cardinality(component_ids) <> (
    select count(distinct id) from public.curriculum_components where id = any(component_ids)
  ) then
    raise exception using errcode = '22023', message = 'Há componentes curriculares inválidos ou repetidos';
  end if;

  if cardinality(descriptor_ids) <> (
    select count(distinct descriptor.id)
      from public.curriculum_descriptors descriptor
     where descriptor.id = any(descriptor_ids)
       and exists (
         select 1
           from public.curriculum_component_descriptors link
          where link.descriptor_id = descriptor.id
            and link.component_id = any(component_ids)
       )
  ) then
    raise exception using errcode = '22023', message = 'Descritores devem pertencer aos componentes selecionados e não podem se repetir';
  end if;

  loop
    attempt := attempt + 1;
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    begin
      insert into public.classes (name, code, theme, grade_year, teacher_id)
      values (normalized_name, generated_code, normalized_theme, p_grade_year, actor_id)
      returning * into created_class;
      exit;
    exception when unique_violation then
      if attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.class_curriculum_components (class_id, component_id)
  select created_class.id, component_id
  from unnest(component_ids) component_id;

  insert into public.class_curriculum_descriptors (class_id, descriptor_id)
  select created_class.id, descriptor_id
  from unnest(descriptor_ids) descriptor_id;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id, actor_role, 'class.created', 'class', created_class.id, 'success',
    jsonb_build_object(
      'gradeYear', created_class.grade_year,
      'hasTheme', created_class.theme is not null,
      'curriculumComponentCount', cardinality(component_ids),
      'curriculumDescriptorCount', cardinality(descriptor_ids)
    )
  );

  return created_class;
end;
$$;

revoke all on function public.create_class(text, text, public.grade_year, uuid[], uuid[])
  from public, anon;
grant execute on function public.create_class(text, text, public.grade_year, uuid[], uuid[])
  to authenticated;

comment on table public.class_curriculum_descriptors is
  'Descritores escolhidos pelo professor para orientar geração, curadoria e acompanhamento da turma.';
comment on function public.create_class(text, text, public.grade_year, uuid[], uuid[]) is
  'Cria turma e blueprint curricular validado: múltiplos componentes e somente descritores pertencentes a eles.';

commit;
