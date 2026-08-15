-- Impide modificar autorizaciones mediante la API cuando el ELEAM no tiene
-- acceso operativo vigente. La pertenencia al mismo ELEAM continúa siendo
-- obligatoria tanto para la fila existente como para el nuevo valor.
drop policy if exists "fp_admin_all" on public.funcionario_permisos;

create policy "fp_admin_all" on public.funcionario_permisos
  for all using (
    public.my_rol() = 'admin_eleam'
    and public.eleam_has_access(public.my_eleam_id())
    and profile_id in (
      select id from public.profiles
      where eleam_id = public.my_eleam_id() and rol = 'funcionario'
    )
  )
  with check (
    public.my_rol() = 'admin_eleam'
    and public.eleam_has_access(public.my_eleam_id())
    and profile_id in (
      select id from public.profiles
      where eleam_id = public.my_eleam_id() and rol = 'funcionario'
    )
  );

drop policy if exists "pfp_admin_all" on public.profile_feature_permissions;

create policy "pfp_admin_all" on public.profile_feature_permissions
  for all using (
    public.my_rol() = 'admin_eleam'
    and public.eleam_has_access(public.my_eleam_id())
    and profile_id in (
      select id from public.profiles
      where eleam_id = public.my_eleam_id() and rol = 'funcionario'
    )
  )
  with check (
    public.my_rol() = 'admin_eleam'
    and public.eleam_has_access(public.my_eleam_id())
    and profile_id in (
      select id from public.profiles
      where eleam_id = public.my_eleam_id() and rol = 'funcionario'
    )
    and (
      enabled = false
      or not exists (
        select 1
        from public.eleam_feature_permissions efp
        join public.profiles p on p.id = profile_feature_permissions.profile_id
        where efp.eleam_id = p.eleam_id
          and efp.rol = p.rol
          and efp.feature_id = profile_feature_permissions.feature_id
          and efp.enabled = false
      )
    )
  );
