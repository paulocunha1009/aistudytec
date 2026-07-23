begin;

create or replace function public.revoke_teacher_student_grant(p_grant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_grant public.access_grants%rowtype;
begin
  select * into target_grant
  from public.access_grants
  where id = p_grant_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Autorização não encontrada';
  end if;

  if target_grant.role <> 'student'
     or target_grant.status <> 'pending'
     or target_grant.class_id is null
     or not (
       (
         target_grant.granted_by = actor_id
         and public.owns_class(target_grant.class_id)
       )
       or public.is_master_aal2()
     ) then
    raise exception using errcode = '42501',
      message = 'Você não pode revogar esta autorização';
  end if;

  update public.access_grants
  set status = 'revoked', revoked_at = now()
  where id = p_grant_id;
end;
$$;

revoke all on function public.revoke_teacher_student_grant(uuid) from public, anon;
grant execute on function public.revoke_teacher_student_grant(uuid) to authenticated;

comment on function public.revoke_teacher_student_grant(uuid) is
  'Professor revoga somente autorização pendente de aluno criada por ele para turma própria; master AAL2 mantém acesso global.';

commit;
