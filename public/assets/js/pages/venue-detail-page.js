(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const fallbackImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let currentVenue = null;

  function slugFromLocation() {
    const params = new URLSearchParams(location.search);
    return params.get('venue') || params.get('slug') || '';
  }

  function titleCase(value) {
    return String(value || 'Restaurant / Bar').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function imageUrl(image) {
    return image?.url || image?.image_path || fallbackImage;
  }

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value || '';
  }

  function listNames(items, fallback) {
    const names = (items || []).map((item) => item.name).filter(Boolean);
    return names.length ? names.join(', ') : fallback;
  }

  function normalizeTime(value) {
    const text = String(value ?? '').trim();
    return /^\d{2}:\d{2}:\d{2}$/.test(text) ? text.slice(0, 5) : text;
  }

  function minutesFromTime(value) {
    const time = normalizeTime(value || '');
    const match = time.match(/^(\d{2}):(\d{2})$/);
    return match ? (Number(match[1]) * 60) + Number(match[2]) : null;
  }

  function timeFromMinutes(minutes) {
    const safe = Math.max(0, Math.min(1439, Number(minutes) || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function timeLabel(value) {
    const minutes = minutesFromTime(value);
    if (minutes === null) return value || '';
    const date = new Date();
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function localDateValue(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  function dayIndexForDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : (date.getDay() + 6) % 7;
  }

  function isToday(value) {
    return value === localDateValue(new Date());
  }

  function nextFutureSlotMinutes() {
    const now = new Date();
    const minutes = (now.getHours() * 60) + now.getMinutes();
    return Math.ceil((minutes + 1) / 30) * 30;
  }

  function nextSlotMinutes(minutes) {
    return Math.ceil((Number(minutes) || 0) / 30) * 30;
  }

  function openingHourForDate(venue, dateValue) {
    const dayIndex = dayIndexForDate(dateValue);
    if (dayIndex === null) return null;
    return (venue.opening_hours || []).find((item) => Number(item.day_of_week) === dayIndex) || null;
  }

  function reservationTimeOptions(venue, dateValue) {
    const openingHour = openingHourForDate(venue, dateValue);
    if (openingHour?.is_closed) return [];

    const defaultStart = 7 * 60;
    const defaultEnd = 23 * 60;
    const opensAt = openingHour?.opens_at ? minutesFromTime(openingHour.opens_at) : defaultStart;
    const closesAt = openingHour?.closes_at ? minutesFromTime(openingHour.closes_at) : defaultEnd + 30;
    const minFuture = isToday(dateValue) ? nextFutureSlotMinutes() : 0;
    const start = nextSlotMinutes(Math.max(defaultStart, opensAt ?? defaultStart, minFuture));
    const end = Math.min(defaultEnd, (closesAt ?? defaultEnd + 30) - 30);
    const times = [];

    for (let minutes = start; minutes <= end; minutes += 30) {
      times.push(timeFromMinutes(minutes));
    }

    return times;
  }

  function iconForFacility(item) {
    const map = {
      wifi: 'wifi',
      'parking-circle': 'p-square',
      music: 'music-note-beamed',
      trees: 'tree',
      'door-closed': 'door-closed',
      accessibility: 'universal-access',
      martini: 'cup-straw',
      cigarette: 'fire',
      'paw-print': 'heart',
      baby: 'emoji-smile',
      'badge-star': 'star',
      'building-2': 'building',
      tv: 'tv',
      'disc-3': 'disc',
    };
    const icon = map[item?.icon] || item?.icon || 'check2-circle';
    const bootstrapIcon = icon.startsWith('bi-') ? icon : `bi-${icon}`;
    return bootstrapIcon;
  }

  function renderGallery(venue) {
    const root = $('[data-detail-gallery]');
    if (!root) return;
    const images = venue.images?.length ? venue.images : [{ url: venue.logo_image || fallbackImage }];
    root.innerHTML = images.slice(0, 5).map((image, index) => `
      <img class="${index === 0 ? 'g-main' : ''}" src="${esc(imageUrl(image))}" alt="${esc(venue.name)} restaurant or bar image ${index + 1}" />
    `).join('');
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
    root.innerHTML = visible ? items.map((item) => `
      <div class="col-md-4 col-6"><div class="facility"><i class="bi ${esc(icon(item))}"></i> ${esc(item.name)}</div></div>
    `).join('') : '';
  }

  function renderHours(hours = []) {
    const root = $('[data-detail-hours]');
    if (!root) return;
    const byDay = new Map(hours.map((item) => [Number(item.day_of_week), item]));
    root.innerHTML = days.map((day, index) => {
      const item = byDay.get(index);
      const label = !item || item.is_closed ? 'Closed' : `${item.opens_at || '--:--'} - ${item.closes_at || '--:--'}`;
      return `
        <div class="col-md-6">
          <div class="facility justify-content-between">
            <span><i class="bi bi-clock"></i> ${day}</span>
            <span class="${!item || item.is_closed ? 'text-muted-pro' : ''}">${esc(label)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function contactItem(icon, label, value, href) {
    if (!value) return '';
    const content = href ? `<a class="text-decoration-none text-reset" href="${esc(href)}" target="_blank" rel="noopener">${esc(value)}</a>` : esc(value);
    return `<div class="col-md-6"><div class="facility"><i class="bi ${icon}"></i> <span><span class="text-muted-pro">${label}: </span>${content}</span></div></div>`;
  }

  function renderContact(venue) {
    const root = $('[data-detail-contact]');
    if (!root) return;
    const address = [venue.address, venue.city, venue.country].filter(Boolean).join(', ');
    const rows = [
      contactItem('bi-geo-alt-fill', 'Address', address),
      contactItem('bi-telephone-fill', 'Phone', venue.phone, venue.phone ? `tel:${venue.phone}` : null),
      contactItem('bi-envelope-fill', 'Email', venue.email, venue.email ? `mailto:${venue.email}` : null),
      contactItem('bi-globe2', 'Website', venue.website, venue.website),
      contactItem('bi-facebook', 'Facebook', venue.social_links?.facebook_url, venue.social_links?.facebook_url),
      contactItem('bi-instagram', 'Instagram', venue.social_links?.instagram_url, venue.social_links?.instagram_url),
      contactItem('bi-tiktok', 'TikTok', venue.social_links?.tiktok_url, venue.social_links?.tiktok_url),
    ].filter(Boolean);
    root.innerHTML = rows.join('') || '<div class="col-12 text-muted-pro">Contact details are not available yet.</div>';

    const coordinates = [venue.latitude, venue.longitude].filter((value) => value !== null && value !== undefined && value !== '').join(', ');
    setText('[data-detail-coordinates]', coordinates ? `Coordinates: ${coordinates}` : '');
  }

  function renderVenue(venue) {
    currentVenue = venue;
    document.title = `${venue.name} - Event Sphere Reservations`;
    setText('[data-detail-city]', venue.city || 'City');
    setText('[data-detail-name]', venue.name || 'Restaurant / Bar');
    setText('[data-detail-title]', venue.name || 'Restaurant / Bar');
    setText('[data-detail-type]', titleCase(venue.venue_type));
    const cuisineMeta = $('[data-detail-cuisines]');
    if (cuisineMeta) {
      const hasCuisines = Boolean(venue.cuisine_types?.length);
      cuisineMeta.hidden = !hasCuisines;
      cuisineMeta.textContent = hasCuisines ? listNames(venue.cuisine_types, '') : '';
    }
    setText('[data-detail-location]', [venue.city, venue.country].filter(Boolean).join(', '));
    setText('[data-detail-description]', venue.description || 'This restaurant or bar has not added a description yet.');
    setText('[data-detail-side-title]', venue.name || 'Restaurant & Bar details');
    setText('[data-detail-side-copy]', `${titleCase(venue.venue_type)} in ${venue.city || 'your city'}`);

    const featured = $('[data-detail-featured]');
    if (featured) featured.hidden = !venue.featured;

    const logo = $('[data-detail-logo]');
    if (logo && venue.logo_image) {
      logo.src = venue.logo_image;
      logo.hidden = false;
    }

    renderGallery(venue);
    renderPills('[data-detail-facilities]', venue.facilities, iconForFacility, 'facilities');
    renderPills('[data-detail-cuisine-list]', venue.cuisine_types, () => 'bi-egg-fried', 'cuisines');
    renderPills('[data-detail-payments]', venue.payment_options, () => 'bi-credit-card', 'payments');
    renderHours(venue.opening_hours || []);
    renderContact(venue);
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

    panel.innerHTML = `<div class="reservation-guest-grid">${values.map((value) => `
      <button class="reservation-choice reservation-choice-guest" type="button" data-picker-option="guests" data-value="${value}">
        ${value > 8 ? `${value}+` : value}
      </button>
    `).join('')}</div>`;
    selectPickerValue('guests', defaultValue, `Guests: ${defaultValue > 8 ? `${defaultValue}+` : defaultValue}`);
  }

  function renderDateSelector(form) {
    const panel = $('[data-picker-panel="date"]');
    if (!panel) return;
    const today = new Date();
    const selected = localDateValue(today);
    const dates = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      const value = localDateValue(date);
      return {
        value,
        day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short' }),
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      };
    });

    panel.innerHTML = `<div class="reservation-date-grid">${dates.map((item) => `
      <button class="reservation-choice reservation-choice-date" type="button" data-picker-option="date" data-value="${esc(item.value)}" data-label="${esc(`${item.day} — ${item.date}`)}">
        <span>${esc(item.day)}</span>
        <strong>${esc(item.date)}</strong>
      </button>
    `).join('')}</div>`;
    const selectedItem = dates.find((item) => item.value === selected) || dates[0];
    selectPickerValue('date', selectedItem.value, `Date: ${selectedItem.day} — ${selectedItem.date}`);
  }

  function renderTimeSelector(form, venue) {
    const panel = $('[data-picker-panel="time"]');
    if (!panel) return;
    const times = reservationTimeOptions(venue, form.elements.reservation_date.value);
    const selected = times.includes('19:00') ? '19:00' : times[0];

    panel.innerHTML = times.length ? `<div class="reservation-time-grid">${times.map((time) => `
      <button class="reservation-choice reservation-choice-time" type="button" data-picker-option="time" data-value="${time}" data-label="${esc(timeLabel(time))}">
        ${esc(timeLabel(time))}
      </button>
    `).join('')}</div>` : '<div class="reservation-picker-empty">No available times for this date.</div>';
    selectPickerValue('time', selected || '', selected ? `Time: ${timeLabel(selected)}` : 'Time');
  }

  function hydrateReservationForm(venue) {
    const form = $('[data-reservation-form]');
    if (!form) return;
    setText('[data-reservation-modal-venue]', `${venue.name || 'This restaurant or bar'} will receive your reservation request.`);
    renderGuestSelector(form, venue);
    renderDateSelector(form);
    renderTimeSelector(form, venue);
  }

  function pickerInputName(type) {
    return {
      guests: 'party_size',
      date: 'reservation_date',
      time: 'reservation_time',
    }[type];
  }

  function closePickers() {
    document.querySelectorAll('[data-picker]').forEach((picker) => {
      picker.classList.remove('open');
    });
    document.querySelectorAll('[data-picker-trigger]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function togglePicker(type) {
    const picker = $(`[data-picker="${type}"]`);
    const trigger = $(`[data-picker-trigger="${type}"]`);
    const willOpen = !picker?.classList.contains('open');
    closePickers();
    if (willOpen && picker && trigger) {
      picker.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  }

  function selectPickerValue(type, value, label) {
    const form = $('[data-reservation-form]');
    const inputName = pickerInputName(type);
    const input = inputName ? form?.elements[inputName] : null;
    if (input) input.value = value;

    const labelEl = $(`[data-picker-label="${type}"]`);
    if (labelEl) labelEl.textContent = label;

    document.querySelectorAll(`[data-picker-option="${type}"]`).forEach((option) => {
      const active = option.dataset.value === String(value);
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function reservationError(err) {
    const errors = err?.payload?.errors;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors).flat().filter(Boolean)[0];
      if (first) return String(first);
    }
    return err?.message || 'Unable to create reservation. Please try again.';
  }

  function setReservationBusy(busy) {
    const button = $('[data-reservation-submit]');
    if (!button) return;
    button.disabled = busy;
    button.innerHTML = busy ? '<span class="spinner-border spinner-border-sm me-1"></span>Sending...' : 'Send Reservation Request';
  }

  async function submitReservation(event) {
    event.preventDefault();
    if (!currentVenue) return;

    const form = event.currentTarget;
    const payload = {
      venue_id: currentVenue.id,
      reservation_date: form.elements.reservation_date.value,
      reservation_time: form.elements.reservation_time.value,
      party_size: Number(form.elements.party_size.value || 0),
      phone: form.elements.phone.value.trim() || null,
      notes: form.elements.notes.value.trim() || null,
    };

    setReservationBusy(true);
    try {
      await api().fetch('/reservations', { method: 'POST', body: payload });
      bootstrap.Modal.getOrCreateInstance($('#reservationModal')).hide();
      form.reset();
      hydrateReservationForm(currentVenue);
      window.tkToast?.('Your reservation request has been sent successfully', 'success');
    } catch (err) {
      window.tkToast?.(reservationError(err), 'error');
    } finally {
      setReservationBusy(false);
    }
  }

  async function loadVenue() {
    const slug = slugFromLocation();
    if (!slug) {
      setText('[data-detail-description]', 'Choose a restaurant or bar from the discovery page to view details.');
      window.tkToast?.('Choose a restaurant or bar from discovery first.', 'info');
      return;
    }

    try {
      const { data } = await api().fetch(`/venues/${encodeURIComponent(slug)}`, { skipAuthRedirect: true });
      renderVenue(data);
    } catch (err) {
      setText('[data-detail-title]', 'Restaurant or bar unavailable');
      setText('[data-detail-description]', 'This restaurant or bar is not available for reservations right now.');
      window.tkToast?.(err?.message || 'Unable to load restaurant or bar.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', loadVenue);
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-reserve-button]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!window.EventSphereAuth?.isLoggedIn?.()) {
          const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
          location.href = `login.html?next=${next}`;
          return;
        }
        bootstrap.Modal.getOrCreateInstance($('#reservationModal')).show();
      });
    });
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-picker-trigger]');
      if (trigger) {
        togglePicker(trigger.dataset.pickerTrigger);
        return;
      }

      const option = event.target.closest('[data-picker-option]');
      if (option) {
        const type = option.dataset.pickerOption;
        const value = option.dataset.value;
        const label = option.dataset.label || option.textContent.trim();
        const prefix = { guests: 'Guests', date: 'Date', time: 'Time' }[type] || '';
        selectPickerValue(type, value, `${prefix}: ${label}`);
        if (type === 'date' && currentVenue) {
          renderTimeSelector($('[data-reservation-form]'), currentVenue);
        }
        closePickers();
        return;
      }

      if (!event.target.closest('[data-picker]')) closePickers();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePickers();
    });
    $('#reservationModal')?.addEventListener('hidden.bs.modal', closePickers);
    $('[data-reservation-form]')?.addEventListener('submit', submitReservation);
  });
})();
