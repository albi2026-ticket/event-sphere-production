import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

type ErrorPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  secondary: string;
};

const errorCopy = {
  en: {
    forbidden: {
      eyebrow: "403",
      title: "You don’t have access to this page.",
      description:
        "This area is available only to the right account type. Sign in with another account or return to your dashboard.",
      primary: "Go to dashboard",
      secondary: "Go home",
    },
    notFound: {
      eyebrow: "404",
      title: "We couldn’t find that page.",
      description:
        "The link may be outdated, or the page may have moved. You can go home or browse events instead.",
      primary: "Go home",
      secondary: "Browse events",
    },
    server: {
      eyebrow: "500",
      title: "Something didn’t load correctly.",
      description:
        "We’re having trouble opening this page. Please try again, or go back home while we sort it out.",
      primary: "Try again",
      secondary: "Go home",
    },
    offline: {
      eyebrow: "Offline",
      title: "You appear to be offline.",
      description:
        "Check your internet connection, then try loading the page again.",
      primary: "Try again",
      secondary: "Go home",
    },
  },
  sq: {
    forbidden: {
      eyebrow: "403",
      title: "Nuk keni qasje në këtë faqe.",
      description:
        "Kjo pjesë është e disponueshme vetëm për llojin e duhur të llogarisë. Identifikohuni me një llogari tjetër ose kthehuni te paneli juaj.",
      primary: "Shko te paneli",
      secondary: "Shko në ballinë",
    },
    notFound: {
      eyebrow: "404",
      title: "Nuk mundëm ta gjejmë këtë faqe.",
      description:
        "Linku mund të jetë i vjetër ose faqja mund të jetë zhvendosur. Mund të ktheheni në ballinë ose të shfletoni eventet.",
      primary: "Shko në ballinë",
      secondary: "Shfleto eventet",
    },
    server: {
      eyebrow: "500",
      title: "Diçka nuk u ngarkua si duhet.",
      description:
        "Po hasim vështirësi me hapjen e kësaj faqeje. Ju lutemi provoni përsëri ose kthehuni në ballinë ndërkohë.",
      primary: "Provo përsëri",
      secondary: "Shko në ballinë",
    },
    offline: {
      eyebrow: "Pa internet",
      title: "Duket se nuk jeni të lidhur me internetin.",
      description:
        "Kontrolloni lidhjen tuaj me internetin dhe provoni ta ngarkoni faqen përsëri.",
      primary: "Provo përsëri",
      secondary: "Shko në ballinë",
    },
  },
} satisfies Record<"en" | "sq", Record<string, ErrorPageCopy>>;

function currentLanguage() {
  if (typeof window === "undefined") return "en";
  try {
    const language =
      window.localStorage.getItem("preferred_language") ||
      window.localStorage.getItem("tiketa_language");
    return language === "sq" ? "sq" : "en";
  } catch {
    return "en";
  }
}

function ErrorLayout({
  copy,
  onPrimary,
  primaryHref,
  secondaryHref = "/",
}: {
  copy: ErrorPageCopy;
  onPrimary?: () => void;
  primaryHref?: string;
  secondaryHref?: string;
}) {
  const primaryClass =
    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
  const secondaryClass =
    "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted text-lg font-semibold text-muted-foreground">
          {copy.eyebrow}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {onPrimary ? (
            <button onClick={onPrimary} className={primaryClass}>
              {copy.primary}
            </button>
          ) : (
            <a href={primaryHref || "/"} className={primaryClass}>
              {copy.primary}
            </a>
          )}
          <a href={secondaryHref} className={secondaryClass}>
            {copy.secondary}
          </a>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  const copy = errorCopy[currentLanguage()].notFound;
  return <ErrorLayout copy={copy} primaryHref="/" secondaryHref="/events/list" />;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const status = Number((error as Error & { status?: number }).status || 500);
  const language = currentLanguage();
  const key = status === 403 ? "forbidden" : typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "server";
  const copy = errorCopy[language][key];

  return (
    <ErrorLayout
      copy={copy}
      primaryHref={key === "forbidden" ? "/dashboard" : undefined}
      onPrimary={
        key === "forbidden"
          ? undefined
          : () => {
              router.invalidate();
              reset();
            }
      }
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tiketa" },
      {
        name: "description",
        content: "Discover events, buy tickets, and manage reservations with Tiketa.",
      },
      { name: "author", content: "Tiketa" },
      { property: "og:title", content: "Tiketa" },
      {
        property: "og:description",
        content: "Discover events, buy tickets, and manage reservations with Tiketa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Tiketa" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
