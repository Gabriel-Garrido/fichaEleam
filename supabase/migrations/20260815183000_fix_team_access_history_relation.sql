-- El historial de acceso muestra al administrador responsable. La FK original
-- apuntaba a auth.users, que PostgREST no puede relacionar con public.profiles.
-- Todos los actores de gestionar_acceso_usuario son perfiles activos.
alter table public.usuario_acceso_historial
  drop constraint if exists usuario_acceso_historial_realizado_por_fkey;

alter table public.usuario_acceso_historial
  add constraint usuario_acceso_historial_realizado_por_fkey
  foreign key (realizado_por) references public.profiles(id) on delete set null;

create index if not exists idx_usuario_acceso_historial_profile
  on public.usuario_acceso_historial(eleam_id, profile_id, realizado_en desc);

notify pgrst, 'reload schema';
