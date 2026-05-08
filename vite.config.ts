import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Required for Sentry to correlate errors with source maps
    sourcemap: true,
  },
  plugins: [
    react(),
    // Upload source maps to Sentry only when SENTRY_AUTH_TOKEN is set (CI/CD)
    // In local dev this plugin is skipped entirely — no DSN or token needed
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT ?? "vyllad-frontend",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Delete source maps from the build output after uploading
      // so they are never served publicly
      sourcemaps: {
        filesToDeleteAfterUpload: ["dist/**/*.map"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
