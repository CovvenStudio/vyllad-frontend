import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/i18n";
import { monitoring } from "@/lib/monitoring/monitoring";

monitoring.init({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
});

createRoot(document.getElementById("root")!).render(<App />);
