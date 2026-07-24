begin;

alter table public.topic_videos
  drop constraint if exists topic_videos_duration_seconds_check;

alter table public.topic_videos
  add constraint topic_videos_duration_seconds_check
  check (duration_seconds between 180 and 2700);

comment on constraint topic_videos_duration_seconds_check on public.topic_videos is
  'Vídeos simples e técnicos permanecem limitados pela busca a 20 minutos; o nível avançado aceita material institucional de até 45 minutos.';

commit;
