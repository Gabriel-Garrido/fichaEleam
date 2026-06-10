// Loaders de import dinámico compartidos entre AppRouter (lazy) y el prefetch del
// navbar/footer. Usar el MISMO thunk en ambos lados garantiza que el chunk se cachee
// una sola vez: al hacer hover sobre un link, el módulo ya está listo cuando se navega.

export const loadLandingPage = () => import("../features/landing/LandingPage");
export const loadPublicBlogList = () => import("../features/blog/PublicBlogList");
export const loadPublicBlogPost = () => import("../features/blog/PublicBlogPost");
export const loadSoftwareEleamPage = () => import("../features/public/SoftwareEleamPage");
export const loadCalculadoraDotacionPage = () => import("../features/public/CalculadoraDotacionPage");
export const loadAcreditacionSeremiPage = () => import("../features/public/AcreditacionSeremiPage");
export const loadFaqPage = () => import("../features/public/FaqPage");
export const loadContactoPage = () => import("../features/public/ContactoPage");
export const loadAuthenticatedApp = () => import("./AuthenticatedApp");

// Mapa ruta → loader para precargar por path exacto. Las rutas dinámicas (post de blog)
// se resuelven por prefijo en prefetchPublicRoute.
const PUBLIC_ROUTE_LOADERS = {
  "/": loadLandingPage,
  "/blog": loadPublicBlogList,
  "/software-eleam": loadSoftwareEleamPage,
  "/calculadora-dotacion-eleam": loadCalculadoraDotacionPage,
  "/acreditacion-seremi": loadAcreditacionSeremiPage,
  "/preguntas-frecuentes": loadFaqPage,
  "/contacto": loadContactoPage,
};

export function prefetchPublicRoute(to) {
  if (typeof to !== "string") return;
  // Normaliza la forma con slash final (los enlaces internos la usan en producción).
  const path = to.length > 1 ? to.replace(/\/+$/, "") : to;
  if (path.startsWith("/blog/")) {
    loadPublicBlogPost();
    return;
  }
  // /pago, /login y demás rutas internas viven en AuthenticatedApp.
  if (path === "/pago" || path === "/login") {
    loadAuthenticatedApp();
    return;
  }
  const loader = PUBLIC_ROUTE_LOADERS[path];
  if (loader) loader();
}
