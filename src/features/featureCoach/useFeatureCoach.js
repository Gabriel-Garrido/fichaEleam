import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { hasCoach } from "./coachCatalog";

export default function useFeatureCoach(featureId) {
  const auth = useAuth();
  const userId = auth?.profile?.id ?? null;
  const isExcluded = !auth?.user || auth?.isSuperadmin || !userId;
  const exists = hasCoach(featureId);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isExcluded || !exists) {
      setIsOpen(false);
    }
  }, [featureId, userId, isExcluded, exists]);

  const open = useCallback(() => {
    if (isExcluded || !exists) return;
    setIsOpen(true);
  }, [isExcluded, exists]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    enabled: !isExcluded && exists,
    open,
    close,
    dismiss,
  };
}
