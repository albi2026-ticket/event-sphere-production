// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { ViteDevServer } from "vite";
import { resolveCleanStaticHtmlUrl } from "./src/lib/clean-url-routing";

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://cdn.jsdelivr.net https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http://127.0.0.1:8000 http://localhost:8000",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "connect-src 'self' http: https: ws: wss:",
    "frame-src 'self' https://maps.google.com https://www.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": [
    "accelerometer=()",
    "autoplay=()",
    "camera=(self)",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=(self)",
    "geolocation=(self)",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=(self)",
    "picture-in-picture=()",
    "usb=()",
  ].join(", "),
};

function cleanStaticHtmlUrls() {
  const siteRoot = path.resolve(process.cwd(), "public/site");

  return {
    name: "clean-static-html-urls",
    apply: "serve" as const,
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        Object.entries(securityHeaders).forEach(([header, value]) => {
          res.setHeader(header, value);
        });

        if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) {
          return next();
        }

        const url = new URL(req.url, "http://localhost");
        const resolution = resolveCleanStaticHtmlUrl({
          url,
          method: req.method,
          hasPage: (pageName) => existsSync(path.join(siteRoot, `${pageName}.html`)),
        });

        if (!resolution) {
          return next();
        }

        req.url = `${resolution.pathname}${url.search}`;
        return next();
      });
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  plugins: [cleanStaticHtmlUrls()],
  tanstackStart: {
    server: { entry: "server" },
  },
});
