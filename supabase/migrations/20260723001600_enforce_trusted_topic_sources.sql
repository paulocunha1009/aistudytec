begin;

create or replace function public.is_trusted_topic_source(source_domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(source_domain)) ~ (
    '(^|\.)(gov\.br|edu\.br|usp\.br|unicamp\.br|ufsc\.br|ufrj\.br|ufmg\.br|'
    'rnp\.br|fiocruz\.br|ibm\.com|microsoft\.com|mozilla\.org|w3\.org|'
    'ieee\.org|acm\.org|nature\.com|science\.org|reuters\.com|bbc\.com|'
    'bbc\.co\.uk|apnews\.com|nytimes\.com|theguardian\.com|'
    'folha\.uol\.com\.br|estadao\.com\.br|oglobo\.globo\.com)$'
  );
$$;

update public.topic_sources
set domain = lower(btrim(title))
where domain = 'vertexaisearch.cloud.google.com'
  and title ~ '^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

delete from public.topic_sources
where not public.is_trusted_topic_source(domain);

create or replace function public.enforce_trusted_topic_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_trusted_topic_source(new.domain) then
    raise exception using errcode = '23514',
      message = 'Fonte fora da política institucional de confiança';
  end if;
  return new;
end;
$$;

create trigger topic_sources_enforce_trust
before insert or update on public.topic_sources
for each row execute function public.enforce_trusted_topic_source();

revoke all on function public.is_trusted_topic_source(text) from anon, authenticated;

comment on function public.is_trusted_topic_source(text) is
  'Lista de confiança para fontes acadêmicas, governamentais, documentação primária e jornalismo de grande prestígio.';

commit;
