import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getCoach } from "./coachCatalog";

export default function useFeatureCoach(featureId) {
  const auth = useAuth();
  const userId = auth?.profile?.id ?? null;
  const isExcluded = !auth?.user || auth?.isSuperadmin || !userId;
  const available = Boolean(getCoach(featureId, auth));

  const [isOpen, setIsOpen] = useState(false);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (isExcluded || !available) {
      setIsOpen(false);
    }
  }, [featureId, userId, isExcluded, available]);

  const open = useCallback(() => {
    if (isExcluded || !available) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setIsOpen(true);
  }, [isExcluded, available]);

  const close = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus?.());
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus?.());
  }, []);

  return {
    isOpen,
    enabled: !isExcluded && available,
    open,
    close,
    dismiss,
  };
}
