begin;

create or replace function public.set_topic_video_approval(
  p_video_id uuid,
  p_approved boolean
)
returns public.topic_videos
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  target_video public.topic_videos%rowtype;
  target_topic public.topics%rowtype;
begin
  select * into target_video from public.topic_videos where id = p_video_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Vídeo não encontrado';
  end if;
  select * into target_topic from public.topics where id = target_video.topic_id for update;

  if not (target_topic.teacher_id = actor_id or public.is_master_aal2()) then
    raise exception using errcode = '42501', message = 'Você não pode revisar este vídeo';
  end if;

  if p_approved then
    update public.topic_videos set approved = false
    where topic_id = target_video.topic_id and level = target_video.level;
  end if;
  update public.topic_videos set approved = p_approved
  where id = p_video_id returning * into target_video;

  if target_topic.status = 'published' then
    update public.topics
    set status = 'generated', published_at = null, reviewed_by = null,
        reviewed_at = null, version = version + 1
    where id = target_topic.id;
  end if;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id, actor_role, 'topic.video_reviewed', 'topic', target_topic.id, 'success',
    jsonb_build_object('videoId', p_video_id, 'level', target_video.level, 'approved', p_approved)
  );
  return target_video;
end;
$$;

create or replace function public.store_validated_topic_video(
  p_topic_id uuid,
  p_video jsonb
)
returns public.topic_videos
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_video public.topic_videos%rowtype;
begin
  insert into public.topic_videos (
    topic_id, level, youtube_video_id, title, channel_title,
    duration_seconds, view_count, thumbnail_url, rank_score, approved, order_index
  ) values (
    p_topic_id,
    (p_video ->> 'level')::public.explanation_level,
    p_video ->> 'youtubeVideoId',
    p_video ->> 'title',
    p_video ->> 'channelTitle',
    (p_video ->> 'durationSeconds')::integer,
    coalesce((p_video ->> 'viewCount')::bigint, 0),
    p_video ->> 'thumbnailUrl',
    coalesce((p_video ->> 'rankScore')::numeric, 0),
    false,
    0
  )
  on conflict (topic_id, level, youtube_video_id)
  do update set
    title = excluded.title,
    channel_title = excluded.channel_title,
    duration_seconds = excluded.duration_seconds,
    view_count = excluded.view_count,
    thumbnail_url = excluded.thumbnail_url,
    rank_score = excluded.rank_score
  returning * into created_video;
  return created_video;
end;
$$;

revoke all on function public.set_topic_video_approval(uuid, boolean) from public, anon;
grant execute on function public.set_topic_video_approval(uuid, boolean) to authenticated;
revoke all on function public.store_validated_topic_video(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.store_validated_topic_video(uuid, jsonb) to service_role;

comment on function public.set_topic_video_approval(uuid, boolean) is
  'Mantém um vídeo aprovado por nível e devolve conteúdo publicado para revisão quando a curadoria muda.';

commit;
