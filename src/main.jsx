import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./index.css";
import { LoadingProvider } from "./context/LoadingContext";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import InitialRouteShellBridge from "./components/InitialRouteShellBridge";
import ScrollToTop from "./components/ScrollToTop";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <LoadingProvider>
            <BrowserRouter>
              <InitialRouteShellBridge />
              <ScrollToTop />
              <App />
            </BrowserRouter>
          </LoadingProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
