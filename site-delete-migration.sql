alter table public.sites
  add column if not exists deleted_at timestamptz;

create or replace function public.delete_simple_sites(p_workspace_id uuid, p_site_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_requested integer;
  v_found integer;
  v_programme integer;
  v_items integer;
  v_sites integer;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;

  if p_workspace_id is null or p_site_ids is null or cardinality(p_site_ids) = 0 then
    raise exception 'Seleziona almeno un cantiere';
  end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  ) then
    raise exception 'Non hai i permessi per eliminare cantieri in questa azienda';
  end if;

  select count(distinct x) into v_requested
  from unnest(p_site_ids) as ids(x);

  perform s.id
  from public.sites s
  where s.id = any(p_site_ids)
    and s.workspace_id = p_workspace_id
    and s.deleted_at is null
  for update;

  get diagnostics v_found = row_count;
  if v_found <> v_requested then
    raise exception 'Uno o più cantieri non sono più disponibili. Ricarica la pagina.';
  end if;

  update public.company_schedule
  set status = 'cancelled', updated_at = now()
  where workspace_id = p_workspace_id
    and site_id = any(p_site_ids)
    and status not in ('cancelled', 'done');
  get diagnostics v_programme = row_count;

  update public.personal_items
  set status = 'cancelled', updated_at = now()
  where workspace_id = p_workspace_id
    and site_id = any(p_site_ids)
    and status not in ('cancelled', 'done');
  get diagnostics v_items = row_count;

  update public.sites
  set deleted_at = now(), updated_at = now()
  where workspace_id = p_workspace_id
    and id = any(p_site_ids)
    and deleted_at is null;
  get diagnostics v_sites = row_count;

  return jsonb_build_object(
    'deleted_sites', v_sites,
    'closed_program_items', v_programme,
    'closed_open_items', v_items,
    'history_preserved', true
  );
end;
$$;

revoke all on function public.delete_simple_sites(uuid, uuid[]) from public, anon;
grant execute on function public.delete_simple_sites(uuid, uuid[]) to authenticated;
