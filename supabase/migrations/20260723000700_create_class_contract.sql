begin;

create or replace function public.create_class(
  p_name text,
  p_theme text default null,
  p_grade_year public.grade_year default 'any'
)
returns public.classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  normalized_name text := btrim(p_name);
  normalized_theme text := nullif(btrim(p_theme), '');
  generated_code text;
  created_class public.classes%rowtype;
  attempt integer := 0;
begin
  if actor_id is null or not (
    actor_role = 'teacher'
    or (actor_role = 'master' and public.is_master_aal2())
  ) then
    raise exception using
      errcode = '42501',
      message = 'Apenas professor ativo ou master com MFA pode criar turma';
  end if;

  if char_length(normalized_name) not between 2 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Nome da turma deve ter entre 2 e 120 caracteres';
  end if;

  loop
    attempt := attempt + 1;
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));

    begin
      insert into public.classes (name, code, theme, grade_year, teacher_id)
      values (normalized_name, generated_code, normalized_theme, p_grade_year, actor_id)
      returning * into created_class;
      exit;
    exception
      when unique_violation then
        if attempt >= 5 then
          raise;
        end if;
    end;
  end loop;

  insert into public.audit_events (
    actor_id,
    actor_role,
    action,
    resource_type,
    resource_id,
    outcome,
    metadata
  ) values (
    actor_id,
    actor_role,
    'class.created',
    'class',
    created_class.id,
    'success',
    jsonb_build_object(
      'gradeYear', created_class.grade_year,
      'hasTheme', created_class.theme is not null
    )
  );

  return created_class;
end;
$$;

revoke all on function public.create_class(text, text, public.grade_year) from public, anon;
grant execute on function public.create_class(text, text, public.grade_year) to authenticated;

comment on function public.create_class(text, text, public.grade_year) is
  'Cria turma com código aleatório, proprietário derivado da sessão e auditoria; aceita professor ativo ou master em AAL2.';

commit;
