(function () {
  "use strict";

  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
  const DEFAULT_LOCAL_API_PORT = "8000";
  const API_PATH = "/api";

  const meta = document.querySelector('meta[name="api-base"]');
  const metaEnv = document.querySelector('meta[name="app-env"]');
  const metaLocal = document.querySelector('meta[name="api-base-local"]');
  const metaStaging = document.querySelector('meta[name="api-base-staging"]');
  const metaProduction = document.querySelector('meta[name="api-base-production"]');
  const metaLocalPort = document.querySelector('meta[name="api-local-port"]');

  function clean(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isLocalHost(hostname) {
    return LOCAL_HOSTS.includes(hostname);
  }

  function environment() {
    const configured = clean(window.__TIKETA_ENV__) || clean(metaEnv?.getAttribute("content"));
    if (configured) return configured.toLowerCase();
    if (isLocalHost(location.hostname)) return "local";
    if (/(\.|-)staging\.|^staging[.-]/i.test(location.hostname)) return "staging";
    return "production";
  }

  function environmentBase(env) {
    const fromMap =
      window.__TIKETA_API_BASES__ && typeof window.__TIKETA_API_BASES__ === "object"
        ? clean(window.__TIKETA_API_BASES__[env])
        : "";

    if (fromMap) return fromMap;

    if (env === "local") return clean(metaLocal?.getAttribute("content"));
    if (env === "staging") return clean(metaStaging?.getAttribute("content"));
    if (env === "production") return clean(metaProduction?.getAttribute("content"));

    return "";
  }

  function localFallback() {
    const port =
      clean(window.__TIKETA_LOCAL_API_PORT__) ||
      clean(metaLocalPort?.getAttribute("content")) ||
      DEFAULT_LOCAL_API_PORT;
    const host = location.hostname || "127.0.0.1";

    return `${location.protocol || "http:"}//${host}:${port}${API_PATH}`;
  }

  function sameOriginFallback() {
    return API_PATH;
  }

  function normalizeBase(value) {
    const raw = clean(value);
    if (!raw) return "";

    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      const url = new URL(raw.startsWith("//") ? `${location.protocol}${raw}` : raw);
      const path = url.pathname.replace(/\/+$/, "");
      url.pathname = path && path !== "/" ? path : API_PATH;

      return raw.startsWith("//")
        ? `${url.href.replace(url.protocol, "").replace(/\/+$/, "")}`
        : url.href.replace(/\/+$/, "");
    }

    if (raw.startsWith("/")) {
      return raw.replace(/\/+$/, "") || API_PATH;
    }

    return `/${raw.replace(/^\/+|\/+$/g, "")}`;
  }

  const env = environment();
  const explicitBase =
    clean(window.__TIKETA_API_BASE_URL__) ||
    clean(window.__EVENT_SPHERE_API__) ||
    clean(meta?.getAttribute("content"));
  const fallback = env === "local" ? localFallback() : sameOriginFallback();

  const base = normalizeBase(explicitBase || environmentBase(env) || fallback);

  window.EventSphereConfig = {
    API_BASE_URL: base,
    API_ENV: env,
    TOKEN_KEY: "event_sphere_token",
    USER_KEY: "event_sphere_user",
    CART_KEY: "event_sphere_cart",
    LOGIN_URL: "/login",
  };

  function cleanSlug(value) {
    return String(value || "")
      .trim()
      .replace(/^\/+|\/+$/g, "");
  }

  function detailUrl(basePath, slug) {
    const clean = cleanSlug(slug);
    return clean ? `${basePath}/${encodeURIComponent(clean)}` : basePath;
  }

  function canonicalDetailUrl(basePath, slug) {
    const clean = cleanSlug(slug).split(/[?#]/)[0];
    return clean ? `${basePath}/${encodeURIComponent(clean)}` : basePath;
  }

  function pathSlug(basePath) {
    const path = location.pathname.replace(/^\/site\//, "/").replace(/\.html$/, "");
    const prefix = `${basePath}/`;
    if (!path.startsWith(prefix)) return "";
    return decodeURIComponent(path.slice(prefix.length).split("/")[0] || "");
  }

  function detailSlug(basePath, aliases = []) {
    const params = new URLSearchParams(location.search);
    const fromPath = pathSlug(basePath);
    const keys = ["id", "slug", ...aliases];
    const fromQuery = keys.map((key) => params.get(key)).find(Boolean) || "";
    return cleanSlug(fromPath || fromQuery);
  }

  function redirectLegacyDetail(basePath, aliases = []) {
    if (pathSlug(basePath)) return;
    const params = new URLSearchParams(location.search);
    const keys = ["id", "slug", ...aliases];
    const slug = cleanSlug(keys.map((key) => params.get(key)).find(Boolean));
    if (!slug) return;
    location.replace(detailUrl(basePath, slug));
  }

  function setCanonical(path) {
    const cleanPath = `/${cleanSlug(path || location.pathname)}`.replace(/\/$/, "") || "/";
    const href = cleanPath === "" ? "/" : cleanPath;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = href || "/";
  }

  window.EventSphereRoutes = {
    eventUrl: (slug) => detailUrl("/event", slug),
    restaurantUrl: (slug) => detailUrl("/restaurant", slug),
    eventSlug: () => detailSlug("/event"),
    restaurantSlug: () => detailSlug("/restaurant", ["venue"]),
    redirectLegacyEvent: () => redirectLegacyDetail("/event"),
    redirectLegacyRestaurant: () => redirectLegacyDetail("/restaurant", ["venue"]),
    setCanonical,
    setEventCanonical: (slug) => setCanonical(canonicalDetailUrl("/event", slug)),
    setRestaurantCanonical: (slug) => setCanonical(canonicalDetailUrl("/restaurant", slug)),
  };
})();
