begin;

create table public.topic_sources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  url text not null check (url ~ '^https://'),
  domain text not null,
  source_kind text not null default 'web_grounding',
  verified_at timestamptz not null default now(),
  unique (topic_id, url)
);

alter table public.topic_sources enable row level security;
create policy topic_sources_read_topic on public.topic_sources
for select to authenticated using (
  exists (select 1 from public.topics topic where topic.id = topic_id)
);
grant select on public.topic_sources to authenticated;

create or replace function public.store_generated_topic_content(
  p_topic_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_topic public.topics%rowtype;
  level_name public.explanation_level;
  question_item jsonb;
  question_id uuid;
  question_index integer := 0;
  descriptor_id uuid;
  video_item jsonb;
  source_item jsonb;
begin
  select * into target_topic from public.topics where id = p_topic_id for update;
  if not found or target_topic.origin <> 'teacher' then
    raise exception using errcode = 'P0002', message = 'Tópico docente não encontrado';
  end if;

  if jsonb_typeof(p_payload -> 'explanations') <> 'object'
     or jsonb_typeof(p_payload -> 'learningPaths') <> 'object'
     or jsonb_typeof(p_payload -> 'questions') <> 'array' then
    raise exception using errcode = '22023', message = 'Payload pedagógico inválido';
  end if;

  delete from public.topic_explanations where topic_id = p_topic_id;
  delete from public.topic_learning_paths where topic_id = p_topic_id;
  delete from public.quiz_questions where topic_id = p_topic_id;
  delete from public.topic_videos where topic_id = p_topic_id;
  delete from public.topic_sources where topic_id = p_topic_id;

  foreach level_name in array array['simple', 'technical', 'advanced']::public.explanation_level[] loop
    insert into public.topic_explanations (topic_id, level, content, ai_generated)
    values (
      p_topic_id, level_name,
      p_payload -> 'explanations' ->> level_name::text,
      true
    );
    insert into public.topic_learning_paths (topic_id, level, content)
    values (
      p_topic_id, level_name,
      p_payload -> 'learningPaths' -> level_name::text
    );
  end loop;

  for question_item in select * from jsonb_array_elements(p_payload -> 'questions') loop
    question_index := question_index + 1;
    select descriptor.id into descriptor_id
    from public.curriculum_descriptors descriptor
    join public.topic_curriculum_descriptors link
      on link.descriptor_id = descriptor.id
    where link.topic_id = p_topic_id
      and descriptor.code = question_item ->> 'descriptorCode';

    if descriptor_id is null then
      raise exception using errcode = '22023',
        message = 'Questão gerada com descritor fora do tópico';
    end if;

    insert into public.quiz_questions (
      topic_id, question, options, explanation, skill,
      difficulty, target_grade, order_index
    ) values (
      p_topic_id,
      question_item ->> 'question',
      question_item -> 'options',
      question_item ->> 'explanation',
      question_item ->> 'skill',
      (question_item ->> 'difficulty')::public.question_difficulty,
      target_topic.target_grade,
      question_index - 1
    ) returning id into question_id;

    insert into public.quiz_answer_keys (question_id, correct_option)
    values (question_id, upper(question_item ->> 'correctOption'));
    insert into public.quiz_question_descriptors (question_id, descriptor_id)
    values (question_id, descriptor_id);
  end loop;

  for video_item in select * from jsonb_array_elements(coalesce(p_payload -> 'videos', '[]'::jsonb)) loop
    insert into public.topic_videos (
      topic_id, level, youtube_video_id, title, channel_title,
      duration_seconds, view_count, thumbnail_url, rank_score, approved, order_index
    ) values (
      p_topic_id,
      (video_item ->> 'level')::public.explanation_level,
      video_item ->> 'youtubeVideoId',
      video_item ->> 'title',
      video_item ->> 'channelTitle',
      coalesce((video_item ->> 'durationSeconds')::integer, 0),
      coalesce((video_item ->> 'viewCount')::bigint, 0),
      video_item ->> 'thumbnailUrl',
      coalesce((video_item ->> 'rankScore')::numeric, 0),
      false,
      coalesce((video_item ->> 'orderIndex')::integer, 0)
    );
  end loop;

  for source_item in select * from jsonb_array_elements(coalesce(p_payload -> 'sources', '[]'::jsonb)) loop
    insert into public.topic_sources (topic_id, title, url, domain)
    values (
      p_topic_id,
      coalesce(nullif(source_item ->> 'title', ''), source_item ->> 'domain'),
      source_item ->> 'url',
      source_item ->> 'domain'
    )
    on conflict (topic_id, url) do nothing;
  end loop;

  update public.topics
  set status = 'generated', published_at = null, reviewed_by = null,
      reviewed_at = null, version = version + 1
  where id = p_topic_id;
end;
$$;

revoke all on function public.store_generated_topic_content(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.store_generated_topic_content(uuid, jsonb)
  to service_role;

comment on table public.topic_sources is
  'Fontes retornadas pelo grounding da pesquisa Gemini; preservadas para curadoria e transparência.';

commit;
