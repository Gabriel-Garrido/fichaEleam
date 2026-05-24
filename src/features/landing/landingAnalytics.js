import { useEffect, useRef } from "react";
import { supabase } from "../../services/supabaseConfig";
import { getLandingContext, getLandingSessionId } from "./landingContext";

export async function trackEvent(tipo, elemento = null, valor = null) {
  try {
    if (!supabase) return;
    const context = getLandingContext();
    // El insert directo del cliente fue retirado: la Edge Function
    // track-landing-event valida e inserta con service role.
    await supabase.functions.invoke("track-landing-event", {
      body: {
        tipo,
        pagina:     context.pagina_origen,
        elemento,
        valor:      valor ? String(valor) : null,
        session_id: getLandingSessionId(),
        referrer:   context.referrer,
        utm_source: context.utm_source,
        utm_medium: context.utm_medium,
        utm_campaign: context.utm_campaign,
      },
    });
  } catch {
    // Analytics never breaks UX
  }
}

export function useScrollDepth(thresholds = [25, 50, 75, 90]) {
  const fired = useRef(new Set());
  useEffect(() => {
    const check = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total    = document.documentElement.scrollHeight;
      const pct      = Math.floor((scrolled / total) * 100);
      for (const t of thresholds) {
        if (pct >= t && !fired.current.has(t)) {
          fired.current.add(t);
          trackEvent("scroll_depth", null, String(t));
        }
      }
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [thresholds]);
}

export function usePageView(pageName, valor = null) {
  useEffect(() => {
    trackEvent("page_view", pageName ?? null, valor ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useSectionView(ref, sectionName) {
  const fired = useRef(false);
  useEffect(() => {
    if (!ref.current || fired.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          trackEvent("section_view", sectionName);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, sectionName]);
}
