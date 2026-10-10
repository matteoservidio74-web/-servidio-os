-- Preserve the job plan independently of the lifecycle of financial forecasts.
alter table public.company_schedule
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.company_schedule.metadata is
  'Manual job plan: client, crew, planned hours, estimated cost, total and expected deposit. Not actual hours or receipts.';

with snapshots as (
  select s.id,
    jsonb_strip_nulls(jsonb_build_object(
      'contact_name', coalesce(d.contact_name, b.contact_name, t.client_name),
      'expected_amount', coalesce(d.amount, 0),
      'total_amount', coalesce(d.metadata->'total_amount', b.metadata->'total_amount',
        to_jsonb(coalesce(d.amount,0) + coalesce(b.amount,0))),
      'invoiceable', coalesce(d.metadata->'invoiceable', b.metadata->'invoiceable', 'true'::jsonb),
      'source', 'schedule_details_backfill'
    )) as plan
  from public.company_schedule s
  left join public.sites t on t.id=s.site_id and t.workspace_id=s.workspace_id
  left join lateral (
    select p.* from public.personal_items p
    where p.workspace_id=s.workspace_id and p.metadata->>'schedule_id'=s.id::text
      and p.item_type='receivable' and p.category='acconto'
    order by (p.status not in ('cancelled','done')) desc, p.updated_at desc, p.created_at desc
    limit 1
  ) d on true
  left join lateral (
    select p.* from public.personal_items p
    where p.workspace_id=s.workspace_id and p.metadata->>'schedule_id'=s.id::text
      and p.item_type='receivable' and p.category='saldo'
    order by (p.status not in ('cancelled','done')) desc, p.updated_at desc, p.created_at desc
    limit 1
  ) b on true
  where s.metadata='{}'::jsonb and (d.id is not null or b.id is not null)
)
update public.company_schedule s set metadata=snapshots.plan
from snapshots where s.id=snapshots.id;

