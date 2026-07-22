begin;

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('student', 'teacher', 'master');
create type public.account_status as enum ('invited', 'active', 'locked', 'disabled');
create type public.grade_year as enum ('1', '2', '3', 'any');
create type public.topic_origin as enum ('teacher', 'student');
create type public.topic_status as enum ('draft', 'generated', 'published');
create type public.explanation_level as enum ('simple', 'technical', 'advanced');
create type public.question_difficulty as enum ('facil', 'medio', 'dificil');
create type public.review_status as enum ('pending', 'resolved');
create type public.generation_status as enum ('queued', 'processing', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  status public.account_status not null default 'invited',
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text,
  phone text,
  date_of_birth date,
  grade_year public.grade_year,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email)) where email is not null;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  code text not null check (code ~ '^[A-Z0-9]{6,12}$'),
  theme text,
  grade_year public.grade_year not null default 'any',
  teacher_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code)
);

create table public.class_memberships (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (class_id, student_id),
  check (left_at is null or left_at >= joined_at)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id),
  student_id uuid references public.profiles(id),
  title text not null check (char_length(btrim(title)) between 2 and 180),
  origin public.topic_origin not null,
  target_grade public.grade_year not null default 'any',
  status public.topic_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (
    (origin = 'teacher' and teacher_id is not null and class_id is not null and student_id is null)
    or (origin = 'student' and student_id is not null and teacher_id is null and class_id is null)
  ),
  check ((status = 'published' and published_at is not null) or status <> 'published'),
  check (origin <> 'student' or status <> 'published')
);

create table public.topic_explanations (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  level public.explanation_level not null,
  content text not null check (char_length(btrim(content)) > 0),
  ai_generated boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (topic_id, level)
);

create table public.topic_learning_paths (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  level public.explanation_level not null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now(),
  unique (topic_id, level)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  question text not null check (char_length(btrim(question)) > 0),
  options jsonb not null check (jsonb_typeof(options) in ('array', 'object')),
  explanation text,
  skill text not null check (char_length(btrim(skill)) between 2 and 120),
  difficulty public.question_difficulty not null default 'medio',
  target_grade public.grade_year not null default 'any',
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (topic_id, order_index)
);

create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_option text not null,
  updated_at timestamptz not null default now()
);

create table public.topic_videos (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  level public.explanation_level not null,
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,
  channel_title text,
  duration_seconds integer check (duration_seconds between 180 and 1200),
  view_count bigint check (view_count >= 0),
  thumbnail_url text,
  rank_score double precision,
  approved boolean not null default false,
  order_index integer not null default 0 check (order_index >= 0),
  unique (topic_id, level, youtube_video_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  topic_id uuid not null references public.topics(id),
  class_id uuid references public.classes(id),
  score integer not null default 0 check (score >= 0),
  total integer not null default 0 check (total >= 0),
  percentage integer not null default 0 check (percentage between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check (score <= total)
);

create table public.quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id),
  skill text not null,
  selected_option text,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table public.skill_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  topic_id uuid references public.topics(id) on delete set null,
  correct_count integer not null default 0 check (correct_count >= 0),
  total_count integer not null default 0 check (total_count >= 0),
  mastery_pct integer not null default 0 check (mastery_pct between 0 and 100),
  last_practiced_at timestamptz,
  unique (student_id, skill),
  check (correct_count <= total_count)
);

