begin;

do $$
declare
  target_id uuid;
begin
  select id
    into strict target_id
    from public.profiles
   where lower(email) = 'paulohcordeiroc@gmail.com';

  update public.profiles
     set role = 'master',
         status = 'active'
   where id = target_id
     and (role <> 'master' or status <> 'active');

  if found then
    insert into public.audit_events (
      actor_id,
      actor_role,
      action,
      resource_type,
      resource_id,
      outcome,
      metadata
    ) values (
      target_id,
      'master',
      'identity.master_bootstrap.promoted',
      'profile',
      target_id,
      'success',
      jsonb_build_object(
        'email', 'paulohcordeiroc@gmail.com',
        'method', 'verified_google_oauth'
      )
    );
  end if;
end;
$$;

commit;
