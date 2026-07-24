begin;

create or replace function public.replace_topic_video_candidates(
  p_topic_id uuid,
  p_requested_by uuid,
  p_videos jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_topic public.topics%rowtype;
  actor_role public.app_role;
  video_item jsonb;
  inserted_count integer := 0;
begin
  if jsonb_typeof(p_videos) <> 'array' then
    raise exception using errcode = '22023', message = 'Lista de vídeos inválida';
  end if;

  select * into target_topic
  from public.topics
  where id = p_topic_id
  for update;

  if not found or target_topic.origin <> 'teacher' then
    raise exception using errcode = 'P0002', message = 'Tópico docente não encontrado';
  end if;

  select role into actor_role
  from public.profiles
  where id = p_requested_by and status = 'active';

  if actor_role is null
     or not (target_topic.teacher_id = p_requested_by or actor_role = 'master') then
    raise exception using errcode = '42501', message = 'Sem permissão para regenerar vídeos';
  end if;

  delete from public.topic_videos
  where topic_id = p_topic_id and approved = false;

  for video_item in
    select * from jsonb_array_elements(p_videos)
  loop
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
    )
    on conflict (topic_id, level, youtube_video_id) do nothing;

    if found then
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  update public.topics
  set updated_at = now()
  where id = p_topic_id;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    p_requested_by, actor_role, 'topic.videos_regenerated', 'topic',
    p_topic_id, 'success',
    jsonb_build_object(
      'insertedCandidates', inserted_count,
      'approvedVideosPreserved',
        (select count(*) from public.topic_videos
         where topic_id = p_topic_id and approved = true)
    )
  );

  return inserted_count;
end;
$$;

revoke all on function public.replace_topic_video_candidates(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_topic_video_candidates(uuid, uuid, jsonb)
  to service_role;

comment on function public.replace_topic_video_candidates(uuid, uuid, jsonb) is
  'Substitui apenas candidatos não aprovados, preserva a curadoria docente e registra auditoria.';

commit;