create table public.review_queue (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  skill text not null,
  due_at timestamptz not null,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (student_id, topic_id, skill, status),
  check ((status = 'resolved' and resolved_at is not null) or status = 'pending')
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id),
  operation text not null,
  idempotency_key text not null,
  request_hash text not null,
  request_payload jsonb not null check (jsonb_typeof(request_payload) = 'object'),
  status public.generation_status not null default 'queued',
  topic_id uuid references public.topics(id) on delete set null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (requested_by, operation, idempotency_key)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  outcome text not null check (outcome in ('success', 'denied', 'failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index classes_teacher_idx on public.classes(teacher_id);
create index class_memberships_student_idx on public.class_memberships(student_id) where left_at is null;
create index topics_class_status_idx on public.topics(class_id, status);
create index topics_student_idx on public.topics(student_id) where origin = 'student';
create index quiz_questions_topic_idx on public.quiz_questions(topic_id, order_index);
create index attempts_student_idx on public.quiz_attempts(student_id, completed_at desc);
create index mastery_student_idx on public.skill_mastery(student_id, mastery_pct);
create index reviews_student_due_idx on public.review_queue(student_id, status, due_at);
create index jobs_status_created_idx on public.generation_jobs(status, created_at);
create index audit_created_idx on public.audit_events(created_at desc);
create index audit_actor_idx on public.audit_events(actor_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger classes_set_updated_at before update on public.classes
for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics
for each row execute function public.set_updated_at();
create trigger explanations_set_updated_at before update on public.topic_explanations
for each row execute function public.set_updated_at();
create trigger paths_set_updated_at before update on public.topic_learning_paths
for each row execute function public.set_updated_at();
create trigger answer_keys_set_updated_at before update on public.quiz_answer_keys
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, status, name, email)
  values (
    new.id,
    'student',
    'invited',
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 'Novo estudante'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid()) and status = 'active';
$$;

create or replace function public.is_master_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_profile_role() = 'master'
    and (select auth.jwt() ->> 'aal') = 'aal2',
    false
  );
$$;

create or replace function public.owns_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = target_class_id and teacher_id = (select auth.uid())
  );
$$;

create or replace function public.is_active_class_member(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_memberships
    where class_id = target_class_id
      and student_id = (select auth.uid())
      and left_at is null
  );
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.is_master_aal2() from public;
revoke all on function public.owns_class(uuid) from public;
revoke all on function public.is_active_class_member(uuid) from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_master_aal2() to authenticated;
grant execute on function public.owns_class(uuid) to authenticated;
grant execute on function public.is_active_class_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.topics enable row level security;
alter table public.topic_explanations enable row level security;
alter table public.topic_learning_paths enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.topic_videos enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.skill_mastery enable row level security;
alter table public.review_queue enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_read_self on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_read_teacher_students on public.profiles for select to authenticated
using (
  role = 'student' and exists (
    select 1 from public.class_memberships cm
    join public.classes c on c.id = cm.class_id
    where cm.student_id = profiles.id and cm.left_at is null and c.teacher_id = (select auth.uid())
  )
);
create policy profiles_master_all on public.profiles for all to authenticated
using ((select public.is_master_aal2())) with check ((select public.is_master_aal2()));

create policy classes_read_related on public.classes for select to authenticated
using (
  teacher_id = (select auth.uid())
  or (select public.is_active_class_member(id))
  or (select public.is_master_aal2())
);
create policy classes_teacher_insert on public.classes for insert to authenticated
with check (teacher_id = (select auth.uid()) and (select public.current_profile_role()) = 'teacher');
create policy classes_teacher_update on public.classes for update to authenticated
using ((select public.owns_class(id)) or (select public.is_master_aal2()))
with check ((teacher_id = (select auth.uid()) and (select public.current_profile_role()) = 'teacher') or (select public.is_master_aal2()));
create policy classes_teacher_delete on public.classes for delete to authenticated
using ((select public.owns_class(id)) or (select public.is_master_aal2()));

create policy memberships_read_related on public.class_memberships for select to authenticated
using (student_id = (select auth.uid()) or (select public.owns_class(class_id)) or (select public.is_master_aal2()));
create policy memberships_manage_teacher on public.class_memberships for all to authenticated
using ((select public.owns_class(class_id)) or (select public.is_master_aal2()))
with check ((select public.owns_class(class_id)) or (select public.is_master_aal2()));

