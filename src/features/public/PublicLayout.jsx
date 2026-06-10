import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import PublicShell from "./PublicShell";
import PublicRouteFallback from "./PublicRouteFallback";

// Monta el chrome público (navbar, footer, FAB de WhatsApp) UNA sola vez y deja que el
// cuerpo cambie vía <Outlet>. Así la navegación entre páginas públicas no remonta el
// shell: sin parpadeo del navbar/footer/FAB y con un loader contenido para el cuerpo.
// PublicShell hace fallback de `current` a location.pathname, por lo que cada página
// resalta sola en el nav sin pasar props.
export default function PublicLayout() {
  return (
    <PublicShell>
      {(ctx) => (
        <Suspense fallback={<PublicRouteFallback />}>
          <Outlet context={ctx} />
        </Suspense>
      )}
    </PublicShell>
  );
}
