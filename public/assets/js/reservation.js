/* =========================================================
   Tiketa - Reservations: public venue discovery
   ========================================================= */
(function () {
  "use strict";

  const api = () => window.EventSphereApi;
  const $ = (selector) => document.querySelector(selector);
  const tr = (key, fallback, replacements) => window.t?.(key, replacements) || fallback;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch],
    );
  const fallbackImage = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80";

  const state = {
    venues: [],
    loading: false,
    lookupsLoaded: false,
    discoveryView: "featured",
    discoveryExpanded: false,
    filters: {
      q: "",
      venue_type: "",
      cuisine: "",
      facility: "",
      sort: "featured",
    },
  };

  function venueImage(venue) {
    return (
      venue.images?.[0]?.url || venue.images?.[0]?.image_path || venue.logo_image || fallbackImage
    );
  }

  function absoluteUrl(path) {
    try {
      const origin =
        window.EventSphereConfig?.PUBLIC_URL ||
        window.TIKETA_CONFIG?.PUBLIC_URL ||
        location.origin;
      return new URL(path || "/", origin).href;
    } catch {
      return new URL(path || "/", "https://tiketa-staging.albi-hellocare.workers.dev").href;
    }
  }

  function setJsonLd(name, data) {
    let script = document.querySelector(`script[type="application/ld+json"][${name}]`);
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute(name, "true");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    window.TiketaLanguage?.applyInternationalSeo?.();
  }

  function applyRestaurantListingSchemas(venues) {
    const language = window.TiketaLanguage?.getLanguage?.() || "en";
    setJsonLd("data-restaurants-itemlist-schema", {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Restaurants and Bars",
      itemListElement: venues.slice(0, 24).map((venue, index) => {
        const url = absoluteUrl(
          window.EventSphereRoutes?.restaurantUrl?.(venue.slug || venue.id) ||
            `/restaurant/${encodeURIComponent(venue.slug || venue.id)}`,
        );
        return {
          "@type": "ListItem",
          position: index + 1,
          url,
          item: {
            "@type":
              String(venue.venue_type || "").toLowerCase() === "restaurant"
                ? "Restaurant"
                : "LocalBusiness",
            name: venue.name,
            url,
            image: venueImage(venue),
            address: [venue.address, venue.city, venue.country].filter(Boolean).join(", "),
            servesCuisine: (venue.cuisine_types || []).map((item) => item.name).filter(Boolean),
          },
        };
      }),
      inLanguage: language,
    });

    setJsonLd("data-restaurants-breadcrumb-schema", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: window.t?.("header.home") || "Home",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: window.t?.("header.reservations") || "Restaurants",
          item: absoluteUrl("/restaurants"),
        },
      ],
      inLanguage: language,
    });
  }

  function titleCase(value) {
    return String(value || "Restaurant / Bar")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function preview(items, fallback) {
    const names = (items || [])
      .map((item) => item.name)
      .filter(Boolean)
      .slice(0, 3);
    return names.length ? names.join(", ") : fallback;
  }

  function card(venue) {
    const facilities = preview(
      venue.facilities,
      tr("restaurants.facilities_coming_soon", "Facilities coming soon"),
    );
    const cuisines = preview(venue.cuisine_types, titleCase(venue.venue_type));
    const detailsUrl =
      window.EventSphereRoutes?.restaurantUrl?.(venue.slug) ||
      `/restaurant/${encodeURIComponent(venue.slug)}`;
    const imageAlt = [venue.name, cuisines, venue.city].filter(Boolean).join(" in ");
    return `
    <div class="col-lg-3 col-md-6">
      <a class="text-decoration-none" href="${detailsUrl}">
        <article class="venue-card venue-card-premium">
          <div class="img-wrap">
            <img src="${esc(venueImage(venue))}" alt="${esc(imageAlt)}" loading="lazy" decoding="async" width="800" height="600" sizes="(min-width: 992px) 25vw, (min-width: 768px) 50vw, 100vw" />
            <div class="badges">
              ${venue.featured ? `<span class="chip-available"><i class="bi bi-stars"></i> <span data-i18n="common.featured">${window.t?.("common.featured") || "Featured"}</span></span>` : `<span class="chip-available"><i class="bi bi-circle-fill icon-dot-tiny"></i> <span data-i18n="header.reservations">${window.t?.("header.reservations") || "Reservations"}</span></span>`}
            </div>
          </div>
          <div class="body">
            <div class="d-flex justify-content-between gap-2">
              <h3 class="title m-0">${esc(venue.name)}</h3>
              <span class="rating"><i class="bi bi-cup-hot-fill"></i> ${esc(titleCase(venue.venue_type))}</span>
            </div>
            <div class="meta"><span>${esc(cuisines)}</span><span class="dot"></span><span><i class="bi bi-geo-alt"></i> ${esc(venue.city || "")}</span></div>
            <div class="venue-preview-tags">${(venue.facilities || [])
              .slice(0, 3)
              .map((item) => `<span>${esc(item.name)}</span>`)
              .join("")}</div>
            <div class="footer-row">
              <span class="small text-muted-pro"><i class="bi bi-egg-fried text-gold"></i> ${esc(facilities)}</span>
              <span class="btn btn-gold btn-sm" data-i18n="restaurants.view_venue">${tr("restaurants.view_venue", "View Venue")}</span>
            </div>
          </div>
        </article>
      </a>
    </div>`;
  }

  function fill(id, venues) {
    const el = document.getElementById(id);
    if (!el) return;
    if (state.loading) {
      el.innerHTML =
        window.EventSphereSkeleton?.venueCards?.(4) ||
        Array.from({ length: 4 })
          .map(
            () => `
        <div class="col-lg-3 col-md-6">
          <article class="venue-card venue-card-premium"><div class="img-wrap reservation-skeleton"></div><div class="body"><div class="reservation-skeleton-line"></div><div class="reservation-skeleton-line short"></div><div class="reservation-skeleton-line"></div></div></article>
        </div>
      `,
          )
          .join("");
      return;
    }
    el.innerHTML = venues.map(card).join("");
  }

  function newestFirst(venues) {
    return [...venues].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function discoveryVenues(venues) {
    if (state.discoveryView === "new") {
      return newestFirst(venues);
    }

    if (state.discoveryView === "popular") {
      return venues;
    }

    const featured = venues.filter((venue) => venue.featured);
    return featured.length ? featured : venues;
  }

  function updateDiscoveryHeading(count) {
    const title = $("[data-main-discovery-title]");
    const subtitle = $("[data-main-discovery-subtitle]");
    const emptyTitle = $("[data-venue-empty-title]");
    const emptyCopy = $("[data-venue-empty-copy]");

    const headings = {
      featured: {
        title: 'Featured <span class="grad-res-text">Restaurants & Bars</span>',
        titleKey: "restaurants.discovery_title_featured",
        subtitle: "Discover our hand-picked restaurants and bars.",
        subtitleKey: "restaurants.discovery_subtitle_featured",
      },
      popular: {
        title: 'Popular <span class="grad-res-text">This Week</span>',
        titleKey: "restaurants.discovery_title_popular",
        subtitle: "Explore places guests are discovering right now.",
        subtitleKey: "restaurants.discovery_subtitle_popular",
      },
      new: {
        title: 'New on <span class="grad-res-text">Tiketa</span>',
        titleKey: "restaurants.discovery_title_new",
        subtitle: "Freshly added restaurants, bars, lounges, and cafés.",
        subtitleKey: "restaurants.discovery_subtitle_new",
      },
    };

    const current = headings[state.discoveryView] || headings.featured;
    if (title) title.innerHTML = tr(current.titleKey, current.title);
    if (subtitle) subtitle.textContent = tr(current.subtitleKey, current.subtitle);

    if (emptyTitle) {
      emptyTitle.textContent = state.filters.q
        ? window.t?.("empty.no_search_results") || "No search results for that query."
        : window.t?.("empty.no_restaurants_found") || "No restaurants or bars match this view yet.";
    }
    if (emptyCopy) {
      emptyCopy.textContent = state.filters.q
        ? window.t?.("empty.try_another_place") ||
          "Try another restaurant, bar, café, lounge, or city."
        : window.t?.("empty.check_back_restaurants") ||
          "New restaurants and bars will appear here as they join Tiketa.";
    }

    $("[data-venue-count]")?.replaceChildren(
      document.createTextNode(
        state.loading
          ? tr("loading.loading_restaurants", "Loading restaurants & bars...")
          : tr("restaurants.count", `${count} restaurants & bars`, { count }),
      ),
    );
  }

  function render() {
    const venues = state.venues;
    const mainVenues = discoveryVenues(venues);
    const visibleMainVenues = state.discoveryExpanded ? mainVenues : mainVenues.slice(0, 8);

    fill("featuredGrid", visibleMainVenues);
    fill("popularGrid", venues.slice(0, 4));
    fill("newGrid", newestFirst(venues).slice(0, 4));

    updateDiscoveryHeading(mainVenues.length);
    $("[data-venue-empty]")?.toggleAttribute("hidden", state.loading || mainVenues.length > 0);

    document.querySelectorAll("[data-discovery-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.discoveryView === state.discoveryView);
      button.setAttribute(
        "aria-pressed",
        button.dataset.discoveryView === state.discoveryView ? "true" : "false",
      );
    });
    if (!state.loading) applyRestaurantListingSchemas(mainVenues);
  }

  function queryString() {
    const params = new URLSearchParams({ per_page: "48" });
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  async function loadVenues() {
    state.loading = true;
    render();
    try {
      const { data } = await api().fetch(`/venues?${queryString()}`, { skipAuthRedirect: true });
      state.venues = Array.isArray(data) ? data : [];
    } catch (err) {
      state.venues = [];
      window.tkToast?.(
        err?.message ||
          window.t?.("toast.unable_load_restaurants") ||
          "We couldn’t load restaurants and bars. Check your connection, then refresh.",
        "error",
      );
    } finally {
      state.loading = false;
      render();
    }
  }

  function setOptions(selector, items, label) {
    const select = $(selector);
    if (!select) return;
    select.innerHTML = `<option value="">${label}</option>${items.map((item) => `<option value="${esc(item.slug)}">${esc(item.name)}</option>`).join("")}`;
  }

  async function loadLookups() {
    if (state.lookupsLoaded) return;
    try {
      const [cuisines, facilities] = await Promise.all([
        api().fetch("/cuisine-types", { skipAuthRedirect: true }),
        api().fetch("/venue-facilities", { skipAuthRedirect: true }),
      ]);
      setOptions(
        '[data-venue-filter="cuisine"]',
        cuisines.data || [],
        tr("restaurants.all_cuisines", "All cuisines"),
      );
      setOptions(
        '[data-venue-filter="facility"]',
        facilities.data || [],
        tr("restaurants.all_facilities", "All facilities"),
      );
      state.lookupsLoaded = true;
    } catch {
      /* keep filters usable with base options */
    }
  }

  function bindFilters() {
    const form = $("[data-venue-search-form]");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.filters.q = String(form.elements.q?.value || "").trim();
      loadVenues();
    });

    form?.addEventListener("input", (event) => {
      if (event.target.name !== "q") return;
      clearTimeout(form._venueTimer);
      form._venueTimer = setTimeout(() => {
        state.filters.q = String(event.target.value || "").trim();
        loadVenues();
      }, 250);
    });

    document.querySelectorAll("[data-venue-filter]").forEach((control) => {
      control.addEventListener("change", () => {
        state.filters[control.dataset.venueFilter] = control.value;
        loadVenues();
      });
    });

    $("[data-venue-clear]")?.addEventListener("click", () => {
      state.filters = { q: "", venue_type: "", cuisine: "", facility: "", sort: "featured" };
      state.discoveryView = "featured";
      state.discoveryExpanded = false;
      if (form) form.reset();
      document.querySelectorAll("[data-venue-filter]").forEach((control) => {
        control.value = control.dataset.venueFilter === "sort" ? "featured" : "";
      });
      loadVenues();
    });

    document.querySelectorAll("[data-discovery-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.discoveryView || "featured";
        state.discoveryView = view;
        state.discoveryExpanded = true;
        state.filters.sort = view === "new" ? "newest" : "featured";
        const sortControl = $('[data-venue-filter="sort"]');
        if (sortControl) sortControl.value = state.filters.sort;
        loadVenues().then(() => {
          $("[data-main-discovery-title]")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    });
  }

  function setNewsletterMessage(form, type, message) {
    const el = form?.querySelector("[data-restaurant-newsletter-message]");
    if (!el) return;
    el.className = `newsletter-message ${type ? `is-${type}` : ""}`;
    el.textContent = message || "";
  }

  function bindNewsletter() {
    document.querySelectorAll("[data-restaurant-newsletter-form]").forEach((form) => {
      const input = form.querySelector("[data-restaurant-newsletter-email]");
      const submit = form.querySelector("[data-restaurant-newsletter-submit]");
      if (!input || !submit) return;

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = input.value.trim();
        if (!email || !input.checkValidity()) {
          setNewsletterMessage(
            form,
            "error",
            window.t?.("homepage.newsletter_invalid") || "Enter a valid email address.",
          );
          input.focus();
          return;
        }

        submit.disabled = true;
        setNewsletterMessage(
          form,
          "",
          window.t?.("homepage.newsletter_subscribing") || "Subscribing...",
        );
        try {
          await api().fetch("/newsletter-subscriptions", {
            method: "POST",
            body: {
              email,
              source: form.dataset.newsletterSource || "restaurants",
              language: window.TiketaLanguage?.getLanguage?.() || "en",
            },
          });
          form.reset();
          setNewsletterMessage(
            form,
            "success",
            window.t?.("homepage.newsletter_success") ||
              "You are subscribed. Watch your inbox for Tiketa updates.",
          );
        } catch (err) {
          setNewsletterMessage(
            form,
            "error",
            err.message ||
              window.t?.("homepage.newsletter_failed") ||
              "We couldn’t add you to the newsletter. Check your email address and try again.",
          );
        } finally {
          submit.disabled = false;
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindFilters();
    bindNewsletter();
    await loadLookups();
    await loadVenues();
  });

  document.addEventListener("tiketa:language-changed", async () => {
    state.lookupsLoaded = false;
    await loadLookups();
    render();
  });
})();