-- One transaction for the plan, optional new site and outstanding forecasts.
-- SECURITY INVOKER keeps all existing owner/admin and personal-item RLS checks.
create or replace function public.save_simple_job(
  p_workspace_id uuid, p_schedule_id uuid, p_job jsonb
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_previous public.company_schedule%rowtype;
  v_result public.company_schedule%rowtype;
  v_site public.sites%rowtype;
  v_item public.personal_items%rowtype;
  v_existing boolean;
  v_site_id uuid;
  v_date date := (p_job->>'schedule_date')::date;
  v_time time := nullif(p_job->>'time','')::time;
  v_contact text := nullif(trim(p_job->>'contact_name'),'');
  v_title text := trim(p_job->>'title');
  v_total numeric := coalesce(nullif(p_job->>'total_amount','')::numeric,0);
  v_deposit numeric := coalesce(nullif(p_job->>'expected_amount','')::numeric,0);
  v_hours numeric := nullif(p_job->>'planned_hours','')::numeric;
  v_cost numeric := nullif(p_job->>'estimated_cost','')::numeric;
  v_invoiceable boolean := coalesce((p_job->>'invoiceable')::boolean,true);
  v_category text;
  v_target numeric;
  v_fulfilled numeric;
  v_amount numeric;
  v_old_amount numeric;
  v_due timestamptz;
  v_meta jsonb;
begin
  if v_user is null or coalesce(public.workspace_role(p_workspace_id)::text,'') not in ('owner','admin') then
    raise exception 'Accesso non autorizzato' using errcode='42501';
  end if;
  if p_schedule_id is null or v_date is null or coalesce(v_title,'')='' then
    raise exception 'Inserisci giorno e titolo del lavoro';
  end if;
  if v_total<0 or v_deposit<0 or v_hours<0 or v_cost<0
    or (v_total>0 and v_deposit>v_total) then
    raise exception 'Controlla ore e importi: l’acconto non può superare il totale';
  end if;

  select * into v_previous from public.company_schedule
    where id=p_schedule_id and workspace_id=p_workspace_id for update;
  v_existing := found;
  if v_existing and coalesce((p_job->>'is_new')::boolean,false) then
    -- A retry after a successful commit must not duplicate the site or forecasts.
    return to_jsonb(v_previous);
  end if;
  if not v_existing and not coalesce((p_job->>'is_new')::boolean,false) then
    raise exception 'Il lavoro non esiste più. Ricarica il programma';
  end if;
  if v_existing and v_previous.status='cancelled' then
    raise exception 'Questo impegno è stato eliminato. Ricarica il programma';
  end if;
  if v_existing and nullif(p_job->>'expected_updated_at','') is not null
    and v_previous.updated_at <> (p_job->>'expected_updated_at')::timestamptz then
    raise exception 'Il lavoro è stato modificato da un’altra schermata. Ricarica prima di salvarlo';
  end if;

  if p_job->>'site_id'='__new__' then
    if v_contact is null then raise exception 'Inserisci il cliente per creare il nuovo cantiere'; end if;
    insert into public.sites (workspace_id,name,client_name,status,contract_value,created_by,planned_start_date)
      values (p_workspace_id,v_contact,v_contact,'planned',v_total,v_user,v_date)
      returning id into v_site_id;
  else
    v_site_id := nullif(p_job->>'site_id','')::uuid;
    if v_site_id is not null then
      select * into v_site from public.sites
        where id=v_site_id and workspace_id=p_workspace_id for update;
      if not found then raise exception 'Cantiere non presente in questa azienda'; end if;
      v_contact := coalesce(v_contact,v_site.client_name,v_site.name);
      -- Fill a missing estimate only; never overwrite an existing contract.
      if v_site.status='planned' and coalesce(v_site.contract_value,0)=0 and v_total>0 then
        update public.sites set contract_value=v_total where id=v_site_id;
      end if;
    end if;
  end if;
  v_contact := coalesce(v_contact,v_title);
  v_meta := coalesce(v_previous.metadata,'{}'::jsonb) || jsonb_build_object(
    'contact_name',v_contact,'crew',nullif(trim(p_job->>'crew'),''),
    'planned_hours',v_hours,'estimated_cost',v_cost,
    'total_amount',v_total,'expected_amount',v_deposit,
    'invoiceable',v_invoiceable,'source','simple_app'
  );
  if v_existing then
    update public.company_schedule set site_id=v_site_id,schedule_date=v_date,
      scheduled_at=case when v_time is null then null else (v_date+v_time) at time zone 'Europe/Rome' end,
      title=v_title,notes=nullif(p_job->>'notes',''),metadata=v_meta,updated_at=now()
      where id=p_schedule_id and workspace_id=p_workspace_id returning * into v_result;
  else
    insert into public.company_schedule (id,workspace_id,site_id,schedule_date,scheduled_at,title,notes,status,created_by,metadata)
      values (p_schedule_id,p_workspace_id,v_site_id,v_date,
        case when v_time is null then null else (v_date+v_time) at time zone 'Europe/Rome' end,
        v_title,nullif(p_job->>'notes',''),'planned',v_user,v_meta) returning * into v_result;
  end if;

  foreach v_category in array array['acconto','saldo'] loop
    v_target := case when v_category='acconto' then v_deposit else greatest(0,v_total-v_deposit) end;
    v_old_amount := case when v_category='acconto' then coalesce((v_previous.metadata->>'expected_amount')::numeric,0)
      else greatest(0,coalesce((v_previous.metadata->>'total_amount')::numeric,0)-coalesce((v_previous.metadata->>'expected_amount')::numeric,0)) end;
    select coalesce(sum(amount),0) into v_fulfilled from public.personal_items
      where user_id=v_user and workspace_id=p_workspace_id and item_type='receivable'
        and category=v_category and metadata->>'schedule_id'=p_schedule_id::text and status='done';
    v_amount := greatest(0,v_target-v_fulfilled);
    v_due := case when v_category='acconto' then (v_date+time '12:00') at time zone 'Europe/Rome' else null end;
    select * into v_item from public.personal_items
      where user_id=v_user and workspace_id=p_workspace_id and item_type='receivable'
        and category=v_category and metadata->>'schedule_id'=p_schedule_id::text
        and status not in ('done','cancelled')
      order by created_at desc limit 1 for update;
    if found then
      update public.personal_items set site_id=v_site_id,contact_name=v_contact,
        title=case when v_category='acconto' then 'Acconto previsto - ' else 'Saldo previsto - ' end || v_contact,
        amount=v_amount,due_at=v_due,status=case when v_amount>0 then status else 'cancelled' end,
        details=case when v_category='acconto' then 'Acconto previsto all’inizio dei lavori.' else 'Saldo previsto a fine lavori.' end,
        metadata=metadata || jsonb_build_object('total_amount',v_total,'invoiceable',v_invoiceable),updated_at=now()
        where id=v_item.id;
      -- Consolidate duplicate OPEN forecasts only; preserve completed/cancelled history.
      update public.personal_items set status='cancelled',metadata=metadata || jsonb_build_object('superseded_by',v_item.id),updated_at=now()
        where user_id=v_user and workspace_id=p_workspace_id and item_type='receivable'
          and category=v_category and metadata->>'schedule_id'=p_schedule_id::text
          and status not in ('done','cancelled') and id<>v_item.id;
    elsif v_amount>0 and (not v_existing or v_old_amount<>v_target or not exists (
      select 1 from public.personal_items where user_id=v_user and workspace_id=p_workspace_id
        and item_type='receivable' and category=v_category and metadata->>'schedule_id'=p_schedule_id::text
    )) then
      -- An unchanged edit must not revive a forecast the owner previously removed.
      insert into public.personal_items (workspace_id,user_id,site_id,item_type,scope,title,details,status,priority,due_at,amount,category,contact_name,metadata)
        values (p_workspace_id,v_user,v_site_id,'receivable','company',
          case when v_category='acconto' then 'Acconto previsto - ' else 'Saldo previsto - ' end || v_contact,
          case when v_category='acconto' then 'Acconto previsto all’inizio dei lavori.' else 'Saldo previsto a fine lavori.' end,
          'open','normal',v_due,v_amount,v_category,v_contact,
          jsonb_build_object('source','simple_app','schedule_id',p_schedule_id,'due_state','planned',
            'due_when',case when v_category='acconto' then 'inizio_lavori' else 'fine_lavori' end,
            'total_amount',v_total,'invoiceable',v_invoiceable));
    end if;
  end loop;
  return to_jsonb(v_result);
end;
$$;
revoke all on function public.save_simple_job(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_simple_job(uuid,uuid,jsonb) to authenticated;
