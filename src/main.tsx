import React from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { registerPwaServiceWorker } from "@/services/pwaService";
import "./styles/globals.css";

if ("serviceWorker" in navigator) {
  const registerServiceWorker = () => {
    void registerPwaServiceWorker().catch((error: unknown) => {
      console.error("FinSight service worker registration failed:", error);
    });
  };
  if (document.readyState === "complete") registerServiceWorker();
  else window.addEventListener("load", registerServiceWorker, { once: true });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element. Check that index.html includes #root.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </MotionConfig>
  </React.StrictMode>,
);