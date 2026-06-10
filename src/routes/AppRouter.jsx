import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Loading from "../components/Loading";
import PublicLayout from "../features/public/PublicLayout";
import {
  loadLandingPage,
  loadPublicBlogList,
  loadPublicBlogPost,
  loadSoftwareEleamPage,
  loadCalculadoraDotacionPage,
  loadAcreditacionSeremiPage,
  loadFaqPage,
  loadContactoPage,
  loadAuthenticatedApp,
} from "./publicRoutes";

const LandingPage = lazy(loadLandingPage);
const PublicBlogList = lazy(loadPublicBlogList);
const PublicBlogPost = lazy(loadPublicBlogPost);
const SoftwareEleamPage = lazy(loadSoftwareEleamPage);
const CalculadoraDotacionPage = lazy(loadCalculadoraDotacionPage);
const AcreditacionSeremiPage = lazy(loadAcreditacionSeremiPage);
const FaqPage = lazy(loadFaqPage);
const ContactoPage = lazy(loadContactoPage);
const AuthenticatedApp = lazy(loadAuthenticatedApp);

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading message="Cargando vista..." />}>
      <Routes>
        {/* Páginas públicas SEO bajo un layout persistente: el navbar/footer se montan
            una vez y solo cambia el cuerpo (Suspense contenido en PublicLayout). */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/blog" element={<PublicBlogList />} />
          <Route path="/blog/:slug" element={<PublicBlogPost />} />
          <Route path="/acreditacion-seremi" element={<AcreditacionSeremiPage />} />
          <Route path="/software-eleam" element={<SoftwareEleamPage />} />
          <Route path="/calculadora-dotacion-eleam" element={<CalculadoraDotacionPage />} />
          <Route path="/preguntas-frecuentes" element={<FaqPage />} />
          <Route path="/contacto" element={<ContactoPage />} />
        </Route>
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </Suspense>
  );
}
