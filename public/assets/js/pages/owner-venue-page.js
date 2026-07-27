(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const tr = (key, fallback, replacements) => window.t?.(key, replacements) || fallback;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch],
    );
  const imageUrl = (image) =>
    image?.url ||
    image?.image_path ||
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80";
  const dayKeys = [
    "calendar.monday",
    "calendar.tuesday",
    "calendar.wednesday",
    "calendar.thursday",
    "calendar.friday",
    "calendar.saturday",
    "calendar.sunday",
  ];
  const shortDayKeys = [
    "calendar.mon",
    "calendar.tue",
    "calendar.wed",
    "calendar.thu",
    "calendar.fri",
    "calendar.sat",
    "calendar.sun",
  ];
  const calendarStatuses = ["pending", "confirmed", "cancelled", "completed", "no_show"];
  const ownerCancellationReasons = [
    "Fully booked",
    "Private event",
    "Kitchen closed",
    "Staff shortage",
    "Maintenance",
  ];
  const locationPickerZoom = 15;
  const defaultLocation = { lat: 40.7128, lng: -74.006 };
  let ownerGoogleMap = null;
  let ownerGoogleMarker = null;
  let ownerGoogleGeocoder = null;
  let ownerSearchBox = null;
  let ownerMapsLoading = null;
  let syncingOwnerMap = false;
  let draggedOwnerImageId = null;
  let reservationLoadId = 0;
  let lastReservationRenderSignature = "";
  let reservationFilterTimer = null;
  const reservationRequests = new Map();
  const calendarRequests = new Map();
  const analyticsRequests = new Map();
  const renderSignatures = new Map();

  const state = {
    venue: null,
    facilities: [],
    cuisines: [],
    payments: [],
    venues: [],
    reservations: [],
    blackoutDates: [],
    specialHours: [],
    editingSpecialHourId: null,
    reservationStats: { pending: 0, confirmed: 0, cancelled: 0, today: 0 },
    reservationFilters: { view: "today", status: "", date: "", venue_id: "" },
    reservationWorkspace: {
      view: "today",
      search: "",
      dateEnd: "",
      partySize: "",
      occasion: "",
    },
    reservationView: "list",
    calendar: {
      view: "week",
      anchorDate: new Date(),
      reservations: [],
      filters: { status: "", venue_id: "" },
      todaySummary: { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
      loading: false,
    },
    analytics: {
      range: "30",
      filters: { venue_id: "" },
      data: null,
      loading: false,
    },
    pendingReservationAction: null,
    saving: false,
  };

  function currentLocale() {
    return window.TiketaLanguage?.getLanguage?.() === "sq" ? "sq-AL" : "en-US";
  }

  function dayName(index) {
    const fallback = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][
      index
    ];
    return tr(dayKeys[index], fallback);
  }

  function shortDayName(index) {
    const fallback = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index];
    return tr(shortDayKeys[index], fallback);
  }

  function guestCountLabel(count) {
    return Number(count) === 1 ? tr("manager.guest", "guest") : tr("manager.guests_count", "guests");
  }

  function guestFallback() {
    return tr("manager.guest_fallback", "Guest");
  }

  function restaurantBarFallback() {
    return tr("manager.restaurant_bar", "Restaurant / Bar");
  }

  function setBusy(busy) {
    state.saving = busy;
    const save = $("[data-owner-save]");
    if (save) {
      save.disabled = busy;
      save.innerHTML = busy
        ? `<span class="spinner-border spinner-border-sm me-1"></span>${tr("loading.saving", "Saving...")}`
        : `<i class="bi bi-check2-circle me-1"></i><span data-i18n="buttons.save_profile">${tr("buttons.save_profile", "Save profile")}</span>`;
    }
  }

  function friendlyError(err) {
    if (err?.status === 422) return validationMessages(err).join(" ");
    if (err?.status === 403)
      return tr(
        "owner.manage_forbidden",
        "This account cannot manage the selected restaurant or bar.",
      );
    return err?.message || tr("toast.unexpected_error", "Something didn’t work as expected. Refresh the page or try again in a moment.");
  }

  function debounceReservationLoad(delay = 250) {
    if (reservationFilterTimer) window.clearTimeout(reservationFilterTimer);
    reservationFilterTimer = window.setTimeout(() => {
      reservationFilterTimer = null;
      loadReservations();
    }, delay);
  }

  function stableSignature(value) {
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value ?? "");
    }
  }

  function skipRender(key, signature) {
    if (renderSignatures.get(key) === signature) return true;
    renderSignatures.set(key, signature);
    return false;
  }

  function clearOwnerRenderSignatures(...keys) {
    keys.forEach((key) => renderSignatures.delete(key));
  }

  function validationMessages(err) {
    const errors = err?.payload?.errors;
    if (!errors || typeof errors !== "object") {
      return [
        err?.originalMessage ||
          err?.message ||
          "Some restaurant or bar details need attention. Review the form and try again.",
      ];
    }

    return Object.values(errors).flat().filter(Boolean).map(String);
  }

  function showOwnerAlert(messages = [], type = "danger") {
    const root = $("[data-owner-alert]");
    if (!root) return;
    const list = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
    root.innerHTML = list.length
      ? `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${list.length === 1 ? esc(list[0]) : `<ul class="mb-0">${list.map((message) => `<li>${esc(message)}</li>`).join("")}</ul>`}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `
      : "";
  }

  function normalizeTime(value) {
    const text = String(value ?? "").trim();
    return /^\d{2}:\d{2}:\d{2}$/.test(text) ? text.slice(0, 5) : text;
  }

  function timeOptions() {
    const options = [`<option value="">${tr("availability.select_time", "Select time")}</option>`];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        options.push(`<option value="${value}">${value}</option>`);
      }
    }
    return options.join("");
  }

  function timeSelect(attrs, value, disabled = false) {
    const normalized = normalizeTime(value || "");
    return `<select class="form-select form-select-sm owner-time-select" ${attrs} ${disabled ? "disabled" : ""}>${timeOptions()}</select>`.replace(
      `value="${normalized}"`,
      `value="${normalized}" selected`,
    );
  }

  function hydrateTimeSelects() {
    document.querySelectorAll("[data-owner-time-select]").forEach((select) => {
      if (!select.options.length) select.innerHTML = timeOptions();
    });
    document.querySelectorAll("[data-special-open], [data-special-close]").forEach((select) => {
      if (!select.options.length) select.innerHTML = timeOptions();
    });
  }

  function statusBadge(status) {
    const map = {
      pending: "reservation-status-pending",
      confirmed: "reservation-status-confirmed",
      completed: "reservation-status-completed",
      cancelled: "reservation-status-cancelled",
      no_show: "reservation-status-no_show",
    };
    return `<span class="reservation-status ${map[status] || ""}">${esc(statusLabel(status || "pending"))}</span>`;
  }

  function dateLabel(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(currentLocale(), { month: "short", day: "numeric", year: "numeric" });
  }

  function timeLabel(value) {
    return String(value || "").slice(0, 5);
  }

  function statusLabel(value) {
    const key = {
      pending: "owner.pending",
      confirmed: "owner.confirmed",
      completed: "owner.completed",
      cancelled: "owner.cancelled",
      no_show: "owner.no_show",
    }[value || "pending"];
    return tr(
      key || "owner.pending",
      String(value || "pending")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    );
  }

  function occasionLabel(value) {
    const labels = {
      Birthday: "Birthday 🎂",
      Anniversary: "Anniversary 🥂",
      "Date Night": "Date Night",
      "Business Meeting": "Business Meeting",
      "Family Gathering": "Family Gathering",
      Celebration: "Celebration",
      "Friends Night Out": "Friends Night Out",
      Other: "Other",
    };
    const key = {
      Birthday: "reservation.birthday",
      Anniversary: "reservation.anniversary",
      "Date Night": "reservation.date_night",
      "Business Meeting": "reservation.business_meeting",
      "Family Gathering": "reservation.family_gathering",
      Celebration: "reservation.celebration",
      "Friends Night Out": "reservation.friends_night_out",
      Other: "reservation.other",
    }[value];
    return key
      ? tr(key, labels[value] || value)
      : value || tr("reservation.not_provided", "Not provided");
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function chartTheme() {
    return {
      text: cssVar("--muted") || "#94a3b8",
      grid: cssVar("--border") || "rgba(148,163,184,.16)",
      primary: cssVar("--primary") || "#5b8cff",
      gold: cssVar("--gold") || "#d4a75a",
    };
  }

  function dateTimeLabel(value) {
    if (!value) return tr("reservation.not_set", "Not set");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(currentLocale(), {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function googleMapEmbedUrl(lat, lng, zoom = locationPickerZoom) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=${zoom}&output=embed`;
  }

  function googleMapsUrl(lat, lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
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

  function formCoordinates() {
    const form = $("[data-owner-venue-form]");
    const lat = Number(form?.elements.latitude?.value);
    const lng = Number(form?.elements.longitude?.value);

    return validCoordinate(lat, lng) ? { lat, lng } : null;
  }

  function formatCoordinate(value) {
    return Number(value).toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
  }

  function locationSearchText() {
    const form = $("[data-owner-venue-form]");
    if (!form) return "";

    return [form.elements.address?.value, form.elements.city?.value, form.elements.country?.value]
      .filter(Boolean)
      .join(", ");
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
    if (ownerMapsLoading) return ownerMapsLoading;

    ownerMapsLoading = new Promise((resolve) => {
      const callback = `eventSphereOwnerMapsReady${Date.now()}`;
      window[callback] = () => {
        delete window[callback];
        resolve(true);
      };

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${callback}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[callback];
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return ownerMapsLoading;
  }

  function selectedAddressText() {
    const form = $("[data-owner-venue-form]");
    return locationSearchText() || form?.elements.address?.value || "";
  }

  function updateSelectedLocationDetails(coordinates) {
    const address = $("[data-owner-location-selected-address]");
    const latitude = $("[data-owner-location-selected-latitude]");
    const longitude = $("[data-owner-location-selected-longitude]");

    if (address)
      address.textContent = coordinates
        ? selectedAddressText() || tr("manager.selected_pin", "Selected pin")
        : tr("manager.not_selected", "Not selected");
    if (latitude) latitude.textContent = coordinates ? formatCoordinate(coordinates.lat) : "-";
    if (longitude) longitude.textContent = coordinates ? formatCoordinate(coordinates.lng) : "-";
  }

  function setLocationFields(lat, lng, address = null) {
    if (!validCoordinate(lat, lng)) return;
    const form = $("[data-owner-venue-form]");
    if (!form) return;
    form.elements.latitude.value = formatCoordinate(lat);
    form.elements.longitude.value = formatCoordinate(lng);
    if (address && form.elements.address) form.elements.address.value = address;
    updateOwnerLocationMap();
  }

  function syncOwnerMarker(lat, lng, animate = false) {
    if (!ownerGoogleMap || !ownerGoogleMarker || !validCoordinate(lat, lng)) return;
    const position = { lat, lng };
    ownerGoogleMarker.setPosition(position);
    ownerGoogleMap.panTo(position);
    if (animate && window.google?.maps?.Animation) {
      ownerGoogleMarker.setAnimation(window.google.maps.Animation.DROP);
      window.setTimeout(() => ownerGoogleMarker?.setAnimation(null), 700);
    }
  }

  function reverseGeocodeOwnerLocation(lat, lng) {
    if (!ownerGoogleGeocoder || !validCoordinate(lat, lng)) return;

    ownerGoogleGeocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results?.[0]) return;
      const form = $("[data-owner-venue-form]");
      const address = results[0].formatted_address || "";
      if (form?.elements.address && address) {
        form.elements.address.value = address;
        const search = $("[data-owner-location-search]");
        if (search) search.value = address;
      }
      updateSelectedLocationDetails(formCoordinates());
    });
  }

  function geocodeOwnerQuery(query) {
    if (!ownerGoogleGeocoder) return Promise.resolve(null);

    return new Promise((resolve) => {
      ownerGoogleGeocoder.geocode({ address: query }, (results, status) => {
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          resolve(null);
          return;
        }
        const result = results[0];
        resolve({
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          address: result.formatted_address || query,
        });
      });
    });
  }

  function moveOwnerMarker(lat, lng, options = {}) {
    if (!validCoordinate(lat, lng)) return;
    setLocationFields(lat, lng, options.address || null);
    syncOwnerMarker(lat, lng, options.animate !== false);
    if (options.reverseGeocode !== false && !options.address) {
      reverseGeocodeOwnerLocation(lat, lng);
    }
  }

  function webMercatorPoint(lat, lng, zoom) {
    const scale = 256 * 2 ** zoom;
    const sinLat = Math.sin((lat * Math.PI) / 180);

    return {
      x: ((lng + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
  }

  function webMercatorLatLng(x, y, zoom) {
    const scale = 256 * 2 ** zoom;
    const lng = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    return { lat, lng };
  }

  function coordinatesFromPickerClick(event) {
    const current = formCoordinates() || defaultLocation;
    const rect = event.currentTarget.getBoundingClientRect();
    const center = webMercatorPoint(current.lat, current.lng, locationPickerZoom);

    return webMercatorLatLng(
      center.x + (event.clientX - rect.left) - rect.width / 2,
      center.y + (event.clientY - rect.top) - rect.height / 2,
      locationPickerZoom,
    );
  }

  function updateOwnerLocationMap() {
    const coordinates = formCoordinates();
    const preview = coordinates || defaultLocation;
    const mapRoot = $("[data-owner-location-map]");
    const frame = $("[data-owner-location-frame]");
    const status = $("[data-owner-location-status]");
    const open = $("[data-owner-location-open]");
    const search = $("[data-owner-location-search]");

    if (frame) frame.src = googleMapEmbedUrl(preview.lat, preview.lng);
    if (ownerGoogleMap && !syncingOwnerMap) {
      syncingOwnerMap = true;
      syncOwnerMarker(preview.lat, preview.lng, Boolean(coordinates));
      syncingOwnerMap = false;
    }
    if (mapRoot) mapRoot.classList.toggle("has-location", Boolean(coordinates));
    if (status) {
      status.textContent = coordinates
        ? tr("manager.location_pin_ready", "Location pin is ready. Drag the marker or click the map to refine it.")
        : tr("owner.map_location_copy", "Search an address, click the map, or drag the marker to set the exact pin.");
    }
    if (open) {
      open.hidden = !coordinates;
      if (coordinates) open.href = googleMapsUrl(coordinates.lat, coordinates.lng);
    }
    if (search && !search.value) search.value = locationSearchText();
    updateSelectedLocationDetails(coordinates);
  }

  async function initOwnerGoogleMap() {
    const canvas = $("[data-owner-location-canvas]");
    const mapRoot = $("[data-owner-location-map]");
    if (!canvas || ownerGoogleMap) return;

    const loaded = await loadGoogleMaps();
    if (!loaded || !window.google?.maps) {
      updateOwnerLocationMap();
      return;
    }

    const coordinates = formCoordinates();
    const center = coordinates || defaultLocation;
    canvas.hidden = false;
    mapRoot?.classList.add("has-google-map");

    ownerGoogleMap = new window.google.maps.Map(canvas, {
      center,
      zoom: coordinates ? 16 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: true,
    });
    ownerGoogleGeocoder = new window.google.maps.Geocoder();
    ownerGoogleMarker = new window.google.maps.Marker({
      position: center,
      map: ownerGoogleMap,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      title: tr("manager.selected_restaurant_location", "Selected restaurant or bar location"),
    });

    ownerGoogleMap.addListener("click", (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      moveOwnerMarker(lat, lng, { animate: true });
    });
    ownerGoogleMarker.addListener("dragend", (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      moveOwnerMarker(lat, lng, { animate: false });
    });

    const search = $("[data-owner-location-search]");
    if (search && window.google.maps.places?.SearchBox) {
      ownerSearchBox = new window.google.maps.places.SearchBox(search);
      ownerGoogleMap.addListener("bounds_changed", () => {
        ownerSearchBox.setBounds(ownerGoogleMap.getBounds());
      });
      ownerSearchBox.addListener("places_changed", () => {
        const place = ownerSearchBox.getPlaces()?.[0];
        const location = place?.geometry?.location;
        if (!location) {
          window.tkToast?.(
            tr(
              "owner.no_matching_address",
              "No matching address yet. Try a more specific street, city, or restaurant name.",
            ),
            "error",
          );
          return;
        }
        moveOwnerMarker(location.lat(), location.lng(), {
          address: place.formatted_address || place.name || search.value,
          animate: true,
          reverseGeocode: false,
        });
        ownerGoogleMap.setZoom(16);
        window.tkToast?.(tr("owner.map_location_updated", "Map location updated."), "success");
      });
    }

    updateOwnerLocationMap();
  }

  async function searchOwnerLocation() {
    const button = $("[data-owner-location-search-button]");
    const search = $("[data-owner-location-search]");
    const query = String(search?.value || locationSearchText()).trim();

    if (!query) {
      window.tkToast?.(tr("owner.enter_address_search", "Enter an address to search."), "error");
      return;
    }

    if (button) {
      button.dataset.originalLabel = button.dataset.originalLabel || button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Searching...';
    }

    try {
      await initOwnerGoogleMap();
      const googleResult = await geocodeOwnerQuery(query);
      if (googleResult) {
        moveOwnerMarker(googleResult.lat, googleResult.lng, {
          address: googleResult.address,
          animate: true,
          reverseGeocode: false,
        });
        if (ownerGoogleMap) ownerGoogleMap.setZoom(16);
        window.tkToast?.(tr("owner.map_location_updated", "Map location updated."), "success");
        return;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        {
          headers: { Accept: "application/json" },
        },
      );
      const results = await response.json();
      const result = Array.isArray(results) ? results[0] : null;

      if (!result) {
        window.tkToast?.(
          tr(
            "owner.no_matching_address",
            "No matching address yet. Try a more specific street, city, or restaurant name.",
          ),
          "error",
        );
        return;
      }

      moveOwnerMarker(Number(result.lat), Number(result.lon), {
        address: result.display_name || query,
        animate: true,
        reverseGeocode: false,
      });
      window.tkToast?.(tr("owner.map_location_updated", "Map location updated."), "success");
    } catch (err) {
      window.tkToast?.(
        tr("owner.address_search_failed", "We couldn’t search that address right now. Try a more specific street, city, or restaurant name."),
        "error",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML =
          button.dataset.originalLabel || '<i class="bi bi-search me-1"></i>Search this address';
      }
    }
  }

  function localDate(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function toDateInputValue(value) {
    const date = localDate(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(value, amount) {
    const date = localDate(value);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function addMonths(value, amount) {
    const date = localDate(value);
    date.setMonth(date.getMonth() + amount);
    return date;
  }

  function startOfWeek(value) {
    const date = localDate(value);
    const day = (date.getDay() + 6) % 7;
    return addDays(date, -day);
  }

  function startOfMonth(value) {
    const date = localDate(value);
    date.setDate(1);
    return date;
  }

  function endOfMonth(value) {
    const date = startOfMonth(value);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date;
  }

  function calendarPeriod() {
    const anchor = localDate(state.calendar.anchorDate);
    if (state.calendar.view === "day") {
      return { start: anchor, end: anchor };
    }
    if (state.calendar.view === "month") {
      const monthStart = startOfMonth(anchor);
      const monthEnd = endOfMonth(anchor);
      return {
        start: startOfWeek(monthStart),
        end: addDays(startOfWeek(monthEnd), 6),
      };
    }
    const weekStart = startOfWeek(anchor);
    return { start: weekStart, end: addDays(weekStart, 6) };
  }

  function calendarTitle() {
    const { start, end } = calendarPeriod();
    if (state.calendar.view === "day") {
      return start.toLocaleDateString(currentLocale(), {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (state.calendar.view === "month") {
      return localDate(state.calendar.anchorDate).toLocaleDateString(currentLocale(), {
        month: "long",
        year: "numeric",
      });
    }
    return `${start.toLocaleDateString(currentLocale(), { month: "short", day: "numeric" })} - ${end.toLocaleDateString(currentLocale(), { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function analyticsPeriod() {
    const end = localDate(new Date());
    let start = addDays(end, -29);

    if (state.analytics.range === "7") start = addDays(end, -6);
    if (state.analytics.range === "90") start = addDays(end, -89);
    if (state.analytics.range === "year") {
      start = localDate(end);
      start.setMonth(0, 1);
    }
    if (state.analytics.range === "custom") {
      const customStart = $("[data-owner-analytics-start]")?.value;
      const customEnd = $("[data-owner-analytics-end]")?.value;
      return {
        start: customStart ? localDate(customStart) : start,
        end: customEnd ? localDate(customEnd) : end,
      };
    }

    return { start, end };
  }

  function selectedIds(items) {
    return new Set((items || []).map((item) => Number(item.id)));
  }

  function renderChecks(selector, items, selected, name) {
    const root = $(selector);
    if (!root) return;
    root.innerHTML =
      items
        .map((item) => {
          const id = `${name}-${item.id}`;
          const checked = selected.has(Number(item.id)) ? " checked" : "";
          return `
        <label class="owner-check" for="${id}">
          <input class="form-check-input" id="${id}" type="checkbox" name="${name}" value="${item.id}"${checked}>
          <span>${esc(item.name)}</span>
        </label>
      `;
        })
        .join("") || '<div class="small text-muted-pro">No options available.</div>';
  }

  function renderHours(openingHours = []) {
    const root = $("[data-owner-hours]");
    if (!root) return;
    $("[data-owner-availability-empty]")?.toggleAttribute("hidden", openingHours.length > 0);
    const byDay = new Map(openingHours.map((item) => [Number(item.day_of_week), item]));
    root.innerHTML = dayKeys
      .map((_, index) => {
        const day = dayName(index);
        const item = byDay.get(index) || {};
        const closed = Boolean(item.is_closed);
        return `
        <div class="col-lg-6">
          <div class="facility owner-hours-row">
            <div class="owner-hours-day"><i class="bi bi-clock"></i><span>${day}</span></div>
            ${timeSelect(`data-hours-open="${index}" aria-label="${esc(day)} opens at"`, item.opens_at, closed)}
            ${timeSelect(`data-hours-close="${index}" aria-label="${esc(day)} closes at"`, item.closes_at, closed)}
            <label class="form-check owner-hours-closed">
              <input class="form-check-input" type="checkbox" data-hours-closed="${index}" ${closed ? "checked" : ""}>
              <span data-i18n="availability.closed">${tr("availability.closed", "Closed")}</span>
            </label>
          </div>
        </div>
      `;
      })
      .join("");
  }

  function renderAvailabilityExceptions() {
    document.querySelectorAll("[data-owner-availability-section]").forEach((section) => {
      section.toggleAttribute("hidden", !state.venue);
    });
    renderBlackoutDates();
    renderSpecialHours();
  }

  function renderBlackoutDates() {
    const root = $("[data-blackout-list]");
    if (!root) return;
    root.innerHTML = state.blackoutDates.length
      ? state.blackoutDates
          .map(
            (item) => `
      <div class="availability-item">
        <div>
          <strong>${esc(dateLabel(item.date))}</strong>
          <span>${esc(item.reason || tr("availability.closed", "Closed"))}</span>
        </div>
        <button class="btn btn-glass btn-sm" type="button" data-blackout-delete="${item.id}" aria-label="${esc(tr("manager.remove_blackout_date", "Remove blackout date"))}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `,
          )
          .join("")
      : `<div class="availability-empty"><strong data-i18n="availability.no_blackout_dates">${tr("availability.no_blackout_dates", "No blackout dates added.")}</strong><span class="d-block">${tr("availability.no_blackout_dates_copy", "Add a blackout date when this restaurant or bar should stop accepting reservations.")}</span></div>`;
  }

  function renderSpecialHours() {
    const root = $("[data-special-list]");
    if (!root) return;
    root.innerHTML = state.specialHours.length
      ? state.specialHours
          .map(
            (item) => `
      <div class="availability-item">
        <div>
          <strong>${esc(dateLabel(item.date))}</strong>
          <span>${item.is_closed ? tr("availability.closed", "Closed") : `${esc(timeLabel(item.opens_at))} - ${esc(timeLabel(item.closes_at))}`}</span>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-glass" type="button" data-special-edit="${item.id}" aria-label="${esc(tr("manager.edit_special_hours", "Edit special hours"))}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-glass" type="button" data-special-delete="${item.id}" aria-label="${esc(tr("manager.delete_special_hours", "Delete special hours"))}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `,
          )
          .join("")
      : `<div class="availability-empty"><strong data-i18n="availability.no_special_hours">${tr("availability.no_special_hours", "No special hours added.")}</strong><span class="d-block">${tr("availability.no_special_hours_copy", "Add special hours for holidays, private events, or one-off schedule changes.")}</span></div>`;
  }

  function clearSpecialForm() {
    state.editingSpecialHourId = null;
    const date = $("[data-special-date]");
    const open = $("[data-special-open]");
    const close = $("[data-special-close]");
    const closed = $("[data-special-closed]");
    if (date) date.value = "";
    if (open) open.value = "";
    if (close) close.value = "";
    if (closed) closed.checked = false;
    syncSpecialClosedState();
  }

  function syncSpecialClosedState() {
    const closed = $("[data-special-closed]")?.checked || false;
    [$("[data-special-open]"), $("[data-special-close]")].forEach((select) => {
      if (!select) return;
      select.disabled = closed;
      if (closed) select.value = "";
    });
  }

  function renderGallery() {
    const root = $("[data-owner-gallery]");
    if (!root) return;
    const images = [...(state.venue?.images || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    );
    const signature = stableSignature(
      images.map((image) => [image.id, imageUrl(image), image.sort_order]),
    );
    if (skipRender("gallery", signature)) return;

    root.innerHTML = images.length
      ? images
          .map(
            (image, index) => `
      <div class="col-md-6 col-xl-4">
        <div class="owner-gallery-card ${index === 0 ? "is-cover" : ""}" draggable="true" data-owner-gallery-card="${image.id}">
          <div class="owner-gallery-image">
            <img loading="lazy" decoding="async" width="800" height="500" sizes="(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw" src="${esc(imageUrl(image))}" alt="${esc(state.venue?.name || tr("common.restaurant_bar", "Restaurant or bar"))} ${esc(tr("venue.gallery", "Gallery"))} ${index + 1}" />
            <span class="owner-gallery-cover-badge"><i class="bi bi-star-fill"></i> ${tr("owner.cover", "Cover")}</span>
            <span class="owner-gallery-drag-hint"><i class="bi bi-grip-vertical"></i> ${tr("owner.drag", "Drag")}</span>
          </div>
          <div class="owner-gallery-card-body">
            <div>
              <strong>${index === 0 ? tr("venue.cover_photo", "Cover photo") : `${tr("venue.gallery", "Gallery")} ${index + 1}`}</strong>
              <small class="text-muted-pro">${tr("owner.drag_to_reorder", "Drag to reorder")}</small>
            </div>
            <div class="owner-gallery-actions">
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-cover="${image.id}" ${index === 0 ? "disabled" : ""} aria-label="${esc(tr("manager.set_as_cover_photo", "Set as cover photo"))}"><i class="bi bi-star"></i></button>
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-up="${image.id}" ${index === 0 ? "disabled" : ""} aria-label="${esc(tr("manager.move_image_left", "Move image left"))}"><i class="bi bi-arrow-left"></i></button>
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-down="${image.id}" ${index === images.length - 1 ? "disabled" : ""} aria-label="${esc(tr("manager.move_image_right", "Move image right"))}"><i class="bi bi-arrow-right"></i></button>
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-delete="${image.id}" aria-label="${esc(tr("manager.delete_image", "Delete image"))}"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `,
          )
          .join("")
      : `<div class="col-12"><div class="owner-gallery-empty"><i class="bi bi-images"></i><strong data-i18n="empty.no_images">${tr("empty.no_images", "Your gallery is waiting for its first image.")}</strong><span class="d-block" data-i18n="empty.no_images_copy">${tr("empty.no_images_copy", "Photos help guests trust the experience before they book or buy.")}</span><button class="btn btn-gold btn-sm mt-2" type="button" data-owner-image-upload-trigger data-i18n="empty.upload_image_action">${tr("empty.upload_image_action", "Upload image")}</button></div></div>`;
  }

  function hasOpeningHours(venue) {
    return Boolean(
      (venue?.opening_hours || []).some(
        (item) => !item.is_closed && normalizeTime(item.opens_at) && normalizeTime(item.closes_at),
      ),
    );
  }

  function hasSocialLinks(venue) {
    const links = venue?.social_links || {};
    return Boolean(venue?.website || links.facebook_url || links.instagram_url || links.tiktok_url);
  }

  function profileCompletionItems(venue) {
    const images = venue?.images || [];
    return [
      {
        label: tr("manager.restaurant_name", "Restaurant name"),
        missing: tr("manager.add_name", "Add Name"),
        complete: Boolean(String(venue?.name || "").trim()),
      },
      {
        label: tr("venue.description", "Description"),
        missing: tr("manager.add_description", "Add Description"),
        complete: Boolean(String(venue?.description || "").trim()),
      },
      {
        label: tr("manager.cover_image", "Cover Image"),
        missing: tr("manager.add_cover_image", "Add Cover Image"),
        complete: Boolean(venue?.logo_image || images.length),
      },
      { label: tr("manager.gallery_images", "Gallery Images"), missing: tr("manager.add_gallery_images", "Add Gallery Images"), complete: images.length > 1 },
      {
        label: tr("venue.phone", "Phone"),
        missing: tr("manager.add_phone", "Add Phone"),
        complete: Boolean(String(venue?.phone || "").trim()),
      },
      {
        label: tr("venue.address", "Address"),
        missing: tr("manager.add_address", "Add Address"),
        complete: Boolean(String(venue?.address || "").trim()),
      },
      { label: tr("owner.opening_hours", "Opening hours"), missing: tr("manager.add_opening_hours", "Add opening hours"), complete: hasOpeningHours(venue) },
      {
        label: tr("venue.facilities", "Facilities"),
        missing: tr("manager.add_facilities", "Add Facilities"),
        complete: Boolean(venue?.facilities?.length),
      },
      {
        label: tr("manager.cuisine_types", "Cuisine Types"),
        missing: tr("manager.add_cuisine_types", "Add Cuisine Types"),
        complete: Boolean(venue?.cuisine_types?.length),
      },
      { label: tr("manager.social_links", "Social links"), missing: tr("manager.add_instagram", "Add Instagram"), complete: hasSocialLinks(venue) },
    ];
  }

  function renderProfileCompletion() {
    const root = $("[data-owner-completion]");
    if (!root) return;
    const venue = state.venue;
    root.hidden = !venue;
    if (!venue) return;

    const items = profileCompletionItems(venue);
    const complete = items.filter((item) => item.complete).length;
    const percent = Math.round((complete / items.length) * 100);
    const missing = items.filter((item) => !item.complete);

    $("[data-owner-completion-percent]").textContent = `${percent}%`;
    const bar = $("[data-owner-completion-bar]");
    if (bar) bar.style.width = `${percent}%`;

    const missingRoot = $("[data-owner-completion-missing]");
    if (missingRoot) {
      missingRoot.innerHTML = missing.length
        ? missing
            .map((item) => `<span><i class="bi bi-plus-circle"></i>${esc(item.missing)}</span>`)
            .join("")
        : `<span class="complete"><i class="bi bi-patch-check"></i>${tr("owner.profile_complete", "Profile looks complete")}</span>`;
    }
  }

  function todayValue() {
    return toDateInputValue(new Date());
  }

  function reservationTimeValue(reservation) {
    return normalizeTime(reservation?.reservation_time || "");
  }

  function reservationDateTime(reservation) {
    const date = reservation?.reservation_date || todayValue();
    const time = reservationTimeValue(reservation) || "00:00";
    return new Date(`${date}T${time}:00`);
  }

  function reservationUpdatedTime(reservation) {
    return new Date(
      reservation?.cancelled_at || reservation?.updated_at || reservation?.created_at || 0,
    ).getTime();
  }

  function todayReservations() {
    const today = todayValue();
    return state.reservations
      .filter((reservation) => reservation.reservation_date === today)
      .sort((a, b) => reservationDateTime(a) - reservationDateTime(b));
  }

  function upcomingReservations(statuses = []) {
    const now = new Date();
    return state.reservations
      .filter((reservation) => {
        if (statuses.length && !statuses.includes(reservation.status)) return false;
        return reservationDateTime(reservation) >= now;
      })
      .sort((a, b) => reservationDateTime(a) - reservationDateTime(b));
  }

  function todaysOpeningWindow() {
    const hours = state.venue?.opening_hours || [];
    const dayIndex = (new Date().getDay() + 6) % 7;
    return hours.find((item) => Number(item.day_of_week) === dayIndex);
  }

  function operatingStatus() {
    if (!state.venue) {
      return {
        label: tr("manager.setup_needed", "Setup needed"),
        detail: tr("manager.setup_needed_detail", "Create a venue profile to start accepting reservations."),
        tone: "warning",
      };
    }
    if (state.venue.status !== "active") {
      return {
        label: tr("manager.venue_inactive", "Venue inactive"),
        detail: tr("manager.venue_inactive_detail", "Activate the venue when you are ready for guests to book."),
        tone: "critical",
      };
    }

    const todayHours = todaysOpeningWindow();
    if (!todayHours || todayHours.is_closed || !todayHours.opens_at || !todayHours.closes_at) {
      return {
        label: tr("manager.closed_today", "Closed today"),
        detail: tr("manager.closed_today_detail", "Existing reservations still appear in today's operations."),
        tone: "warning",
      };
    }

    const now = new Date();
    const open = new Date(`${todayValue()}T${normalizeTime(todayHours.opens_at)}:00`);
    const close = new Date(`${todayValue()}T${normalizeTime(todayHours.closes_at)}:00`);
    if (now < open) {
      return {
        label: tr("manager.opens_at", "Opens at {time}", { time: timeLabel(todayHours.opens_at) }),
        detail: tr("manager.todays_hours", "Today's hours: {open} - {close}", {
          open: timeLabel(todayHours.opens_at),
          close: timeLabel(todayHours.closes_at),
        }),
        tone: "info",
      };
    }
    if (now > close) {
      return {
        label: tr("manager.closed_now", "Closed now"),
        detail: tr("manager.closed_at", "Closed at {time}", { time: timeLabel(todayHours.closes_at) }),
        tone: "info",
      };
    }
    return {
      label: tr("manager.open_now", "Open now"),
      detail: tr("manager.open_until", "Open until {time}", { time: timeLabel(todayHours.closes_at) }),
      tone: "success",
    };
  }

  function servicePeriodLabel() {
    const hour = new Date().getHours();
    if (hour < 11) return tr("manager.breakfast_service", "Breakfast service");
    if (hour < 16) return tr("manager.lunch_service", "Lunch service");
    if (hour < 22) return tr("manager.dinner_service", "Dinner service");
    return tr("manager.late_service", "Late service");
  }

  function dashboardEmpty(icon, title, copy, actions = "") {
    return `
      <div class="manager-dashboard-empty">
        <i class="bi ${icon}"></i>
        <div><strong>${esc(title)}</strong><span>${esc(copy)}</span>${actions}</div>
      </div>
    `;
  }

  function dashboardReservationRow(reservation, action = "") {
    return `
      <div class="manager-operation-row">
        <div>
          <strong>${esc(reservation.guest_name || guestFallback())}</strong>
          <span>${esc(timeLabel(reservation.reservation_time))} · ${Number(reservation.party_size || 0)} ${guestCountLabel(reservation.party_size)}</span>
        </div>
        <div class="manager-operation-meta">
          ${statusBadge(reservation.status)}
          ${action}
        </div>
      </div>
    `;
  }

  function renderDashboardHeader() {
    const user = auth()?.getUser?.();
    const name = user?.name ? user.name.split(" ")[0] : "";
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? tr("manager.good_morning", "Good morning")
        : hour < 18
          ? tr("manager.good_afternoon", "Good afternoon")
          : tr("manager.good_evening", "Good evening");
    const status = operatingStatus();
    const next = upcomingReservations(["pending", "confirmed"])[0];

    const greetingEl = $("[data-dashboard-greeting]");
    if (greetingEl) greetingEl.textContent = name ? `${greeting}, ${name}` : greeting;
    const venueEl = $("[data-dashboard-venue-name]");
    if (venueEl) {
      venueEl.textContent = state.venue?.name || restaurantBarFallback();
    }
    const dateEl = $("[data-dashboard-date]");
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString(currentLocale(), {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
    const statusEl = $("[data-dashboard-operating-status]");
    if (statusEl) {
      statusEl.textContent = status.label;
      statusEl.className = `manager-status-pill manager-status-${status.tone}`;
    }
    const serviceEl = $("[data-dashboard-service-period]");
    if (serviceEl) serviceEl.textContent = servicePeriodLabel();
    const nextEl = $("[data-dashboard-next-service]");
    if (nextEl) {
      nextEl.textContent = next
        ? tr("manager.next_reservation_at", "Next reservation at {time} · {guest}", {
            time: timeLabel(next.reservation_time),
            guest: next.guest_name || guestFallback(),
          })
        : status.detail;
    }
  }

  function renderAttentionQueue() {
    const root = $("[data-dashboard-attention-list]");
    if (!root) return;
    const today = todayValue();
    const pending = state.reservations.filter((reservation) => reservation.status === "pending");
    const cancellationsToday = state.reservations.filter(
      (reservation) =>
        reservation.status === "cancelled" &&
        (reservation.reservation_date === today ||
          String(reservation.cancelled_at || "").startsWith(today)),
    );
    const noShowsToday = state.reservations.filter(
      (reservation) => reservation.status === "no_show" && reservation.reservation_date === today,
    );
    const missing = state.venue
      ? profileCompletionItems(state.venue).filter((item) => !item.complete)
      : [];
    const status = operatingStatus();
    const items = [];

    if (!state.venue) {
      items.push({
        tone: "critical",
        icon: "bi-exclamation-octagon",
        title: tr("manager.venue_setup_blocking", "Venue setup is blocking bookings"),
        copy: tr("manager.venue_setup_blocking_copy", "Create your venue profile before guests can reserve."),
      });
    } else if (state.venue.status !== "active") {
      items.push({
        tone: "critical",
        icon: "bi-slash-circle",
        title: tr("manager.venue_inactive", "Venue is not active"),
        copy: tr("manager.venue_not_active_copy", "Public booking depends on the venue being active."),
      });
    }
    if (pending.length) {
      items.push({
        tone: "warning",
        icon: "bi-hourglass-split",
        title: tr(
          pending.length === 1 ? "manager.pending_request_count" : "manager.pending_requests_count",
          "{count} pending requests",
          { count: pending.length },
        ),
        copy: tr("manager.review_guest_requests_copy", "Review guest requests before service."),
        action: "pending",
      });
    }
    if (cancellationsToday.length) {
      items.push({
        tone: "warning",
        icon: "bi-calendar-x",
        title: tr(
          cancellationsToday.length === 1
            ? "manager.cancellation_today_count"
            : "manager.cancellations_today_count",
          "{count} cancellations today",
          { count: cancellationsToday.length },
        ),
        copy: tr("manager.same_day_changes", "Same-day changes may affect covers and staffing."),
      });
    }
    if (noShowsToday.length) {
      items.push({
        tone: "warning",
        icon: "bi-person-x",
        title: tr(
          noShowsToday.length === 1 ? "manager.no_show_today_count" : "manager.no_shows_today_count",
          "{count} no-shows today",
          { count: noShowsToday.length },
        ),
        copy: tr("manager.review_missed_arrivals_copy", "Review missed arrivals before closing the day."),
      });
    }
    if (state.venue && (!hasOpeningHours(state.venue) || missing.length >= 4)) {
      items.push({
        tone: "info",
        icon: "bi-clipboard2-check",
        title: !hasOpeningHours(state.venue)
          ? tr("manager.opening_hours", "Opening hours missing")
          : tr("manager.profile_needs_attention", "Profile needs attention"),
        copy: !hasOpeningHours(state.venue)
          ? tr("manager.availability_untrusted_copy", "Availability cannot be trusted until hours are configured.")
          : tr("manager.setup_items_incomplete", "{count} setup items are still incomplete.", {
              count: missing.length,
            }),
      });
    }
    if (status.label === tr("manager.closed_today", "Closed today") && todayReservations().length) {
      items.push({
        tone: "warning",
        icon: "bi-calendar-event",
        title: tr("manager.reservations_exist_closed", "Reservations exist while closed today"),
        copy: tr("manager.review_closed_bookings_copy", "Review today's bookings against venue hours."),
      });
    }

    root.innerHTML = items.length
      ? items
          .slice(0, 4)
          .map(
            (item) => `
        <div class="manager-attention-item manager-attention-${item.tone}">
          <i class="bi ${item.icon}"></i>
          <div><strong>${esc(item.title)}</strong><span>${esc(item.copy)}</span></div>
          ${
            item.action
              ? `<button class="btn btn-gold-outline btn-sm" type="button" data-manager-quick-action="${item.action}">${tr("manager.review", "Review")}</button>`
              : ""
          }
        </div>
      `,
          )
          .join("")
      : dashboardEmpty(
          "bi-shield-check",
          tr("manager.no_urgent_items", "No urgent items."),
          tr("manager.no_urgent_items_copy", "Pending requests, same-day cancellations, and setup blockers will appear here."),
        );
  }

  function renderDashboardOperations() {
    const pendingRoot = $("[data-dashboard-pending-list]");
    const arrivalsRoot = $("[data-dashboard-arrivals-list]");
    const timelineRoot = $("[data-dashboard-timeline-list]");
    const pending = state.reservations
      .filter((reservation) => reservation.status === "pending")
      .sort((a, b) => reservationDateTime(a) - reservationDateTime(b))
      .slice(0, 4);
    const arrivals = upcomingReservations(["confirmed"]).slice(0, 4);
    const today = todayReservations();

    if (pendingRoot) {
      pendingRoot.innerHTML = pending.length
        ? pending
            .map((reservation) =>
              dashboardReservationRow(
                reservation,
                `<button class="btn btn-gold-outline btn-sm" type="button" data-owner-reservation-view="${reservation.id}">${tr("manager.review", "Review")}</button>`,
              ),
            )
            .join("")
        : dashboardEmpty(
            "bi-calendar-check",
            tr("manager.no_pending_reservations", "No pending reservations."),
            tr("manager.no_pending_reservations_copy", "New guest requests will appear here when they need review."),
          );
    }

    if (arrivalsRoot) {
      arrivalsRoot.innerHTML = arrivals.length
        ? arrivals.map((reservation) => dashboardReservationRow(reservation)).join("")
        : dashboardEmpty(
            "bi-person-walking",
            tr("manager.no_upcoming_arrivals", "No upcoming confirmed arrivals."),
            tr("manager.no_upcoming_arrivals_copy", "Confirmed reservations will appear here as service approaches."),
          );
    }

    if (timelineRoot) {
      timelineRoot.innerHTML = today.length
        ? today
            .slice(0, 8)
            .map(
              (reservation) => `
        <div class="manager-timeline-row">
          <time>${esc(timeLabel(reservation.reservation_time))}</time>
          <div><strong>${esc(reservation.guest_name || guestFallback())}</strong><span>${Number(reservation.party_size || 0)} ${guestCountLabel(reservation.party_size)}</span></div>
          ${statusBadge(reservation.status)}
        </div>
      `,
            )
            .join("")
        : dashboardEmpty(
            "bi-calendar2",
            tr("manager.no_reservations_yet", "No reservations yet."),
            tr("manager.no_reservations_dashboard_copy", "Preview the public page or check availability when you are ready for bookings."),
            `<div class="manager-empty-actions"><button class="btn btn-gold btn-sm" type="button" data-manager-quick-action="preview">${tr("manager.preview_public_page", "Preview public page")}</button><button class="btn btn-gold-outline btn-sm" type="button" data-manager-quick-action="opening-hours">${tr("manager.check_availability", "Check availability")}</button></div>`,
          );
    }
  }

  function renderDashboardActivity() {
    const root = $("[data-dashboard-activity-list]");
    if (!root) return;
    const items = state.reservations
      .slice()
      .sort((a, b) => reservationUpdatedTime(b) - reservationUpdatedTime(a))
      .slice(0, 6)
      .map((reservation) => {
        const label =
          reservation.status === "pending"
            ? tr("manager.new_reservation_request", "New reservation request")
            : reservation.status === "confirmed"
              ? tr("manager.reservation_confirmed", "Reservation confirmed")
              : reservation.status === "cancelled"
                ? tr("manager.reservation_cancelled", "Reservation cancelled")
                : reservation.status === "completed"
                  ? tr("manager.reservation_completed", "Reservation completed")
                  : tr("manager.no_show_marked", "No-show marked");
        return `
          <div class="manager-activity-item">
            <i class="bi bi-clock-history"></i>
            <div>
              <strong>${esc(label)}</strong>
              <span>${esc(reservation.guest_name || guestFallback())} · ${esc(dateTimeLabel(reservation.cancelled_at || reservation.updated_at || reservation.created_at))}</span>
            </div>
          </div>
        `;
      });

    if (state.venue?.updated_at) {
      items.push(`
        <div class="manager-activity-item">
          <i class="bi bi-shop-window"></i>
          <div><strong>${tr("manager.venue_updated", "Venue updated")}</strong><span>${esc(dateTimeLabel(state.venue.updated_at))}</span></div>
        </div>
      `);
    }

    root.innerHTML = items.length
      ? items.join("")
      : dashboardEmpty(
          "bi-activity",
          tr("manager.no_recent_activity", "No recent activity yet."),
          tr("manager.no_recent_activity_copy", "Meaningful reservation and venue changes will appear here after activity begins."),
        );
  }

  function renderDashboardReadiness() {
    const root = $("[data-dashboard-readiness-list]");
    if (!root) return;
    if (!state.venue) {
      root.innerHTML = dashboardEmpty(
        "bi-list-check",
        tr("manager.start_with_venue_setup", "Start with venue setup."),
        tr("manager.start_with_venue_setup_copy", "Complete the checklist above before focusing on daily operations."),
      );
      return;
    }

    const insights = [];
    const missing = profileCompletionItems(state.venue).filter((item) => !item.complete);
    if (!hasOpeningHours(state.venue)) {
      insights.push([
        "bi-clock-history",
        tr("manager.no_opening_hours_configured", "No opening hours configured"),
        tr("manager.no_opening_hours_configured_copy", "Add hours so availability is clear."),
      ]);
    }
    if (!(state.venue.images || []).length) {
      insights.push([
        "bi-images",
        tr("manager.venue_no_images", "Venue has no images"),
        tr("manager.venue_no_images_copy", "Upload at least one image before sharing the public page."),
      ]);
    }
    if (!String(state.venue.address || "").trim()) {
      insights.push([
        "bi-geo-alt",
        tr("manager.location_incomplete", "Location is incomplete"),
        tr("manager.location_incomplete_copy", "Add an address so guests know where to arrive."),
      ]);
    }
    if (!state.reservations.length) {
      insights.push([
        "bi-calendar-check",
        tr("manager.no_reservations_yet", "No reservations yet"),
        tr("manager.no_reservations_readiness_copy", "Preview the public page and confirm availability settings."),
      ]);
    }
    if (!insights.length && missing.length) {
      insights.push([
        "bi-clipboard2-check",
        tr("manager.profile_items_remaining", "{count} profile items remaining", {
          count: missing.length,
        }),
        tr("manager.profile_items_remaining_copy", "Finish the remaining setup items when service is calm."),
      ]);
    }

    root.innerHTML = insights.length
      ? insights
          .slice(0, 3)
          .map(
            ([icon, title, copy]) => `
        <div class="manager-insight-item">
          <i class="bi ${icon}"></i>
          <div><strong>${esc(title)}</strong><span>${esc(copy)}</span></div>
        </div>
      `,
          )
          .join("")
      : dashboardEmpty(
          "bi-check2-circle",
          tr("manager.venue_health_good", "Venue health looks good."),
          tr("manager.venue_health_good_copy", "Availability and profile issues will appear here only when relevant."),
        );
  }

  function renderManagerDashboard() {
    const signature = stableSignature({
      venue: state.venue
        ? {
            id: state.venue.id,
            name: state.venue.name,
            status: state.venue.status,
            updated_at: state.venue.updated_at,
            images: state.venue.images?.length || 0,
            opening_hours: state.venue.opening_hours,
            address: state.venue.address,
          }
        : null,
      stats: state.reservationStats,
      reservations: state.reservations.map((reservation) => [
        reservation.id,
        reservation.status,
        reservation.reservation_date,
        reservation.reservation_time,
        reservation.party_size,
        reservation.updated_at,
        reservation.cancelled_at,
      ]),
    });
    if (skipRender("manager-dashboard", signature)) return;
    renderDashboardHeader();
    renderAttentionQueue();
    renderDashboardOperations();
    renderDashboardActivity();
    renderDashboardReadiness();
  }

  function fillForm() {
    const form = $("[data-owner-venue-form]");
    if (!form) return;
    hydrateTimeSelects();
    const venue = state.venue;
    form.reset();
    form.elements.venue_slug.value = venue?.slug || "";
    form.elements.name.value = venue?.name || "";
    form.elements.venue_type.value = venue?.venue_type || "";
    form.elements.status.value = venue?.status || "active";
    form.elements.phone.value = venue?.phone || "";
    form.elements.email.value = venue?.email || "";
    form.elements.description.value = venue?.description || "";
    form.elements.website.value = venue?.website || "";
    form.elements.address.value = venue?.address || "";
    form.elements.city.value = venue?.city || "";
    form.elements.country.value = venue?.country || "";
    form.elements.latitude.value = venue?.latitude || "";
    form.elements.longitude.value = venue?.longitude || "";
    form.elements.min_guests.value = venue?.reservation_settings?.min_guests || 1;
    form.elements.max_guests.value = venue?.reservation_settings?.max_guests || 10;
    form.elements.max_reservations_per_slot.value =
      venue?.reservation_settings?.max_reservations_per_slot || 10;
    form.elements.booking_horizon_days.value =
      venue?.reservation_settings?.booking_horizon_days || 30;
    form.elements.reservation_interval_minutes.value =
      venue?.reservation_settings?.reservation_interval_minutes || 30;
    form.elements.last_reservation_time.value = normalizeTime(
      venue?.reservation_settings?.last_reservation_time || "",
    );
    form.elements.facebook_url.value = venue?.social_links?.facebook_url || "";
    form.elements.instagram_url.value = venue?.social_links?.instagram_url || "";
    form.elements.tiktok_url.value = venue?.social_links?.tiktok_url || "";

    renderChecks(
      "[data-owner-facilities]",
      state.facilities,
      selectedIds(venue?.facilities),
      "facility_ids",
    );
    renderChecks(
      "[data-owner-cuisines]",
      state.cuisines,
      selectedIds(venue?.cuisine_types),
      "cuisine_type_ids",
    );
    renderChecks(
      "[data-owner-payments]",
      state.payments,
      selectedIds(venue?.payment_options),
      "payment_option_ids",
    );
    renderHours(venue?.opening_hours || []);
    renderGallery();
    renderAvailabilityExceptions();
    updateOwnerLocationMap();
    initOwnerGoogleMap();
  }

  function renderSummary() {
    const hasVenue = Boolean(state.venue);
    $("[data-owner-empty]")?.toggleAttribute("hidden", hasVenue);
    $("[data-owner-summary]")?.toggleAttribute("hidden", !hasVenue);
    $("[data-owner-delete-section]")?.toggleAttribute("hidden", !hasVenue);
    document.querySelectorAll("[data-owner-availability-section]").forEach((section) => {
      section.toggleAttribute("hidden", !hasVenue);
    });
    renderProfileCompletion();
    renderManagerDashboard();

    if (!hasVenue) return;
    const venue = state.venue;
    const cover = venue.images?.[0];
    const status = venue.status || "draft";
    const coverEl = $("[data-owner-cover]");
    if (coverEl) {
      coverEl.loading = "lazy";
      coverEl.decoding = "async";
      coverEl.src = imageUrl(cover);
    }
    $("[data-owner-title]").textContent =
      venue.name || tr("venue.profile", "Restaurant or bar profile");
    $("[data-owner-type]").textContent = (venue.venue_type || "restaurant / bar").replace(
      /^\w/,
      (letter) => letter.toUpperCase(),
    );
    const statusBadge = $("[data-owner-status]");
    if (statusBadge) {
      statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusBadge.className = `chip-available owner-status-${status}`;
    }
    $("[data-owner-location]").textContent =
      [venue.city, venue.country].filter(Boolean).join(", ") ||
      tr("reservation.location_not_set", "Location not set");
    $("[data-owner-image-count]").textContent =
      `${venue.images?.length || 0} ${tr("owner.images", "images")}`;
    $("[data-owner-description]").textContent =
      venue.description ||
      tr("venue.complete_profile_details", "Complete your profile details below.");
    const managerVenueName = $("[data-manager-venue-name]");
    if (managerVenueName) {
      managerVenueName.textContent = venue.name || tr("venue.profile", "Restaurant or bar profile");
    }
    const publicLink = $("[data-owner-public-link]");
    if (publicLink) {
      publicLink.href = venue.slug
        ? window.EventSphereRoutes?.restaurantUrl?.(venue.slug) ||
          `/restaurant/${encodeURIComponent(venue.slug)}`
        : "#";
      publicLink.toggleAttribute("aria-disabled", !venue.slug);
    }
    document.querySelectorAll("[data-manager-public-page]").forEach((link) => {
      link.href = publicLink?.href || "#";
      link.toggleAttribute("aria-disabled", !venue.slug);
    });
    const publicNote = $("[data-owner-public-note]");
    if (publicNote) {
      publicNote.textContent =
        status === "active"
          ? tr("venue.public_page_preview", "Opens the public restaurant or bar page.")
          : tr("owner.availability", "Public visibility depends on this profile being active.");
    }
  }

  function renderVenueFilter() {
    const signature = stableSignature(state.venues.map((venue) => [venue.id, venue.name]));
    if (skipRender("venue-filters", signature)) return;

    const select = $('[data-owner-reservation-filter="venue_id"]');
    if (select) {
      const current = select.value;
      select.innerHTML =
        `<option value="">${tr("owner.all_restaurants_bars", "All restaurants & bars")}</option>` +
        state.venues
          .map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`)
          .join("");
      select.value = current;
    }
    const calendarSelect = $('[data-owner-calendar-filter="venue_id"]');
    if (calendarSelect) {
      const current = calendarSelect.value;
      calendarSelect.innerHTML =
        `<option value="">${tr("owner.all_restaurants_bars", "All restaurants & bars")}</option>` +
        state.venues
          .map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`)
          .join("");
      calendarSelect.value = current;
    }
    const analyticsSelect = $('[data-owner-analytics-filter="venue_id"]');
    if (analyticsSelect) {
      const current = analyticsSelect.value;
      analyticsSelect.innerHTML =
        `<option value="">${tr("owner.all_restaurants_bars", "All restaurants & bars")}</option>` +
        state.venues
          .map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`)
          .join("");
      analyticsSelect.value = current;
    }
  }

  function renderReservationStats() {
    const root = $("[data-owner-reservation-stats]");
    if (!root) return;
    renderManagerDashboard();
    const stats = state.reservationStats || {};
    const todaysReservations = todayReservations();
    const coversToday = todaysReservations.reduce(
      (total, reservation) => total + Number(reservation.party_size || 0),
      0,
    );
    const cancellationsToday = todaysReservations.filter(
      (reservation) => reservation.status === "cancelled",
    ).length;
    const noShowsToday = todaysReservations.filter(
      (reservation) => reservation.status === "no_show",
    ).length;
    const next = upcomingReservations(["pending", "confirmed"])[0];
    const signature = stableSignature({
      stats,
      today: todaysReservations.map((reservation) => [
        reservation.id,
        reservation.status,
        reservation.reservation_time,
        reservation.party_size,
      ]),
      next: next ? [next.id, next.reservation_time, next.guest_name] : null,
    });
    if (skipRender("reservation-stats", signature)) return;
    updateManagerPendingBadge(stats.pending || 0);

    root.innerHTML = [
      {
        label: tr("manager.pending_requests", "Pending Requests"),
        value: stats.pending || 0,
        description: tr("manager.needs_review", "Needs review"),
        icon: "bi-hourglass-split",
        tone: "pending",
        action: "pending",
      },
      {
        label: tr("manager.todays_reservations", "Today's Reservations"),
        value: stats.today || todaysReservations.length,
        description: tr("manager.scheduled_today", "Scheduled today"),
        icon: "bi-calendar2-check",
        tone: "today",
        action: "calendar",
      },
      {
        label: tr("manager.guests_today", "Guests Today"),
        value: coversToday,
        description: tr("manager.covers_expected", "Covers expected"),
        icon: "bi-people",
        tone: "guests",
        action: "calendar",
      },
      {
        label: tr("manager.next_arrival", "Next Arrival"),
        value: next ? timeLabel(next.reservation_time) : "-",
        description: next ? next.guest_name || guestFallback() : tr("manager.no_arrival_scheduled", "No arrival scheduled"),
        icon: "bi-person-walking",
        tone: "next",
        action: "calendar",
      },
      {
        label: tr("manager.cancellations_today", "Cancellations Today"),
        value: cancellationsToday,
        description: tr("manager.same_day_changes", "Same-day changes"),
        icon: "bi-x-circle",
        tone: "cancelled",
      },
      {
        label: tr("manager.no_shows_today", "No-shows Today"),
        value: noShowsToday,
        description: tr("manager.marked_today", "Marked today"),
        icon: "bi-person-x",
        tone: "noshow",
      },
    ]
      .map(
        (item) => `
      <div class="col-sm-6 col-xl-2">
        <button class="reservation-stat reservation-stat-${item.tone}" type="button" ${item.action ? `data-manager-quick-action="${item.action}"` : ""}>
          <div class="reservation-stat-icon"><i class="bi ${item.icon}"></i></div>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <small>${item.description}</small>
        </button>
      </div>
    `,
      )
      .join("");
  }

  function reservationActions(reservation) {
    const id = reservation.id;
    const status = reservation.status;
    const isConfirmed = status === "confirmed";
    return `
      <div class="owner-reservation-actions">
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-view="${id}">
          <i class="bi bi-eye"></i><span data-i18n="buttons.view_details">${tr("buttons.view_details", "View Details")}</span>
        </button>
        <button class="btn btn-gold-outline btn-sm" type="button" data-owner-reservation-action="confirm" data-owner-reservation-id="${id}" ${status !== "pending" ? "disabled" : ""}>
          <i class="bi bi-check2-circle"></i><span data-i18n="owner.confirm">${tr("owner.confirm", "Confirm")}</span>
        </button>
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-action="complete" data-owner-reservation-id="${id}" ${!isConfirmed ? "disabled" : ""}>
          <i class="bi bi-patch-check"></i><span data-i18n="owner.mark_completed">${tr("owner.mark_completed", "Mark Completed")}</span>
        </button>
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-action="no-show" data-owner-reservation-id="${id}" ${!isConfirmed ? "disabled" : ""}>
          <i class="bi bi-person-x"></i><span data-i18n="owner.mark_no_show">${tr("owner.mark_no_show", "Mark guest as no-show")}</span>
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-owner-reservation-action="cancel" data-owner-reservation-id="${id}" ${!["pending", "confirmed"].includes(status) ? "disabled" : ""}>
          <i class="bi bi-x-circle"></i><span data-i18n="buttons.cancel">${tr("buttons.cancel", "Cancel")}</span>
        </button>
      </div>
    `;
  }

  function reservationSearchText(reservation) {
    return [
      reservation.id,
      reservation.guest_name,
      reservation.phone,
      reservation.email,
      reservation.reservation_date,
      reservation.status,
      reservation.occasion,
      reservation.notes,
      reservation.venue?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function partySizeMatches(value, partySize) {
    const size = Number(partySize || 0);
    if (!value) return true;
    if (value === "1-2") return size >= 1 && size <= 2;
    if (value === "3-4") return size >= 3 && size <= 4;
    if (value === "5-8") return size >= 5 && size <= 8;
    if (value === "9+") return size >= 9;
    return true;
  }

  function workspaceViewMatches(reservation) {
    const view = state.reservationWorkspace.view || "today";
    const today = todayValue();
    const reservationDate = reservation.reservation_date || "";
    if (view === "today") return reservationDate === today;
    if (view === "pending") return reservation.status === "pending";
    if (view === "upcoming") {
      return (
        reservationDate >= today &&
        !["completed", "cancelled", "no_show"].includes(reservation.status)
      );
    }
    if (view === "completed") return reservation.status === "completed";
    if (view === "cancelled") return reservation.status === "cancelled";
    if (view === "no_show") return reservation.status === "no_show";
    return true;
  }

  function filteredWorkspaceReservations() {
    const workspace = state.reservationWorkspace;
    const query = workspace.search.trim().toLowerCase();
    return state.reservations
      .filter((reservation) => workspaceViewMatches(reservation))
      .filter((reservation) => (query ? reservationSearchText(reservation).includes(query) : true))
      .filter((reservation) =>
        state.reservationFilters.date
          ? reservation.reservation_date >= state.reservationFilters.date
          : true,
      )
      .filter((reservation) =>
        workspace.dateEnd ? reservation.reservation_date <= workspace.dateEnd : true,
      )
      .filter((reservation) => partySizeMatches(workspace.partySize, reservation.party_size))
      .filter((reservation) =>
        workspace.occasion ? String(reservation.occasion || "") === workspace.occasion : true,
      );
  }

  function servicePeriod(time) {
    const hour = Number(String(time || "00:00").slice(0, 2));
    if (hour < 11) return tr("manager.morning", "Morning");
    if (hour < 16) return tr("manager.lunch", "Lunch");
    if (hour < 22) return tr("manager.dinner", "Dinner");
    return tr("manager.late", "Late");
  }

  function urgencyGroup(reservation) {
    const today = todayValue();
    const tomorrow = toDateInputValue(new Date(Date.now() + 86400000));
    if (reservation.reservation_date === today) return tr("manager.today", "Today");
    if (reservation.reservation_date === tomorrow) return tr("manager.tomorrow", "Tomorrow");
    return tr("manager.later", "Later");
  }

  function reservationGroupLabel(reservation) {
    const view = state.reservationWorkspace.view || "today";
    if (view === "today") return servicePeriod(reservation.reservation_time);
    if (view === "pending") return urgencyGroup(reservation);
    if (view === "upcoming") return dateLabel(reservation.reservation_date);
    if (["completed", "cancelled", "no_show"].includes(view))
      return dateLabel(reservation.reservation_date);
    return reservation.reservation_date === todayValue()
      ? tr("manager.today", "Today")
      : dateLabel(reservation.reservation_date);
  }

  function sortWorkspaceReservations(items) {
    const view = state.reservationWorkspace.view || "today";
    return items.slice().sort((a, b) => {
      if (["completed", "cancelled", "no_show", "all"].includes(view)) {
        return reservationUpdatedTime(b) - reservationUpdatedTime(a);
      }
      return reservationDateTime(a) - reservationDateTime(b);
    });
  }

  function nextBestReservationAction(reservation) {
    if (reservation.status === "pending") return { label: tr("manager.review", "Review"), action: "view", tone: "gold" };
    if (reservation.status === "confirmed")
      return { label: tr("manager.open_details", "Open details"), action: "view", tone: "glass" };
    return { label: tr("manager.view", "View"), action: "view", tone: "glass" };
  }

  function reservationRowCard(reservation) {
    const action = nextBestReservationAction(reservation);
    const mobileAction =
      reservation.status === "pending"
        ? `<button class="btn btn-gold-outline manager-reservation-mobile-primary" type="button" data-owner-reservation-view="${reservation.id}">${tr("manager.review", "Review")}</button>`
        : `<button class="btn btn-gold-outline manager-reservation-mobile-primary" type="button" data-owner-reservation-view="${reservation.id}">${tr("manager.view_details", "View details")}</button>`;
    const contact = [reservation.phone, reservation.email].filter(Boolean).join(" · ");
    const secondary = [
      contact || tr("reservation.not_provided", "Contact not provided"),
      reservation.occasion ? occasionLabel(reservation.occasion) : "",
      reservation.venue?.name || "",
    ].filter(Boolean);
    return `
      <article class="manager-reservation-row manager-reservation-${esc(reservation.status || "pending")}">
        <button class="manager-reservation-main" type="button" data-owner-reservation-view="${reservation.id}">
          <time>${esc(timeLabel(reservation.reservation_time) || dateLabel(reservation.reservation_date))}</time>
          <div>
            <strong>${esc(reservation.guest_name || guestFallback())}</strong>
            <span>${Number(reservation.party_size || 0)} ${guestCountLabel(reservation.party_size)}</span>
          </div>
          ${statusBadge(reservation.status)}
        </button>
        <div class="manager-reservation-mobile-meta">
          <span><i class="bi bi-clock"></i>${esc(timeLabel(reservation.reservation_time) || dateLabel(reservation.reservation_date))}</span>
          <span><i class="bi bi-people"></i>${Number(reservation.party_size || 0)} ${guestCountLabel(reservation.party_size)}</span>
        </div>
        <div class="manager-reservation-secondary">
          <span>${esc(secondary.join(" · "))}</span>
          ${
            reservation.notes
              ? `<small>${esc(String(reservation.notes).slice(0, 120))}</small>`
              : ""
          }
        </div>
        ${mobileAction}
        <button class="btn ${action.tone === "gold" ? "btn-gold-outline" : "btn-glass"} btn-sm" type="button" data-owner-reservation-view="${reservation.id}">${esc(action.label)}</button>
      </article>
    `;
  }

  function reservationEmptyState() {
    const view = state.reservationWorkspace.view || "today";
    if (state.reservationWorkspace.search) {
      return dashboardEmpty(
        "bi-search",
        tr("manager.no_search_results_query", 'No reservations match "{query}".', {
          query: state.reservationWorkspace.search,
        }),
        tr("manager.clear_search_filters_copy", "Clear the search or active filters to broaden the list."),
        `<div class="manager-empty-actions"><button class="btn btn-gold-outline btn-sm" type="button" data-owner-reservations-clear>${tr("manager.clear_search", "Clear search")}</button><button class="btn btn-glass btn-sm" type="button" data-owner-reservations-clear>${tr("manager.clear_filters", "Clear filters")}</button></div>`,
      );
    }
    if (view === "today") {
      return dashboardEmpty(
        "bi-calendar2",
        tr("manager.no_reservations_today", "No reservations scheduled today."),
        tr("manager.no_reservations_today_copy", "Upcoming bookings and public availability are one click away."),
        `<div class="manager-empty-actions"><button class="btn btn-gold-outline btn-sm" type="button" data-reservation-workspace-view="upcoming">${tr("manager.view_upcoming", "View Upcoming")}</button><button class="btn btn-glass btn-sm" type="button" data-manager-quick-action="opening-hours">${tr("manager.check_availability", "Check Availability")}</button><button class="btn btn-glass btn-sm" type="button" data-manager-quick-action="preview">${tr("manager.preview_public_page", "Preview Public Page")}</button></div>`,
      );
    }
    if (view === "pending") {
      return dashboardEmpty(
        "bi-hourglass-split",
        tr("manager.no_pending_requests", "No pending requests."),
        tr("manager.no_pending_requests_copy", "New requests will appear here when guests need confirmation."),
        `<div class="manager-empty-actions"><button class="btn btn-gold-outline btn-sm" type="button" data-reservation-workspace-view="today">${tr("manager.view_today", "View Today")}</button><button class="btn btn-glass btn-sm" type="button" data-reservation-workspace-view="upcoming">${tr("manager.view_upcoming", "View Upcoming")}</button></div>`,
      );
    }
    return dashboardEmpty(
      "bi-calendar-check",
      tr("manager.no_reservations_view", "No reservations in this view."),
      tr("manager.no_reservations_view_copy", "Try another view or clear filters to see more reservations."),
    );
  }

  function renderReservationWorkspaceHeader() {
    const venue = $("[data-reservations-venue-name]");
    if (venue) venue.textContent = state.venue?.name || restaurantBarFallback();
    const date = $("[data-reservations-date-context]");
    if (date) {
      date.textContent = new Date().toLocaleDateString(currentLocale(), {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
    const view = $("[data-reservation-current-view]");
    if (view) {
      view.textContent = {
        today: tr("manager.today", "Today"),
        pending: tr("manager.pending", "Pending"),
        upcoming: tr("events.upcoming", "Upcoming"),
        all: tr("manager.all", "All"),
        completed: tr("manager.completed", "Completed"),
        cancelled: tr("manager.cancelled", "Cancelled"),
        no_show: tr("manager.no_shows", "No-shows"),
      }[state.reservationWorkspace.view || "today"];
    }
  }

  function renderReservationWorkspaceSummary() {
    const root = $("[data-reservation-workspace-summary]");
    if (!root) return;
    const today = todayValue();
    const todayItems = state.reservations.filter(
      (reservation) => reservation.reservation_date === today,
    );
    const values = {
      pending: state.reservations.filter((reservation) => reservation.status === "pending").length,
      confirmed_today: todayItems.filter((reservation) => reservation.status === "confirmed")
        .length,
      today: todayItems.reduce(
        (total, reservation) => total + Number(reservation.party_size || 0),
        0,
      ),
      cancelled_today: todayItems.filter((reservation) => reservation.status === "cancelled")
        .length,
      no_show_today: todayItems.filter((reservation) => reservation.status === "no_show").length,
    };
    root.querySelectorAll("[data-reservation-summary-filter]").forEach((item) => {
      const value = values[item.dataset.reservationSummaryFilter] || 0;
      const number = item.querySelector("strong");
      if (number) number.textContent = String(value);
    });
    const badge = $("[data-reservation-pending-tab-badge]");
    if (badge) {
      badge.textContent = String(values.pending);
      badge.hidden = values.pending <= 0;
      badge.closest("[data-reservation-workspace-view]")?.classList.toggle(
        "manager-tab-attention",
        values.pending > 0,
      );
    }
  }

  function activeReservationFilterCount() {
    return [
      state.reservationWorkspace.search,
      state.reservationFilters.status,
      state.reservationFilters.date,
      state.reservationWorkspace.dateEnd,
      state.reservationFilters.venue_id,
      state.reservationWorkspace.partySize,
      state.reservationWorkspace.occasion,
    ].filter(Boolean).length;
  }

  function renderActiveReservationFilters() {
    const root = $("[data-reservation-active-filters]");
    if (!root) return;
    const filters = [];
    if (state.reservationWorkspace.search)
      filters.push(tr("manager.search_filter", "Search: {value}", { value: state.reservationWorkspace.search }));
    if (state.reservationFilters.status)
      filters.push(tr("manager.status_filter", "Status: {value}", { value: statusLabel(state.reservationFilters.status) }));
    if (state.reservationFilters.date)
      filters.push(tr("manager.from_filter", "From: {value}", { value: dateLabel(state.reservationFilters.date) }));
    if (state.reservationWorkspace.dateEnd)
      filters.push(tr("manager.to_filter", "To: {value}", { value: dateLabel(state.reservationWorkspace.dateEnd) }));
    if (state.reservationFilters.venue_id) filters.push(tr("manager.venue_selected", "Venue selected"));
    if (state.reservationWorkspace.partySize)
      filters.push(tr("manager.party_filter", "Party: {value}", { value: state.reservationWorkspace.partySize }));
    if (state.reservationWorkspace.occasion)
      filters.push(tr("manager.occasion_filter", "Occasion: {value}", { value: state.reservationWorkspace.occasion }));

    root.hidden = !filters.length;
    root.innerHTML = filters
      .map((filter) => `<span><i class="bi bi-funnel"></i>${esc(filter)}</span>`)
      .join("");
    const count = activeReservationFilterCount();
    const filterCount = $("[data-reservation-filter-count]");
    if (filterCount) {
      filterCount.textContent = String(count);
      filterCount.hidden = count <= 0;
    }
  }

  function syncReservationWorkspaceControls() {
    document.querySelectorAll("[data-reservation-workspace-view]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.reservationWorkspaceView === state.reservationWorkspace.view,
      );
      button.setAttribute(
        "aria-current",
        button.dataset.reservationWorkspaceView === state.reservationWorkspace.view
          ? "page"
          : "false",
      );
    });
    const view = $('[data-owner-reservation-filter="view"]');
    if (view) view.value = state.reservationFilters.view;
    const status = $('[data-owner-reservation-filter="status"]');
    if (status) status.value = state.reservationFilters.status;
    const date = $('[data-owner-reservation-filter="date"]');
    if (date) date.value = state.reservationFilters.date;
    const venue = $('[data-owner-reservation-filter="venue_id"]');
    if (venue) venue.value = state.reservationFilters.venue_id;
    const search = $("[data-owner-reservation-search]");
    if (search) search.value = state.reservationWorkspace.search;
    const dateEnd = $("[data-owner-reservation-date-end]");
    if (dateEnd) dateEnd.value = state.reservationWorkspace.dateEnd;
    const partySize = $("[data-owner-reservation-party-size]");
    if (partySize) partySize.value = state.reservationWorkspace.partySize;
    const occasion = $("[data-owner-reservation-occasion]");
    if (occasion) occasion.value = state.reservationWorkspace.occasion;
    const mobileView = $("[data-reservation-mobile-view]");
    if (mobileView) {
      mobileView.value = ["today", "pending", "upcoming"].includes(state.reservationWorkspace.view)
        ? state.reservationWorkspace.view
        : "today";
    }
  }

  function setReservationWorkspaceView(view, options = {}) {
    state.reservationWorkspace.view = view || "today";
    const filterMap = {
      today: { view: "today", status: "" },
      pending: { view: "", status: "pending" },
      upcoming: { view: "upcoming", status: "" },
      all: { view: "", status: "" },
      completed: { view: "completed", status: "" },
      cancelled: { view: "cancelled", status: "" },
      no_show: { view: "", status: "no_show" },
    }[state.reservationWorkspace.view] || { view: "", status: "" };
    state.reservationFilters.view = filterMap.view;
    state.reservationFilters.status = filterMap.status;
    state.reservationFilters.date = "";
    syncReservationWorkspaceControls();
    $("[data-reservation-filter-sheet]")?.classList.remove("is-open");
    document.body.classList.remove("reservation-filter-sheet-open");
    lastReservationRenderSignature = "";
    clearOwnerRenderSignatures("reservation-stats");
    if (options.load === false) {
      renderReservations();
      return;
    }
    loadReservations();
  }

  function clearReservationWorkspace() {
    state.reservationFilters = { view: "today", status: "", date: "", venue_id: "" };
    state.reservationWorkspace = {
      view: "today",
      search: "",
      dateEnd: "",
      partySize: "",
      occasion: "",
    };
    document.querySelectorAll("[data-owner-reservation-filter]").forEach((control) => {
      control.value = control.dataset.ownerReservationFilter === "view" ? "today" : "";
    });
    syncReservationWorkspaceControls();
    lastReservationRenderSignature = "";
    clearOwnerRenderSignatures("reservation-stats");
    loadReservations();
  }

  function renderReservations(loading = false) {
    const body = $("[data-owner-reservations-table]");
    if (!body) return;
    syncReservationWorkspaceControls();
    renderReservationWorkspaceHeader();
    renderReservationWorkspaceSummary();
    renderActiveReservationFilters();
    const signature = loading
      ? `loading:${reservationQuery()}`
      : state.reservations
          .map(
            (reservation) =>
              `${reservation.id}:${reservation.status}:${reservation.updated_at || reservation.cancelled_at || ""}`,
          )
          .join("|") +
        `:${stableSignature(state.reservationWorkspace)}:${stableSignature(state.reservationFilters)}`;
    if (signature === lastReservationRenderSignature) return;
    lastReservationRenderSignature = signature;

    if (loading) {
      body.innerHTML = `
        <div class="reservation-list-skeleton" aria-label="${tr("reservation.loading_reservations", "Loading reservations")}">
          ${Array.from({ length: 5 }, () => "<span></span>").join("")}
        </div>
      `;
      renderReservationStats();
      return;
    }

    const reservations = sortWorkspaceReservations(filteredWorkspaceReservations());
    const groups = reservations.reduce((acc, reservation) => {
      const label = reservationGroupLabel(reservation);
      if (!acc.has(label)) acc.set(label, []);
      acc.get(label).push(reservation);
      return acc;
    }, new Map());

    body.innerHTML = reservations.length
      ? Array.from(groups.entries())
          .map(
            ([label, items]) => `
        <section class="manager-reservation-group">
          <div class="manager-reservation-group-head"><strong>${esc(label)}</strong><span>${items.length} ${items.length === 1 ? "reservation" : "reservations"}</span></div>
          <div class="manager-reservation-group-list">${items.map(reservationRowCard).join("")}</div>
        </section>
      `,
          )
          .join("")
      : reservationEmptyState();
    renderReservationStats();
  }

  function renderCalendarSummary() {
    const root = $("[data-owner-calendar-summary]");
    if (!root) return;
    const summary = state.calendar.todaySummary || {};
    root.innerHTML = [
      [tr("owner.today_reservations", "Today's Reservations"), summary.total || 0],
      [tr("owner.pending_today", "Pending Today"), summary.pending || 0],
      [tr("owner.confirmed_today", "Confirmed Today"), summary.confirmed || 0],
      [tr("owner.cancelled_today", "Cancelled Today"), summary.cancelled || 0],
    ]
      .map(([label, value]) => `<div><span>${esc(label)}</span><strong>${value}</strong></div>`)
      .join("");
  }

  function reservationsForDate(dateValue) {
    return state.calendar.reservations
      .filter((reservation) => reservation.reservation_date === dateValue)
      .sort((a, b) => {
        const created =
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        return created || Number(b.id || 0) - Number(a.id || 0);
      });
  }

  function calendarReservationCard(reservation) {
    const status = calendarStatuses.includes(reservation.status) ? reservation.status : "pending";
    return `
      <button class="owner-calendar-item owner-calendar-item-${status}" type="button" data-owner-calendar-reservation="${reservation.id}">
        <strong>${esc(reservation.guest_name || guestFallback())}</strong>
        <span>${esc(timeLabel(reservation.reservation_time))}</span>
        <span>${reservation.party_size} ${Number(reservation.party_size) === 1 ? tr("reservation.guest", "Guest") : tr("reservation.guests", "Guests")}</span>
        <em>${esc(statusLabel(reservation.status))}</em>
      </button>
    `;
  }

  function renderCalendarDay(date, compact = false) {
    const value = toDateInputValue(date);
    const reservations = reservationsForDate(value);
    return `
      <section class="owner-calendar-day ${compact ? "owner-calendar-day-compact" : ""}">
        <div class="owner-calendar-day-head">
          <span>${esc(shortDayName((date.getDay() + 6) % 7))}</span>
          <strong>${date.getDate()}</strong>
        </div>
        <div class="owner-calendar-day-items">
          ${reservations.length ? reservations.map(calendarReservationCard).join("") : `<div class="owner-calendar-empty" data-i18n="empty.no_reservations_found">${tr("empty.no_reservations_found", "No reservations yet.")}</div>`}
        </div>
      </section>
    `;
  }

  function renderCalendar(loading = false) {
    const root = $("[data-owner-calendar]");
    if (!root) return;
    renderCalendarSummary();
    const title = $("[data-owner-calendar-title]");
    if (title) title.textContent = calendarTitle();
    const jump = $("[data-owner-calendar-jump]");
    if (jump) jump.value = toDateInputValue(state.calendar.anchorDate);
    document.querySelectorAll("[data-owner-calendar-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.ownerCalendarView === state.calendar.view);
    });

    if (loading) {
      const signature = `calendar-loading:${calendarQuery()}`;
      if (skipRender("calendar", signature)) return;

      root.innerHTML = `
        <div class="owner-calendar-grid owner-calendar-grid-week" aria-label="Loading calendar">
          ${Array.from(
            { length: 7 },
            () => `
            <section class="owner-calendar-day owner-calendar-day-loading">
              <div class="owner-calendar-day-head"><span></span><strong></strong></div>
              <div class="owner-calendar-day-items">
                <div class="reservation-skeleton-line"></div>
                <div class="reservation-skeleton-line short"></div>
              </div>
            </section>
          `,
          ).join("")}
        </div>
      `;
      return;
    }

    const { start, end } = calendarPeriod();
    const signature = stableSignature({
      view: state.calendar.view,
      start: toDateInputValue(start),
      end: toDateInputValue(end),
      reservations: state.calendar.reservations.map((reservation) => [
        reservation.id,
        reservation.status,
        reservation.reservation_date,
        reservation.reservation_time,
        reservation.updated_at || reservation.cancelled_at || "",
      ]),
    });
    if (skipRender("calendar", signature)) return;

    if (state.calendar.view === "day") {
      root.innerHTML = `<div class="owner-calendar-grid owner-calendar-grid-day">${renderCalendarDay(start)}</div>`;
      return;
    }

    const dates = [];
    for (let date = start; date <= end; date = addDays(date, 1)) {
      dates.push(localDate(date));
    }

    root.innerHTML = `
      <div class="owner-calendar-grid owner-calendar-grid-${state.calendar.view}">
        ${dates.map((date) => renderCalendarDay(date, state.calendar.view === "month")).join("")}
      </div>
    `;
  }

  function metricCard(label, value, tone = "today") {
    return `
      <div class="col-md-6 col-xl-2">
        <div class="reservation-stat reservation-stat-${tone}">
          <span>${esc(label)}</span>
          <strong>${value ?? 0}</strong>
        </div>
      </div>
    `;
  }

  function renderAnalytics(loading = false) {
    const overviewRoot = $("[data-owner-analytics-overview]");
    if (!overviewRoot) return;

    document.querySelectorAll("[data-owner-analytics-range]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.ownerAnalyticsRange === state.analytics.range,
      );
    });
    const isCustom = state.analytics.range === "custom";
    $("[data-owner-analytics-start]")?.toggleAttribute("hidden", !isCustom);
    $("[data-owner-analytics-end]")?.toggleAttribute("hidden", !isCustom);
    $("[data-owner-analytics-apply]")?.toggleAttribute("hidden", !isCustom);

    if (loading) {
      const signature = `analytics-loading:${analyticsQuery()}`;
      if (skipRender("analytics-overview", signature)) return;

      overviewRoot.innerHTML = Array.from(
        { length: 6 },
        () => `
        <div class="col-md-6 col-xl-2">
          <div class="reservation-stat reservation-stat-loading">
            <div class="reservation-skeleton-line short"></div>
            <div class="reservation-skeleton-line"></div>
          </div>
        </div>
      `,
      ).join("");
      return;
    }

    const data = state.analytics.data;
    if (!data) {
      if (skipRender("analytics-overview", "empty")) {
        renderAnalyticsCharts();
        return;
      }
      overviewRoot.innerHTML = `<div class="col-12"><div class="dashboard-empty"><i class="bi bi-graph-up"></i><div><strong data-i18n="owner.no_analytics_loaded">${tr("owner.no_analytics_loaded", "No analytics loaded yet.")}</strong><span class="d-block text-muted-pro" data-i18n="empty.no_reservations_copy">${tr("empty.no_reservations_copy", "Table requests and status updates will appear here once guests start booking.")}</span><a class="btn btn-gold btn-sm mt-2" href="/restaurants" data-i18n="buttons.discover_restaurants">${tr("buttons.discover_restaurants", "Discover restaurants & bars")}</a></div></div></div>`;
      renderAnalyticsCharts();
      return;
    }

    const analyticsSignature = stableSignature(data);
    const overviewSignature = stableSignature(data.overview || {});
    if (!skipRender("analytics-overview", overviewSignature)) {
      const overview = data.overview || {};
      overviewRoot.innerHTML = [
        metricCard(tr("owner.total_reservations", "Total Reservations"), overview.total, "today"),
        metricCard(
          tr("reservation.pending_reservations", "Pending Reservations"),
          overview.pending,
          "pending",
        ),
        metricCard(
          tr("reservation.confirmed_reservations", "Confirmed Reservations"),
          overview.confirmed,
          "confirmed",
        ),
        metricCard(
          tr("reservation.completed_reservations", "Completed Reservations"),
          overview.completed,
          "completed",
        ),
        metricCard(
          tr("reservation.cancelled_reservations", "Cancelled Reservations"),
          overview.cancelled,
          "cancelled",
        ),
        metricCard(
          tr("reservation.no_show_reservations", "No-show reservations"),
          overview.no_show,
          "no-show",
        ),
      ].join("");
    }

    renderMiniMetrics("[data-owner-analytics-today]", data.today || {}, [
      [tr("owner.reservations_today", "Reservations Today"), "reservations"],
      [tr("owner.completed_today", "Completed Today"), "completed"],
      [tr("owner.cancelled_today_metric", "Cancelled Today"), "cancelled"],
      [tr("owner.no_shows_today", "No-shows today"), "no_show"],
    ]);
    renderMiniMetrics("[data-owner-analytics-month]", data.month || {}, [
      [tr("owner.reservations_month", "Reservations this month"), "reservations"],
      [tr("owner.completed_month", "Completed this month"), "completed"],
      [tr("owner.cancelled_month", "Cancelled this month"), "cancelled"],
      [tr("owner.no_shows_month", "No-shows this month"), "no_show"],
    ]);

    const rates = data.rates || {};
    const ratesRoot = $("[data-owner-analytics-rates]");
    if (ratesRoot && !skipRender("analytics-rates", stableSignature(rates))) {
      ratesRoot.innerHTML = [
        [tr("owner.completion_rate", "Completion Rate"), rates.completion_rate],
        [tr("owner.cancellation_rate", "Cancellation Rate"), rates.cancellation_rate],
        [tr("owner.no_show_rate", "No-show rate"), rates.no_show_rate],
      ]
        .map(
          ([label, value]) => `
        <div class="col-md-4">
          <div class="owner-analytics-rate">
            <span>${esc(label)}</span>
            <strong>${Number(value || 0)}%</strong>
          </div>
        </div>
      `,
        )
        .join("");
    }

    renderRankList("[data-owner-analytics-top-days]", data.top_days || [], "day");
    renderRankList("[data-owner-analytics-top-times]", data.top_time_slots || [], "time");
    renderSignatures.set("analytics-data", analyticsSignature);
    renderAnalyticsCharts();
  }

  function renderMiniMetrics(selector, values, items) {
    const root = $(selector);
    if (!root) return;
    if (skipRender(`mini:${selector}`, stableSignature(values))) return;

    root.innerHTML = items
      .map(
        ([label, key]) => `
      <div>
        <span>${esc(label)}</span>
        <strong>${Number(values[key] || 0)}</strong>
      </div>
    `,
      )
      .join("");
  }

  function renderRankList(selector, items, key) {
    const root = $(selector);
    if (!root) return;
    if (skipRender(`rank:${selector}`, stableSignature(items))) return;

    root.innerHTML = items.length
      ? items
          .map(
            (item, index) => `
      <div class="owner-analytics-rank">
        <span>${index + 1}</span>
        <strong>${esc(item[key] || "-")}</strong>
        <em>${Number(item.total || 0)} ${tr("owner.reservations", "reservations")}</em>
      </div>
    `,
          )
          .join("")
      : `<div class="availability-empty"><strong data-i18n="owner.no_reservation_data">${tr("owner.no_reservation_data", "No reservation data yet.")}</strong><span class="d-block" data-i18n="empty.no_reservations_action_copy">${tr("empty.no_reservations_action_copy", "Share your restaurant page or adjust filters to review another reservation set.")}</span></div>`;
  }

  function renderAnalyticsCharts() {
    const data = state.analytics.data;
    const trendCanvas = document.getElementById("ownerReservationTrendChart");
    const statusCanvas = document.getElementById("ownerReservationStatusChart");

    const chartSignature = data
      ? stableSignature({
          trend: data.trend || [],
          status_breakdown: data.status_breakdown || [],
        })
      : "empty";
    if (skipRender("analytics-charts", chartSignature)) return;

    if (window._ownerReservationTrendChart) {
      window._ownerReservationTrendChart.destroy();
      window._ownerReservationTrendChart = null;
    }
    if (window._ownerReservationStatusChart) {
      window._ownerReservationStatusChart.destroy();
      window._ownerReservationStatusChart = null;
    }

    if (!data) return;
    if (typeof Chart === "undefined") {
      window
        .EventSphereLoadChart?.()
        .then(renderAnalyticsCharts)
        .catch(() => {});
      return;
    }

    const theme = chartTheme();
    const trend = data.trend || [];
    const trendEmpty = $("[data-owner-analytics-trend-empty]");
    if (trendEmpty)
      trendEmpty.innerHTML = trend.some((item) => Number(item.total) > 0)
        ? ""
        : `<div class="availability-empty mt-3"><strong data-i18n="owner.no_reservations_range">${tr("owner.no_reservations_range", "No reservations in this range.")}</strong><span class="d-block" data-i18n="empty.no_reservations_action_copy">${tr("empty.no_reservations_action_copy", "Share your restaurant page or adjust filters to review another reservation set.")}</span></div>`;
    if (trendCanvas) {
      window._ownerReservationTrendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: trend.map((item) => dateLabel(item.date)),
          datasets: [
            {
              label: tr("owner.reservations", "Reservations"),
              data: trend.map((item) => item.total),
              borderColor: theme.gold,
              backgroundColor: "rgba(212, 167, 90, .18)",
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: {
          plugins: { legend: { labels: { color: theme.text } } },
          scales: {
            x: {
              ticks: { color: theme.text, maxRotation: 0, autoSkip: true },
              grid: { color: theme.grid },
            },
            y: {
              ticks: { color: theme.text, precision: 0 },
              grid: { color: theme.grid },
              beginAtZero: true,
            },
          },
        },
      });
    }

    const breakdown = data.status_breakdown || [];
    const statusEmpty = $("[data-owner-analytics-status-empty]");
    if (statusEmpty)
      statusEmpty.innerHTML = breakdown.some((item) => Number(item.total) > 0)
        ? ""
        : `<div class="availability-empty mt-3"><strong data-i18n="owner.no_statuses_chart">${tr("owner.no_statuses_chart", "No statuses to chart yet.")}</strong><span class="d-block" data-i18n="empty.no_reservations_action_copy">${tr("empty.no_reservations_action_copy", "Share your restaurant page or adjust filters to review another reservation set.")}</span></div>`;
    if (statusCanvas) {
      window._ownerReservationStatusChart = new Chart(statusCanvas, {
        type: "doughnut",
        data: {
          labels: breakdown.map((item) => statusLabel(item.status)),
          datasets: [
            {
              data: breakdown.map((item) => item.total),
              backgroundColor: ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#94a3b8"],
              borderColor: "rgba(255,255,255,.08)",
            },
          ],
        },
        options: {
          plugins: { legend: { position: "bottom", labels: { color: theme.text } } },
          cutout: "62%",
        },
      });
    }
  }

  function detailActionMarkup(reservation) {
    if (reservation.status === "pending") {
      return `
        <button class="btn btn-gold manager-detail-primary-action" type="button" data-owner-reservation-action="confirm" data-owner-reservation-id="${reservation.id}">
          <i class="bi bi-check2-circle me-1"></i>${tr("owner.confirm", "Confirm")}
        </button>
        <button class="btn btn-outline-danger manager-detail-danger-action" type="button" data-owner-reservation-action="cancel" data-owner-reservation-id="${reservation.id}">
          <i class="bi bi-x-circle me-1"></i>${tr("buttons.cancel", "Cancel")}
        </button>
      `;
    }
    if (reservation.status === "confirmed") {
      return `
        <button class="btn btn-gold manager-detail-primary-action" type="button" data-owner-reservation-action="complete" data-owner-reservation-id="${reservation.id}">
          <i class="bi bi-patch-check me-1"></i>${tr("owner.mark_completed", "Complete")}
        </button>
        <button class="btn btn-outline-danger manager-detail-danger-action" type="button" data-owner-reservation-action="cancel" data-owner-reservation-id="${reservation.id}">
          <i class="bi bi-x-circle me-1"></i>${tr("buttons.cancel", "Cancel")}
        </button>
        <button class="btn btn-glass manager-detail-secondary-action" type="button" data-owner-reservation-action="no-show" data-owner-reservation-id="${reservation.id}">
          <i class="bi bi-person-x me-1"></i>${tr("owner.mark_no_show", "Mark no-show")}
        </button>
      `;
    }
    if (reservation.status === "cancelled") {
      return `<div class="manager-detail-state-note manager-detail-state-danger"><i class="bi bi-x-circle"></i><span>${tr("manager.reservation_cancelled_note", "This reservation has been cancelled.")}</span></div>`;
    }
    if (reservation.status === "no_show") {
      return `<div class="manager-detail-state-note"><i class="bi bi-person-x"></i><span>${tr("manager.no_show_note", "This guest was marked as a no-show.")}</span></div>`;
    }
    return `<div class="manager-detail-state-note"><i class="bi bi-eye"></i><span>${esc(tr("manager.view_only_note", "{status} reservations are view-only.", { status: statusLabel(reservation.status) }))}</span></div>`;
  }

  function detailHistoryItems(reservation) {
    return [
      reservation.created_at ? [tr("manager.created", "Created"), dateTimeLabel(reservation.created_at)] : null,
      reservation.status === "confirmed" && reservation.updated_at
        ? [tr("manager.confirmed", "Confirmed"), dateTimeLabel(reservation.updated_at)]
        : null,
      reservation.status === "completed" && reservation.updated_at
        ? [tr("manager.completed", "Completed"), dateTimeLabel(reservation.updated_at)]
        : null,
      reservation.status === "no_show" && reservation.updated_at
        ? [tr("reservation.no_show", "No-show"), dateTimeLabel(reservation.updated_at)]
        : null,
      reservation.cancelled_at ? [tr("manager.cancelled", "Cancelled"), dateTimeLabel(reservation.cancelled_at)] : null,
      reservation.updated_at ? [tr("manager.last_updated", "Last updated"), dateTimeLabel(reservation.updated_at)] : null,
    ].filter(Boolean);
  }

  function renderReservationDetailSkeleton() {
    const body = $("[data-owner-reservation-detail]");
    if (!body) return;
    body.innerHTML = `
      <div class="manager-detail-skeleton" aria-label="Loading reservation detail">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
  }

  function renderReservationDetailMissing() {
    $("[data-owner-reservation-title]").textContent = tr("manager.reservation_unavailable", "Reservation unavailable");
    const body = $("[data-owner-reservation-detail]");
    if (!body) return;
    body.innerHTML = dashboardEmpty(
      "bi-exclamation-circle",
      tr("manager.reservation_not_found", "Reservation not found."),
      tr("manager.reservation_not_found_copy", "The list may have refreshed or the selected reservation is no longer available."),
      `<div class="manager-empty-actions"><button class="btn btn-gold-outline btn-sm" type="button" data-bs-dismiss="offcanvas">${tr("manager.close_panel", "Close panel")}</button></div>`,
    );
    bootstrap.Offcanvas.getOrCreateInstance($("#ownerReservationModal"), {
      backdrop: false,
      scroll: true,
    }).show();
  }

  function renderReservationDetail(reservation) {
    if (!reservation) {
      renderReservationDetailMissing();
      return;
    }
    $("[data-owner-reservation-title]").textContent =
      reservation.guest_name ||
      tr(
        "owner.reservation_detail_title",
        tr("reservation.reservation_details", "Reservation details"),
      );
    const body = $("[data-owner-reservation-detail]");
    if (!body) return;
    renderReservationDetailSkeleton();
    const primaryActions = detailActionMarkup(reservation);
    const history = detailHistoryItems(reservation);
    bootstrap.Offcanvas.getOrCreateInstance($("#ownerReservationModal"), {
      backdrop: false,
      scroll: true,
    }).show();
    const detailHtml = `
      <div class="manager-detail-hero">
        <div>
          <h3>${esc(reservation.guest_name || guestFallback())}</h3>
          <p>${esc(dateLabel(reservation.reservation_date))} · ${esc(timeLabel(reservation.reservation_time))} · ${Number(reservation.party_size || 0)} ${guestCountLabel(reservation.party_size)}</p>
        </div>
        ${statusBadge(reservation.status)}
      </div>

      <div class="manager-detail-actions">${primaryActions}</div>

      <section class="manager-detail-section">
        <h4>${tr("manager.guest_information", "Guest Information")}</h4>
        <div class="manager-detail-grid">
          <div><span>${tr("manager.name", "Name")}</span><strong>${esc(reservation.guest_name || guestFallback())}</strong></div>
          <div><span>${tr("manager.phone", "Phone")}</span><strong>${esc(reservation.phone || tr("reservation.not_provided", "Not provided"))}</strong></div>
          <div><span>${tr("manager.email", "Email")}</span><strong>${esc(reservation.email || tr("reservation.not_provided", "Not provided"))}</strong></div>
        </div>
      </section>

      <section class="manager-detail-section">
        <h4>${tr("manager.reservation_details", "Reservation Details")}</h4>
        <div class="manager-detail-grid">
          <div><span>${tr("common.status", "Status")}</span><strong>${esc(statusLabel(reservation.status))}</strong></div>
          <div><span>${tr("manager.reservation_id", "Reservation ID")}</span><strong>#${esc(reservation.id)}</strong></div>
          <div><span>${tr("common.date", "Date")}</span><strong>${esc(dateLabel(reservation.reservation_date))}</strong></div>
          <div><span>${tr("common.time", "Time")}</span><strong>${esc(timeLabel(reservation.reservation_time))}</strong></div>
          <div><span>${tr("manager.party_size", "Party size")}</span><strong>${Number(reservation.party_size || 0)}</strong></div>
          <div><span>${tr("reservation.occasion", "Occasion")}</span><strong>${esc(occasionLabel(reservation.occasion))}</strong></div>
        </div>
      </section>

      <section class="manager-detail-section">
        <h4>${tr("manager.notes", "Notes")}</h4>
        <div class="manager-detail-note-block">
          <strong>${esc(reservation.venue?.name || state.venue?.name || restaurantBarFallback())}</strong>
          <span>${esc(reservation.notes || tr("reservation.no_special_request", "No special request provided."))}</span>
        </div>
      </section>

      ${
        reservation.status === "cancelled"
          ? `
        <section class="manager-detail-section">
          <h4>${tr("manager.cancellation_context", "Cancellation Context")}</h4>
          <div class="manager-detail-note-block">
            <strong>${esc(dateTimeLabel(reservation.cancelled_at))}</strong>
            <span>${esc(reservation.owner_cancellation_reason || reservation.cancellation_reason || tr("reservation.no_reason_provided", "No reason provided."))}</span>
          </div>
        </section>
      `
          : ""
      }

      <section class="manager-detail-section">
        <h4>${tr("manager.status_history", "Status History")}</h4>
        <div class="manager-detail-history">
          ${
            history.length
              ? history
                  .map(
                    ([label, value]) =>
                      `<div><i class="bi bi-clock-history"></i><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`,
                  )
                  .join("")
              : `<div><i class="bi bi-clock-history"></i><span>${tr("manager.no_status_history", "No status history available")}</span><strong>${tr("manager.current_status_only", "Current status only")}</strong></div>`
          }
        </div>
      </section>

      <section class="manager-detail-section">
        <h4>${tr("manager.related_context", "Related Context")}</h4>
        <div class="manager-detail-note-block">
          <strong>${esc(reservation.venue?.name || state.venue?.name || restaurantBarFallback())}</strong>
          <span>${esc(reservation.reservation_date === todayValue() ? tr("manager.scheduled_for_today", "Scheduled for today") : tr("manager.scheduled_for_date", "Scheduled for {date}", { date: dateLabel(reservation.reservation_date) }))}</span>
        </div>
      </section>
    `;
    window.requestAnimationFrame(() => {
      body.innerHTML = detailHtml;
    });
  }

  function collectIds(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) =>
      Number(input.value),
    );
  }

  function collectHours() {
    return dayKeys.map((_, index) => {
      const closed = $(`[data-hours-closed="${index}"]`)?.checked || false;
      return {
        day_of_week: index,
        opens_at: closed ? null : normalizeTime($(`[data-hours-open="${index}"]`)?.value) || null,
        closes_at: closed ? null : normalizeTime($(`[data-hours-close="${index}"]`)?.value) || null,
        is_closed: closed,
      };
    });
  }

  function nullable(value) {
    const trimmed = String(value ?? "").trim();
    return trimmed || null;
  }

  function payloadFromForm() {
    const form = $("[data-owner-venue-form]");
    const fd = new FormData(form);
    return {
      name: nullable(fd.get("name")),
      description: nullable(fd.get("description")),
      venue_type: nullable(fd.get("venue_type")),
      phone: nullable(fd.get("phone")),
      email: nullable(fd.get("email")),
      website: nullable(fd.get("website")),
      address: nullable(fd.get("address")),
      city: nullable(fd.get("city")),
      country: nullable(fd.get("country")),
      latitude: nullable(fd.get("latitude")),
      longitude: nullable(fd.get("longitude")),
      status: fd.get("status") || "active",
      min_guests: Number(fd.get("min_guests") || 1),
      max_guests: Number(fd.get("max_guests") || 10),
      max_reservations_per_slot: Number(fd.get("max_reservations_per_slot") || 10),
      booking_horizon_days: Number(fd.get("booking_horizon_days") || 30),
      reservation_interval_minutes: Number(fd.get("reservation_interval_minutes") || 30),
      last_reservation_time: nullable(normalizeTime(fd.get("last_reservation_time"))),
      facebook_url: nullable(fd.get("facebook_url")),
      instagram_url: nullable(fd.get("instagram_url")),
      tiktok_url: nullable(fd.get("tiktok_url")),
      facility_ids: collectIds("facility_ids"),
      cuisine_type_ids: collectIds("cuisine_type_ids"),
      payment_option_ids: collectIds("payment_option_ids"),
      opening_hours: collectHours(),
    };
  }

  async function saveVenue() {
    if (state.saving) return;
    const payload = payloadFromForm();
    if (!payload.name || !payload.venue_type || !payload.city) {
      showOwnerAlert(
        tr("owner.required_profile_fields", "Add the restaurant or bar name, type, and city before saving."),
      );
      window.tkToast?.(
        tr("owner.required_profile_fields", "Add the restaurant or bar name, type, and city before saving."),
        "error",
      );
      return;
    }

    setBusy(true);
    try {
      showOwnerAlert([]);
      const method = state.venue ? "PUT" : "POST";
      const path = state.venue ? `/owner/venues/${state.venue.slug}` : "/owner/venues";
      const { data } = await api().fetch(path, { method, body: payload });
      state.venue = data;
      state.venues = state.venues.some((venue) => String(venue.id) === String(data.id))
        ? state.venues.map((venue) => (String(venue.id) === String(data.id) ? data : venue))
        : [data, ...state.venues];
      clearOwnerRenderSignatures("gallery", "venue-filters");
      renderSummary();
      fillForm();
      renderVenueFilter();
      await loadAvailabilityExceptions();
      window.tkToast?.(
        method === "POST"
          ? tr("owner.venue_created", "Restaurant profile created. Add images and availability when you’re ready.")
          : tr("owner.venue_updated", "Restaurant profile saved. Guests will see the latest details."),
        "success",
      );
    } catch (err) {
      const messages = err?.status === 422 ? validationMessages(err) : [friendlyError(err)];
      showOwnerAlert(messages);
      window.tkToast?.(messages[0], "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImages(files) {
    if (!state.venue) {
      window.tkToast?.(
        tr("owner.create_before_upload", "Create the restaurant or bar before uploading images."),
        "error",
      );
      return;
    }
    const valid = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!valid.length) return;

    setBusy(true);
    try {
      renderUploadProgress(valid, 0, tr("loading.uploading", "Preparing uploads..."));
      for (const [index, file] of valid.entries()) {
        const data = await uploadVenueImage(file, (progress) => {
          renderUploadProgress(
            valid,
            index,
            tr("manager.uploading_file", "Uploading {file}", { file: file.name }),
            progress,
          );
        });
        state.venue = data;
        state.venues = state.venues.map((venue) =>
          String(venue.id) === String(data.id) ? data : venue,
        );
        clearOwnerRenderSignatures("gallery", "venue-filters");
      }
      renderSummary();
      fillForm();
      window.tkToast?.(
        tr(
          valid.length === 1 ? "owner.image_uploaded" : "owner.images_uploaded",
          valid.length === 1
            ? tr("owner.image_uploaded", "Image uploaded. The public gallery is up to date.")
            : tr("owner.images_uploaded", "Images uploaded. The public gallery is up to date."),
        ),
        "success",
      );
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    } finally {
      setBusy(false);
      renderUploadProgress([], 0, "", 0);
      const input = $("[data-owner-image-input]");
      if (input) input.value = "";
    }
  }

  function renderUploadProgress(files, currentIndex, label, progress = 0) {
    const root = $("[data-owner-upload-progress]");
    if (!root) return;
    if (!files.length) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }

    const total = files.length;
    const completed = currentIndex;
    const currentProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    const overall = Math.round(((completed + currentProgress / 100) / total) * 100);

    root.hidden = false;
    root.innerHTML = `
      <div class="owner-upload-progress-head">
        <span>${esc(label || tr("loading.uploading", "Uploading photos..."))}</span>
        <strong>${overall}%</strong>
      </div>
      <div class="owner-upload-progress-bar" aria-hidden="true"><span style="width:${overall}%"></span></div>
      <small class="text-muted-pro">${completed + 1} of ${total} photos</small>
    `;
  }

  function uploadVenueImage(file, onProgress) {
    return new Promise((resolve, reject) => {
      const cfg = window.EventSphereConfig;
      const token =
        window.EventSphereApi?.getToken?.() ||
        localStorage.getItem(cfg.TOKEN_KEY);
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("image", file);

      xhr.open(
        "POST",
        `${cfg.API_BASE_URL.replace(/\/$/, "")}/owner/venues/${encodeURIComponent(state.venue.slug)}/images`,
      );
      xhr.setRequestHeader("Accept", "application/json");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      console.info("[Tiketa auth debug]", "API REQUEST: Authorization header", {
        path: `/owner/venues/${state.venue.slug}/images`,
        method: "POST",
        hasAuthorization: !!token,
        transport: "xhr",
      });
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener("load", () => {
        let payload = null;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          payload = { message: xhr.responseText };
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload?.data || payload);
          return;
        }
        const err = new Error(
          payload?.message ||
            tr("owner.image_upload_failed", "We couldn’t upload this image. Check the file size and try again."),
        );
        err.status = xhr.status;
        err.payload = payload;
        reject(err);
      });
      xhr.addEventListener("error", () =>
        reject(new Error(tr("owner.image_upload_failed", "We couldn’t upload this image. Check the file size and try again."))),
      );
      xhr.send(fd);
    });
  }

  async function deleteImage(imageId) {
    if (!state.venue) return;
    setBusy(true);
    try {
      await api().fetch(`/owner/venue-images/${imageId}`, { method: "DELETE" });
      state.venue.images = (state.venue.images || []).filter(
        (image) => String(image.id) !== String(imageId),
      );
      state.venue.images = state.venue.images.map((image, index) => ({
        ...image,
        sort_order: index,
      }));
      clearOwnerRenderSignatures("gallery");
      renderSummary();
      fillForm();
      window.tkToast?.(
        tr("owner.image_deleted", "Image removed. The public gallery is up to date."),
        "success",
      );
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function persistGalleryOrder(
    images,
    message = tr("owner.gallery_order_updated", "Gallery order updated."),
  ) {
    if (!state.venue?.slug || !images.length) return;
    const payload = images.map((image, order) => ({ id: image.id, sort_order: order }));

    setBusy(true);
    try {
      const { data } = await api().fetch(`/owner/venues/${state.venue.slug}/images/reorder`, {
        method: "PUT",
        body: { images: payload },
      });
      state.venue = data;
      state.venues = state.venues.map((venue) =>
        String(venue.id) === String(data.id) ? data : venue,
      );
      clearOwnerRenderSignatures("gallery", "venue-filters");
      renderSummary();
      fillForm();
      window.tkToast?.(message, "success");
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function reorderImage(imageId, direction) {
    const images = [...(state.venue?.images || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    );
    const index = images.findIndex((image) => String(image.id) === String(imageId));
    const next = index + direction;
    if (index < 0 || next < 0 || next >= images.length) return;
    [images[index], images[next]] = [images[next], images[index]];
    await persistGalleryOrder(images);
  }

  async function setCoverImage(imageId) {
    const images = [...(state.venue?.images || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    );
    const image = images.find((item) => String(item.id) === String(imageId));
    if (!image) return;
    await persistGalleryOrder(
      [image, ...images.filter((item) => String(item.id) !== String(imageId))],
      tr("owner.cover_photo_updated", "Cover photo updated. Guests will see it first."),
    );
  }

  async function moveImageBefore(sourceId, targetId) {
    if (!sourceId || !targetId || String(sourceId) === String(targetId)) return;
    const images = [...(state.venue?.images || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    );
    const source = images.find((image) => String(image.id) === String(sourceId));
    const withoutSource = images.filter((image) => String(image.id) !== String(sourceId));
    const targetIndex = withoutSource.findIndex((image) => String(image.id) === String(targetId));
    if (!source || targetIndex < 0) return;
    withoutSource.splice(targetIndex, 0, source);
    await persistGalleryOrder(withoutSource);
  }

  async function deleteVenue() {
    if (!state.venue) return;
    setBusy(true);
    try {
      await api().fetch(`/owner/venues/${state.venue.slug}`, { method: "DELETE" });
      state.venue = null;
      state.venues = [];
      state.blackoutDates = [];
      state.specialHours = [];
      clearOwnerRenderSignatures(
        "gallery",
        "venue-filters",
        "reservation-stats",
        "calendar",
        "analytics-overview",
        "analytics-charts",
      );
      renderSummary();
      fillForm();
      renderAvailabilityExceptions();
      renderVenueFilter();
      bootstrap.Modal.getOrCreateInstance($("#ownerDeleteModal")).hide();
      window.tkToast?.(
        tr("owner.venue_deleted", "Restaurant profile removed. Reservation history stays preserved."),
        "success",
      );
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function loadData() {
    auth().requireAuth(["owner"]);
    try {
      const [venues, facilities, cuisines, payments] = await Promise.all([
        api().fetch("/owner/venues?per_page=100"),
        api().fetch("/venue-facilities"),
        api().fetch("/cuisine-types"),
        api().fetch("/payment-options"),
      ]);
      state.venues = venues.data || [];
      state.venue = state.venues[0] || null;
      state.facilities = facilities.data || [];
      state.cuisines = cuisines.data || [];
      state.payments = payments.data || [];
      renderSummary();
      fillForm();
      renderVenueFilter();
      await loadAvailabilityExceptions();
      await loadReservations();
      if (state.reservationView === "calendar") await loadCalendarReservations();
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  function reservationQuery() {
    const params = new URLSearchParams({ per_page: "50" });
    Object.entries(state.reservationFilters).forEach(([key, value]) => {
      if (key === "date" && state.reservationWorkspace.dateEnd) return;
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  async function loadReservations(options = {}) {
    const query = reservationQuery();
    const requestId = ++reservationLoadId;
    if (options.force) reservationRequests.delete(query);
    if (!options.force && reservationRequests.has(query)) {
      try {
        const { data, meta } = await reservationRequests.get(query);
        if (requestId !== reservationLoadId) return;
        state.reservations = Array.isArray(data) ? data : [];
        state.reservationStats = meta?.stats || state.reservationStats;
        renderReservations();
      } catch (err) {
        if (requestId !== reservationLoadId) return;
        state.reservations = [];
        lastReservationRenderSignature = "";
        renderReservations();
        window.tkToast?.(friendlyError(err), "error");
      }
      return;
    }

    renderReservations(true);
    const request = api()
      .fetch(`/owner/reservations?${query}`)
      .finally(() => {
        reservationRequests.delete(query);
      });
    reservationRequests.set(query, request);

    try {
      const { data, meta } = await request;
      if (requestId !== reservationLoadId) return;
      state.reservations = Array.isArray(data) ? data : [];
      state.reservationStats = meta?.stats || state.reservationStats;
      renderReservations();
    } catch (err) {
      if (requestId !== reservationLoadId) return;
      state.reservations = [];
      lastReservationRenderSignature = "";
      renderReservations();
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  function calendarQuery() {
    const { start, end } = calendarPeriod();
    const params = new URLSearchParams({
      start_date: toDateInputValue(start),
      end_date: toDateInputValue(end),
    });
    Object.entries(state.calendar.filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  async function loadCalendarReservations(options = {}) {
    const query = calendarQuery();
    if (options.force) calendarRequests.delete(query);
    if (!options.force && calendarRequests.has(query)) {
      try {
        const { data, meta } = await calendarRequests.get(query);
        state.calendar.reservations = Array.isArray(data) ? data : [];
        state.calendar.todaySummary = meta?.today_summary || state.calendar.todaySummary;
        renderCalendar();
      } catch (err) {
        state.calendar.reservations = [];
        clearOwnerRenderSignatures("calendar");
        renderCalendar();
        window.tkToast?.(friendlyError(err), "error");
      }
      return;
    }

    state.calendar.loading = true;
    renderCalendar(true);
    const request = api()
      .fetch(`/owner/reservations/calendar?${query}`)
      .finally(() => {
        calendarRequests.delete(query);
      });
    calendarRequests.set(query, request);

    try {
      const { data, meta } = await request;
      state.calendar.reservations = Array.isArray(data) ? data : [];
      state.calendar.todaySummary = meta?.today_summary || state.calendar.todaySummary;
      renderCalendar();
    } catch (err) {
      state.calendar.reservations = [];
      clearOwnerRenderSignatures("calendar");
      renderCalendar();
      window.tkToast?.(friendlyError(err), "error");
    } finally {
      state.calendar.loading = false;
    }
  }

  function analyticsQuery() {
    const { start, end } = analyticsPeriod();
    const params = new URLSearchParams({
      start_date: toDateInputValue(start),
      end_date: toDateInputValue(end),
    });
    if (state.analytics.filters.venue_id) params.set("venue_id", state.analytics.filters.venue_id);
    return params.toString();
  }

  async function loadAnalytics(options = {}) {
    const query = analyticsQuery();
    if (options.force) analyticsRequests.delete(query);
    if (!options.force && analyticsRequests.has(query)) {
      try {
        const { data } = await analyticsRequests.get(query);
        state.analytics.data = data || null;
        renderAnalytics();
      } catch (err) {
        state.analytics.data = null;
        clearOwnerRenderSignatures("analytics-overview", "analytics-charts");
        renderAnalytics();
        window.tkToast?.(friendlyError(err), "error");
      }
      return;
    }

    state.analytics.loading = true;
    renderAnalytics(true);
    const request = api()
      .fetch(`/owner/analytics?${query}`)
      .finally(() => {
        analyticsRequests.delete(query);
      });
    analyticsRequests.set(query, request);

    try {
      const { data } = await request;
      state.analytics.data = data || null;
      renderAnalytics();
    } catch (err) {
      state.analytics.data = null;
      clearOwnerRenderSignatures("analytics-overview", "analytics-charts");
      renderAnalytics();
      window.tkToast?.(friendlyError(err), "error");
    } finally {
      state.analytics.loading = false;
    }
  }

  async function loadAvailabilityExceptions() {
    if (!state.venue?.slug) {
      state.blackoutDates = [];
      state.specialHours = [];
      renderAvailabilityExceptions();
      return;
    }

    try {
      const [blackouts, specialHours] = await Promise.all([
        api().fetch(`/owner/venues/${state.venue.slug}/blackout-dates`),
        api().fetch(`/owner/venues/${state.venue.slug}/special-hours`),
      ]);
      state.blackoutDates = Array.isArray(blackouts.data) ? blackouts.data : [];
      state.specialHours = Array.isArray(specialHours.data) ? specialHours.data : [];
      renderAvailabilityExceptions();
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  async function addBlackoutDate() {
    if (!state.venue) {
      window.tkToast?.(
        tr("owner.create_before_blackout", "Create the restaurant or bar before adding blackout dates."),
        "error",
      );
      return;
    }

    const date = $("[data-blackout-date]")?.value;
    const reason = nullable($("[data-blackout-reason]")?.value);
    if (!date) {
      window.tkToast?.(tr("availability.select_blackout_date", "Select a blackout date."), "error");
      return;
    }

    try {
      const { data } = await api().fetch(`/owner/venues/${state.venue.slug}/blackout-dates`, {
        method: "POST",
        body: { date, reason },
      });
      state.blackoutDates = [...state.blackoutDates, data].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      );
      if ($("[data-blackout-date]")) $("[data-blackout-date]").value = "";
      if ($("[data-blackout-reason]")) $("[data-blackout-reason]").value = "";
      renderBlackoutDates();
      window.tkToast?.(tr("availability.blackout_added", "Blackout date added."), "success");
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  async function deleteBlackoutDate(id) {
    if (!state.venue) return;
    try {
      await api().fetch(`/owner/venues/${state.venue.slug}/blackout-dates/${id}`, {
        method: "DELETE",
      });
      state.blackoutDates = state.blackoutDates.filter((item) => String(item.id) !== String(id));
      renderBlackoutDates();
      window.tkToast?.(tr("availability.blackout_removed", "Blackout date removed."), "success");
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  async function saveSpecialHours() {
    if (!state.venue) {
      window.tkToast?.(
        tr("owner.create_before_special_hours", "Create the restaurant or bar before adding special hours."),
        "error",
      );
      return;
    }

    const date = $("[data-special-date]")?.value;
    const isClosed = $("[data-special-closed]")?.checked || false;
    const payload = {
      date,
      opens_at: isClosed ? null : normalizeTime($("[data-special-open]")?.value),
      closes_at: isClosed ? null : normalizeTime($("[data-special-close]")?.value),
      is_closed: isClosed,
    };

    if (!payload.date || (!payload.is_closed && (!payload.opens_at || !payload.closes_at))) {
      window.tkToast?.(
        tr("availability.select_special_hours", "Select a date and special opening hours."),
        "error",
      );
      return;
    }

    const editingId = state.editingSpecialHourId;
    const path = editingId
      ? `/owner/venues/${state.venue.slug}/special-hours/${editingId}`
      : `/owner/venues/${state.venue.slug}/special-hours`;

    try {
      const { data } = await api().fetch(path, {
        method: editingId ? "PUT" : "POST",
        body: payload,
      });
      state.specialHours = editingId
        ? state.specialHours.map((item) => (String(item.id) === String(editingId) ? data : item))
        : [...state.specialHours, data];
      state.specialHours = state.specialHours.sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      );
      clearSpecialForm();
      renderSpecialHours();
      window.tkToast?.(
        editingId
          ? tr("availability.special_updated", "Special hours updated.")
          : tr("availability.special_added", "Special hours added."),
        "success",
      );
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  function editSpecialHours(id) {
    const item = state.specialHours.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    state.editingSpecialHourId = item.id;
    if ($("[data-special-date]")) $("[data-special-date]").value = item.date || "";
    if ($("[data-special-open]"))
      $("[data-special-open]").value = normalizeTime(item.opens_at || "");
    if ($("[data-special-close]"))
      $("[data-special-close]").value = normalizeTime(item.closes_at || "");
    if ($("[data-special-closed]")) $("[data-special-closed]").checked = Boolean(item.is_closed);
    syncSpecialClosedState();
    $("[data-special-date]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function deleteSpecialHours(id) {
    if (!state.venue) return;
    try {
      await api().fetch(`/owner/venues/${state.venue.slug}/special-hours/${id}`, {
        method: "DELETE",
      });
      state.specialHours = state.specialHours.filter((item) => String(item.id) !== String(id));
      if (String(state.editingSpecialHourId) === String(id)) clearSpecialForm();
      renderSpecialHours();
      window.tkToast?.(tr("availability.special_removed", "Special hours removed."), "success");
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  async function reservationAction(id, action, body = {}) {
    try {
      const { data } = await api().fetch(`/owner/reservations/${id}/${action}`, {
        method: "PATCH",
        body,
      });
      state.reservations = state.reservations.map((reservation) =>
        String(reservation.id) === String(id) ? data : reservation,
      );
      state.calendar.reservations = state.calendar.reservations.map((reservation) =>
        String(reservation.id) === String(id) ? data : reservation,
      );
      lastReservationRenderSignature = "";
      clearOwnerRenderSignatures("reservation-stats", "calendar");
      renderReservations();
      renderCalendar();
      await loadReservations();
      if (state.reservationView === "calendar") await loadCalendarReservations();
      const message =
        action === "complete"
          ? tr("owner.reservation_completed", "Visit marked complete. The reservation history is up to date.")
          : action === "no-show"
            ? tr("owner.reservation_no_show", "No-show recorded. The guest record is up to date.")
            : action === "confirm"
              ? tr("owner.reservation_confirmed", "Reservation confirmed. The guest can see the updated status.")
              : action === "cancel"
                ? tr("owner.reservation_cancelled", "Reservation cancelled. The guest record is up to date.")
                : tr("toast.operation_completed", "Done. Your update has been applied.");
      window.tkToast?.(message, "success");
    } catch (err) {
      window.tkToast?.(friendlyError(err), "error");
    }
  }

  function reservationActionMeta(action) {
    return (
      {
        confirm: {
          title: tr("reservation.confirm_reservation", "Confirm reservation?"),
          body: tr("reservation.confirm_reservation", "This will confirm the guest reservation."),
          confirm: tr("reservation.confirm_reservation", "Confirm reservation"),
        },
        cancel: {
          title: tr("reservation.cancel_reservation", "Cancel reservation?"),
          body: tr("reservation.cancel_notice", "This will cancel the guest reservation."),
          confirm: tr("reservation.cancel_reservation", "Cancel reservation"),
        },
        complete: {
          title: tr("owner.mark_completed", "Mark reservation completed?"),
          body: tr(
            "reservation.reservation_completed",
            tr("manager.mark_completed_body", "Use this after the guest visit has finished."),
          ),
          confirm: tr("owner.mark_completed", "Mark completed"),
        },
        "no-show": {
          title: tr("owner.mark_no_show", "Mark reservation as no show?"),
          body: tr(
            "reservation.no_show",
            tr("manager.mark_no_show_body", "Use this only when the guest did not arrive for a confirmed reservation."),
          ),
          confirm: tr("owner.mark_no_show", "Mark no show"),
        },
      }[action] || {
        title: tr("reservation.reservation", "Update reservation?"),
        body: tr("reservation.reservation_status", "This will update the reservation status."),
        confirm: tr("buttons.update", "Update reservation"),
      }
    );
  }

  function openReservationActionModal(id, action) {
    state.pendingReservationAction = { id, action };
    const meta = reservationActionMeta(action);
    $("[data-owner-action-title]").textContent = meta.title;
    $("[data-owner-action-body]").textContent = meta.body;
    $("[data-owner-action-confirm]").textContent = meta.confirm;
    const reasonFields = $("[data-owner-cancel-reason-fields]");
    const reasonSelect = $("[data-owner-cancel-reason-select]");
    const reasonOther = $("[data-owner-cancel-reason-other]");
    if (reasonFields) reasonFields.hidden = action !== "cancel";
    if (reasonSelect) reasonSelect.value = ownerCancellationReasons[0];
    if (reasonOther) {
      reasonOther.value = "";
      reasonOther.hidden = true;
    }
    bootstrap.Modal.getOrCreateInstance($("#ownerReservationActionModal")).show();
  }

  function ownerCancellationReason() {
    const selected = String($("[data-owner-cancel-reason-select]")?.value || "").trim();
    if (selected !== "Other") return selected;

    return String($("[data-owner-cancel-reason-other]")?.value || "").trim();
  }

  async function confirmReservationAction() {
    const pending = state.pendingReservationAction;
    if (!pending) return;
    const body = {};
    if (pending.action === "cancel") {
      const reason = ownerCancellationReason();
      if (!reason) {
        window.tkToast?.(
          tr("owner.add_cancellation_reason", "Please add a cancellation reason."),
          "error",
        );
        return;
      }
      body.owner_cancellation_reason = reason;
    }
    bootstrap.Modal.getOrCreateInstance($("#ownerReservationActionModal")).hide();
    state.pendingReservationAction = null;
    await reservationAction(pending.id, pending.action, body);
  }

  function managerShortcutLabel() {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform || "") ? "⌘ K" : "Ctrl K";
  }

  function setManagerSidebarCollapsed(collapsed) {
    const shell = $("[data-manager-shell]");
    const toggle = $("[data-manager-sidebar-toggle]");
    if (!shell) return;
    shell.classList.toggle("manager-sidebar-collapsed", collapsed);
    toggle?.setAttribute(
      "aria-label",
      collapsed ? tr("manager.expand_sidebar", "Expand sidebar") : tr("manager.collapse_sidebar", "Collapse sidebar"),
    );
    localStorage.setItem("tiketa_manager_sidebar_collapsed", collapsed ? "1" : "0");
  }

  function isManagerMobileNav() {
    return window.matchMedia?.("(max-width: 720px)")?.matches || window.innerWidth <= 720;
  }

  function setManagerMobileSidebarOpen(open) {
    const shell = $("[data-manager-shell]");
    const overlay = $("[data-manager-sidebar-overlay]");
    const trigger = $("[data-manager-mobile-sidebar-open]");
    if (!shell) return;
    shell.classList.toggle("manager-mobile-sidebar-open", open);
    document.body.classList.toggle("manager-mobile-sidebar-lock", open);
    if (overlay) {
      overlay.hidden = !open;
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
    }
    trigger?.setAttribute("aria-expanded", String(open));
  }

  function closeManagerMobileSidebar() {
    setManagerMobileSidebarOpen(false);
  }

  function updateManagerPendingBadge(count) {
    const badge = $("[data-manager-pending-badge]");
    if (!badge) return;
    badge.textContent = String(count);
    badge.hidden = Number(count) <= 0;
  }

  const managerWorkspaceSections = [
    "dashboard",
    "reservations",
    "calendar",
    "guests",
    "analytics",
    "venue",
    "availability",
    "settings",
  ];

  function managerSectionFromTarget(target = "") {
    const value = String(target || "");
    if (value.includes("ownerReservations")) return "reservations";
    if (value.includes("managerCalendar")) return "calendar";
    if (value.includes("managerGuestsWorkspace")) return "guests";
    if (value.includes("managerAnalytics")) return "analytics";
    if (value.includes("managerVenue") || value.includes("managerPublicPreview")) return "venue";
    if (value.includes("managerAvailability") || value.includes("managerBookingRules") || value.includes("managerGuestRules"))
      return "availability";
    if (value.includes("managerSettings") || value.includes("managerDangerZone")) return "settings";
    if (value.includes("managerDashboard")) return "dashboard";
    return "";
  }

  function managerSectionFromHash(hash = window.location.hash) {
    const cleanHash = String(hash || "").replace(/^#/, "");
    if (!cleanHash) return "";
    if (managerWorkspaceSections.includes(cleanHash)) return cleanHash;
    return managerSectionFromTarget(`#${cleanHash}`);
  }

  function setManagerWorkspaceHistory(section, replace = false) {
    const destination = `#${section || "dashboard"}`;
    if (!destination || !window.history?.pushState) return;
    const nextUrl = `${window.location.pathname}${window.location.search}${destination}`;
    if (nextUrl === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ managerWorkspace: section }, "", nextUrl);
  }

  function showManagerWorkspace(section) {
    const root = $("[data-owner-venue-page]");
    const reservations = $("#ownerReservations");
    const calendar = $("#managerCalendar");
    const analytics = $("#managerAnalytics");
    const guests = $("#managerGuestsWorkspace");
    const form = $("[data-owner-venue-form]");
    const venueModule = $("#managerVenueModule");
    const availabilityModule = $("#managerAvailabilityModule");
    const settingsModule = $("#managerSettings");
    const activeSection = managerWorkspaceSections.includes(section) ? section : "dashboard";
    const dashboardVisible = activeSection === "dashboard";
    const formVisible = ["venue", "availability", "settings"].includes(activeSection);

    Array.from(root?.children || []).forEach((child) => {
      if (
        child === reservations ||
        child === calendar ||
        child === analytics ||
        child === guests ||
        child === form ||
        child.matches?.("[data-owner-alert]")
      )
        return;
      child.hidden = !dashboardVisible;
    });

    if (reservations) reservations.hidden = activeSection !== "reservations";
    if (calendar) calendar.hidden = activeSection !== "calendar";
    if (analytics) analytics.hidden = activeSection !== "analytics";
    if (guests) guests.hidden = activeSection !== "guests";
    if (form) form.hidden = !formVisible;
    if (venueModule) venueModule.hidden = activeSection !== "venue";
    if (availabilityModule) availabilityModule.hidden = activeSection !== "availability";
    if (settingsModule) settingsModule.hidden = activeSection !== "settings";

    if (activeSection === "reservations") switchOwnerReservationPanel("list");
    if (activeSection === "calendar") switchOwnerReservationPanel("calendar");
    if (activeSection === "analytics") switchOwnerReservationPanel("analytics");

    document.body.dataset.managerWorkspace = activeSection;
    localStorage.setItem("tiketa_manager_workspace", activeSection);
  }

  function setManagerActiveSection(section) {
    document.querySelectorAll("[data-manager-nav]").forEach((item) => {
      const active = item.dataset.managerNav === section;
      item.classList.toggle("active", active);
      item.setAttribute("aria-current", active ? "page" : "false");
    });
    document.querySelectorAll("[data-manager-subnav]").forEach((subnav) => {
      subnav.hidden = subnav.dataset.managerSubnav !== section;
    });
  }

  function switchOwnerReservationPanel(view) {
    state.reservationView = view;
    document.querySelectorAll("[data-owner-reservation-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.ownerReservationTab === view);
    });
    document.querySelectorAll("[data-owner-reservation-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.ownerReservationPanel !== view;
    });
    if (view === "calendar" && !state.calendar.reservations.length) {
      loadCalendarReservations();
    }
    if (view === "analytics" && !state.analytics.data) {
      loadAnalytics();
    }
  }

  function applyManagerReservationFilter(status) {
    const mappedView =
      {
        all: "all",
        pending: "pending",
        completed: "completed",
        cancelled: "cancelled",
        no_show: "no_show",
      }[status] || "all";
    state.reservationWorkspace.search = "";
    state.reservationWorkspace.dateEnd = "";
    state.reservationWorkspace.partySize = "";
    state.reservationWorkspace.occasion = "";
    if (status === "confirmed") {
      state.reservationWorkspace.view = "all";
      state.reservationFilters.view = "";
      state.reservationFilters.status = "confirmed";
      syncReservationWorkspaceControls();
    } else {
      setReservationWorkspaceView(mappedView, { load: false });
    }
    lastReservationRenderSignature = "";
    clearOwnerRenderSignatures("reservation-stats");
    loadReservations();
  }

  function openManagerSection(section, options = {}) {
    const activeSection = managerWorkspaceSections.includes(section) ? section : "dashboard";
    setManagerActiveSection(activeSection);
    showManagerWorkspace(activeSection);
    if (options.updateHistory !== false) {
      setManagerWorkspaceHistory(activeSection, Boolean(options.replaceHistory));
    }
    if (options.resetScroll !== false) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    if (activeSection === "guests" && !options.silent) {
      window.tkToast?.(tr("manager.guest_workspace_later", "Guest workspace will be available in a later manager phase."), "info");
    }
  }

  function openPublicVenuePage() {
    const link = $("[data-owner-public-link]");
    if (link?.href && link.href !== "#") {
      window.open(link.href, "_blank", "noopener");
      return;
    }
    window.tkToast?.(
      tr(
        "owner.create_before_upload",
        "Create the restaurant or bar before opening the public page.",
      ),
      "info",
    );
  }

  function handleManagerQuickAction(action) {
    if (action === "pending") {
      openManagerSection("reservations");
      applyManagerReservationFilter("pending");
      return;
    }
    if (action === "calendar") {
      openManagerSection("calendar");
      document.querySelector('[data-owner-calendar-view="day"]')?.click();
      return;
    }
    if (action === "blackout") {
      openManagerSection("availability", { target: "#managerAvailabilityExceptions" });
      $("[data-blackout-date]")?.focus();
      return;
    }
    if (action === "special-hours") {
      openManagerSection("availability", { target: "#managerAvailabilitySpecialHours" });
      $("[data-special-date]")?.focus();
      return;
    }
    if (action === "opening-hours") {
      openManagerSection("availability", { target: "#managerAvailabilityOpeningHours" });
      return;
    }
    if (action === "preview") {
      openManagerSection("venue", { target: "#managerVenuePublicPreview" });
      openPublicVenuePage();
    }
  }

  function bindManagerShell() {
    const shortcut = $("[data-manager-shortcut]");
    if (shortcut) shortcut.textContent = managerShortcutLabel();

    setManagerSidebarCollapsed(localStorage.getItem("tiketa_manager_sidebar_collapsed") === "1");
    const initialSection =
      managerSectionFromHash() ||
      (managerWorkspaceSections.includes(localStorage.getItem("tiketa_manager_workspace"))
        ? localStorage.getItem("tiketa_manager_workspace")
        : "dashboard");
    openManagerSection(initialSection, {
      replaceHistory: true,
      resetScroll: false,
      silent: true,
    });

    const openWorkspaceFromLocation = () => {
      const section = managerSectionFromHash() || "dashboard";
      openManagerSection(section, {
        updateHistory: false,
        resetScroll: false,
        silent: true,
      });
    };
    window.addEventListener("popstate", openWorkspaceFromLocation);
    window.addEventListener("hashchange", openWorkspaceFromLocation);

    const mobileSidebarTrigger = $("[data-manager-mobile-sidebar-open]");
    mobileSidebarTrigger?.setAttribute("aria-expanded", "false");
    mobileSidebarTrigger?.addEventListener("click", () => {
      setManagerMobileSidebarOpen(true);
    });
    $("[data-manager-mobile-sidebar-close]")?.addEventListener("click", closeManagerMobileSidebar);
    $("[data-manager-sidebar-overlay]")?.addEventListener("click", closeManagerMobileSidebar);
    window.addEventListener("resize", () => {
      if (!isManagerMobileNav()) closeManagerMobileSidebar();
    });

    $("[data-manager-sidebar-toggle]")?.addEventListener("click", () => {
      const shell = $("[data-manager-shell]");
      setManagerSidebarCollapsed(!shell?.classList.contains("manager-sidebar-collapsed"));
    });

    document.querySelectorAll("[data-manager-section]").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        openManagerSection(item.dataset.managerSection);
        closeManagerMobileSidebar();
      });
    });

    document.querySelectorAll("[data-manager-reservation-filter]").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        openManagerSection("reservations");
        applyManagerReservationFilter(item.dataset.managerReservationFilter);
        closeManagerMobileSidebar();
      });
    });

    document.querySelectorAll("[data-manager-target]").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        const section = item.closest("[data-manager-subnav]")?.dataset.managerSubnav || "dashboard";
        openManagerSection(section, { target: item.dataset.managerTarget });
        closeManagerMobileSidebar();
      });
    });

    document.querySelectorAll("[data-manager-placeholder]").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        const label = item.dataset.managerPlaceholder || tr("manager.this_section", "This section");
        window.tkToast?.(
          tr("manager.section_later", "{section} will be available in a later manager phase.", {
            section: tr(`manager.${String(label).toLowerCase()}`, label),
          }),
          "info",
        );
        closeManagerMobileSidebar();
      });
    });

    document
      .querySelectorAll("[data-manager-public-preview], [data-manager-public-page]")
      .forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          openManagerSection("venue", { target: "#managerVenuePublicPreview" });
          openPublicVenuePage();
          closeManagerMobileSidebar();
        });
      });

    $("[data-manager-search]")?.addEventListener("click", () => {
      window.tkToast?.(tr("manager.global_search_later", "Global search will be available in a later manager phase."), "info");
    });

    document.addEventListener("keydown", (event) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      window.tkToast?.(tr("manager.global_search_later", "Global search will be available in a later manager phase."), "info");
    });

    document.addEventListener("click", (event) => {
      const item = event.target.closest("[data-manager-quick-action]");
      if (!item) return;
      event.preventDefault();
      handleManagerQuickAction(item.dataset.managerQuickAction);
    });
  }

  function bindEvents() {
    bindManagerShell();
    $("[data-owner-save]")?.addEventListener("click", saveVenue);
    $("[data-owner-start-create]")?.addEventListener("click", () =>
      openManagerSection("venue", { target: "#managerVenueProfile" }),
    );
    $("[data-owner-image-browse]")?.addEventListener("click", () =>
      $("[data-owner-image-input]")?.click(),
    );
    $("[data-owner-image-input]")?.addEventListener("change", (event) =>
      uploadImages(event.target.files),
    );
    const galleryDropzone = $("[data-owner-gallery-dropzone]");
    galleryDropzone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      galleryDropzone.classList.add("is-dragover");
    });
    galleryDropzone?.addEventListener("dragleave", (event) => {
      if (!galleryDropzone.contains(event.relatedTarget))
        galleryDropzone.classList.remove("is-dragover");
    });
    galleryDropzone?.addEventListener("drop", (event) => {
      event.preventDefault();
      galleryDropzone.classList.remove("is-dragover");
      uploadImages(event.dataTransfer?.files);
    });
    $("[data-owner-delete-open]")?.addEventListener("click", () =>
      bootstrap.Modal.getOrCreateInstance($("#ownerDeleteModal")).show(),
    );
    $("[data-owner-delete-confirm]")?.addEventListener("click", deleteVenue);
    $("[data-owner-action-confirm]")?.addEventListener("click", confirmReservationAction);
    $("[data-owner-cancel-reason-select]")?.addEventListener("change", (event) => {
      const reasonOther = $("[data-owner-cancel-reason-other]");
      if (!reasonOther) return;
      reasonOther.hidden = event.currentTarget.value !== "Other";
      if (reasonOther.hidden) reasonOther.value = "";
    });
    $("[data-blackout-add]")?.addEventListener("click", addBlackoutDate);
    $("[data-special-save]")?.addEventListener("click", saveSpecialHours);
    $("[data-special-closed]")?.addEventListener("change", syncSpecialClosedState);
    $("[data-owner-location-search-button]")?.addEventListener("click", searchOwnerLocation);
    $("[data-owner-location-search]")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchOwnerLocation();
      }
    });
    $("[data-owner-location-click-layer]")?.addEventListener("click", (event) => {
      const coordinates = coordinatesFromPickerClick(event);
      setLocationFields(coordinates.lat, coordinates.lng);
    });
    $("[data-owner-location-clear]")?.addEventListener("click", () => {
      const form = $("[data-owner-venue-form]");
      if (!form) return;
      form.elements.latitude.value = "";
      form.elements.longitude.value = "";
      updateOwnerLocationMap();
    });
    ["latitude", "longitude"].forEach((name) => {
      $("[data-owner-venue-form]")?.elements[name]?.addEventListener(
        "input",
        updateOwnerLocationMap,
      );
    });
    ["address", "city", "country"].forEach((name) => {
      $("[data-owner-venue-form]")?.elements[name]?.addEventListener("input", () => {
        const search = $("[data-owner-location-search]");
        if (search) search.value = locationSearchText();
      });
    });
    $("[data-owner-reservations-refresh]")?.addEventListener("click", () => {
      if (state.reservationView === "analytics") {
        clearOwnerRenderSignatures("analytics-overview", "analytics-rates", "analytics-charts");
        loadAnalytics({ force: true });
        return;
      }
      if (state.reservationView === "calendar") {
        clearOwnerRenderSignatures("calendar");
        loadCalendarReservations({ force: true });
        return;
      }
      lastReservationRenderSignature = "";
      clearOwnerRenderSignatures("reservation-stats");
      loadReservations({ force: true });
    });
    $("[data-owner-calendar-prev]")?.addEventListener("click", () => {
      state.calendar.anchorDate =
        state.calendar.view === "month"
          ? addMonths(state.calendar.anchorDate, -1)
          : addDays(state.calendar.anchorDate, state.calendar.view === "week" ? -7 : -1);
      loadCalendarReservations();
    });
    $("[data-owner-calendar-next]")?.addEventListener("click", () => {
      state.calendar.anchorDate =
        state.calendar.view === "month"
          ? addMonths(state.calendar.anchorDate, 1)
          : addDays(state.calendar.anchorDate, state.calendar.view === "week" ? 7 : 1);
      loadCalendarReservations();
    });
    $("[data-owner-calendar-jump]")?.addEventListener("change", (event) => {
      if (!event.target.value) return;
      state.calendar.anchorDate = localDate(event.target.value);
      clearOwnerRenderSignatures("calendar");
      loadCalendarReservations();
    });
    document.addEventListener("click", (event) => {
      const clearButton = event.target.closest("[data-owner-reservations-clear]");
      if (!clearButton) return;
      event.preventDefault();
      clearReservationWorkspace();
    });

    document.querySelectorAll("[data-owner-reservation-filter]").forEach((control) => {
      control.addEventListener("change", () => {
        state.reservationFilters[control.dataset.ownerReservationFilter] = control.value;
        if (control.dataset.ownerReservationFilter === "status" && control.value) {
          state.reservationWorkspace.view =
            control.value === "pending" || control.value === "no_show" ? control.value : "all";
        }
        if (control.dataset.ownerReservationFilter === "date" && control.value) {
          state.reservationWorkspace.view = "all";
          state.reservationFilters.view = "";
        }
        syncReservationWorkspaceControls();
        debounceReservationLoad();
      });
    });

    $("[data-owner-reservation-search]")?.addEventListener("input", (event) => {
      state.reservationWorkspace.search = event.target.value;
      lastReservationRenderSignature = "";
      renderReservations();
    });

    $("[data-owner-reservation-date-end]")?.addEventListener("change", (event) => {
      state.reservationWorkspace.dateEnd = event.target.value;
      lastReservationRenderSignature = "";
      loadReservations();
    });

    $("[data-owner-reservation-party-size]")?.addEventListener("change", (event) => {
      state.reservationWorkspace.partySize = event.target.value;
      lastReservationRenderSignature = "";
      renderReservations();
    });

    $("[data-owner-reservation-occasion]")?.addEventListener("change", (event) => {
      state.reservationWorkspace.occasion = event.target.value;
      lastReservationRenderSignature = "";
      renderReservations();
    });

    $("[data-reservation-mobile-view]")?.addEventListener("change", (event) => {
      setReservationWorkspaceView(event.target.value);
    });

    $("[data-reservation-filter-toggle]")?.addEventListener("click", () => {
      $("[data-reservation-filter-sheet]")?.classList.add("is-open");
      document.body.classList.add("reservation-filter-sheet-open");
    });

    $("[data-reservation-filter-close]")?.addEventListener("click", () => {
      $("[data-reservation-filter-sheet]")?.classList.remove("is-open");
      document.body.classList.remove("reservation-filter-sheet-open");
    });

    document.addEventListener("click", (event) => {
      const sheet = $("[data-reservation-filter-sheet]");
      if (!sheet?.classList.contains("is-open")) return;
      if (event.target.closest("[data-reservation-filter-sheet]")) return;
      if (event.target.closest("[data-reservation-filter-toggle]")) return;
      sheet.classList.remove("is-open");
      document.body.classList.remove("reservation-filter-sheet-open");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      $("[data-reservation-filter-sheet]")?.classList.remove("is-open");
      document.body.classList.remove("reservation-filter-sheet-open");
    });

    document.querySelectorAll("[data-reservation-summary-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.reservationSummaryFilter;
        if (filter === "pending") {
          setReservationWorkspaceView("pending");
          return;
        }
        if (filter === "confirmed_today") {
          setReservationWorkspaceView("today", { load: false });
          state.reservationFilters.status = "confirmed";
          syncReservationWorkspaceControls();
          loadReservations();
          return;
        }
        if (filter === "today") {
          setReservationWorkspaceView("today");
          return;
        }
        if (filter === "cancelled_today") {
          setReservationWorkspaceView("today", { load: false });
          state.reservationFilters.status = "cancelled";
          syncReservationWorkspaceControls();
          loadReservations();
          return;
        }
        if (filter === "no_show_today") {
          setReservationWorkspaceView("today", { load: false });
          state.reservationFilters.status = "no_show";
          syncReservationWorkspaceControls();
          loadReservations();
        }
      });
    });

    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-reservation-workspace-view]");
      if (!viewButton) return;
      event.preventDefault();
      setReservationWorkspaceView(viewButton.dataset.reservationWorkspaceView);
    });

    document.querySelectorAll("[data-owner-reservation-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.reservationView = button.dataset.ownerReservationTab;
        document.querySelectorAll("[data-owner-reservation-tab]").forEach((tab) => {
          tab.classList.toggle("active", tab === button);
        });
        document.querySelectorAll("[data-owner-reservation-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.ownerReservationPanel !== state.reservationView;
        });
        if (state.reservationView === "calendar" && !state.calendar.reservations.length) {
          loadCalendarReservations();
        }
        if (state.reservationView === "analytics" && !state.analytics.data) {
          loadAnalytics();
        }
      });
    });

    document.querySelectorAll("[data-owner-calendar-view]").forEach((button) => {
      button.addEventListener("click", () => {
        state.calendar.view = button.dataset.ownerCalendarView;
        if (state.calendar.view === "day") state.calendar.anchorDate = new Date();
        clearOwnerRenderSignatures("calendar");
        loadCalendarReservations();
      });
    });

    document.querySelectorAll("[data-owner-calendar-filter]").forEach((control) => {
      control.addEventListener("change", () => {
        state.calendar.filters[control.dataset.ownerCalendarFilter] = control.value;
        clearOwnerRenderSignatures("calendar");
        loadCalendarReservations();
      });
    });

    document.querySelectorAll("[data-owner-analytics-range]").forEach((button) => {
      button.addEventListener("click", () => {
        state.analytics.range = button.dataset.ownerAnalyticsRange;
        clearOwnerRenderSignatures("analytics-overview", "analytics-rates", "analytics-charts");
        renderAnalytics();
        if (state.analytics.range !== "custom") loadAnalytics();
      });
    });

    $("[data-owner-analytics-apply]")?.addEventListener("click", loadAnalytics);

    document.querySelectorAll("[data-owner-analytics-filter]").forEach((control) => {
      control.addEventListener("change", () => {
        state.analytics.filters[control.dataset.ownerAnalyticsFilter] = control.value;
        clearOwnerRenderSignatures("analytics-overview", "analytics-rates", "analytics-charts");
        loadAnalytics();
      });
    });

    document.addEventListener("change", (event) => {
      const closed = event.target.closest("[data-hours-closed]");
      if (!closed) return;
      const day = closed.dataset.hoursClosed;
      const open = $(`[data-hours-open="${day}"]`);
      const close = $(`[data-hours-close="${day}"]`);
      [open, close].forEach((input) => {
        if (!input) return;
        input.disabled = closed.checked;
        if (closed.checked) input.value = "";
      });
    });

    document.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-owner-image-delete]");
      if (deleteButton) {
        deleteImage(deleteButton.dataset.ownerImageDelete);
        return;
      }
      const coverButton = event.target.closest("[data-owner-image-cover]");
      if (coverButton) {
        setCoverImage(coverButton.dataset.ownerImageCover);
        return;
      }
      const up = event.target.closest("[data-owner-image-up]");
      if (up) {
        reorderImage(up.dataset.ownerImageUp, -1);
        return;
      }
      const down = event.target.closest("[data-owner-image-down]");
      if (down) {
        reorderImage(down.dataset.ownerImageDown, 1);
        return;
      }
      const uploadTrigger = event.target.closest("[data-owner-image-upload-trigger]");
      if (uploadTrigger) {
        $("[data-owner-image-input]")?.click();
        return;
      }
      const reservationView = event.target.closest("[data-owner-reservation-view]");
      if (reservationView) {
        const reservation = state.reservations.find(
          (item) => String(item.id) === String(reservationView.dataset.ownerReservationView),
        );
        renderReservationDetail(reservation);
        return;
      }
      const calendarReservation = event.target.closest("[data-owner-calendar-reservation]");
      if (calendarReservation) {
        const reservation = state.calendar.reservations.find(
          (item) =>
            String(item.id) === String(calendarReservation.dataset.ownerCalendarReservation),
        );
        renderReservationDetail(reservation);
        return;
      }
      const reservationButton = event.target.closest("[data-owner-reservation-action]");
      if (reservationButton) {
        openReservationActionModal(
          reservationButton.dataset.ownerReservationId,
          reservationButton.dataset.ownerReservationAction,
        );
        return;
      }
      const blackoutDelete = event.target.closest("[data-blackout-delete]");
      if (blackoutDelete) {
        deleteBlackoutDate(blackoutDelete.dataset.blackoutDelete);
        return;
      }
      const specialEdit = event.target.closest("[data-special-edit]");
      if (specialEdit) {
        editSpecialHours(specialEdit.dataset.specialEdit);
        return;
      }
      const specialDelete = event.target.closest("[data-special-delete]");
      if (specialDelete) {
        deleteSpecialHours(specialDelete.dataset.specialDelete);
      }
    });

    document.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-owner-gallery-card]");
      if (!card) return;
      draggedOwnerImageId = card.dataset.ownerGalleryCard;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedOwnerImageId);
    });
    document.addEventListener("dragover", (event) => {
      const card = event.target.closest("[data-owner-gallery-card]");
      if (!card || !draggedOwnerImageId) return;
      event.preventDefault();
      card.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "move";
    });
    document.addEventListener("dragleave", (event) => {
      const card = event.target.closest("[data-owner-gallery-card]");
      if (card) card.classList.remove("is-drop-target");
    });
    document.addEventListener("drop", (event) => {
      const card = event.target.closest("[data-owner-gallery-card]");
      if (!card || !draggedOwnerImageId) return;
      event.preventDefault();
      const targetId = card.dataset.ownerGalleryCard;
      document
        .querySelectorAll("[data-owner-gallery-card]")
        .forEach((item) => item.classList.remove("is-drop-target", "is-dragging"));
      moveImageBefore(draggedOwnerImageId, targetId);
      draggedOwnerImageId = null;
    });
    document.addEventListener("dragend", () => {
      draggedOwnerImageId = null;
      document
        .querySelectorAll("[data-owner-gallery-card]")
        .forEach((item) => item.classList.remove("is-drop-target", "is-dragging"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    hydrateTimeSelects();
    bindEvents();
    loadData();
  });

  document.addEventListener("tiketa:language-changed", () => {
    renderSignatures.clear();
    lastReservationRenderSignature = "";
    hydrateTimeSelects();
    renderSummary();
    fillForm();
    renderVenueFilter();
    renderReservations();
    renderCalendar();
    renderAnalytics();
    renderAvailabilityExceptions();
  });
})();
