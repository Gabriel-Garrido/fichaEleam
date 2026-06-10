import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return undefined;
    }

    const targetId = decodeURIComponent(hash.slice(1));
    let rafId = 0;
    let timeoutId = 0;

    const scrollToHash = () => {
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
    };

    rafId = window.requestAnimationFrame(scrollToHash);
    timeoutId = window.setTimeout(scrollToHash, 80);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, search, hash]);

  return null;
}
