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
  const fallbackImage = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80";
  const defaultRestaurantSocialImage = fallbackImage;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const occasionOptions = [
    "Birthday",
    "Anniversary",
    "Date Night",
    "Business Meeting",
    "Family Gathering",
    "Celebration",
    "Friends Night Out",
    "Other",
  ];
  let currentVenue = null;
  let availabilityRequestId = 0;
  let detailGoogleMap = null;
  let detailGoogleMarker = null;
  let detailMapsLoading = null;
  let galleryImages = [];
  let activeGalleryIndex = 0;
  let galleryTouchStartX = null;
  let liveStatusTimer = null;
  let renderedVenueKey = "";
  let reservationSubmitInFlight = false;
  const availabilityCache = new Map();
  const availabilityRequests = new Map();
  const renderSignatures = new Map();
  const availabilityCacheTtlMs = 30000;

  function slugFromLocation() {
    window.EventSphereRoutes?.redirectLegacyRestaurant?.();
    return window.EventSphereRoutes?.restaurantSlug?.() || "";
  }

  function titleCase(value) {
    return String(value || "Restaurant / Bar")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function compactText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function smartTrim(value, maxLength = 160) {
    const text = compactText(value);
    if (text.length <= maxLength) return text;
    const slice = text.slice(0, maxLength - 3);
    const boundary = Math.max(
      slice.lastIndexOf("."),
      slice.lastIndexOf(","),
      slice.lastIndexOf(" "),
    );
    return `${slice.slice(0, boundary > 100 ? boundary : maxLength - 3).trim()}...`;
  }

  function setMetaDescription(content) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function absoluteUrl(value) {
    const text = compactText(value);
    if (!text) return "";
    try {
      return new URL(text, window.location.origin).href;
    } catch (err) {
      return text;
    }
  }

  function setOpenGraph(property, content) {
    const value = compactText(content);
    if (!value) return;
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.appendChild(meta);
    }
    meta.content = value;
  }

  function setTwitter(name, content) {
    const value = compactText(content);
    if (!value) return;
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = value;
  }

  function socialImageUrl(value, fallback = defaultRestaurantSocialImage) {
    const url = absoluteUrl(value || fallback);
    if (!url) return absoluteUrl(fallback);
    try {
      const parsed = new URL(url);
      if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return absoluteUrl(fallback);
    } catch (err) {
      return absoluteUrl(fallback);
    }
    return url;
  }

  function socialPageUrl(path) {
    try {
      const current = new URL(window.location.href);
      const base =
        window.EventSphereConfig?.PUBLIC_URL ||
        window.TIKETA_CONFIG?.PUBLIC_URL ||
        current.origin;
      return new URL(path, base).href;
    } catch (err) {
      return new URL(path, "https://tiketa-staging.albi-hellocare.workers.dev").href;
    }
  }

  function venueCuisineLabel(venue) {
    const cuisines = listNames(venue.cuisine_types, "");
    if (cuisines) return cuisines;
    return titleCase(venue.venue_type);
  }

  function venueMetaDescription(venue) {
    const name = compactText(venue.name) || "this restaurant";
    const city = compactText(venue.city);
    const cuisine = compactText(venueCuisineLabel(venue));
    if (window.TiketaLanguage?.getLanguage?.() === "sq") {
      const intro = `Rezervoni tavolinë te ${name}${city ? ` në ${city}` : ""}.`;
      const detail = ` Shikoni ${cuisine ? `${cuisine}, ` : ""}disponueshmërinë, oraret dhe detajet e rezervimit me Tiketa.`;
      return smartTrim(`${intro}${detail}`, 160);
    }
    const intro = `Reserve a table at ${name}${city ? ` in ${city}` : ""}.`;
    const detail = ` Discover ${cuisine ? `${cuisine} dining, ` : ""}availability, opening hours, and reservation details with Tiketa.`;
    return smartTrim(`${intro}${detail}`, 160);
  }

  function venuePrimaryImage(venue) {
    const image = venue.images?.[0];
    return imageUrl(image) || venue.logo_image || fallbackImage;
  }

  function applyVenueOpenGraph(venue) {
    const slug = venue.slug || slugFromLocation();
    const title = `${compactText(venue.name) || "Restaurant"} | Reserve a Table | Tiketa`;
    const description = venueMetaDescription(venue);
    const image = socialImageUrl(venuePrimaryImage(venue));
    const path =
      window.EventSphereRoutes?.restaurantUrl?.(slug) || `/restaurant/${encodeURIComponent(slug)}`;
    const url = socialPageUrl(path);

    setOpenGraph("og:title", title);
    setOpenGraph("og:description", description);
    setOpenGraph("og:image", image);
    setOpenGraph("og:url", url);
    setOpenGraph("og:type", "website");
    setOpenGraph("og:site_name", "Tiketa");
    setTwitter("twitter:card", "summary_large_image");
    setTwitter("twitter:title", title);
    setTwitter("twitter:description", description);
    setTwitter("twitter:image", image);
  }

  function cleanObject(value) {
    if (Array.isArray(value)) {
      return value.map(cleanObject).filter((item) => item !== undefined);
    }
    if (!value || typeof value !== "object")
      return value === "" || value === null ? undefined : value;
    return Object.entries(value).reduce((acc, [key, item]) => {
      const cleaned = cleanObject(item);
      if (cleaned !== undefined && !(Array.isArray(cleaned) && cleaned.length === 0))
        acc[key] = cleaned;
      return acc;
    }, {});
  }

  function venueSchemaType(venue) {
    return String(venue.venue_type || "").toLowerCase() === "restaurant"
      ? "Restaurant"
      : "LocalBusiness";
  }

  function venueOpeningHoursSchema(venue) {
    return (venue.opening_hours || [])
      .filter((item) => item && !item.is_closed && item.opens_at && item.closes_at)
      .map((item) =>
        cleanObject({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: days[Number(item.day_of_week)] || "",
          opens: item.opens_at,
          closes: item.closes_at,
        }),
      );
  }

  function venueCuisineSchema(venue) {
    return (venue.cuisine_types || []).map((item) => compactText(item.name)).filter(Boolean);
  }

  function venueRatingSchema(venue) {
    const ratingValue = Number(
      venue.aggregate_rating?.rating_value ?? venue.aggregateRating?.ratingValue ?? venue.rating,
    );
    const reviewCount = Number(
      venue.aggregate_rating?.review_count ??
        venue.aggregateRating?.reviewCount ??
        venue.review_count,
    );
    if (!Number.isFinite(ratingValue) || ratingValue <= 0) return undefined;
    return cleanObject({
      "@type": "AggregateRating",
      ratingValue,
      reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : undefined,
    });
  }

  function venueJsonLd(venue) {
    const slug = venue.slug || slugFromLocation();
    const lat = Number(venue.latitude);
    const lng = Number(venue.longitude);
    return cleanObject({
      "@context": "https://schema.org",
      "@type": venueSchemaType(venue),
      inLanguage: window.TiketaLanguage?.getLanguage?.() || "en",
      name: compactText(venue.name),
      image: venuePrimaryImage(venue) ? [absoluteUrl(venuePrimaryImage(venue))] : [],
      description: compactText(venue.description) || venueMetaDescription(venue),
      telephone: compactText(venue.phone),
      email: compactText(venue.email),
      address: {
        "@type": "PostalAddress",
        streetAddress: compactText(venue.address),
        addressLocality: compactText(venue.city),
        postalCode: compactText(venue.postal_code || venue.postalCode),
        addressCountry: compactText(venue.country),
      },
      geo:
        Number.isFinite(lat) && Number.isFinite(lng)
          ? {
              "@type": "GeoCoordinates",
              latitude: lat,
              longitude: lng,
            }
          : undefined,
      url: absoluteUrl(
        window.EventSphereRoutes?.restaurantUrl?.(slug) ||
          `/restaurant/${encodeURIComponent(slug)}`,
      ),
      openingHoursSpecification: venueOpeningHoursSchema(venue),
      servesCuisine: venueCuisineSchema(venue),
      priceRange: compactText(venue.price_range || venue.priceRange),
      aggregateRating: venueRatingSchema(venue),
    });
  }

  function applyVenueSchema(venue) {
    let script = document.querySelector('script[type="application/ld+json"][data-venue-schema]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.venueSchema = "true";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(venueJsonLd(venue));
  }

  function breadcrumbJsonLd(venue) {
    const slug = venue.slug || slugFromLocation();
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: tr("header.home", "Home"),
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: tr("footer.hospitality_reservations", "Restaurants"),
          item: absoluteUrl("/restaurants"),
        },
        venueCuisineLabel(venue)
          ? {
              "@type": "ListItem",
              position: 3,
              name: venueCuisineLabel(venue),
              item: absoluteUrl(
                `/restaurants?cuisine=${encodeURIComponent(venueCuisineLabel(venue))}`,
              ),
            }
          : undefined,
        {
          "@type": "ListItem",
          position: venueCuisineLabel(venue) ? 4 : 3,
          name: compactText(venue.name) || "Restaurant",
          item: absoluteUrl(
            window.EventSphereRoutes?.restaurantUrl?.(slug) ||
              `/restaurant/${encodeURIComponent(slug)}`,
          ),
        },
      ].filter(Boolean),
    };
  }

  function applyBreadcrumbSchema(venue) {
    let script = document.querySelector(
      'script[type="application/ld+json"][data-breadcrumb-schema]',
    );
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.breadcrumbSchema = "true";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(breadcrumbJsonLd(venue));
    window.TiketaLanguage?.applyInternationalSeo?.();
  }

  function applyVenueMetadata(venue) {
    document.title = `${compactText(venue.name) || "Restaurant"} | Reserve a Table | Tiketa`;
    setMetaDescription(venueMetaDescription(venue));
    window.EventSphereRoutes?.setRestaurantCanonical?.(venue.slug || slugFromLocation());
    applyVenueOpenGraph(venue);
  }

  function occasionKey(value) {
    return (
      {
        Birthday: "reservation.birthday",
        Anniversary: "reservation.anniversary",
        "Date Night": "reservation.date_night",
        "Business Meeting": "reservation.business_meeting",
        "Family Gathering": "reservation.family_gathering",
        Celebration: "reservation.celebration",
        "Friends Night Out": "reservation.friends_night_out",
        Other: "reservation.other",
      }[value] || ""
    );
  }

  function imageUrl(image) {
    return image?.url || image?.image_path || fallbackImage;
  }

  function stableSignature(value) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value ?? "");
    }
  }

  function skipIdenticalRender(key, signature) {
    if (renderSignatures.get(key) === signature) return true;
    renderSignatures.set(key, signature);
    return false;
  }

  function resetRenderStateForVenue(venue) {
    const key = String(venue?.id || venue?.slug || "");
    if (renderedVenueKey === key) return;
    renderedVenueKey = key;
    availabilityCache.clear();
    availabilityRequests.clear();
    renderSignatures.clear();
  }

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value || "";
  }

  function listNames(items, fallback) {
    const names = (items || []).map((item) => item.name).filter(Boolean);
    return names.length ? names.join(", ") : fallback;
  }

  function normalizeTime(value) {
    const text = String(value ?? "").trim();
    return /^\d{2}:\d{2}:\d{2}$/.test(text) ? text.slice(0, 5) : text;
  }

  function minutesFromTime(value) {
    const time = normalizeTime(value || "");
    const match = time.match(/^(\d{2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function timeLabel(value) {
    const minutes = minutesFromTime(value);
    if (minutes === null) return value || "";
    const date = new Date();
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function statusTimeLabel(value) {
    return normalizeTime(value || "");
  }

  function dateWithDayOffset(base, offset) {
    const date = new Date(base);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
  }

  function dayIndexForDate(date) {
    return (date.getDay() + 6) % 7;
  }

  function blackoutDates(venue) {
    return new Set((venue.blackout_dates || []).map((item) => item.date).filter(Boolean));
  }

  function specialHourForDate(venue, dateValue) {
    return (venue.special_hours || []).find((item) => item.date === dateValue) || null;
  }

  function openingHourForDate(venue, date) {
    return (
      (venue.opening_hours || []).find(
        (item) => Number(item.day_of_week) === dayIndexForDate(date),
      ) || null
    );
  }

  function scheduleForDate(venue, date) {
    const dateValue = localDateValue(date);
    if (blackoutDates(venue).has(dateValue)) {
      return { is_closed: true, blackout: true };
    }

    const special = specialHourForDate(venue, dateValue);
    if (special) return special;

    return openingHourForDate(venue, date) || { is_closed: true };
  }

  function businessWindowForDate(venue, date) {
    const schedule = scheduleForDate(venue, date);
    const opens = minutesFromTime(schedule.opens_at);
    const closes = minutesFromTime(schedule.closes_at);

    if (schedule.is_closed || opens === null || closes === null) return null;

    const start = dateWithDayOffset(date, 0);
    start.setMinutes(opens);
    const end = dateWithDayOffset(date, 0);
    end.setMinutes(closes);
    if (closes <= opens) end.setDate(end.getDate() + 1);

    return {
      start,
      end,
      opens_at: statusTimeLabel(schedule.opens_at),
      closes_at: statusTimeLabel(schedule.closes_at),
    };
  }

  function relationLabel(date, now) {
    const today = localDateValue(now);
    const tomorrow = localDateValue(dateWithDayOffset(now, 1));
    const value = localDateValue(date);
    if (value === today) return "today";
    if (value === tomorrow) return "tomorrow";
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  function liveStatusForVenue(venue, now = new Date()) {
    const candidateDates = [dateWithDayOffset(now, -1), dateWithDayOffset(now, 0)];
    const currentWindow = candidateDates
      .map((date) => businessWindowForDate(venue, date))
      .filter(Boolean)
      .find((window) => now >= window.start && now < window.end);

    if (currentWindow) {
      return {
        open: true,
        label: tr("restaurants.open_now", "Open Now"),
        detail: `${tr("restaurants.closes", "Closes")} ${currentWindow.closes_at}`,
      };
    }

    for (let offset = 0; offset <= 7; offset += 1) {
      const date = dateWithDayOffset(now, offset);
      const window = businessWindowForDate(venue, date);
      if (window && window.start > now) {
        return {
          open: false,
          label: tr("restaurants.closed", "Closed"),
          detail: `${tr("restaurants.opens", "Opens")} ${relationLabel(window.start, now)} ${window.opens_at}`,
        };
      }
    }

    return {
      open: false,
      label: tr("restaurants.closed", "Closed"),
      detail: tr("availability.no_available_slots", "No upcoming opening hours listed"),
    };
  }

  function renderLiveStatus(venue) {
    const root = $("[data-live-status]");
    const label = $("[data-live-status-label]");
    const detail = $("[data-live-status-detail]");
    if (!root || !venue) return;

    const status = liveStatusForVenue(venue);
    root.hidden = false;
    root.classList.toggle("is-open", status.open);
    root.classList.toggle("is-closed", !status.open);
    if (label) label.textContent = status.label;
    if (detail) detail.textContent = status.detail;
  }

  function startLiveStatusUpdates() {
    if (liveStatusTimer) window.clearInterval(liveStatusTimer);
    if (!currentVenue) return;
    renderLiveStatus(currentVenue);
    liveStatusTimer = window.setInterval(() => {
      if (currentVenue) renderLiveStatus(currentVenue);
    }, 60000);
  }

  function validCoordinate(lat, lng) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  function venueCoordinates(venue) {
    const lat = Number(venue.latitude);
    const lng = Number(venue.longitude);

    return validCoordinate(lat, lng) ? { lat, lng } : null;
  }

  function googleMapEmbedUrl(lat, lng) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=16&output=embed`;
  }

  function googleDirectionsUrl(lat, lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  function googleMapsUrl(lat, lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  function formatCoordinate(value) {
    return Number(value).toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
  }

  function googleMapsApiKey() {
    return String(
      window.EventSphereConfig?.GOOGLE_MAPS_API_KEY ||
        window.__EVENT_SPHERE_GOOGLE_MAPS_API_KEY__ ||
        document.querySelector('meta[name="google-maps-api-key"]')?.content ||
        "",
    ).trim();
  }

  function loadGoogleMaps() {
    if (window.google?.maps) return Promise.resolve(true);
    const key = googleMapsApiKey();
    if (!key) return Promise.resolve(false);
    if (detailMapsLoading) return detailMapsLoading;

    detailMapsLoading = new Promise((resolve) => {
      const callback = `eventSphereDetailMapsReady${Date.now()}`;
      window[callback] = () => {
        delete window[callback];
        resolve(true);
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${callback}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callback];
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return detailMapsLoading;
  }

  async function renderInteractiveMap(lat, lng, venue) {
    const canvas = $("[data-detail-map-canvas]");
    const frame = $("[data-detail-map]");
    const section = $("[data-detail-map-section]");
    if (!canvas) return;

    const loaded = await loadGoogleMaps();
    if (!loaded || !window.google?.maps) return;

    const position = { lat, lng };
    canvas.hidden = false;
    if (frame) frame.hidden = true;
    section?.classList.add("has-google-map");

    if (!detailGoogleMap) {
      detailGoogleMap = new window.google.maps.Map(canvas, {
        center: position,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      detailGoogleMarker = new window.google.maps.Marker({
        position,
        map: detailGoogleMap,
        animation: window.google.maps.Animation.DROP,
        title: venue?.name || "Restaurant location",
      });
      return;
    }

    detailGoogleMap.setCenter(position);
    detailGoogleMap.setZoom(16);
    detailGoogleMarker?.setPosition(position);
    detailGoogleMarker?.setTitle(venue?.name || "Restaurant location");
  }

  function localDateValue(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function bookingHorizonDays(venue) {
    const days = Number(venue?.reservation_settings?.booking_horizon_days);
    return Number.isFinite(days) && days >= 0 ? Math.floor(days) : 0;
  }

  function iconForFacility(item) {
    const map = {
      wifi: "wifi",
      "parking-circle": "p-square",
      music: "music-note-beamed",
      trees: "tree",
      "door-closed": "door-closed",
      accessibility: "universal-access",
      martini: "cup-straw",
      cigarette: "fire",
      "paw-print": "heart",
      baby: "emoji-smile",
      "badge-star": "star",
      "building-2": "building",
      tv: "tv",
      "disc-3": "disc",
    };
    const icon = map[item?.icon] || item?.icon || "check2-circle";
    const bootstrapIcon = icon.startsWith("bi-") ? icon : `bi-${icon}`;
    return bootstrapIcon;
  }

  function renderGallery(venue) {
    const root = $("[data-detail-gallery]");
    if (!root) return;
    galleryImages = (
      venue.images?.length ? venue.images : [{ url: venue.logo_image || fallbackImage }]
    ).map((image, index) => ({
      src: imageUrl(image),
      alt: `${venue.name || "Restaurant or bar"} photo ${index + 1}`,
    }));
    const signature = stableSignature(galleryImages);
    if (skipIdenticalRender("gallery", signature)) return;

    root.innerHTML = galleryImages
      .map(
        (image, index) => `
      <button class="gallery-photo ${index === 0 ? "g-main" : ""}" type="button" data-gallery-open="${index}" aria-label="Open photo ${index + 1}">
        <img src="${esc(image.src)}" alt="${esc(image.alt)}" width="${index === 0 ? "1200" : "640"}" height="${index === 0 ? "800" : "480"}" sizes="${index === 0 ? "(min-width: 992px) 66vw, 100vw" : "(min-width: 992px) 33vw, 50vw"}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" ${index === 0 ? 'fetchpriority="high"' : ""} />
        ${index === 0 ? `<span class="gallery-cover-label"><i class="bi bi-star-fill"></i> ${tr("venue.cover_photo", "Cover Photo")}</span>` : ""}
      </button>
    `,
      )
      .join("");
  }

  function updateLightbox() {
    const lightbox = $("[data-gallery-lightbox]");
    const image = $("[data-gallery-lightbox-image]");
    const title = $("[data-gallery-lightbox-title]");
    const count = $("[data-gallery-lightbox-count]");
    const item = galleryImages[activeGalleryIndex];
    if (!lightbox || !image || !item) return;

    image.src = item.src;
    image.alt = item.alt;
    if (title) title.textContent = item.alt;
    if (count) count.textContent = `${activeGalleryIndex + 1} / ${galleryImages.length}`;
  }

  function openLightbox(index) {
    if (!galleryImages.length) return;
    activeGalleryIndex = Math.max(0, Math.min(galleryImages.length - 1, Number(index) || 0));
    updateLightbox();
    const lightbox = $("[data-gallery-lightbox]");
    if (lightbox) {
      lightbox.hidden = false;
      document.body.classList.add("venue-lightbox-open");
      $("[data-gallery-close]")?.focus();
    }
  }

  function closeLightbox() {
    const lightbox = $("[data-gallery-lightbox]");
    if (lightbox) lightbox.hidden = true;
    document.body.classList.remove("venue-lightbox-open");
  }

  function moveLightbox(direction) {
    if (!galleryImages.length) return;
    activeGalleryIndex =
      (activeGalleryIndex + direction + galleryImages.length) % galleryImages.length;
    updateLightbox();
  }

  function setOptionalSection(key, visible) {
    const section = $(`[data-detail-section="${key}"]`);
    if (section) section.hidden = !visible;
    document.querySelectorAll(`[data-detail-divider="${key}"]`).forEach((divider) => {
      divider.hidden = !visible;
    });
  }

  function renderPills(selector, items, icon, sectionKey) {
    const root = $(selector);
    if (!root) return;
    const visible = Boolean(items?.length);
    if (sectionKey) setOptionalSection(sectionKey, visible);
    const signature = stableSignature(
      (items || []).map((item) => [item.id, item.name, icon(item)]),
    );
    if (skipIdenticalRender(`pills:${selector}`, signature)) return;

    root.innerHTML = visible
      ? items
          .map(
            (item) => `
      <div class="col-md-4 col-6"><div class="facility"><i class="bi ${esc(icon(item))}"></i> ${esc(item.name)}</div></div>
    `,
          )
          .join("")
      : "";
  }

  function renderHours(hours = []) {
    const root = $("[data-detail-hours]");
    if (!root) return;
    const signature = stableSignature(
      hours.map((item) => [item.day_of_week, item.is_closed, item.opens_at, item.closes_at]),
    );
    if (skipIdenticalRender("hours", signature)) return;

    const byDay = new Map(hours.map((item) => [Number(item.day_of_week), item]));
    root.innerHTML = days
      .map((day, index) => {
        const item = byDay.get(index);
        const label =
          !item || item.is_closed
            ? tr("availability.closed", "Closed")
            : `${item.opens_at || "--:--"} - ${item.closes_at || "--:--"}`;
        return `
        <div class="col-md-6">
          <div class="facility justify-content-between">
            <span><i class="bi bi-clock"></i> ${day}</span>
            <span class="${!item || item.is_closed ? "text-muted-pro" : ""}">${esc(label)}</span>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function contactItem(icon, label, value, href) {
    if (!value) return "";
    const content = href
      ? `<a class="text-decoration-none text-reset" href="${esc(href)}" target="_blank" rel="noopener">${esc(value)}</a>`
      : esc(value);
    return `<div class="col-md-6"><div class="facility"><i class="bi ${icon}"></i> <span><span class="text-muted-pro">${label}: </span>${content}</span></div></div>`;
  }

  function renderContact(venue) {
    const root = $("[data-detail-contact]");
    if (!root) return;
    const address = [venue.address, venue.city, venue.country].filter(Boolean).join(", ");
    const coordinates = venueCoordinates(venue);
    const signature = stableSignature({
      address,
      phone: venue.phone,
      email: venue.email,
      website: venue.website,
      social_links: venue.social_links,
      coordinates,
    });
    if (skipIdenticalRender("contact", signature)) return;

    const rows = [
      contactItem("bi-geo-alt-fill", tr("venue.address", "Address"), address),
      contactItem(
        "bi-telephone-fill",
        tr("venue.phone", "Phone"),
        venue.phone,
        venue.phone ? `tel:${venue.phone}` : null,
      ),
      contactItem(
        "bi-envelope-fill",
        tr("venue.email", "Email"),
        venue.email,
        venue.email ? `mailto:${venue.email}` : null,
      ),
      contactItem("bi-globe2", tr("venue.website", "Website"), venue.website, venue.website),
      contactItem(
        "bi-facebook",
        "Facebook",
        venue.social_links?.facebook_url,
        venue.social_links?.facebook_url,
      ),
      contactItem(
        "bi-instagram",
        "Instagram",
        venue.social_links?.instagram_url,
        venue.social_links?.instagram_url,
      ),
      contactItem(
        "bi-tiktok",
        "TikTok",
        venue.social_links?.tiktok_url,
        venue.social_links?.tiktok_url,
      ),
    ].filter(Boolean);
    root.innerHTML =
      rows.join("") ||
      `<div class="col-12 text-muted-pro" data-i18n="venue.contact_unavailable">${tr("venue.contact_unavailable", "Contact details are not available yet.")}</div>`;

    renderMap(venue);
  }

  function renderMap(venue) {
    const section = $("[data-detail-map-section]");
    const frame = $("[data-detail-map]");
    const canvas = $("[data-detail-map-canvas]");
    const directions = $("[data-detail-directions]");
    const openMap = $("[data-detail-open-map]");
    const mapTitle = $("[data-detail-map-title]");
    const coordinatesLabel = $("[data-detail-coordinates]");
    const coordinates = venueCoordinates(venue);

    if (!section) return;
    section.hidden = !coordinates;
    if (!coordinates) {
      if (frame) {
        frame.removeAttribute("src");
        frame.hidden = false;
      }
      if (canvas) canvas.hidden = true;
      section.classList.remove("has-google-map");
      return;
    }

    const { lat, lng } = coordinates;
    if (frame) {
      frame.src = googleMapEmbedUrl(lat, lng);
      frame.hidden = false;
    }
    if (directions) directions.href = googleDirectionsUrl(lat, lng);
    if (openMap) openMap.href = googleMapsUrl(lat, lng);
    if (mapTitle) mapTitle.textContent = venue.name || tr("venue.find_us_here", "Find us here");
    if (coordinatesLabel)
      coordinatesLabel.textContent = `${formatCoordinate(lat)}, ${formatCoordinate(lng)}`;
    renderInteractiveMap(lat, lng, venue);
  }

  function renderVenue(venue) {
    resetRenderStateForVenue(venue);
    currentVenue = venue;
    applyVenueMetadata(venue);
    applyVenueSchema(venue);
    applyBreadcrumbSchema(venue);
    setText("[data-detail-city]", venue.city || "City");
    setText("[data-detail-crumb-category]", venueCuisineLabel(venue));
    setText("[data-detail-name]", venue.name || "Restaurant / Bar");
    setText("[data-detail-title]", venue.name || "Restaurant / Bar");
    setText("[data-detail-type]", titleCase(venue.venue_type));
    const cuisineMeta = $("[data-detail-cuisines]");
    if (cuisineMeta) {
      const hasCuisines = Boolean(venue.cuisine_types?.length);
      cuisineMeta.hidden = !hasCuisines;
      cuisineMeta.textContent = hasCuisines ? listNames(venue.cuisine_types, "") : "";
    }
    setText("[data-detail-location]", [venue.city, venue.country].filter(Boolean).join(", "));
    setText(
      "[data-detail-description]",
      venue.description ||
        tr("venue.no_description", "This restaurant or bar has not added a description yet."),
    );
    setText(
      "[data-detail-side-title]",
      venue.name || tr("venue.details", "Restaurant & Bar details"),
    );
    setText(
      "[data-detail-side-copy]",
      `${titleCase(venue.venue_type)} in ${venue.city || "your city"}`,
    );

    const featured = $("[data-detail-featured]");
    if (featured) featured.hidden = !venue.featured;

    const logo = $("[data-detail-logo]");
    if (logo && venue.logo_image) {
      logo.src = venue.logo_image;
      logo.alt = `${venue.name || "Restaurant or bar"} logo`;
      logo.loading = "lazy";
      logo.decoding = "async";
      logo.hidden = false;
    }

    renderGallery(venue);
    renderPills("[data-detail-facilities]", venue.facilities, iconForFacility, "facilities");
    renderPills(
      "[data-detail-cuisine-list]",
      venue.cuisine_types,
      () => "bi-egg-fried",
      "cuisines",
    );
    renderPills(
      "[data-detail-payments]",
      venue.payment_options,
      () => "bi-credit-card",
      "payments",
    );
    renderHours(venue.opening_hours || []);
    renderContact(venue);
    startLiveStatusUpdates();
    hydrateReservationForm(venue);
  }

  function renderGuestSelector(form, venue) {
    const panel = $('[data-picker-panel="guests"]');
    if (!panel) return;
    const min = Number(venue.reservation_settings?.min_guests || 1);
    const max = Number(venue.reservation_settings?.max_guests || 20);
    const defaultValue = Math.min(max, Math.max(min, 2));
    const values = [];
    for (let value = min; value <= Math.min(max, 8); value += 1) values.push(value);
    if (max > 8) values.push(Math.min(max, Math.max(9, defaultValue)));

    const signature = stableSignature(values);
    if (!skipIdenticalRender("reservation:guests", signature)) {
      panel.innerHTML = `<div class="reservation-guest-grid">${values
        .map(
          (value) => `
        <button class="reservation-choice reservation-choice-guest" type="button" data-picker-option="guests" data-value="${value}">
          ${value > 8 ? `${value}+` : value}
        </button>
      `,
        )
        .join("")}</div>`;
    }
    selectPickerValue(
      "guests",
      defaultValue,
      `${tr("reservation.guests", "Guests")}: ${defaultValue > 8 ? `${defaultValue}+` : defaultValue}`,
    );
  }

  function renderDateSelector(form, venue) {
    const panel = $('[data-picker-panel="date"]');
    if (!panel) return;
    const today = new Date();
    const selected = localDateValue(today);
    const dates = Array.from({ length: bookingHorizonDays(venue) + 1 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      const value = localDateValue(date);
      return {
        value,
        day:
          index === 0
            ? tr("events.today", "Today")
            : index === 1
              ? tr("events.tomorrow", "Tomorrow")
              : date.toLocaleDateString(undefined, { weekday: "short" }),
        date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      };
    });

    const selectedItem = dates.find((item) => item.value === selected) || dates[0];
    const signature = stableSignature(dates);
    if (!skipIdenticalRender("reservation:dates", signature)) {
      panel.innerHTML = `<div class="reservation-date-grid">${dates
        .map(
          (item) => `
        <button class="reservation-choice reservation-choice-date" type="button" data-picker-option="date" data-value="${esc(item.value)}" data-label="${esc(`${item.day} — ${item.date}`)}">
          <span>${esc(item.day)}</span>
          <strong>${esc(item.date)}</strong>
        </button>
      `,
        )
        .join("")}</div>`;
    }
    selectPickerValue(
      "date",
      selectedItem.value,
      `${tr("common.date", "Date")}: ${selectedItem.day} - ${selectedItem.date}`,
    );
  }

  function renderTimeOptions(times) {
    const panel = $('[data-picker-panel="time"]');
    if (!panel) return;
    const selected = times.includes("19:00") ? "19:00" : times[0];
    const signature = stableSignature(times);

    if (!skipIdenticalRender("reservation:times", signature)) {
      panel.innerHTML = times.length
        ? `<div class="reservation-time-grid">${times
            .map(
              (time) => `
        <button class="reservation-choice reservation-choice-time" type="button" data-picker-option="time" data-value="${time}" data-label="${esc(timeLabel(time))}">
          ${esc(timeLabel(time))}
        </button>
      `,
            )
            .join("")}</div>`
        : `<div class="reservation-picker-empty" data-i18n="availability.no_reservation_times">${tr("availability.no_reservation_times", "No reservation times are available for this date.")}</div>`;
    }
    selectPickerValue(
      "time",
      selected || "",
      selected ? `${tr("common.time", "Time")}: ${timeLabel(selected)}` : tr("common.time", "Time"),
    );
  }

  function renderOccasionSelector() {
    const panel = $('[data-picker-panel="occasion"]');
    if (!panel) return;

    if (!skipIdenticalRender("reservation:occasion", stableSignature(occasionOptions))) {
      panel.innerHTML = `
        <div class="reservation-time-grid reservation-occasion-grid">
          <button class="reservation-choice reservation-choice-time" type="button" data-picker-option="occasion" data-value="" data-label="${tr("reservation.occasion", "Occasion")}">
            ${tr("reservation.no_occasion", "No occasion")}
          </button>
          ${occasionOptions
            .map(
              (occasion) => `
            <button class="reservation-choice reservation-choice-time" type="button" data-picker-option="occasion" data-value="${esc(occasion)}" data-label="${esc(tr(occasionKey(occasion), occasion))}">
              ${esc(tr(occasionKey(occasion), occasion))}
            </button>
          `,
            )
            .join("")}
        </div>
      `;
    }
    selectPickerValue("occasion", "", tr("reservation.occasion", "Occasion"));
  }

  function availabilityCacheKey(venue, date) {
    return `${venue.slug}:${date}`;
  }

  function cachedAvailability(cacheKey) {
    const cached = availabilityCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      availabilityCache.delete(cacheKey);
      return null;
    }
    return cached.times;
  }

  async function loadAvailabilitySlots(venue, date) {
    const cacheKey = availabilityCacheKey(venue, date);
    const cached = cachedAvailability(cacheKey);
    if (cached) return cached;
    if (availabilityRequests.has(cacheKey)) return availabilityRequests.get(cacheKey);

    const request = api()
      .fetch(
        `/venues/${encodeURIComponent(venue.slug)}/availability?date=${encodeURIComponent(date)}`,
        {
          skipAuthRedirect: true,
        },
      )
      .then(({ data }) => {
        const times = Array.isArray(data?.slots)
          ? data.slots.map((slot) => normalizeTime(slot?.time)).filter(Boolean)
          : [];
        availabilityCache.set(cacheKey, {
          times,
          expiresAt: Date.now() + availabilityCacheTtlMs,
        });
        return times;
      })
      .finally(() => {
        availabilityRequests.delete(cacheKey);
      });

    availabilityRequests.set(cacheKey, request);
    return request;
  }

  async function renderTimeSelector(form, venue) {
    const panel = $('[data-picker-panel="time"]');
    const date = form?.elements.reservation_date.value;
    if (!panel || !venue?.slug || !date) return;

    const requestId = ++availabilityRequestId;
    const cacheKey = availabilityCacheKey(venue, date);
    if (!cachedAvailability(cacheKey)) {
      renderSignatures.delete("reservation:times");
      panel.innerHTML = `
        <div class="reservation-time-grid" aria-hidden="true">
          ${Array.from({ length: 6 }, () => '<div class="reservation-time-skeleton"></div>').join("")}
        </div>
        <div class="reservation-picker-loading">${tr("availability.loading_available_times", "Loading available times...")}</div>
      `;
      selectPickerValue("time", "", tr("common.time", "Time"));
    }

    try {
      const times = await loadAvailabilitySlots(venue, date);
      if (requestId !== availabilityRequestId) return;

      renderTimeOptions(times);
    } catch (err) {
      if (requestId !== availabilityRequestId) return;

      panel.innerHTML = `<div class="reservation-picker-empty" data-i18n="availability.no_reservation_times">${tr("availability.no_reservation_times", "No reservation times are available for this date.")}</div>`;
      selectPickerValue("time", "", tr("common.time", "Time"));
      window.tkToast?.(
        err?.message || tr("reservation.unable_load_times", "We couldn’t load reservation times. Choose another date or refresh availability."),
        "error",
      );
    }
  }

  async function hydrateReservationForm(venue) {
    const form = $("[data-reservation-form]");
    if (!form) return;
    setText(
      "[data-reservation-modal-venue]",
      `${venue.name || tr("common.restaurant_bar", "This restaurant or bar")} will receive your reservation request.`,
    );
    renderGuestSelector(form, venue);
    renderDateSelector(form, venue);
    renderOccasionSelector();
    await renderTimeSelector(form, venue);
  }

  function pickerInputName(type) {
    return {
      guests: "party_size",
      date: "reservation_date",
      time: "reservation_time",
      occasion: "occasion",
    }[type];
  }

  function closePickers() {
    document.querySelectorAll("[data-picker]").forEach((picker) => {
      picker.classList.remove("open");
    });
    document.querySelectorAll("[data-picker-trigger]").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  function togglePicker(type) {
    const picker = $(`[data-picker="${type}"]`);
    const trigger = $(`[data-picker-trigger="${type}"]`);
    const willOpen = !picker?.classList.contains("open");
    closePickers();
    if (willOpen && picker && trigger) {
      picker.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  }

  function selectPickerValue(type, value, label) {
    const form = $("[data-reservation-form]");
    const inputName = pickerInputName(type);
    const input = inputName ? form?.elements[inputName] : null;
    if (input) input.value = value;

    const labelEl = $(`[data-picker-label="${type}"]`);
    if (labelEl) labelEl.textContent = label;

    document.querySelectorAll(`[data-picker-option="${type}"]`).forEach((option) => {
      const active = option.dataset.value === String(value);
      option.classList.toggle("active", active);
      option.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function reservationError(err) {
    const errors = err?.payload?.errors;
    if (errors && typeof errors === "object") {
      const first = Object.values(errors).flat().filter(Boolean)[0];
      if (first) return String(first);
    }
    return (
      err?.message ||
      tr("reservation.unable_create", "We couldn’t send your reservation request. Check the guest count, date, and time, then try again.")
    );
  }

  function userHasVerifiedEmail() {
    const user = window.EventSphereAuth?.getUser?.();
    return window.EventSphereAuth?.hasVerifiedEmail?.(user) === true;
  }

  function showVerifyEmailModal() {
    bootstrap.Modal.getOrCreateInstance($("#reservationVerifyEmailModal")).show();
  }

  function setReservationBusy(busy) {
    const button = $("[data-reservation-submit]");
    if (!button) return;
    button.disabled = busy;
    button.innerHTML = busy
      ? `<span class="spinner-border spinner-border-sm me-1"></span>${tr("loading.saving", "Saving...")}`
      : tr("reservation.save_request", "Send reservation request");
  }

  async function submitReservation(event) {
    event.preventDefault();
    if (!currentVenue) return;
    if (reservationSubmitInFlight) return;

    if (!userHasVerifiedEmail()) {
      showVerifyEmailModal();
      return;
    }

    const form = event.currentTarget;
    const payload = {
      venue_id: currentVenue.id,
      reservation_date: form.elements.reservation_date.value,
      reservation_time: form.elements.reservation_time.value,
      party_size: Number(form.elements.party_size.value || 0),
      phone: form.elements.phone.value.trim() || null,
      occasion: form.elements.occasion.value || null,
      notes: form.elements.notes.value.trim() || null,
    };

    reservationSubmitInFlight = true;
    setReservationBusy(true);
    try {
      await api().fetch("/reservations", { method: "POST", body: payload });
      bootstrap.Modal.getOrCreateInstance($("#reservationModal")).hide();
      form.reset();
      availabilityCache.clear();
      availabilityRequests.clear();
      renderSignatures.delete("reservation:times");
      hydrateReservationForm(currentVenue);
      document.body.classList.add("reservation-success-burst");
      window.setTimeout(() => document.body.classList.remove("reservation-success-burst"), 900);
      window.tkToast?.(
        tr("reservation.request_sent", "Reservation request sent. The venue will review it shortly."),
        "success",
      );
    } catch (err) {
      window.tkToast?.(reservationError(err), "error");
    } finally {
      reservationSubmitInFlight = false;
      setReservationBusy(false);
    }
  }

  async function loadVenue() {
    const slug = slugFromLocation();
    if (!slug) {
      setText(
        "[data-detail-description]",
        tr(
          "venue.choose_from_discovery",
          "Choose a restaurant or bar from the discovery page to view details.",
        ),
      );
      window.tkToast?.(
        tr("venue.choose_from_discovery_toast", "Choose a restaurant or bar from discovery first."),
        "info",
      );
      return;
    }

    try {
      const { data } = await api().fetch(`/venues/${encodeURIComponent(slug)}`, {
        skipAuthRedirect: true,
      });
      renderVenue(data);
    } catch (err) {
      setText("[data-detail-title]", tr("venue.not_available", "Restaurant or bar unavailable"));
      setText(
        "[data-detail-description]",
        tr(
          "venue.not_available",
          "This restaurant or bar is not available for reservations right now.",
        ),
      );
      window.tkToast?.(
        err?.message || tr("venue.unable_to_load", "We couldn’t load this restaurant or bar. It may be unavailable or your connection may have dropped."),
        "error",
      );
    }
  }

  document.addEventListener("DOMContentLoaded", loadVenue);
  document.addEventListener("tiketa:language-changed", () => {
    if (!currentVenue) return;
    renderSignatures.clear();
    renderVenue(currentVenue);
  });
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-reserve-button]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!window.EventSphereAuth?.isLoggedIn?.()) {
          const next = encodeURIComponent(location.pathname + location.search);
          location.href = `/login?next=${next}`;
          return;
        }
        if (!userHasVerifiedEmail()) {
          showVerifyEmailModal();
          return;
        }
        bootstrap.Modal.getOrCreateInstance($("#reservationModal")).show();
      });
    });
    $("[data-reservation-resend-verification]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const original = button.innerHTML;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending...';
      try {
        const response = await window.EventSphereAuth?.resendVerificationEmail?.();
        window.tkToast?.(
          response?.status === "already-verified"
            ? tr("auth.email_already_verified", "Your email is already verified.")
            : tr("auth.verification_sent", "Verification email sent. Please check your inbox."),
          "info",
        );
        await window.EventSphereAuth?.refreshUser?.();
        if (userHasVerifiedEmail()) {
          bootstrap.Modal.getOrCreateInstance($("#reservationVerifyEmailModal")).hide();
        }
      } catch (err) {
        window.tkToast?.(
          err?.message || tr("auth.verification_failed", "We couldn’t send the verification email. Check your connection and try again."),
          "error",
        );
      } finally {
        button.disabled = false;
        button.innerHTML = original;
      }
    });
    document.addEventListener("click", async (event) => {
      const galleryOpen = event.target.closest("[data-gallery-open]");
      if (galleryOpen) {
        openLightbox(galleryOpen.dataset.galleryOpen);
        return;
      }

      const trigger = event.target.closest("[data-picker-trigger]");
      if (trigger) {
        togglePicker(trigger.dataset.pickerTrigger);
        return;
      }

      const option = event.target.closest("[data-picker-option]");
      if (option) {
        const type = option.dataset.pickerOption;
        const value = option.dataset.value;
        const label = option.dataset.label || option.textContent.trim();
        const prefix =
          {
            guests: tr("reservation.guests", "Guests"),
            date: tr("common.date", "Date"),
            time: tr("common.time", "Time"),
          }[type] || "";
        selectPickerValue(type, value, `${prefix}: ${label}`);
        if (type === "date" && currentVenue) {
          renderTimeSelector($("[data-reservation-form]"), currentVenue);
        }
        closePickers();
        return;
      }

      if (!event.target.closest("[data-picker]")) closePickers();
    });
    document.addEventListener("keydown", (event) => {
      const lightboxOpen = !$("[data-gallery-lightbox]")?.hidden;
      if (event.key === "Escape") {
        if (lightboxOpen) closeLightbox();
        closePickers();
      }
      if (lightboxOpen && event.key === "ArrowLeft") moveLightbox(-1);
      if (lightboxOpen && event.key === "ArrowRight") moveLightbox(1);
    });
    $("[data-gallery-close]")?.addEventListener("click", closeLightbox);
    $("[data-gallery-prev]")?.addEventListener("click", () => moveLightbox(-1));
    $("[data-gallery-next]")?.addEventListener("click", () => moveLightbox(1));
    $("[data-gallery-lightbox]")?.addEventListener("click", (event) => {
      if (event.target.matches("[data-gallery-lightbox]")) closeLightbox();
    });
    $("[data-gallery-lightbox]")?.addEventListener(
      "touchstart",
      (event) => {
        galleryTouchStartX = event.touches?.[0]?.clientX ?? null;
      },
      { passive: true },
    );
    $("[data-gallery-lightbox]")?.addEventListener(
      "touchend",
      (event) => {
        if (galleryTouchStartX === null) return;
        const endX = event.changedTouches?.[0]?.clientX ?? galleryTouchStartX;
        const delta = endX - galleryTouchStartX;
        if (Math.abs(delta) > 45) moveLightbox(delta > 0 ? -1 : 1);
        galleryTouchStartX = null;
      },
      { passive: true },
    );
    $("#reservationModal")?.addEventListener("hidden.bs.modal", () => {
      closePickers();
    });
    $("[data-reservation-form]")?.addEventListener("submit", submitReservation);
  });
})();
