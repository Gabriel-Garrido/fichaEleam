import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { hasCoach } from "./coachCatalog";
import { hasSeenCoach, markCoachSeen, resetCoachSeen } from "./featureCoachStorage";

export default function useFeatureCoach(featureId) {
  const auth = useAuth();
  const userId = auth?.profile?.id ?? null;
  const isExcluded = !auth?.user || auth?.isSuperadmin || !userId;
  const exists = hasCoach(featureId);

  const [hasSeen, setHasSeen] = useState(() =>
    !isExcluded && exists ? hasSeenCoach(featureId, userId) : true,
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isExcluded || !exists) {
      setHasSeen(true);
      setIsOpen(false);
      return;
    }
    const seen = hasSeenCoach(featureId, userId);
    setHasSeen(seen);
    setIsOpen(!seen);
  }, [featureId, userId, isExcluded, exists]);

  const open = useCallback(() => {
    if (isExcluded || !exists) return;
    setIsOpen(true);
  }, [isExcluded, exists]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismiss = useCallback(() => {
    if (!isExcluded && exists && userId) {
      markCoachSeen(featureId, userId);
    }
    setHasSeen(true);
    setIsOpen(false);
  }, [featureId, userId, isExcluded, exists]);

  const reset = useCallback(() => {
    if (isExcluded || !exists || !userId) return;
    resetCoachSeen(featureId, userId);
    setHasSeen(false);
    setIsOpen(true);
  }, [featureId, userId, isExcluded, exists]);

  return {
    isOpen,
    hasSeen,
    enabled: !isExcluded && exists,
    open,
    close,
    dismiss,
    reset,
  };
}
