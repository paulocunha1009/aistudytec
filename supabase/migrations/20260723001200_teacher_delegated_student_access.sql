begin;

alter table public.access_grants
  add column class_id uuid references public.classes(id) on delete cascade;

create index access_grants_class_idx
  on public.access_grants (class_id, created_at desc)
  where class_id is not null;

drop policy if exists access_grants_teacher_scoped_read on public.access_grants;
create policy access_grants_teacher_scoped_read
on public.access_grants
for select
to authenticated
using (
  role = 'student'
  and class_id is not null
  and granted_by = (select auth.uid())
  and (select public.owns_class(class_id))
);

create or replace function public.authorize_or_enroll_class_student(
  p_class_id uuid,
  p_email text,
  p_expires_at timestamptz default (now() + interval '7 days')
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  normalized_email text := lower(btrim(p_email));
  target_student public.profiles%rowtype;
  created_grant public.access_grants%rowtype;
begin
  if actor_id is null or not public.can_manage_class(p_class_id) then
    raise exception using errcode = '42501', message = 'Você não pode administrar esta turma';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Informe um e-mail válido';
  end if;

  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception using errcode = '22023', message = 'A autorização deve valer entre 1 e 30 dias';
  end if;

  select *
    into target_student
    from public.profiles
   where lower(email) = normalized_email;

  if found then
    if target_student.role <> 'student' or target_student.status <> 'active' then
      raise exception using errcode = '42501',
        message = 'A conta existente não é um aluno ativo';
    end if;

    insert into public.class_memberships (class_id, student_id, joined_at, left_at)
    values (p_class_id, target_student.id, now(), null)
    on conflict (class_id, student_id)
    do update set joined_at = excluded.joined_at, left_at = null;

    insert into public.audit_events (
      actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
    ) values (
      actor_id, actor_role, 'class.student_enrolled', 'class', p_class_id, 'success',
      jsonb_build_object('studentId', target_student.id, 'source', 'delegated_access')
    );

    return jsonb_build_object(
      'status', 'enrolled',
      'studentId', target_student.id,
      'email', normalized_email
    );
  end if;

  if exists (
    select 1 from public.access_grants
    where email = normalized_email and status = 'pending'
  ) then
    raise exception using errcode = '23505',
      message = 'Já existe uma autorização pendente para este e-mail';
  end if;

  insert into public.access_grants (
    email, role, granted_by, class_id, expires_at
  ) values (
    normalized_email, 'student', actor_id, p_class_id, p_expires_at
  ) returning * into created_grant;

  return jsonb_build_object(
    'status', 'authorized',
    'grantId', created_grant.id,
    'email', created_grant.email,
    'expiresAt', created_grant.expires_at
  );
end;
$$;

create or replace function public.apply_access_grant_to_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_grant public.access_grants%rowtype;
  grantor_role public.app_role;
begin
  select *
    into approved_grant
    from public.access_grants
   where email = lower(btrim(new.email))
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then return new; end if;

  select role into grantor_role
  from public.profiles
  where id = approved_grant.granted_by;

  if grantor_role = 'teacher' and (
    approved_grant.role <> 'student'
    or approved_grant.class_id is null
    or not exists (
      select 1 from public.classes
      where id = approved_grant.class_id
        and teacher_id = approved_grant.granted_by
    )
  ) then
    raise exception using errcode = '42501',
      message = 'Autorização docente inválida';
  end if;

  update public.profiles
     set role = approved_grant.role, status = 'active'
   where id = new.id;

  if approved_grant.class_id is not null then
    insert into public.class_memberships (class_id, student_id)
    values (approved_grant.class_id, new.id)
    on conflict (class_id, student_id)
    do update set joined_at = now(), left_at = null;
  end if;

  update public.access_grants
     set status = 'consumed', consumed_by = new.id, consumed_at = now()
   where id = approved_grant.id;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    approved_grant.granted_by, coalesce(grantor_role, 'master'),
    'identity.access_grant.consumed', 'profile', new.id, 'success',
    jsonb_build_object(
      'role', approved_grant.role,
      'grantId', approved_grant.id,
      'classId', approved_grant.class_id
    )
  );

  return new;
end;
$$;

revoke all on function public.authorize_or_enroll_class_student(uuid, text, timestamptz)
  from public, anon;
grant execute on function public.authorize_or_enroll_class_student(uuid, text, timestamptz)
  to authenticated;

comment on function public.authorize_or_enroll_class_student(uuid, text, timestamptz) is
  'Professor autoriza exclusivamente aluno para turma própria; conta existente é matriculada e conta nova entra via Google e é matriculada no primeiro acesso.';

commit;