create policy topics_read_allowed on public.topics for select to authenticated
using (
  (origin = 'student' and student_id = (select auth.uid()))
  or (origin = 'teacher' and teacher_id = (select auth.uid()))
  or (origin = 'teacher' and status = 'published' and (select public.is_active_class_member(class_id)))
  or (select public.is_master_aal2())
);
create policy topics_teacher_create on public.topics for insert to authenticated
with check (
  (origin = 'teacher' and teacher_id = (select auth.uid()) and (select public.owns_class(class_id)))
  or (origin = 'student' and student_id = (select auth.uid()) and status <> 'published')
  or (select public.is_master_aal2())
);
create policy topics_owner_update on public.topics for update to authenticated
using (
  (origin = 'teacher' and teacher_id = (select auth.uid()) and (select public.owns_class(class_id)))
  or (origin = 'student' and student_id = (select auth.uid()))
  or (select public.is_master_aal2())
)
with check (
  (origin = 'teacher' and teacher_id = (select auth.uid()) and (select public.owns_class(class_id)))
  or (origin = 'student' and student_id = (select auth.uid()) and status <> 'published')
  or (select public.is_master_aal2())
);
create policy topics_owner_delete on public.topics for delete to authenticated
using (
  (origin = 'teacher' and teacher_id = (select auth.uid()) and (select public.owns_class(class_id)))
  or (origin = 'student' and student_id = (select auth.uid()))
  or (select public.is_master_aal2())
);

create policy explanations_read_topic on public.topic_explanations for select to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id));
create policy explanations_manage_topic on public.topic_explanations for all to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))))
with check (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))));

create policy paths_read_topic on public.topic_learning_paths for select to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id));
create policy paths_manage_topic on public.topic_learning_paths for all to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))))
with check (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))));

create policy questions_read_topic on public.quiz_questions for select to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id));
create policy questions_manage_topic on public.quiz_questions for all to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))))
with check (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))));

create policy answer_keys_curator_only on public.quiz_answer_keys for all to authenticated
using (exists (
  select 1 from public.quiz_questions q join public.topics t on t.id = q.topic_id
  where q.id = question_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))
))
with check (exists (
  select 1 from public.quiz_questions q join public.topics t on t.id = q.topic_id
  where q.id = question_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))
));

create policy videos_read_topic on public.topic_videos for select to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id));
create policy videos_manage_topic on public.topic_videos for all to authenticated
using (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))))
with check (exists (select 1 from public.topics t where t.id = topic_id and (t.teacher_id = (select auth.uid()) or (select public.is_master_aal2()))));

create policy attempts_read_related on public.quiz_attempts for select to authenticated
using (student_id = (select auth.uid()) or (class_id is not null and (select public.owns_class(class_id))) or (select public.is_master_aal2()));
create policy answers_read_related on public.quiz_attempt_answers for select to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id));
create policy mastery_read_related on public.skill_mastery for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.class_memberships cm
    where cm.student_id = skill_mastery.student_id and cm.left_at is null and (select public.owns_class(cm.class_id))
  )
  or (select public.is_master_aal2())
);
create policy reviews_read_related on public.review_queue for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.class_memberships cm
    where cm.student_id = review_queue.student_id and cm.left_at is null and (select public.owns_class(cm.class_id))
  )
  or (select public.is_master_aal2())
);

create policy jobs_read_owner on public.generation_jobs for select to authenticated
using (requested_by = (select auth.uid()) or (select public.is_master_aal2()));

create policy audit_master_read on public.audit_events for select to authenticated
using ((select public.is_master_aal2()));

revoke all on public.quiz_answer_keys from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.classes, public.class_memberships,
  public.topics, public.topic_explanations, public.topic_learning_paths, public.quiz_questions,
  public.topic_videos, public.quiz_attempts, public.quiz_attempt_answers, public.skill_mastery,
  public.review_queue, public.generation_jobs to authenticated;
grant select, insert, update, delete on public.quiz_answer_keys to authenticated;
grant select on public.audit_events to authenticated;

comment on table public.quiz_answer_keys is 'Gabarito privado. Nunca expor ao estudante; submissão será corrigida por função server-side.';
comment on table public.audit_events is 'Auditoria minimizada. Escrita somente por funções privilegiadas.';

commit;
