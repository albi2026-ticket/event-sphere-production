type ErrorPageKind = "forbidden" | "notFound" | "server" | "offline" | "network" | "api";

type ErrorPageCopy = {
  code: string;
  title: string;
  description: string;
  primary: string;
  secondary: string;
};

const copies: Record<"en" | "sq", Record<ErrorPageKind, ErrorPageCopy>> = {
  en: {
    forbidden: {
      code: "403",
      title: "You don’t have access to this page.",
      description:
        "This area is available only to the right account type. Sign in with another account or return home.",
      primary: "Go home",
      secondary: "Sign in",
    },
    notFound: {
      code: "404",
      title: "We couldn’t find that page.",
      description:
        "The link may be outdated, or the page may have moved. You can go home or browse events instead.",
      primary: "Go home",
      secondary: "Browse events",
    },
    server: {
      code: "500",
      title: "Something didn’t load correctly.",
      description:
        "We’re having trouble opening this page. Please try again, or go back home while we sort it out.",
      primary: "Try again",
      secondary: "Go home",
    },
    offline: {
      code: "Offline",
      title: "You appear to be offline.",
      description:
        "Check your internet connection, then try loading the page again.",
      primary: "Try again",
      secondary: "Go home",
    },
    network: {
      code: "Network",
      title: "We couldn’t connect.",
      description:
        "Your connection may be unstable. Please check it and try again.",
      primary: "Try again",
      secondary: "Go home",
    },
    api: {
      code: "Service",
      title: "Tiketa is taking longer than expected.",
      description:
        "The service is temporarily unavailable. Please try again in a moment.",
      primary: "Try again",
      secondary: "Go home",
    },
  },
  sq: {
    forbidden: {
      code: "403",
      title: "Nuk keni qasje në këtë faqe.",
      description:
        "Kjo pjesë është e disponueshme vetëm për llojin e duhur të llogarisë. Identifikohuni me një llogari tjetër ose kthehuni në ballinë.",
      primary: "Shko në ballinë",
      secondary: "Identifikohu",
    },
    notFound: {
      code: "404",
      title: "Nuk mundëm ta gjejmë këtë faqe.",
      description:
        "Linku mund të jetë i vjetër ose faqja mund të jetë zhvendosur. Mund të ktheheni në ballinë ose të shfletoni eventet.",
      primary: "Shko në ballinë",
      secondary: "Shfleto eventet",
    },
    server: {
      code: "500",
      title: "Diçka nuk u ngarkua si duhet.",
      description:
        "Po hasim vështirësi me hapjen e kësaj faqeje. Ju lutemi provoni përsëri ose kthehuni në ballinë ndërkohë.",
      primary: "Provo përsëri",
      secondary: "Shko në ballinë",
    },
    offline: {
      code: "Pa internet",
      title: "Duket se nuk jeni të lidhur me internetin.",
      description:
        "Kontrolloni lidhjen tuaj me internetin dhe provoni ta ngarkoni faqen përsëri.",
      primary: "Provo përsëri",
      secondary: "Shko në ballinë",
    },
    network: {
      code: "Lidhja",
      title: "Nuk mundëm të lidhemi.",
      description:
        "Lidhja juaj mund të jetë e paqëndrueshme. Ju lutemi kontrollojeni dhe provoni përsëri.",
      primary: "Provo përsëri",
      secondary: "Shko në ballinë",
    },
    api: {
      code: "Shërbimi",
      title: "Tiketa po vonon më shumë se zakonisht.",
      description:
        "Shërbimi është përkohësisht i padisponueshëm. Ju lutemi provoni përsëri pas pak.",
      primary: "Provo përsëri",
      secondary: "Shko në ballinë",
    },
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderErrorPage(options: { kind?: ErrorPageKind; language?: "en" | "sq" } = {}): string {
  const language = options.language === "sq" ? "sq" : "en";
  const kind = options.kind || "server";
  const copy = copies[language][kind] || copies.en.server;
  const primaryAction = kind === "server" || kind === "offline" || kind === "network" || kind === "api"
    ? `<button class="primary" onclick="location.reload()">${escapeHtml(copy.primary)}</button>`
    : `<a class="primary" href="/">${escapeHtml(copy.primary)}</a>`;
  const secondaryHref = kind === "notFound" ? "/events/list" : kind === "forbidden" ? "/login" : "/";

  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(copy.title)} | Tiketa</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: dark; }
      body { font: 15px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      body::before { content: ""; position: fixed; inset: 0; background: radial-gradient(900px 500px at 50% -10%, rgba(91,140,255,.24), transparent 60%); pointer-events: none; }
      .card { max-width: 34rem; width: 100%; text-align: center; padding: 2rem; position: relative; }
      .badge { width: 4.5rem; height: 4.5rem; margin: 0 auto 1.25rem; display: inline-grid; place-items: center; border-radius: 1.25rem; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #cbd5e1; font-weight: 700; }
      h1 { font-size: clamp(1.65rem, 4vw, 2.25rem); line-height: 1.1; margin: 0 0 0.75rem; }
      p { color: #94a3b8; margin: 0 auto 1.75rem; max-width: 29rem; }
      .actions { display: flex; gap: 0.65rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.7rem 1rem; border-radius: 0.65rem; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: linear-gradient(135deg, #5b8cff, #8b5cf6); color: #fff; }
      .secondary { background: rgba(255,255,255,.06); color: #f8fafc; border-color: rgba(255,255,255,.14); }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">${escapeHtml(copy.code)}</div>
      <h1>${escapeHtml(copy.title)}</h1>
      <p>${escapeHtml(copy.description)}</p>
      <div class="actions">
        ${primaryAction}
        <a class="secondary" href="${secondaryHref}">${escapeHtml(copy.secondary)}</a>
      </div>
    </div>
  </body>
</html>`;
}
