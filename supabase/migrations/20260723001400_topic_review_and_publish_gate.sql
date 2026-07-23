begin;

alter table public.topics
  add column version integer not null default 1 check (version > 0),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz;

create table public.quiz_question_descriptors (
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  descriptor_id uuid not null references public.curriculum_descriptors(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (question_id, descriptor_id)
);

alter table public.quiz_question_descriptors enable row level security;

create policy question_descriptor_read_topic
on public.quiz_question_descriptors
for select to authenticated
using (
  exists (
    select 1
    from public.quiz_questions question
    join public.topics topic on topic.id = question.topic_id
    where question.id = question_id
  )
);

create policy question_descriptor_manage_curator
on public.quiz_question_descriptors
for all to authenticated
using (
  exists (
    select 1
    from public.quiz_questions question
    join public.topics topic on topic.id = question.topic_id
    where question.id = question_id
      and (topic.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))
  )
)
with check (
  exists (
    select 1
    from public.quiz_questions question
    join public.topics topic on topic.id = question.topic_id
    join public.topic_curriculum_descriptors topic_descriptor
      on topic_descriptor.topic_id = topic.id
     and topic_descriptor.descriptor_id = descriptor_id
    where question.id = question_id
      and (topic.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))
  )
);

grant select, insert, update, delete on public.quiz_question_descriptors to authenticated;

create or replace function public.publish_teacher_topic(p_topic_id uuid)
returns public.topics
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  target_topic public.topics%rowtype;
  missing text[] := array[]::text[];
begin
  select * into target_topic from public.topics where id = p_topic_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Tópico não encontrado';
  end if;

  if target_topic.origin <> 'teacher'
     or not (target_topic.teacher_id = actor_id or public.is_master_aal2()) then
    raise exception using errcode = '42501', message = 'Você não pode publicar este tópico';
  end if;

  if (
    select count(distinct level) from public.topic_explanations
    where topic_id = p_topic_id and char_length(btrim(content)) >= 120
  ) <> 3 then
    missing := array_append(missing, 'explicações detalhadas nos três níveis');
  end if;

  if (
    select count(distinct level) from public.topic_learning_paths
    where topic_id = p_topic_id
      and jsonb_typeof(content) = 'object'
      and content ?& array[
        'hook', 'objectives', 'keyIdeas', 'realWorldConnection',
        'guidedInvestigation', 'watchMission', 'handsOnChallenge',
        'reflectionQuestions', 'discussionPrompt'
      ]
  ) <> 3 then
    missing := array_append(missing, 'trilhas imersivas completas nos três níveis');
  end if;

  if (select count(*) from public.quiz_questions where topic_id = p_topic_id) < 8 then
    missing := array_append(missing, 'mínimo de oito questões');
  end if;

  if exists (
    select 1 from public.quiz_questions question
    where question.topic_id = p_topic_id
      and (
        char_length(btrim(coalesce(question.explanation, ''))) < 20
        or not exists (
          select 1 from public.quiz_answer_keys answer
          where answer.question_id = question.id
        )
        or not exists (
          select 1 from public.quiz_question_descriptors descriptor
          where descriptor.question_id = question.id
        )
      )
  ) then
    missing := array_append(missing, 'gabarito, feedback e descritor em todas as questões');
  end if;

  if (
    select count(distinct level) from public.topic_videos
    where topic_id = p_topic_id and approved
  ) <> 3 then
    missing := array_append(missing, 'um vídeo aprovado por nível');
  end if;

  if cardinality(missing) > 0 then
    raise exception using
      errcode = '23514',
      message = 'Conteúdo incompleto para publicação',
      detail = array_to_string(missing, ' | ');
  end if;

  update public.topics
     set status = 'published',
         published_at = now(),
         reviewed_by = actor_id,
         reviewed_at = now(),
         version = version + 1
   where id = p_topic_id
   returning * into target_topic;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id, actor_role, 'topic.published', 'topic', p_topic_id, 'success',
    jsonb_build_object('version', target_topic.version)
  );

  return target_topic;
end;
$$;

revoke all on function public.publish_teacher_topic(uuid) from public, anon;
grant execute on function public.publish_teacher_topic(uuid) to authenticated;

comment on function public.publish_teacher_topic(uuid) is
  'Gate pedagógico: publica somente após três explicações, três trilhas imersivas, oito questões completas com descritores e vídeos aprovados.';

commit;
