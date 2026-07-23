begin;

create table public.topic_curriculum_descriptors (
  topic_id uuid not null references public.topics(id) on delete cascade,
  descriptor_id uuid not null references public.curriculum_descriptors(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (topic_id, descriptor_id)
);

alter table public.topic_curriculum_descriptors enable row level security;

create policy topic_descriptor_read_allowed on public.topic_curriculum_descriptors
for select to authenticated using (
  exists (select 1 from public.topics topic where topic.id = topic_id)
);

create policy topic_descriptor_manage_owner on public.topic_curriculum_descriptors
for all to authenticated
using (
  exists (
    select 1
    from public.topics topic
    where topic.id = topic_id
      and (topic.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))
  )
)
with check (
  exists (
    select 1
    from public.topics topic
    where topic.id = topic_id
      and (topic.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))
  )
);

revoke all on public.topic_curriculum_descriptors from anon, authenticated;
grant select, insert, update, delete on public.topic_curriculum_descriptors to authenticated;

create or replace function public.create_teacher_topic(
  p_class_id uuid,
  p_title text,
  p_target_grade public.grade_year default 'any',
  p_descriptor_ids uuid[] default array[]::uuid[]
)
returns public.topics
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_title text := btrim(p_title);
  descriptor_ids uuid[] := coalesce(p_descriptor_ids, array[]::uuid[]);
  created_topic public.topics%rowtype;
begin
  if not public.can_manage_class(p_class_id) then
    raise exception using errcode = '42501', message = 'Sem permissão para criar tópico nesta turma';
  end if;

  if char_length(normalized_title) not between 2 and 180 then
    raise exception using errcode = '22023', message = 'Título deve ter entre 2 e 180 caracteres';
  end if;

  if cardinality(descriptor_ids) = 0 then
    raise exception using errcode = '22023', message = 'Selecione ao menos um descritor curricular';
  end if;

  if cardinality(descriptor_ids) <> (
    select count(distinct descriptor_id)
    from public.class_curriculum_descriptors
    where class_id = p_class_id
      and descriptor_id = any(descriptor_ids)
  ) then
    raise exception using errcode = '22023',
      message = 'Os descritores do tópico devem pertencer ao blueprint da turma';
  end if;

  insert into public.topics (
    class_id, teacher_id, title, origin, target_grade, status
  ) values (
    p_class_id, actor_id, normalized_title, 'teacher', p_target_grade, 'draft'
  ) returning * into created_topic;

  insert into public.topic_curriculum_descriptors (topic_id, descriptor_id)
  select created_topic.id, descriptor_id
  from unnest(descriptor_ids) descriptor_id;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id, public.current_profile_role(), 'topic.created', 'topic',
    created_topic.id, 'success',
    jsonb_build_object('classId', p_class_id, 'descriptorCount', cardinality(descriptor_ids))
  );

  return created_topic;
end;
$$;

revoke all on function public.create_teacher_topic(uuid, text, public.grade_year, uuid[])
  from public, anon;
grant execute on function public.create_teacher_topic(uuid, text, public.grade_year, uuid[])
  to authenticated;

comment on table public.topic_curriculum_descriptors is
  'Descritores do blueprint da turma escolhidos pelo professor para orientar um tópico.';

commit;
