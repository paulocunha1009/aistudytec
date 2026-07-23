begin;

create or replace function public.can_manage_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.owns_class(target_class_id)
    or public.is_master_aal2(),
    false
  );
$$;

revoke all on function public.can_manage_class(uuid) from public, anon;
grant execute on function public.can_manage_class(uuid) to authenticated;

create or replace function public.enroll_student_by_email(
  p_class_id uuid,
  p_email text
)
returns table (
  id uuid,
  name text,
  email text,
  grade_year public.grade_year,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  normalized_email text := lower(btrim(p_email));
  target_student public.profiles%rowtype;
  enrollment_time timestamptz := now();
begin
  if actor_id is null or not public.can_manage_class(p_class_id) then
    raise exception using errcode = '42501', message = 'Você não pode administrar esta turma';
  end if;

  select *
    into target_student
    from public.profiles
   where lower(profiles.email) = normalized_email
     and role = 'student'
     and status = 'active';

  if not found then
    raise exception using errcode = 'P0002', message = 'Aluno elegível não encontrado';
  end if;

  insert into public.class_memberships (class_id, student_id, joined_at, left_at)
  values (p_class_id, target_student.id, enrollment_time, null)
  on conflict (class_id, student_id)
  do update set joined_at = excluded.joined_at, left_at = null;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id,
    actor_role,
    'class.student_enrolled',
    'class',
    p_class_id,
    'success',
    jsonb_build_object('studentId', target_student.id)
  );

  return query
  select target_student.id, target_student.name, target_student.email,
         target_student.grade_year, enrollment_time;
end;
$$;

create or replace function public.remove_student_from_class(
  p_class_id uuid,
  p_student_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
begin
  if actor_id is null or not public.can_manage_class(p_class_id) then
    raise exception using errcode = '42501', message = 'Você não pode administrar esta turma';
  end if;

  update public.class_memberships
     set left_at = now()
   where class_id = p_class_id
     and student_id = p_student_id
     and left_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'Matrícula ativa não encontrada';
  end if;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id,
    actor_role,
    'class.student_removed',
    'class',
    p_class_id,
    'success',
    jsonb_build_object('studentId', p_student_id)
  );
end;
$$;

revoke all on function public.enroll_student_by_email(uuid, text) from public, anon;
revoke all on function public.remove_student_from_class(uuid, uuid) from public, anon;
grant execute on function public.enroll_student_by_email(uuid, text) to authenticated;
grant execute on function public.remove_student_from_class(uuid, uuid) to authenticated;

comment on function public.enroll_student_by_email(uuid, text) is
  'Matricula somente perfil ativo de aluno por correspondência exata de e-mail, sob propriedade da turma ou master AAL2.';
comment on function public.remove_student_from_class(uuid, uuid) is
  'Encerra matrícula sem apagar histórico e registra auditoria.';

commit;
