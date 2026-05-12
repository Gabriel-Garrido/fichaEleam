import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getNavigationSections, getQuickActions } from "./navigationConfig";

export function useNavigationItems() {
  const auth = useAuth();

  return useMemo(() => {
    const sections = getNavigationSections(auth);
    const allItems = sections.flatMap((section) =>
      section.items.map((item) => ({ ...item, section: section.label }))
    );
    const mobileItems = allItems.filter((item) => item.mobile && !item.disabled).slice(0, 4);

    return {
      sections,
      allItems,
      mobileItems,
      quickActions: getQuickActions(auth),
    };
  }, [auth]);
}
