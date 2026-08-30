import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getNavigationSections, getQuickActions, getMobileBottomNav } from "./navigationConfig";

export function useNavigationItems() {
  const auth = useAuth();

  return useMemo(() => {
    const sections = getNavigationSections(auth);
    const allItems = sections.flatMap((section) =>
      section.items.map((item) => ({ ...item, section: section.label }))
    );
    const bottomNavSlots = getMobileBottomNav(auth);

    return {
      sections,
      allItems,
      bottomNavSlots,
      quickActions: getQuickActions(auth),
    };
  }, [auth]);
}
