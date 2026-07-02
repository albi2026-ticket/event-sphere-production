// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync } from "node:fs";
import path from "node:path";

const cleanUrlAliases: Record<string, string> = {
  events: "index",
  "events/list": "events",
  event: "event-details",
  restaurant: "venue",
  restaurants: "reservations",
  "my-tickets": "dashboard",
};

function cleanStaticHtmlUrls() {
  const siteRoot = path.resolve(process.cwd(), "public/site");

  return {
    name: "clean-static-html-urls",
    apply: "serve" as const,
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) {
          return next();
        }

        const url = new URL(req.url, "http://localhost");
        const slug = url.pathname.replace(/^\/+|\/+$/g, "");

        if (slug && (slug.includes(".") || !/^[a-z0-9/-]+$/i.test(slug))) {
          return next();
        }

        const pageName = slug ? (cleanUrlAliases[slug] ?? slug) : "welcome";
        const htmlPath = path.join(siteRoot, `${pageName}.html`);

        if (!existsSync(htmlPath)) {
          return next();
        }

        req.url = `/site/${pageName}.html${url.search}`;
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
