(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const imageUrl = (image) => image?.url || image?.image_path || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const calendarStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  const ownerCancellationReasons = ['Fully booked', 'Private event', 'Kitchen closed', 'Staff shortage', 'Maintenance'];
  const locationPickerZoom = 15;
  const defaultLocation = { lat: 40.7128, lng: -74.0060 };
  let ownerGoogleMap = null;
  let ownerGoogleMarker = null;
  let ownerGoogleGeocoder = null;
  let ownerSearchBox = null;
  let ownerMapsLoading = null;
  let syncingOwnerMap = false;
  let draggedOwnerImageId = null;

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
    reservationFilters: { view: '', status: '', date: '', venue_id: '' },
    reservationView: 'list',
    calendar: {
      view: 'week',
      anchorDate: new Date(),
      reservations: [],
      filters: { status: '', venue_id: '' },
      todaySummary: { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
      loading: false,
    },
    analytics: {
      range: '30',
      filters: { venue_id: '' },
      data: null,
      loading: false,
    },
    pendingReservationAction: null,
    saving: false,
  };

  function setBusy(busy) {
    state.saving = busy;
    const save = $('[data-owner-save]');
    if (save) {
      save.disabled = busy;
      save.innerHTML = busy ? '<span class="spinner-border spinner-border-sm me-1"></span>Saving...' : '<i class="bi bi-check2-circle me-1"></i>Save profile';
    }
  }

  function friendlyError(err) {
    if (err?.status === 422) return validationMessages(err).join(' ');
    if (err?.status === 403) return 'Your organizer account cannot manage this restaurant or bar.';
    return err?.message || 'Something went wrong. Please try again.';
  }

  function validationMessages(err) {
    const errors = err?.payload?.errors;
    if (!errors || typeof errors !== 'object') {
      return [err?.originalMessage || err?.message || 'Please check your restaurant or bar details and try again.'];
    }

    return Object.values(errors).flat().filter(Boolean).map(String);
  }

  function showOwnerAlert(messages = [], type = 'danger') {
    const root = $('[data-owner-alert]');
    if (!root) return;
    const list = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
    root.innerHTML = list.length ? `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${list.length === 1 ? esc(list[0]) : `<ul class="mb-0">${list.map((message) => `<li>${esc(message)}</li>`).join('')}</ul>`}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    ` : '';
  }

  function normalizeTime(value) {
    const text = String(value ?? '').trim();
    return /^\d{2}:\d{2}:\d{2}$/.test(text) ? text.slice(0, 5) : text;
  }

  function timeOptions() {
    const options = ['<option value="">Select time</option>'];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push(`<option value="${value}">${value}</option>`);
      }
    }
    return options.join('');
  }

  function timeSelect(attrs, value, disabled = false) {
    const normalized = normalizeTime(value || '');
    return `<select class="form-select form-select-sm owner-time-select" ${attrs} ${disabled ? 'disabled' : ''}>${timeOptions()}</select>`
      .replace(`value="${normalized}"`, `value="${normalized}" selected`);
  }

  function hydrateTimeSelects() {
    document.querySelectorAll('[data-owner-time-select]').forEach((select) => {
      if (!select.options.length) select.innerHTML = timeOptions();
    });
    document.querySelectorAll('[data-special-open], [data-special-close]').forEach((select) => {
      if (!select.options.length) select.innerHTML = timeOptions();
    });
  }

  function statusBadge(status) {
    const map = {
      pending: 'reservation-status-pending',
      confirmed: 'reservation-status-confirmed',
      completed: 'reservation-status-completed',
      cancelled: 'reservation-status-cancelled',
      no_show: 'reservation-status-no_show',
    };
    return `<span class="reservation-status ${map[status] || ''}">${esc(statusLabel(status || 'pending'))}</span>`;
  }

  function dateLabel(value) {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeLabel(value) {
    return String(value || '').slice(0, 5);
  }

  function statusLabel(value) {
    return String(value || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function occasionLabel(value) {
    const labels = {
      Birthday: 'Birthday 🎂',
      Anniversary: 'Anniversary 🥂',
      'Date Night': 'Date Night',
      'Business Meeting': 'Business Meeting',
      'Family Gathering': 'Family Gathering',
      Celebration: 'Celebration',
      'Friends Night Out': 'Friends Night Out',
      Other: 'Other',
    };
    return labels[value] || value || 'Not provided';
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function chartTheme() {
    return {
      text: cssVar('--muted') || '#94a3b8',
      grid: cssVar('--border') || 'rgba(148,163,184,.16)',
      primary: cssVar('--primary') || '#5b8cff',
      gold: cssVar('--gold') || '#d4a75a',
    };
  }

  function dateTimeLabel(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function googleMapEmbedUrl(lat, lng, zoom = locationPickerZoom) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=${zoom}&output=embed`;
  }

  function googleMapsUrl(lat, lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  function validCoordinate(lat, lng) {
    return Number.isFinite(lat)
      && Number.isFinite(lng)
      && lat >= -90
      && lat <= 90
      && lng >= -180
      && lng <= 180;
  }

  function formCoordinates() {
    const form = $('[data-owner-venue-form]');
    const lat = Number(form?.elements.latitude?.value);
    const lng = Number(form?.elements.longitude?.value);

    return validCoordinate(lat, lng) ? { lat, lng } : null;
  }

  function formatCoordinate(value) {
    return Number(value).toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
  }

  function locationSearchText() {
    const form = $('[data-owner-venue-form]');
    if (!form) return '';

    return [
      form.elements.address?.value,
      form.elements.city?.value,
      form.elements.country?.value,
    ].filter(Boolean).join(', ');
  }

  function googleMapsApiKey() {
    return String(
      window.EventSphereConfig?.GOOGLE_MAPS_API_KEY
      || window.__EVENT_SPHERE_GOOGLE_MAPS_API_KEY__
      || document.querySelector('meta[name="google-maps-api-key"]')?.content
      || '',
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

      const script = document.createElement('script');
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
    const form = $('[data-owner-venue-form]');
    return locationSearchText() || form?.elements.address?.value || '';
  }

  function updateSelectedLocationDetails(coordinates) {
    const address = $('[data-owner-location-selected-address]');
    const latitude = $('[data-owner-location-selected-latitude]');
    const longitude = $('[data-owner-location-selected-longitude]');

    if (address) address.textContent = coordinates ? (selectedAddressText() || 'Selected pin') : 'Not selected';
    if (latitude) latitude.textContent = coordinates ? formatCoordinate(coordinates.lat) : '-';
    if (longitude) longitude.textContent = coordinates ? formatCoordinate(coordinates.lng) : '-';
  }

  function setLocationFields(lat, lng, address = null) {
    if (!validCoordinate(lat, lng)) return;
    const form = $('[data-owner-venue-form]');
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
      if (status !== 'OK' || !results?.[0]) return;
      const form = $('[data-owner-venue-form]');
      const address = results[0].formatted_address || '';
      if (form?.elements.address && address) {
        form.elements.address.value = address;
        const search = $('[data-owner-location-search]');
        if (search) search.value = address;
      }
      updateSelectedLocationDetails(formCoordinates());
    });
  }

  function geocodeOwnerQuery(query) {
    if (!ownerGoogleGeocoder) return Promise.resolve(null);

    return new Promise((resolve) => {
      ownerGoogleGeocoder.geocode({ address: query }, (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
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
    const scale = 256 * (2 ** zoom);
    const sinLat = Math.sin((lat * Math.PI) / 180);

    return {
      x: ((lng + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
  }

  function webMercatorLatLng(x, y, zoom) {
    const scale = 256 * (2 ** zoom);
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
      center.x + (event.clientX - rect.left) - (rect.width / 2),
      center.y + (event.clientY - rect.top) - (rect.height / 2),
      locationPickerZoom,
    );
  }

  function updateOwnerLocationMap() {
    const coordinates = formCoordinates();
    const preview = coordinates || defaultLocation;
    const mapRoot = $('[data-owner-location-map]');
    const frame = $('[data-owner-location-frame]');
    const status = $('[data-owner-location-status]');
    const open = $('[data-owner-location-open]');
    const search = $('[data-owner-location-search]');

    if (frame) frame.src = googleMapEmbedUrl(preview.lat, preview.lng);
    if (ownerGoogleMap && !syncingOwnerMap) {
      syncingOwnerMap = true;
      syncOwnerMarker(preview.lat, preview.lng, Boolean(coordinates));
      syncingOwnerMap = false;
    }
    if (mapRoot) mapRoot.classList.toggle('has-location', Boolean(coordinates));
    if (status) {
      status.textContent = coordinates
        ? 'Location pin is ready. Drag the marker or click the map to refine it.'
        : 'Search an address, click the map, or drag the marker to set the exact pin.';
    }
    if (open) {
      open.hidden = !coordinates;
      if (coordinates) open.href = googleMapsUrl(coordinates.lat, coordinates.lng);
    }
    if (search && !search.value) search.value = locationSearchText();
    updateSelectedLocationDetails(coordinates);
  }

  async function initOwnerGoogleMap() {
    const canvas = $('[data-owner-location-canvas]');
    const mapRoot = $('[data-owner-location-map]');
    if (!canvas || ownerGoogleMap) return;

    const loaded = await loadGoogleMaps();
    if (!loaded || !window.google?.maps) {
      updateOwnerLocationMap();
      return;
    }

    const coordinates = formCoordinates();
    const center = coordinates || defaultLocation;
    canvas.hidden = false;
    mapRoot?.classList.add('has-google-map');

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
      title: 'Selected restaurant or bar location',
    });

    ownerGoogleMap.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      moveOwnerMarker(lat, lng, { animate: true });
    });
    ownerGoogleMarker.addListener('dragend', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      moveOwnerMarker(lat, lng, { animate: false });
    });

    const search = $('[data-owner-location-search]');
    if (search && window.google.maps.places?.SearchBox) {
      ownerSearchBox = new window.google.maps.places.SearchBox(search);
      ownerGoogleMap.addListener('bounds_changed', () => {
        ownerSearchBox.setBounds(ownerGoogleMap.getBounds());
      });
      ownerSearchBox.addListener('places_changed', () => {
        const place = ownerSearchBox.getPlaces()?.[0];
        const location = place?.geometry?.location;
        if (!location) {
          window.tkToast?.('No matching address found. Try a more specific search.', 'error');
          return;
        }
        moveOwnerMarker(location.lat(), location.lng(), {
          address: place.formatted_address || place.name || search.value,
          animate: true,
          reverseGeocode: false,
        });
        ownerGoogleMap.setZoom(16);
        window.tkToast?.('Map location updated.', 'success');
      });
    }

    updateOwnerLocationMap();
  }

  async function searchOwnerLocation() {
    const button = $('[data-owner-location-search-button]');
    const search = $('[data-owner-location-search]');
    const query = String(search?.value || locationSearchText()).trim();

    if (!query) {
      window.tkToast?.('Enter an address to search.', 'error');
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
        window.tkToast?.('Map location updated.', 'success');
        return;
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
      });
      const results = await response.json();
      const result = Array.isArray(results) ? results[0] : null;

      if (!result) {
        window.tkToast?.('No matching address found. Try a more specific search.', 'error');
        return;
      }

      moveOwnerMarker(Number(result.lat), Number(result.lon), {
        address: result.display_name || query,
        animate: true,
        reverseGeocode: false,
      });
      window.tkToast?.('Map location updated.', 'success');
    } catch (err) {
      window.tkToast?.('Unable to search this address right now.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalLabel || '<i class="bi bi-search me-1"></i>Search Address';
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
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    if (state.calendar.view === 'day') {
      return { start: anchor, end: anchor };
    }
    if (state.calendar.view === 'month') {
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
    if (state.calendar.view === 'day') {
      return start.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (state.calendar.view === 'month') {
      return localDate(state.calendar.anchorDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  function analyticsPeriod() {
    const end = localDate(new Date());
    let start = addDays(end, -29);

    if (state.analytics.range === '7') start = addDays(end, -6);
    if (state.analytics.range === '90') start = addDays(end, -89);
    if (state.analytics.range === 'year') {
      start = localDate(end);
      start.setMonth(0, 1);
    }
    if (state.analytics.range === 'custom') {
      const customStart = $('[data-owner-analytics-start]')?.value;
      const customEnd = $('[data-owner-analytics-end]')?.value;
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
    root.innerHTML = items.map((item) => {
      const id = `${name}-${item.id}`;
      const checked = selected.has(Number(item.id)) ? ' checked' : '';
      return `
        <label class="owner-check" for="${id}">
          <input class="form-check-input" id="${id}" type="checkbox" name="${name}" value="${item.id}"${checked}>
          <span>${esc(item.name)}</span>
        </label>
      `;
    }).join('') || '<div class="small text-muted-pro">No options available.</div>';
  }

  function renderHours(openingHours = []) {
    const root = $('[data-owner-hours]');
    if (!root) return;
    const byDay = new Map(openingHours.map((item) => [Number(item.day_of_week), item]));
    root.innerHTML = days.map((day, index) => {
      const item = byDay.get(index) || {};
      const closed = Boolean(item.is_closed);
      return `
        <div class="col-lg-6">
          <div class="facility owner-hours-row">
            <div class="owner-hours-day"><i class="bi bi-clock"></i><span>${day}</span></div>
            ${timeSelect(`data-hours-open="${index}" aria-label="${esc(day)} opens at"`, item.opens_at, closed)}
            ${timeSelect(`data-hours-close="${index}" aria-label="${esc(day)} closes at"`, item.closes_at, closed)}
            <label class="form-check owner-hours-closed">
              <input class="form-check-input" type="checkbox" data-hours-closed="${index}" ${closed ? 'checked' : ''}>
              <span>Closed</span>
            </label>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAvailabilityExceptions() {
    $('[data-owner-availability-section]')?.toggleAttribute('hidden', !state.venue);
    renderBlackoutDates();
    renderSpecialHours();
  }

  function renderBlackoutDates() {
    const root = $('[data-blackout-list]');
    if (!root) return;
    root.innerHTML = state.blackoutDates.length ? state.blackoutDates.map((item) => `
      <div class="availability-item">
        <div>
          <strong>${esc(dateLabel(item.date))}</strong>
          <span>${esc(item.reason || 'Closed')}</span>
        </div>
        <button class="btn btn-glass btn-sm" type="button" data-blackout-delete="${item.id}" aria-label="Remove blackout date">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `).join('') : '<div class="availability-empty">No blackout dates added.</div>';
  }

  function renderSpecialHours() {
    const root = $('[data-special-list]');
    if (!root) return;
    root.innerHTML = state.specialHours.length ? state.specialHours.map((item) => `
      <div class="availability-item">
        <div>
          <strong>${esc(dateLabel(item.date))}</strong>
          <span>${item.is_closed ? 'Closed' : `${esc(timeLabel(item.opens_at))} - ${esc(timeLabel(item.closes_at))}`}</span>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-glass" type="button" data-special-edit="${item.id}" aria-label="Edit special hours">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-glass" type="button" data-special-delete="${item.id}" aria-label="Delete special hours">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('') : '<div class="availability-empty">No special hours added.</div>';
  }

  function clearSpecialForm() {
    state.editingSpecialHourId = null;
    const date = $('[data-special-date]');
    const open = $('[data-special-open]');
    const close = $('[data-special-close]');
    const closed = $('[data-special-closed]');
    if (date) date.value = '';
    if (open) open.value = '';
    if (close) close.value = '';
    if (closed) closed.checked = false;
    syncSpecialClosedState();
  }

  function syncSpecialClosedState() {
    const closed = $('[data-special-closed]')?.checked || false;
    [$('[data-special-open]'), $('[data-special-close]')].forEach((select) => {
      if (!select) return;
      select.disabled = closed;
      if (closed) select.value = '';
    });
  }

  function renderGallery() {
    const root = $('[data-owner-gallery]');
    if (!root) return;
    const images = [...(state.venue?.images || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    root.innerHTML = images.length ? images.map((image, index) => `
      <div class="col-md-6 col-xl-4">
        <div class="owner-gallery-card ${index === 0 ? 'is-cover' : ''}" draggable="true" data-owner-gallery-card="${image.id}">
          <div class="owner-gallery-image">
            <img src="${esc(imageUrl(image))}" alt="${esc(state.venue?.name || 'Restaurant or bar')} gallery photo ${index + 1}" />
            <span class="owner-gallery-cover-badge"><i class="bi bi-star-fill"></i> Cover</span>
            <span class="owner-gallery-drag-hint"><i class="bi bi-grip-vertical"></i> Drag</span>
          </div>
          <div class="owner-gallery-card-body">
            <div>
              <strong>${index === 0 ? 'Cover Photo' : `Gallery Photo ${index + 1}`}</strong>
              <small class="text-muted-pro">Drag to reorder</small>
            </div>
            <div class="owner-gallery-actions">
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-cover="${image.id}" ${index === 0 ? 'disabled' : ''} aria-label="Set as cover photo"><i class="bi bi-star"></i></button>
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-up="${image.id}" ${index === 0 ? 'disabled' : ''} aria-label="Move image left"><i class="bi bi-arrow-left"></i></button>
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-down="${image.id}" ${index === images.length - 1 ? 'disabled' : ''} aria-label="Move image right"><i class="bi bi-arrow-right"></i></button>
              <button class="btn btn-glass btn-sm" type="button" data-owner-image-delete="${image.id}" aria-label="Delete image"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('') : '<div class="col-12"><div class="owner-gallery-empty">No uploaded images yet. Add a cover photo and a few ambience shots to make the public page feel alive.</div></div>';
  }

  function hasOpeningHours(venue) {
    return Boolean((venue?.opening_hours || []).some((item) => (
      !item.is_closed && normalizeTime(item.opens_at) && normalizeTime(item.closes_at)
    )));
  }

  function hasSocialLinks(venue) {
    const links = venue?.social_links || {};
    return Boolean(venue?.website || links.facebook_url || links.instagram_url || links.tiktok_url);
  }

  function profileCompletionItems(venue) {
    const images = venue?.images || [];
    return [
      { label: 'Venue Name', missing: 'Add Name', complete: Boolean(String(venue?.name || '').trim()) },
      { label: 'Description', missing: 'Add Description', complete: Boolean(String(venue?.description || '').trim()) },
      { label: 'Cover Image', missing: 'Add Cover Image', complete: Boolean(venue?.logo_image || images.length) },
      { label: 'Gallery Images', missing: 'Add Gallery Images', complete: images.length > 1 },
      { label: 'Phone', missing: 'Add Phone', complete: Boolean(String(venue?.phone || '').trim()) },
      { label: 'Address', missing: 'Add Address', complete: Boolean(String(venue?.address || '').trim()) },
      { label: 'Opening Hours', missing: 'Add Opening Hours', complete: hasOpeningHours(venue) },
      { label: 'Facilities', missing: 'Add Facilities', complete: Boolean(venue?.facilities?.length) },
      { label: 'Cuisine Types', missing: 'Add Cuisine Types', complete: Boolean(venue?.cuisine_types?.length) },
      { label: 'Social Links', missing: 'Add Instagram', complete: hasSocialLinks(venue) },
    ];
  }

  function renderProfileCompletion() {
    const root = $('[data-owner-completion]');
    if (!root) return;
    const venue = state.venue;
    root.hidden = !venue;
    if (!venue) return;

    const items = profileCompletionItems(venue);
    const complete = items.filter((item) => item.complete).length;
    const percent = Math.round((complete / items.length) * 100);
    const missing = items.filter((item) => !item.complete);

    $('[data-owner-completion-percent]').textContent = `${percent}%`;
    const bar = $('[data-owner-completion-bar]');
    if (bar) bar.style.width = `${percent}%`;

    const missingRoot = $('[data-owner-completion-missing]');
    if (missingRoot) {
      missingRoot.innerHTML = missing.length
        ? missing.map((item) => `<span><i class="bi bi-plus-circle"></i>${esc(item.missing)}</span>`).join('')
        : '<span class="complete"><i class="bi bi-patch-check"></i>Profile looks complete</span>';
    }
  }

  function fillForm() {
    const form = $('[data-owner-venue-form]');
    if (!form) return;
    hydrateTimeSelects();
    const venue = state.venue;
    form.reset();
    form.elements.venue_slug.value = venue?.slug || '';
    form.elements.name.value = venue?.name || '';
    form.elements.venue_type.value = venue?.venue_type || '';
    form.elements.status.value = venue?.status || 'active';
    form.elements.phone.value = venue?.phone || '';
    form.elements.email.value = venue?.email || '';
    form.elements.description.value = venue?.description || '';
    form.elements.website.value = venue?.website || '';
    form.elements.address.value = venue?.address || '';
    form.elements.city.value = venue?.city || '';
    form.elements.country.value = venue?.country || '';
    form.elements.latitude.value = venue?.latitude || '';
    form.elements.longitude.value = venue?.longitude || '';
    form.elements.min_guests.value = venue?.reservation_settings?.min_guests || 1;
    form.elements.max_guests.value = venue?.reservation_settings?.max_guests || 10;
    form.elements.max_reservations_per_slot.value = venue?.reservation_settings?.max_reservations_per_slot || 10;
    form.elements.booking_horizon_days.value = venue?.reservation_settings?.booking_horizon_days || 30;
    form.elements.reservation_interval_minutes.value = venue?.reservation_settings?.reservation_interval_minutes || 30;
    form.elements.last_reservation_time.value = normalizeTime(venue?.reservation_settings?.last_reservation_time || '');
    form.elements.facebook_url.value = venue?.social_links?.facebook_url || '';
    form.elements.instagram_url.value = venue?.social_links?.instagram_url || '';
    form.elements.tiktok_url.value = venue?.social_links?.tiktok_url || '';

    renderChecks('[data-owner-facilities]', state.facilities, selectedIds(venue?.facilities), 'facility_ids');
    renderChecks('[data-owner-cuisines]', state.cuisines, selectedIds(venue?.cuisine_types), 'cuisine_type_ids');
    renderChecks('[data-owner-payments]', state.payments, selectedIds(venue?.payment_options), 'payment_option_ids');
    renderHours(venue?.opening_hours || []);
    renderGallery();
    renderAvailabilityExceptions();
    updateOwnerLocationMap();
    initOwnerGoogleMap();
  }

  function renderSummary() {
    const hasVenue = Boolean(state.venue);
    $('[data-owner-empty]')?.toggleAttribute('hidden', hasVenue);
    $('[data-owner-summary]')?.toggleAttribute('hidden', !hasVenue);
    $('[data-owner-delete-section]')?.toggleAttribute('hidden', !hasVenue);
    $('[data-owner-availability-section]')?.toggleAttribute('hidden', !hasVenue);
    renderProfileCompletion();

    if (!hasVenue) return;
    const venue = state.venue;
    const cover = venue.images?.[0];
    const status = venue.status || 'draft';
    $('[data-owner-cover]').src = imageUrl(cover);
    $('[data-owner-title]').textContent = venue.name || 'Restaurant / Bar profile';
    $('[data-owner-type]').textContent = (venue.venue_type || 'restaurant / bar').replace(/^\w/, (letter) => letter.toUpperCase());
    const statusBadge = $('[data-owner-status]');
    if (statusBadge) {
      statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusBadge.className = `chip-available owner-status-${status}`;
    }
    $('[data-owner-location]').textContent = [venue.city, venue.country].filter(Boolean).join(', ') || 'Location not set';
    $('[data-owner-image-count]').textContent = `${venue.images?.length || 0} images`;
    $('[data-owner-description]').textContent = venue.description || 'Complete your profile details below.';
    const publicLink = $('[data-owner-public-link]');
    if (publicLink) {
      publicLink.href = venue.slug ? `venue.html?venue=${encodeURIComponent(venue.slug)}` : '#';
      publicLink.toggleAttribute('aria-disabled', !venue.slug);
    }
    const publicNote = $('[data-owner-public-note]');
    if (publicNote) {
      publicNote.textContent = status === 'active'
        ? 'Opens the public restaurant or bar page.'
        : 'Public visibility depends on this profile being active.';
    }
  }

  function renderVenueFilter() {
    const select = $('[data-owner-reservation-filter="venue_id"]');
    if (select) {
      const current = select.value;
      select.innerHTML = '<option value="">All restaurants & bars</option>' + state.venues.map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`).join('');
      select.value = current;
    }
    const calendarSelect = $('[data-owner-calendar-filter="venue_id"]');
    if (calendarSelect) {
      const current = calendarSelect.value;
      calendarSelect.innerHTML = '<option value="">All restaurants & bars</option>' + state.venues.map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`).join('');
      calendarSelect.value = current;
    }
    const analyticsSelect = $('[data-owner-analytics-filter="venue_id"]');
    if (analyticsSelect) {
      const current = analyticsSelect.value;
      analyticsSelect.innerHTML = '<option value="">All restaurants & bars</option>' + state.venues.map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`).join('');
      analyticsSelect.value = current;
    }
  }

  function renderReservationStats() {
    const root = $('[data-owner-reservation-stats]');
    if (!root) return;
    const stats = state.reservationStats || {};
    root.innerHTML = [
      {
        label: 'Pending Reservations',
        value: stats.pending || 0,
        description: 'Requests waiting for your review',
        icon: 'bi-hourglass-split',
        tone: 'pending',
      },
      {
        label: 'Confirmed Reservations',
        value: stats.confirmed || 0,
        description: 'Approved upcoming bookings',
        icon: 'bi-patch-check',
        tone: 'confirmed',
      },
      {
        label: 'Cancelled Reservations',
        value: stats.cancelled || 0,
        description: 'Requests that were cancelled',
        icon: 'bi-x-circle',
        tone: 'cancelled',
      },
      {
        label: 'Today\'s Reservations',
        value: stats.today || 0,
        description: 'Guest arrivals scheduled today',
        icon: 'bi-calendar2-check',
        tone: 'today',
      },
    ].map((item) => `
      <div class="col-sm-6 col-xl-3">
        <div class="reservation-stat reservation-stat-${item.tone}">
          <div class="reservation-stat-icon"><i class="bi ${item.icon}"></i></div>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <small>${item.description}</small>
        </div>
      </div>
    `).join('');
  }

  function reservationActions(reservation) {
    const id = reservation.id;
    const status = reservation.status;
    const isConfirmed = status === 'confirmed';
    return `
      <div class="owner-reservation-actions">
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-view="${id}">
          <i class="bi bi-eye"></i><span>View Details</span>
        </button>
        <button class="btn btn-gold-outline btn-sm" type="button" data-owner-reservation-action="confirm" data-owner-reservation-id="${id}" ${status !== 'pending' ? 'disabled' : ''}>
          <i class="bi bi-check2-circle"></i><span>Confirm</span>
        </button>
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-action="complete" data-owner-reservation-id="${id}" ${!isConfirmed ? 'disabled' : ''}>
          <i class="bi bi-patch-check"></i><span>Mark Completed</span>
        </button>
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-action="no-show" data-owner-reservation-id="${id}" ${!isConfirmed ? 'disabled' : ''}>
          <i class="bi bi-person-x"></i><span>Mark No Show</span>
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-owner-reservation-action="cancel" data-owner-reservation-id="${id}" ${!['pending', 'confirmed'].includes(status) ? 'disabled' : ''}>
          <i class="bi bi-x-circle"></i><span>Cancel</span>
        </button>
      </div>
    `;
  }

  function renderReservations(loading = false) {
    const body = $('[data-owner-reservations-table]');
    if (!body) return;
    if (loading) {
      body.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="reservation-table-skeleton" aria-label="Loading reservations">
              ${Array.from({ length: 4 }, () => '<span></span>').join('')}
            </div>
          </td>
        </tr>
      `;
      renderReservationStats();
      return;
    }

    body.innerHTML = state.reservations.length ? state.reservations.map((reservation) => `
      <tr>
        <td data-label="Guest">
          <span class="owner-reservation-guest">${esc(reservation.guest_name)}</span>
        </td>
        <td data-label="Phone">${esc(reservation.phone || 'Not provided')}</td>
        <td data-label="Date">${esc(dateLabel(reservation.reservation_date))}</td>
        <td data-label="Time">${esc(timeLabel(reservation.reservation_time))}</td>
        <td data-label="Guests">${reservation.party_size}</td>
        <td data-label="Status">${statusBadge(reservation.status)}</td>
        <td data-label="Actions">${reservationActions(reservation)}</td>
      </tr>
    `).join('') : '<tr><td colspan="7"><div class="dashboard-empty owner-reservation-empty"><i class="bi bi-calendar-check"></i><strong>No reservations yet.</strong><span>Once guests start booking tables, reservations will appear here.</span></div></td></tr>';
    renderReservationStats();
  }

  function renderCalendarSummary() {
    const root = $('[data-owner-calendar-summary]');
    if (!root) return;
    const summary = state.calendar.todaySummary || {};
    root.innerHTML = [
      ['Today\'s Reservations', summary.total || 0],
      ['Pending Today', summary.pending || 0],
      ['Confirmed Today', summary.confirmed || 0],
      ['Cancelled Today', summary.cancelled || 0],
    ].map(([label, value]) => `<div><span>${esc(label)}</span><strong>${value}</strong></div>`).join('');
  }

  function reservationsForDate(dateValue) {
    return state.calendar.reservations
      .filter((reservation) => reservation.reservation_date === dateValue)
      .sort((a, b) => {
        const created = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        return created || Number(b.id || 0) - Number(a.id || 0);
      });
  }

  function calendarReservationCard(reservation) {
    const status = calendarStatuses.includes(reservation.status) ? reservation.status : 'pending';
    return `
      <button class="owner-calendar-item owner-calendar-item-${status}" type="button" data-owner-calendar-reservation="${reservation.id}">
        <strong>${esc(reservation.guest_name)}</strong>
        <span>${esc(timeLabel(reservation.reservation_time))}</span>
        <span>${reservation.party_size} ${Number(reservation.party_size) === 1 ? 'Guest' : 'Guests'}</span>
        <em>${esc(statusLabel(reservation.status))}</em>
      </button>
    `;
  }

  function renderCalendarDay(date, compact = false) {
    const value = toDateInputValue(date);
    const reservations = reservationsForDate(value);
    return `
      <section class="owner-calendar-day ${compact ? 'owner-calendar-day-compact' : ''}">
        <div class="owner-calendar-day-head">
          <span>${esc(shortDays[(date.getDay() + 6) % 7])}</span>
          <strong>${date.getDate()}</strong>
        </div>
        <div class="owner-calendar-day-items">
          ${reservations.length ? reservations.map(calendarReservationCard).join('') : '<div class="owner-calendar-empty">No reservations</div>'}
        </div>
      </section>
    `;
  }

  function renderCalendar(loading = false) {
    const root = $('[data-owner-calendar]');
    if (!root) return;
    renderCalendarSummary();
    const title = $('[data-owner-calendar-title]');
    if (title) title.textContent = calendarTitle();
    const jump = $('[data-owner-calendar-jump]');
    if (jump) jump.value = toDateInputValue(state.calendar.anchorDate);
    document.querySelectorAll('[data-owner-calendar-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.ownerCalendarView === state.calendar.view);
    });

    if (loading) {
      root.innerHTML = `
        <div class="owner-calendar-grid owner-calendar-grid-week" aria-label="Loading calendar">
          ${Array.from({ length: 7 }, () => `
            <section class="owner-calendar-day owner-calendar-day-loading">
              <div class="owner-calendar-day-head"><span></span><strong></strong></div>
              <div class="owner-calendar-day-items">
                <div class="reservation-skeleton-line"></div>
                <div class="reservation-skeleton-line short"></div>
              </div>
            </section>
          `).join('')}
        </div>
      `;
      return;
    }

    const { start, end } = calendarPeriod();
    if (state.calendar.view === 'day') {
      root.innerHTML = `<div class="owner-calendar-grid owner-calendar-grid-day">${renderCalendarDay(start)}</div>`;
      return;
    }

    const dates = [];
    for (let date = start; date <= end; date = addDays(date, 1)) {
      dates.push(localDate(date));
    }

    root.innerHTML = `
      <div class="owner-calendar-grid owner-calendar-grid-${state.calendar.view}">
        ${dates.map((date) => renderCalendarDay(date, state.calendar.view === 'month')).join('')}
      </div>
    `;
  }

  function metricCard(label, value, tone = 'today') {
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
    const overviewRoot = $('[data-owner-analytics-overview]');
    if (!overviewRoot) return;

    document.querySelectorAll('[data-owner-analytics-range]').forEach((button) => {
      button.classList.toggle('active', button.dataset.ownerAnalyticsRange === state.analytics.range);
    });
    const isCustom = state.analytics.range === 'custom';
    $('[data-owner-analytics-start]')?.toggleAttribute('hidden', !isCustom);
    $('[data-owner-analytics-end]')?.toggleAttribute('hidden', !isCustom);
    $('[data-owner-analytics-apply]')?.toggleAttribute('hidden', !isCustom);

    if (loading) {
      overviewRoot.innerHTML = Array.from({ length: 6 }, () => `
        <div class="col-md-6 col-xl-2">
          <div class="reservation-stat reservation-stat-loading">
            <div class="reservation-skeleton-line short"></div>
            <div class="reservation-skeleton-line"></div>
          </div>
        </div>
      `).join('');
      return;
    }

    const data = state.analytics.data;
    if (!data) {
      overviewRoot.innerHTML = '<div class="col-12"><div class="dashboard-empty"><i class="bi bi-graph-up"></i><span>No analytics loaded yet.</span></div></div>';
      renderAnalyticsCharts();
      return;
    }

    const overview = data.overview || {};
    overviewRoot.innerHTML = [
      metricCard('Total Reservations', overview.total, 'today'),
      metricCard('Pending Reservations', overview.pending, 'pending'),
      metricCard('Confirmed Reservations', overview.confirmed, 'confirmed'),
      metricCard('Completed Reservations', overview.completed, 'completed'),
      metricCard('Cancelled Reservations', overview.cancelled, 'cancelled'),
      metricCard('No Show Reservations', overview.no_show, 'no-show'),
    ].join('');

    renderMiniMetrics('[data-owner-analytics-today]', data.today || {}, [
      ['Reservations Today', 'reservations'],
      ['Completed Today', 'completed'],
      ['Cancelled Today', 'cancelled'],
      ['No Shows Today', 'no_show'],
    ]);
    renderMiniMetrics('[data-owner-analytics-month]', data.month || {}, [
      ['Reservations This Month', 'reservations'],
      ['Completed This Month', 'completed'],
      ['Cancelled This Month', 'cancelled'],
      ['No Shows This Month', 'no_show'],
    ]);

    const rates = data.rates || {};
    const ratesRoot = $('[data-owner-analytics-rates]');
    if (ratesRoot) {
      ratesRoot.innerHTML = [
        ['Completion Rate', rates.completion_rate],
        ['Cancellation Rate', rates.cancellation_rate],
        ['No Show Rate', rates.no_show_rate],
      ].map(([label, value]) => `
        <div class="col-md-4">
          <div class="owner-analytics-rate">
            <span>${esc(label)}</span>
            <strong>${Number(value || 0)}%</strong>
          </div>
        </div>
      `).join('');
    }

    renderRankList('[data-owner-analytics-top-days]', data.top_days || [], 'day');
    renderRankList('[data-owner-analytics-top-times]', data.top_time_slots || [], 'time');
    renderAnalyticsCharts();
  }

  function renderMiniMetrics(selector, values, items) {
    const root = $(selector);
    if (!root) return;
    root.innerHTML = items.map(([label, key]) => `
      <div>
        <span>${esc(label)}</span>
        <strong>${Number(values[key] || 0)}</strong>
      </div>
    `).join('');
  }

  function renderRankList(selector, items, key) {
    const root = $(selector);
    if (!root) return;
    root.innerHTML = items.length ? items.map((item, index) => `
      <div class="owner-analytics-rank">
        <span>${index + 1}</span>
        <strong>${esc(item[key] || '-')}</strong>
        <em>${Number(item.total || 0)} reservations</em>
      </div>
    `).join('') : '<div class="availability-empty">No reservation data yet.</div>';
  }

  function renderAnalyticsCharts() {
    const data = state.analytics.data;
    const trendCanvas = document.getElementById('ownerReservationTrendChart');
    const statusCanvas = document.getElementById('ownerReservationStatusChart');

    if (window._ownerReservationTrendChart) window._ownerReservationTrendChart.destroy();
    if (window._ownerReservationStatusChart) window._ownerReservationStatusChart.destroy();

    if (!data || typeof Chart === 'undefined') return;

    const theme = chartTheme();
    const trend = data.trend || [];
    const trendEmpty = $('[data-owner-analytics-trend-empty]');
    if (trendEmpty) trendEmpty.innerHTML = trend.some((item) => Number(item.total) > 0) ? '' : '<div class="availability-empty mt-3">No reservations in this range.</div>';
    if (trendCanvas) {
      window._ownerReservationTrendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: trend.map((item) => dateLabel(item.date)),
          datasets: [{
            label: 'Reservations',
            data: trend.map((item) => item.total),
            borderColor: theme.gold,
            backgroundColor: 'rgba(212, 167, 90, .18)',
            fill: true,
            tension: .35,
          }],
        },
        options: {
          plugins: { legend: { labels: { color: theme.text } } },
          scales: {
            x: { ticks: { color: theme.text, maxRotation: 0, autoSkip: true }, grid: { color: theme.grid } },
            y: { ticks: { color: theme.text, precision: 0 }, grid: { color: theme.grid }, beginAtZero: true },
          },
        },
      });
    }

    const breakdown = data.status_breakdown || [];
    const statusEmpty = $('[data-owner-analytics-status-empty]');
    if (statusEmpty) statusEmpty.innerHTML = breakdown.some((item) => Number(item.total) > 0) ? '' : '<div class="availability-empty mt-3">No statuses to chart yet.</div>';
    if (statusCanvas) {
      window._ownerReservationStatusChart = new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
          labels: breakdown.map((item) => statusLabel(item.status)),
          datasets: [{
            data: breakdown.map((item) => item.total),
            backgroundColor: ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#94a3b8'],
            borderColor: 'rgba(255,255,255,.08)',
          }],
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { color: theme.text } } },
          cutout: '62%',
        },
      });
    }
  }

  function renderReservationDetail(reservation) {
    $('[data-owner-reservation-title]').textContent = `Reservation #${reservation.id}`;
    const body = $('[data-owner-reservation-detail]');
    if (!body) return;
    body.innerHTML = `
      <div class="row g-3 owner-reservation-detail-grid">
        <div class="col-md-6"><div class="facility justify-content-between"><span>Guest</span><strong>${esc(reservation.guest_name)}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Status</span>${statusBadge(reservation.status)}</div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Phone</span><strong>${esc(reservation.phone || 'Not provided')}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Party Size</span><strong>${reservation.party_size}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Date</span><strong>${esc(dateLabel(reservation.reservation_date))}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Time</span><strong>${esc(timeLabel(reservation.reservation_time))}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Created At</span><strong>${esc(dateTimeLabel(reservation.created_at))}</strong></div></div>
        <div class="col-12"><div class="facility justify-content-between"><span>Restaurant / Bar</span><strong>${esc(reservation.venue?.name || '')}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Occasion</span><strong>${esc(occasionLabel(reservation.occasion))}</strong></div></div>
        <div class="col-12"><div class="facility"><span><span class="text-muted-pro d-block mb-1">Special Request</span>${esc(reservation.notes || 'No special request provided.')}</span></div></div>
        ${reservation.status === 'cancelled' ? `
          <div class="col-md-6"><div class="facility justify-content-between"><span>Cancelled At</span><strong>${esc(dateTimeLabel(reservation.cancelled_at))}</strong></div></div>
          <div class="col-12"><div class="facility"><span><span class="text-muted-pro d-block mb-1">Cancellation Reason</span>${esc(reservation.owner_cancellation_reason || reservation.cancellation_reason || 'No reason provided.')}</span></div></div>
        ` : ''}
      </div>
    `;
    bootstrap.Modal.getOrCreateInstance($('#ownerReservationModal')).show();
  }

  function collectIds(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => Number(input.value));
  }

  function collectHours() {
    return days.map((day, index) => {
      const closed = $(`[data-hours-closed="${index}"]`)?.checked || false;
      return {
        day_of_week: index,
        opens_at: closed ? null : (normalizeTime($(`[data-hours-open="${index}"]`)?.value) || null),
        closes_at: closed ? null : (normalizeTime($(`[data-hours-close="${index}"]`)?.value) || null),
        is_closed: closed,
      };
    });
  }

  function nullable(value) {
    const trimmed = String(value ?? '').trim();
    return trimmed || null;
  }

  function payloadFromForm() {
    const form = $('[data-owner-venue-form]');
    const fd = new FormData(form);
    return {
      name: nullable(fd.get('name')),
      description: nullable(fd.get('description')),
      venue_type: nullable(fd.get('venue_type')),
      phone: nullable(fd.get('phone')),
      email: nullable(fd.get('email')),
      website: nullable(fd.get('website')),
      address: nullable(fd.get('address')),
      city: nullable(fd.get('city')),
      country: nullable(fd.get('country')),
      latitude: nullable(fd.get('latitude')),
      longitude: nullable(fd.get('longitude')),
      status: fd.get('status') || 'active',
      min_guests: Number(fd.get('min_guests') || 1),
      max_guests: Number(fd.get('max_guests') || 10),
      max_reservations_per_slot: Number(fd.get('max_reservations_per_slot') || 10),
      booking_horizon_days: Number(fd.get('booking_horizon_days') || 30),
      reservation_interval_minutes: Number(fd.get('reservation_interval_minutes') || 30),
      last_reservation_time: nullable(normalizeTime(fd.get('last_reservation_time'))),
      facebook_url: nullable(fd.get('facebook_url')),
      instagram_url: nullable(fd.get('instagram_url')),
      tiktok_url: nullable(fd.get('tiktok_url')),
      facility_ids: collectIds('facility_ids'),
      cuisine_type_ids: collectIds('cuisine_type_ids'),
      payment_option_ids: collectIds('payment_option_ids'),
      opening_hours: collectHours(),
    };
  }

  async function saveVenue() {
    if (state.saving) return;
    const payload = payloadFromForm();
    if (!payload.name || !payload.venue_type || !payload.city) {
      showOwnerAlert('Please add a restaurant or bar name, type, and city.');
      window.tkToast?.('Please add a restaurant or bar name, type, and city.', 'error');
      return;
    }

    setBusy(true);
    try {
      showOwnerAlert([]);
      const method = state.venue ? 'PUT' : 'POST';
      const path = state.venue ? `/owner/venues/${state.venue.slug}` : '/owner/venues';
      const { data } = await api().fetch(path, { method, body: payload });
      state.venue = data;
      state.venues = state.venues.some((venue) => String(venue.id) === String(data.id))
        ? state.venues.map((venue) => String(venue.id) === String(data.id) ? data : venue)
        : [data, ...state.venues];
      renderSummary();
      fillForm();
      renderVenueFilter();
      await loadAvailabilityExceptions();
      window.tkToast?.(method === 'POST' ? 'Restaurant or bar created successfully.' : 'Restaurant or bar updated successfully.', 'success');
    } catch (err) {
      const messages = err?.status === 422 ? validationMessages(err) : [friendlyError(err)];
      showOwnerAlert(messages);
      window.tkToast?.(messages[0], 'error');
    } finally {
      setBusy(false);
    }
  }

  async function uploadImages(files) {
    if (!state.venue) {
      window.tkToast?.('Create the restaurant or bar before uploading images.', 'error');
      return;
    }
    const valid = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!valid.length) return;

    setBusy(true);
    try {
      renderUploadProgress(valid, 0, 'Preparing uploads...');
      for (const [index, file] of valid.entries()) {
        const data = await uploadVenueImage(file, (progress) => {
          renderUploadProgress(valid, index, `Uploading ${file.name}`, progress);
        });
        state.venue = data;
        state.venues = state.venues.map((venue) => String(venue.id) === String(data.id) ? data : venue);
      }
      renderSummary();
      fillForm();
      window.tkToast?.(valid.length === 1 ? 'Image uploaded successfully.' : 'Images uploaded successfully.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
      renderUploadProgress([], 0, '', 0);
      const input = $('[data-owner-image-input]');
      if (input) input.value = '';
    }
  }

  function renderUploadProgress(files, currentIndex, label, progress = 0) {
    const root = $('[data-owner-upload-progress]');
    if (!root) return;
    if (!files.length) {
      root.hidden = true;
      root.innerHTML = '';
      return;
    }

    const total = files.length;
    const completed = currentIndex;
    const currentProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    const overall = Math.round(((completed + (currentProgress / 100)) / total) * 100);

    root.hidden = false;
    root.innerHTML = `
      <div class="owner-upload-progress-head">
        <span>${esc(label || 'Uploading photos...')}</span>
        <strong>${overall}%</strong>
      </div>
      <div class="owner-upload-progress-bar" aria-hidden="true"><span style="width:${overall}%"></span></div>
      <small class="text-muted-pro">${completed + 1} of ${total} photos</small>
    `;
  }

  function uploadVenueImage(file, onProgress) {
    return new Promise((resolve, reject) => {
      const cfg = window.EventSphereConfig;
      const token = sessionStorage.getItem(cfg.TOKEN_KEY);
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('image', file);

      xhr.open('POST', `${cfg.API_BASE_URL.replace(/\/$/, '')}/owner/venues/${encodeURIComponent(state.venue.slug)}/images`);
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener('load', () => {
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
        const err = new Error(payload?.message || `Upload failed (${xhr.status})`);
        err.status = xhr.status;
        err.payload = payload;
        reject(err);
      });
      xhr.addEventListener('error', () => reject(new Error('Unable to upload this image right now.')));
      xhr.send(fd);
    });
  }

  async function deleteImage(imageId) {
    if (!state.venue) return;
    setBusy(true);
    try {
      await api().fetch(`/owner/venue-images/${imageId}`, { method: 'DELETE' });
      state.venue.images = (state.venue.images || []).filter((image) => String(image.id) !== String(imageId));
      state.venue.images = state.venue.images.map((image, index) => ({ ...image, sort_order: index }));
      renderSummary();
      fillForm();
      window.tkToast?.('Image deleted successfully.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function persistGalleryOrder(images, message = 'Gallery order updated.') {
    if (!state.venue?.slug || !images.length) return;
    const payload = images.map((image, order) => ({ id: image.id, sort_order: order }));

    setBusy(true);
    try {
      const { data } = await api().fetch(`/owner/venues/${state.venue.slug}/images/reorder`, { method: 'PUT', body: { images: payload } });
      state.venue = data;
      state.venues = state.venues.map((venue) => String(venue.id) === String(data.id) ? data : venue);
      renderSummary();
      fillForm();
      window.tkToast?.(message, 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function reorderImage(imageId, direction) {
    const images = [...(state.venue?.images || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const index = images.findIndex((image) => String(image.id) === String(imageId));
    const next = index + direction;
    if (index < 0 || next < 0 || next >= images.length) return;
    [images[index], images[next]] = [images[next], images[index]];
    await persistGalleryOrder(images);
  }

  async function setCoverImage(imageId) {
    const images = [...(state.venue?.images || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const image = images.find((item) => String(item.id) === String(imageId));
    if (!image) return;
    await persistGalleryOrder([image, ...images.filter((item) => String(item.id) !== String(imageId))], 'Cover photo updated.');
  }

  async function moveImageBefore(sourceId, targetId) {
    if (!sourceId || !targetId || String(sourceId) === String(targetId)) return;
    const images = [...(state.venue?.images || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
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
      await api().fetch(`/owner/venues/${state.venue.slug}`, { method: 'DELETE' });
      state.venue = null;
      state.venues = [];
      state.blackoutDates = [];
      state.specialHours = [];
      renderSummary();
      fillForm();
      renderAvailabilityExceptions();
      renderVenueFilter();
      bootstrap.Modal.getOrCreateInstance($('#ownerDeleteModal')).hide();
      window.tkToast?.('Restaurant or bar deleted successfully.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadData() {
    auth().requireAuth(['organizer']);
    try {
      const [venues, facilities, cuisines, payments] = await Promise.all([
        api().fetch('/owner/venues?per_page=100'),
        api().fetch('/venue-facilities'),
        api().fetch('/cuisine-types'),
        api().fetch('/payment-options'),
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
      if (state.reservationView === 'calendar') await loadCalendarReservations();
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  function reservationQuery() {
    const params = new URLSearchParams({ per_page: '50' });
    Object.entries(state.reservationFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  async function loadReservations() {
    renderReservations(true);
    try {
      const { data, meta } = await api().fetch(`/owner/reservations?${reservationQuery()}`);
      state.reservations = Array.isArray(data) ? data : [];
      state.reservationStats = meta?.stats || state.reservationStats;
      renderReservations();
    } catch (err) {
      state.reservations = [];
      renderReservations();
      window.tkToast?.(friendlyError(err), 'error');
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

  async function loadCalendarReservations() {
    state.calendar.loading = true;
    renderCalendar(true);
    try {
      const { data, meta } = await api().fetch(`/owner/reservations/calendar?${calendarQuery()}`);
      state.calendar.reservations = Array.isArray(data) ? data : [];
      state.calendar.todaySummary = meta?.today_summary || state.calendar.todaySummary;
      renderCalendar();
    } catch (err) {
      state.calendar.reservations = [];
      renderCalendar();
      window.tkToast?.(friendlyError(err), 'error');
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
    if (state.analytics.filters.venue_id) params.set('venue_id', state.analytics.filters.venue_id);
    return params.toString();
  }

  async function loadAnalytics() {
    state.analytics.loading = true;
    renderAnalytics(true);
    try {
      const { data } = await api().fetch(`/owner/analytics?${analyticsQuery()}`);
      state.analytics.data = data || null;
      renderAnalytics();
    } catch (err) {
      state.analytics.data = null;
      renderAnalytics();
      window.tkToast?.(friendlyError(err), 'error');
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
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  async function addBlackoutDate() {
    if (!state.venue) {
      window.tkToast?.('Create the restaurant or bar before adding blackout dates.', 'error');
      return;
    }

    const date = $('[data-blackout-date]')?.value;
    const reason = nullable($('[data-blackout-reason]')?.value);
    if (!date) {
      window.tkToast?.('Select a blackout date.', 'error');
      return;
    }

    try {
      const { data } = await api().fetch(`/owner/venues/${state.venue.slug}/blackout-dates`, {
        method: 'POST',
        body: { date, reason },
      });
      state.blackoutDates = [...state.blackoutDates, data].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      if ($('[data-blackout-date]')) $('[data-blackout-date]').value = '';
      if ($('[data-blackout-reason]')) $('[data-blackout-reason]').value = '';
      renderBlackoutDates();
      window.tkToast?.('Blackout date added.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  async function deleteBlackoutDate(id) {
    if (!state.venue) return;
    try {
      await api().fetch(`/owner/venues/${state.venue.slug}/blackout-dates/${id}`, { method: 'DELETE' });
      state.blackoutDates = state.blackoutDates.filter((item) => String(item.id) !== String(id));
      renderBlackoutDates();
      window.tkToast?.('Blackout date removed.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  async function saveSpecialHours() {
    if (!state.venue) {
      window.tkToast?.('Create the restaurant or bar before adding special hours.', 'error');
      return;
    }

    const date = $('[data-special-date]')?.value;
    const isClosed = $('[data-special-closed]')?.checked || false;
    const payload = {
      date,
      opens_at: isClosed ? null : normalizeTime($('[data-special-open]')?.value),
      closes_at: isClosed ? null : normalizeTime($('[data-special-close]')?.value),
      is_closed: isClosed,
    };

    if (!payload.date || (!payload.is_closed && (!payload.opens_at || !payload.closes_at))) {
      window.tkToast?.('Select a date and special opening hours.', 'error');
      return;
    }

    const editingId = state.editingSpecialHourId;
    const path = editingId
      ? `/owner/venues/${state.venue.slug}/special-hours/${editingId}`
      : `/owner/venues/${state.venue.slug}/special-hours`;

    try {
      const { data } = await api().fetch(path, { method: editingId ? 'PUT' : 'POST', body: payload });
      state.specialHours = editingId
        ? state.specialHours.map((item) => String(item.id) === String(editingId) ? data : item)
        : [...state.specialHours, data];
      state.specialHours = state.specialHours.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      clearSpecialForm();
      renderSpecialHours();
      window.tkToast?.(editingId ? 'Special hours updated.' : 'Special hours added.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  function editSpecialHours(id) {
    const item = state.specialHours.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    state.editingSpecialHourId = item.id;
    if ($('[data-special-date]')) $('[data-special-date]').value = item.date || '';
    if ($('[data-special-open]')) $('[data-special-open]').value = normalizeTime(item.opens_at || '');
    if ($('[data-special-close]')) $('[data-special-close]').value = normalizeTime(item.closes_at || '');
    if ($('[data-special-closed]')) $('[data-special-closed]').checked = Boolean(item.is_closed);
    syncSpecialClosedState();
    $('[data-special-date]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function deleteSpecialHours(id) {
    if (!state.venue) return;
    try {
      await api().fetch(`/owner/venues/${state.venue.slug}/special-hours/${id}`, { method: 'DELETE' });
      state.specialHours = state.specialHours.filter((item) => String(item.id) !== String(id));
      if (String(state.editingSpecialHourId) === String(id)) clearSpecialForm();
      renderSpecialHours();
      window.tkToast?.('Special hours removed.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  async function reservationAction(id, action, body = {}) {
    try {
      const { data } = await api().fetch(`/owner/reservations/${id}/${action}`, { method: 'PATCH', body });
      state.reservations = state.reservations.map((reservation) => String(reservation.id) === String(id) ? data : reservation);
      state.calendar.reservations = state.calendar.reservations.map((reservation) => String(reservation.id) === String(id) ? data : reservation);
      renderReservations();
      renderCalendar();
      await loadReservations();
      if (state.reservationView === 'calendar') await loadCalendarReservations();
      const message = action === 'complete'
        ? 'Reservation marked completed successfully.'
        : action === 'no-show'
          ? 'Reservation marked as no show successfully.'
          : `Reservation ${action}ed successfully.`;
      window.tkToast?.(message, 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  function reservationActionMeta(action) {
    return {
      confirm: {
        title: 'Confirm reservation?',
        body: 'This will confirm the guest reservation.',
        confirm: 'Confirm reservation',
      },
      cancel: {
        title: 'Cancel reservation?',
        body: 'This will cancel the guest reservation.',
        confirm: 'Cancel reservation',
      },
      complete: {
        title: 'Mark reservation completed?',
        body: 'Use this after the guest visit has finished.',
        confirm: 'Mark completed',
      },
      'no-show': {
        title: 'Mark reservation as no show?',
        body: 'Use this only when the guest did not arrive for a confirmed reservation.',
        confirm: 'Mark no show',
      },
    }[action] || {
      title: 'Update reservation?',
      body: 'This will update the reservation status.',
      confirm: 'Update reservation',
    };
  }

  function openReservationActionModal(id, action) {
    state.pendingReservationAction = { id, action };
    const meta = reservationActionMeta(action);
    $('[data-owner-action-title]').textContent = meta.title;
    $('[data-owner-action-body]').textContent = meta.body;
    $('[data-owner-action-confirm]').textContent = meta.confirm;
    const reasonFields = $('[data-owner-cancel-reason-fields]');
    const reasonSelect = $('[data-owner-cancel-reason-select]');
    const reasonOther = $('[data-owner-cancel-reason-other]');
    if (reasonFields) reasonFields.hidden = action !== 'cancel';
    if (reasonSelect) reasonSelect.value = ownerCancellationReasons[0];
    if (reasonOther) {
      reasonOther.value = '';
      reasonOther.hidden = true;
    }
    bootstrap.Modal.getOrCreateInstance($('#ownerReservationActionModal')).show();
  }

  function ownerCancellationReason() {
    const selected = String($('[data-owner-cancel-reason-select]')?.value || '').trim();
    if (selected !== 'Other') return selected;

    return String($('[data-owner-cancel-reason-other]')?.value || '').trim();
  }

  async function confirmReservationAction() {
    const pending = state.pendingReservationAction;
    if (!pending) return;
    const body = {};
    if (pending.action === 'cancel') {
      const reason = ownerCancellationReason();
      if (!reason) {
        window.tkToast?.('Please add a cancellation reason.', 'error');
        return;
      }
      body.owner_cancellation_reason = reason;
    }
    bootstrap.Modal.getOrCreateInstance($('#ownerReservationActionModal')).hide();
    state.pendingReservationAction = null;
    await reservationAction(pending.id, pending.action, body);
  }

  function bindEvents() {
    $('[data-owner-save]')?.addEventListener('click', saveVenue);
    $('[data-owner-start-create]')?.addEventListener('click', () => $('[data-owner-venue-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $('[data-owner-image-browse]')?.addEventListener('click', () => $('[data-owner-image-input]')?.click());
    $('[data-owner-image-input]')?.addEventListener('change', (event) => uploadImages(event.target.files));
    const galleryDropzone = $('[data-owner-gallery-dropzone]');
    galleryDropzone?.addEventListener('dragover', (event) => {
      event.preventDefault();
      galleryDropzone.classList.add('is-dragover');
    });
    galleryDropzone?.addEventListener('dragleave', (event) => {
      if (!galleryDropzone.contains(event.relatedTarget)) galleryDropzone.classList.remove('is-dragover');
    });
    galleryDropzone?.addEventListener('drop', (event) => {
      event.preventDefault();
      galleryDropzone.classList.remove('is-dragover');
      uploadImages(event.dataTransfer?.files);
    });
    $('[data-owner-delete-open]')?.addEventListener('click', () => bootstrap.Modal.getOrCreateInstance($('#ownerDeleteModal')).show());
    $('[data-owner-delete-confirm]')?.addEventListener('click', deleteVenue);
    $('[data-owner-action-confirm]')?.addEventListener('click', confirmReservationAction);
    $('[data-owner-cancel-reason-select]')?.addEventListener('change', (event) => {
      const reasonOther = $('[data-owner-cancel-reason-other]');
      if (!reasonOther) return;
      reasonOther.hidden = event.currentTarget.value !== 'Other';
      if (reasonOther.hidden) reasonOther.value = '';
    });
    $('[data-blackout-add]')?.addEventListener('click', addBlackoutDate);
    $('[data-special-save]')?.addEventListener('click', saveSpecialHours);
    $('[data-special-closed]')?.addEventListener('change', syncSpecialClosedState);
    $('[data-owner-location-search-button]')?.addEventListener('click', searchOwnerLocation);
    $('[data-owner-location-search]')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchOwnerLocation();
      }
    });
    $('[data-owner-location-click-layer]')?.addEventListener('click', (event) => {
      const coordinates = coordinatesFromPickerClick(event);
      setLocationFields(coordinates.lat, coordinates.lng);
    });
    $('[data-owner-location-clear]')?.addEventListener('click', () => {
      const form = $('[data-owner-venue-form]');
      if (!form) return;
      form.elements.latitude.value = '';
      form.elements.longitude.value = '';
      updateOwnerLocationMap();
    });
    ['latitude', 'longitude'].forEach((name) => {
      $('[data-owner-venue-form]')?.elements[name]?.addEventListener('input', updateOwnerLocationMap);
    });
    ['address', 'city', 'country'].forEach((name) => {
      $('[data-owner-venue-form]')?.elements[name]?.addEventListener('input', () => {
        const search = $('[data-owner-location-search]');
        if (search) search.value = locationSearchText();
      });
    });
    $('[data-owner-reservations-refresh]')?.addEventListener('click', () => {
      if (state.reservationView === 'analytics') {
        loadAnalytics();
        return;
      }
      if (state.reservationView === 'calendar') {
        loadCalendarReservations();
        return;
      }
      loadReservations();
    });
    $('[data-owner-calendar-prev]')?.addEventListener('click', () => {
      state.calendar.anchorDate = state.calendar.view === 'month'
        ? addMonths(state.calendar.anchorDate, -1)
        : addDays(state.calendar.anchorDate, state.calendar.view === 'week' ? -7 : -1);
      loadCalendarReservations();
    });
    $('[data-owner-calendar-next]')?.addEventListener('click', () => {
      state.calendar.anchorDate = state.calendar.view === 'month'
        ? addMonths(state.calendar.anchorDate, 1)
        : addDays(state.calendar.anchorDate, state.calendar.view === 'week' ? 7 : 1);
      loadCalendarReservations();
    });
    $('[data-owner-calendar-jump]')?.addEventListener('change', (event) => {
      if (!event.target.value) return;
      state.calendar.anchorDate = localDate(event.target.value);
      loadCalendarReservations();
    });
    $('[data-owner-reservations-clear]')?.addEventListener('click', () => {
      state.reservationFilters = { view: '', status: '', date: '', venue_id: '' };
      document.querySelectorAll('[data-owner-reservation-filter]').forEach((control) => { control.value = ''; });
      loadReservations();
    });

    document.querySelectorAll('[data-owner-reservation-filter]').forEach((control) => {
      control.addEventListener('change', () => {
        state.reservationFilters[control.dataset.ownerReservationFilter] = control.value;
        loadReservations();
      });
    });

    document.querySelectorAll('[data-owner-reservation-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.reservationView = button.dataset.ownerReservationTab;
        document.querySelectorAll('[data-owner-reservation-tab]').forEach((tab) => {
          tab.classList.toggle('active', tab === button);
        });
        document.querySelectorAll('[data-owner-reservation-panel]').forEach((panel) => {
          panel.hidden = panel.dataset.ownerReservationPanel !== state.reservationView;
        });
        if (state.reservationView === 'calendar' && !state.calendar.reservations.length) {
          loadCalendarReservations();
        }
        if (state.reservationView === 'analytics' && !state.analytics.data) {
          loadAnalytics();
        }
      });
    });

    document.querySelectorAll('[data-owner-calendar-view]').forEach((button) => {
      button.addEventListener('click', () => {
        state.calendar.view = button.dataset.ownerCalendarView;
        if (state.calendar.view === 'day') state.calendar.anchorDate = new Date();
        loadCalendarReservations();
      });
    });

    document.querySelectorAll('[data-owner-calendar-filter]').forEach((control) => {
      control.addEventListener('change', () => {
        state.calendar.filters[control.dataset.ownerCalendarFilter] = control.value;
        loadCalendarReservations();
      });
    });

    document.querySelectorAll('[data-owner-analytics-range]').forEach((button) => {
      button.addEventListener('click', () => {
        state.analytics.range = button.dataset.ownerAnalyticsRange;
        renderAnalytics();
        if (state.analytics.range !== 'custom') loadAnalytics();
      });
    });

    $('[data-owner-analytics-apply]')?.addEventListener('click', loadAnalytics);

    document.querySelectorAll('[data-owner-analytics-filter]').forEach((control) => {
      control.addEventListener('change', () => {
        state.analytics.filters[control.dataset.ownerAnalyticsFilter] = control.value;
        loadAnalytics();
      });
    });

    document.addEventListener('change', (event) => {
      const closed = event.target.closest('[data-hours-closed]');
      if (!closed) return;
      const day = closed.dataset.hoursClosed;
      const open = $(`[data-hours-open="${day}"]`);
      const close = $(`[data-hours-close="${day}"]`);
      [open, close].forEach((input) => {
        if (!input) return;
        input.disabled = closed.checked;
        if (closed.checked) input.value = '';
      });
    });

    document.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('[data-owner-image-delete]');
      if (deleteButton) {
        deleteImage(deleteButton.dataset.ownerImageDelete);
        return;
      }
      const coverButton = event.target.closest('[data-owner-image-cover]');
      if (coverButton) {
        setCoverImage(coverButton.dataset.ownerImageCover);
        return;
      }
      const up = event.target.closest('[data-owner-image-up]');
      if (up) {
        reorderImage(up.dataset.ownerImageUp, -1);
        return;
      }
      const down = event.target.closest('[data-owner-image-down]');
      if (down) {
        reorderImage(down.dataset.ownerImageDown, 1);
        return;
      }
      const reservationView = event.target.closest('[data-owner-reservation-view]');
      if (reservationView) {
        const reservation = state.reservations.find((item) => String(item.id) === String(reservationView.dataset.ownerReservationView));
        if (reservation) renderReservationDetail(reservation);
        return;
      }
      const calendarReservation = event.target.closest('[data-owner-calendar-reservation]');
      if (calendarReservation) {
        const reservation = state.calendar.reservations.find((item) => String(item.id) === String(calendarReservation.dataset.ownerCalendarReservation));
        if (reservation) renderReservationDetail(reservation);
        return;
      }
      const reservationButton = event.target.closest('[data-owner-reservation-action]');
      if (reservationButton) {
        openReservationActionModal(reservationButton.dataset.ownerReservationId, reservationButton.dataset.ownerReservationAction);
        return;
      }
      const blackoutDelete = event.target.closest('[data-blackout-delete]');
      if (blackoutDelete) {
        deleteBlackoutDate(blackoutDelete.dataset.blackoutDelete);
        return;
      }
      const specialEdit = event.target.closest('[data-special-edit]');
      if (specialEdit) {
        editSpecialHours(specialEdit.dataset.specialEdit);
        return;
      }
      const specialDelete = event.target.closest('[data-special-delete]');
      if (specialDelete) {
        deleteSpecialHours(specialDelete.dataset.specialDelete);
      }
    });

    document.addEventListener('dragstart', (event) => {
      const card = event.target.closest('[data-owner-gallery-card]');
      if (!card) return;
      draggedOwnerImageId = card.dataset.ownerGalleryCard;
      card.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedOwnerImageId);
    });
    document.addEventListener('dragover', (event) => {
      const card = event.target.closest('[data-owner-gallery-card]');
      if (!card || !draggedOwnerImageId) return;
      event.preventDefault();
      card.classList.add('is-drop-target');
      event.dataTransfer.dropEffect = 'move';
    });
    document.addEventListener('dragleave', (event) => {
      const card = event.target.closest('[data-owner-gallery-card]');
      if (card) card.classList.remove('is-drop-target');
    });
    document.addEventListener('drop', (event) => {
      const card = event.target.closest('[data-owner-gallery-card]');
      if (!card || !draggedOwnerImageId) return;
      event.preventDefault();
      const targetId = card.dataset.ownerGalleryCard;
      document.querySelectorAll('[data-owner-gallery-card]').forEach((item) => item.classList.remove('is-drop-target', 'is-dragging'));
      moveImageBefore(draggedOwnerImageId, targetId);
      draggedOwnerImageId = null;
    });
    document.addEventListener('dragend', () => {
      draggedOwnerImageId = null;
      document.querySelectorAll('[data-owner-gallery-card]').forEach((item) => item.classList.remove('is-drop-target', 'is-dragging'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    hydrateTimeSelects();
    bindEvents();
    loadData();
  });
})();
