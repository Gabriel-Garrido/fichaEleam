import React from "react";

export default function InitialRouteShellBridge() {
  React.useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-fichaeleam-app-route");
  }, []);

  return null;
}
