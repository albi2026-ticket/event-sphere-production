export type CleanStaticHtmlResolution = {
  pageName: string;
  pathname: string;
};

const cleanUrlAliases: Record<string, string> = {
  events: "index",
  "events/list": "events",
  event: "event-details",
  restaurant: "venue",
  restaurants: "reservations",
  "checkout-success": "checkout-success",
  "checkout-cancelled": "checkout-cancelled",
  "my-tickets": "dashboard",
};

function cleanSlug(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function pageNameForSlug(slug: string): string {
  if (slug.startsWith("event/")) return "event-details";
  if (slug.startsWith("restaurant/")) return "venue";

  return slug ? (cleanUrlAliases[slug] ?? slug) : "welcome";
}

export function resolveCleanStaticHtmlUrl({
  url,
  method = "GET",
  hasPage,
}: {
  url: string | URL;
  method?: string;
  hasPage?: (pageName: string) => boolean;
}): CleanStaticHtmlResolution | null {
  if (method !== "GET" && method !== "HEAD") return null;

  const parsedUrl = typeof url === "string" ? new URL(url, "http://localhost") : url;
  const slug = cleanSlug(parsedUrl.pathname);

  if (slug && (slug.includes(".") || !/^[a-z0-9/-]+$/i.test(slug))) {
    return null;
  }

  const pageName = pageNameForSlug(slug);

  if (hasPage && !hasPage(pageName)) {
    return null;
  }

  return {
    pageName,
    pathname: `/site/${pageName}.html`,
  };
}
