begin;

drop policy if exists access_grants_master_all on public.access_grants;

create policy access_grants_master_all
on public.access_grants
for all
to authenticated
using ((select public.is_master_aal2()))
with check (
  (select public.is_master_aal2())
  and granted_by = (select auth.uid())
);

comment on policy access_grants_master_all on public.access_grants is
  'Master com AAL2 gerencia autorizações e só pode registrar a própria identidade como concedente.';

commit;
