begin;

do $$
declare
  legacy_master_id uuid := '97deac38-2f8e-49b6-b1ee-4629fb994f31';
  verified_master_id uuid := 'b44af93b-5a5f-444c-a392-f040de623a21';
  transferred_grants integer;
begin
  if not exists (
    select 1
      from public.profiles
     where id = verified_master_id
       and lower(email) = 'paulohcordeiroc@gmail.com'
       and role = 'master'
       and status = 'active'
  ) then
    raise exception 'Verified master profile was not found or is not active';
  end if;

  update public.access_grants
     set granted_by = verified_master_id
   where granted_by = legacy_master_id;

  get diagnostics transferred_grants = row_count;

  insert into public.audit_events (
    actor_id,
    actor_role,
    action,
    resource_type,
    resource_id,
    outcome,
    metadata
  ) values (
    verified_master_id,
    'master',
    'identity.legacy_master.references_transferred',
    'profile',
    verified_master_id,
    'success',
    jsonb_build_object(
      'legacyProfileId', legacy_master_id,
      'transferredAccessGrants', transferred_grants,
      'reason', 'remove_incorrect_invited_identity'
    )
  );
end;
$$;

commit;
