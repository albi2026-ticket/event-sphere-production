import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import welcomeHtml from "../public/site/welcome.html?raw";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://cdn.jsdelivr.net https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
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

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);

  Object.entries(securityHeaders).forEach(([header, value]) => {
    headers.set(header, value);
  });

  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function preferredLanguage(request: Request): "en" | "sq" {
  const url = new URL(request.url);
  const queryLanguage = url.searchParams.get("lang");
  if (queryLanguage === "sq") return "sq";

  const cookieLanguage = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("preferred_language="))
    ?.split("=")[1];
  if (cookieLanguage === "sq") return "sq";

  const acceptLanguage = request.headers.get("accept-language") || "";
  return acceptLanguage.toLowerCase().startsWith("sq") ? "sq" : "en";
}

function brandedErrorResponse(request: Request): Response {
  return new Response(renderErrorPage({ kind: "server", language: preferredLanguage(request) }), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isProductionRootRequest(request: Request): boolean {
  const url = new URL(request.url);

  return (request.method === "GET" || request.method === "HEAD") && url.pathname === "/";
}

function welcomeResponse(request: Request): Response {
  return withSecurityHeaders(
    new Response(request.method === "HEAD" ? null : welcomeHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
    request,
  );
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response, request: Request): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse(request);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (isProductionRootRequest(request)) {
        return welcomeResponse(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response, request), request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(brandedErrorResponse(request), request);
    }
  },
};
