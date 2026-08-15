drop function if exists public.superadmin_portfolio_usage(integer);

create function public.superadmin_portfolio_usage(p_days integer default 30)
returns table (
  eleam_id uuid,
  usuarios_totales bigint,
  usuarios_activos bigint,
  usuarios_sin_primer_ingreso bigint,
  registros bigint,
  modulos_activos bigint,
  ultima_actividad timestamptz,
  residentes_totales bigint,
  residentes_activos bigint,
  camas_totales bigint,
  camas_ocupadas bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
begin
  if not public.is_superadmin() then
    raise exception 'Solo superadmin puede consultar el uso general de la cartera.' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'La ventana de uso debe estar entre 1 y 365 dias.' using errcode = '22023';
  end if;
  v_since := now() - make_interval(days => p_days);

  return query
  with actividad as (
    select r.eleam_id, sv.registrado_por as actor_id, sv.creado_en as ocurrido_en, 'signos'::text as modulo from public.signos_vitales sv join public.residentes r on r.id = sv.residente_id
    union all select r.eleam_id, od.registrado_por, od.creado_en, 'observaciones' from public.observaciones_diarias od join public.residentes r on r.id = od.residente_id
    union all select ma.eleam_id, ma.administrado_por, ma.administrado_en, 'medicamentos' from public.medicamentos_administraciones ma where ma.administrado_en is not null
    union all select tc.eleam_id, tc.cumplida_por, tc.cumplida_en, 'cuidados' from public.tareas_cuidado tc where tc.cumplida_en is not null
    union all select te.eleam_id, te.creado_por, te.creado_en, 'turnos' from public.turno_entregas te
    union all select r.eleam_id, r.creado_por, r.creado_en, 'residentes' from public.residentes r where r.eleam_id is not null
    union all select ea.eleam_id, ea.registrado_por, ea.creado_en, 'eventos' from public.eventos_adversos ea
    union all select ca.eleam_id, ca.realizado_por, ca.realizado_en, 'camas' from public.camas_audit ca where ca.eleam_id is not null
    union all select ad.eleam_id, ad.subido_por, ad.creado_en, 'acreditacion' from public.acred_documentos ad
  ),
  uso as (
    select a.eleam_id,
      count(*) filter (where a.ocurrido_en >= v_since) as registros,
      count(distinct a.actor_id) filter (where a.ocurrido_en >= v_since and a.actor_id is not null) as usuarios_activos,
      count(distinct a.modulo) filter (where a.ocurrido_en >= v_since) as modulos_activos,
      max(a.ocurrido_en) as ultima_actividad
    from actividad a where a.eleam_id is not null group by a.eleam_id
  ),
  usuarios as (
    select p.eleam_id, count(*) as usuarios_totales,
      count(*) filter (where p.must_reset_password = true) as usuarios_sin_primer_ingreso
    from public.profiles p
    where p.eleam_id is not null and p.rol in ('admin_eleam', 'funcionario')
    group by p.eleam_id
  ),
  residentes_capacidad as (
    select r.eleam_id,
      count(*) as residentes_totales,
      count(*) filter (where r.estado in ('activo', 'hospitalizado')) as residentes_activos
    from public.residentes r
    where r.eleam_id is not null
    group by r.eleam_id
  ),
  camas_capacidad as (
    select c.eleam_id,
      count(*) as camas_totales,
      count(*) filter (
        where exists (
          select 1 from public.cama_asignaciones ca
          where ca.cama_id = c.id and ca.fecha_fin is null
        )
      ) as camas_ocupadas
    from public.camas c
    where c.eleam_id is not null
    group by c.eleam_id
  )
  select e.id,
    coalesce(u.usuarios_totales, 0)::bigint,
    coalesce(us.usuarios_activos, 0)::bigint,
    coalesce(u.usuarios_sin_primer_ingreso, 0)::bigint,
    coalesce(us.registros, 0)::bigint,
    coalesce(us.modulos_activos, 0)::bigint,
    us.ultima_actividad,
    coalesce(rc.residentes_totales, 0)::bigint,
    coalesce(rc.residentes_activos, 0)::bigint,
    coalesce(cc.camas_totales, 0)::bigint,
    coalesce(cc.camas_ocupadas, 0)::bigint
  from public.eleams e
  left join usuarios u on u.eleam_id = e.id
  left join uso us on us.eleam_id = e.id
  left join residentes_capacidad rc on rc.eleam_id = e.id
  left join camas_capacidad cc on cc.eleam_id = e.id;
end;
$$;

revoke all on function public.superadmin_portfolio_usage(integer) from public;
grant execute on function public.superadmin_portfolio_usage(integer) to authenticated;
