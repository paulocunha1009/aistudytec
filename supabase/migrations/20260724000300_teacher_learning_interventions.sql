begin;

create table public.learning_interventions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  kind text not null default 'reinforcement'
    check (kind in ('reinforcement', 'review', 'first_attempt')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  title text not null check (char_length(btrim(title)) between 5 and 160),
  instructions text not null check (char_length(btrim(instructions)) between 20 and 1200),
  skills text[] not null check (cardinality(skills) between 1 and 12),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index learning_interventions_one_active_idx
  on public.learning_interventions(class_id, student_id)
  where status = 'active';
create index learning_interventions_student_idx
  on public.learning_interventions(student_id, status, created_at desc);

alter table public.learning_interventions enable row level security;

create policy learning_interventions_student_read
  on public.learning_interventions for select to authenticated
  using (student_id = (select auth.uid()));

create policy learning_interventions_manager_read
  on public.learning_interventions for select to authenticated
  using (public.can_manage_class(class_id));

revoke all on public.learning_interventions from anon, authenticated;
grant select on public.learning_interventions to authenticated;

create or replace function public.create_learning_intervention(
  p_class_id uuid,
  p_student_id uuid,
  p_skills text[],
  p_instructions text
)
returns public.learning_interventions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_topic_id uuid;
  normalized_skills text[];
  created_intervention public.learning_interventions;
begin
  if actor_id is null or not public.can_manage_class(p_class_id) then
    raise exception using errcode = '42501', message = 'Você não pode intervir nesta turma';
  end if;

  if not exists (
    select 1
    from public.class_memberships membership
    join public.profiles profile on profile.id = membership.student_id
    where membership.class_id = p_class_id
      and membership.student_id = p_student_id
      and membership.left_at is null
      and profile.role = 'student'
      and profile.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Aluno não pertence à turma';
  end if;

  select array_agg(distinct btrim(skill_value) order by btrim(skill_value))
  into normalized_skills
  from unnest(coalesce(p_skills, array[]::text[])) skill_value
  where btrim(skill_value) <> '';

  if coalesce(cardinality(normalized_skills), 0) = 0
    or char_length(btrim(coalesce(p_instructions, ''))) not between 20 and 1200 then
    raise exception using errcode = '22023', message = 'Habilidades ou orientação inválidas';
  end if;

  if exists (
    select 1 from unnest(normalized_skills) requested(skill)
    where not exists (
      select 1
      from public.skill_mastery mastery
      join public.topics topic on topic.id = mastery.topic_id
      where mastery.student_id = p_student_id
        and topic.class_id = p_class_id
        and mastery.skill = requested.skill
        and mastery.mastery_pct < 70
        and mastery.total_count > 1
    )
  ) then
    raise exception using errcode = '22023', message = 'Intervenção exige evidência repetida abaixo de 70%';
  end if;

  select mastery.topic_id
  into target_topic_id
  from public.skill_mastery mastery
  join public.topics topic on topic.id = mastery.topic_id
  where mastery.student_id = p_student_id
    and topic.class_id = p_class_id
    and topic.status = 'published'
    and mastery.skill = any(normalized_skills)
  order by mastery.last_practiced_at desc
  limit 1;

  if target_topic_id is null then
    raise exception using errcode = 'P0002', message = 'Material publicado para reforço não encontrado';
  end if;

  update public.learning_interventions
  set status = 'cancelled', completed_at = now()
  where class_id = p_class_id
    and student_id = p_student_id
    and status = 'active';

  insert into public.learning_interventions (
    class_id, student_id, topic_id, created_by, title, instructions, skills
  ) values (
    p_class_id,
    p_student_id,
    target_topic_id,
    actor_id,
    'Reforço orientado pelo professor',
    btrim(p_instructions),
    normalized_skills
  )
  returning * into created_intervention;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id,
    public.current_profile_role(),
    'learning_intervention.created',
    'learning_intervention',
    created_intervention.id,
    'success',
    jsonb_build_object(
      'classId', p_class_id,
      'studentId', p_student_id,
      'topicId', target_topic_id,
      'skills', normalized_skills
    )
  );

  return created_intervention;
end;
$$;

revoke all on function public.create_learning_intervention(uuid, uuid, text[], text) from public, anon;
grant execute on function public.create_learning_intervention(uuid, uuid, text[], text) to authenticated;

comment on table public.learning_interventions is
  'Decisões pedagógicas explícitas do professor, vinculadas a evidências e entregues ao aluno.';
comment on function public.create_learning_intervention(uuid, uuid, text[], text) is
  'Cria reforço somente para habilidades com evidência repetida abaixo de 70%.';

create or replace function public.complete_learning_intervention_after_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.completed_at is not null then
    update public.learning_interventions
    set status = 'completed', completed_at = new.completed_at
    where student_id = new.student_id
      and topic_id = new.topic_id
      and status = 'active'
      and created_at <= new.completed_at;
  end if;
  return new;
end;
$$;

create trigger complete_learning_intervention_after_attempt
after insert or update of completed_at on public.quiz_attempts
for each row execute function public.complete_learning_intervention_after_attempt();

comment on function public.complete_learning_intervention_after_attempt() is
  'Conclui a orientação ativa quando o aluno entrega uma nova tentativa do material indicado.';

commit;
