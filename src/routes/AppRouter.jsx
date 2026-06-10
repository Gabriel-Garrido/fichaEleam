import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Loading from "../components/Loading";

const LandingPage = lazy(() => import("../features/landing/LandingPage"));
const AcreditacionSeremiPage = lazy(() => import("../features/public/AcreditacionSeremiPage"));
const SoftwareEleamPage = lazy(() => import("../features/public/SoftwareEleamPage"));
const CalculadoraDotacionPage = lazy(() => import("../features/public/CalculadoraDotacionPage"));
const FaqPage = lazy(() => import("../features/public/FaqPage"));
const ContactoPage = lazy(() => import("../features/public/ContactoPage"));
const PublicBlogList = lazy(() => import("../features/blog/PublicBlogList"));
const PublicBlogPost = lazy(() => import("../features/blog/PublicBlogPost"));
const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading message="Cargando vista..." />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/blog" element={<PublicBlogList />} />
        <Route path="/blog/:slug" element={<PublicBlogPost />} />
        <Route path="/acreditacion-seremi" element={<AcreditacionSeremiPage />} />
        <Route path="/software-eleam" element={<SoftwareEleamPage />} />
        <Route path="/calculadora-dotacion-eleam" element={<CalculadoraDotacionPage />} />
        <Route path="/preguntas-frecuentes" element={<FaqPage />} />
        <Route path="/contacto" element={<ContactoPage />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </Suspense>
  );
}
