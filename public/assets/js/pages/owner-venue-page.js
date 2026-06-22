(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const imageUrl = (image) => image?.url || image?.image_path || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const state = {
    venue: null,
    facilities: [],
    cuisines: [],
    payments: [],
    venues: [],
    reservations: [],
    reservationStats: { today: 0, upcoming: 0, completed: 0, cancelled: 0 },
    reservationFilters: { view: '', status: '', date: '', venue_id: '' },
    saving: false,
  };

  function setBusy(busy) {
    state.saving = busy;
    const save = $('[data-owner-save]');
    if (save) {
      save.disabled = busy;
      save.innerHTML = busy ? '<span class="spinner-border spinner-border-sm me-1"></span>Saving...' : '<i class="bi bi-check2-circle me-1"></i>Save venue';
    }
  }

  function friendlyError(err) {
    if (err?.status === 422) return 'Please check the highlighted venue details and try again.';
    if (err?.status === 403) return 'Your organizer account cannot manage this venue.';
    return err?.message || 'Something went wrong. Please try again.';
  }

  function statusBadge(status) {
    const map = {
      pending: 'reservation-status-pending',
      confirmed: 'reservation-status-confirmed',
      completed: 'reservation-status-completed',
      cancelled: 'reservation-status-cancelled',
    };
    return `<span class="reservation-status ${map[status] || ''}">${esc(status || 'pending')}</span>`;
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
            <input class="form-control form-control-sm" type="time" data-hours-open="${index}" value="${esc(item.opens_at || '')}" ${closed ? 'disabled' : ''}>
            <input class="form-control form-control-sm" type="time" data-hours-close="${index}" value="${esc(item.closes_at || '')}" ${closed ? 'disabled' : ''}>
            <label class="form-check owner-hours-closed">
              <input class="form-check-input" type="checkbox" data-hours-closed="${index}" ${closed ? 'checked' : ''}>
              <span>Closed</span>
            </label>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderGallery() {
    const root = $('[data-owner-gallery]');
    if (!root) return;
    const images = [...(state.venue?.images || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    root.innerHTML = images.length ? images.map((image, index) => `
      <div class="col-md-6">
        <div class="card-pro p-2 owner-gallery-card">
          <img src="${esc(imageUrl(image))}" alt="" />
          <div class="d-flex justify-content-between align-items-center mt-2 gap-2">
            <small class="text-muted-pro">${index === 0 ? 'Cover image' : `Gallery ${index + 1}`}</small>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-glass" type="button" data-owner-image-up="${image.id}" ${index === 0 ? 'disabled' : ''} aria-label="Move image up"><i class="bi bi-arrow-left"></i></button>
              <button class="btn btn-glass" type="button" data-owner-image-down="${image.id}" ${index === images.length - 1 ? 'disabled' : ''} aria-label="Move image down"><i class="bi bi-arrow-right"></i></button>
              <button class="btn btn-glass" type="button" data-owner-image-delete="${image.id}" aria-label="Delete image"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('') : '<div class="col-12 small text-muted-pro">No uploaded images yet.</div>';
  }

  function fillForm() {
    const form = $('[data-owner-venue-form]');
    if (!form) return;
    const venue = state.venue;
    form.reset();
    form.elements.venue_slug.value = venue?.slug || '';
    form.elements.name.value = venue?.name || '';
    form.elements.venue_type.value = venue?.venue_type || '';
    form.elements.status.value = venue?.status || 'draft';
    form.elements.phone.value = venue?.phone || '';
    form.elements.email.value = venue?.email || '';
    form.elements.description.value = venue?.description || '';
    form.elements.website.value = venue?.website || '';
    form.elements.address.value = venue?.address || '';
    form.elements.city.value = venue?.city || '';
    form.elements.country.value = venue?.country || '';
    form.elements.latitude.value = venue?.latitude || '';
    form.elements.longitude.value = venue?.longitude || '';
    form.elements.reservation_enabled.checked = Boolean(venue?.reservation_settings?.reservation_enabled);
    form.elements.min_guests.value = venue?.reservation_settings?.min_guests || 1;
    form.elements.max_guests.value = venue?.reservation_settings?.max_guests || 10;
    form.elements.reservation_interval_minutes.value = venue?.reservation_settings?.reservation_interval_minutes || 30;
    form.elements.last_reservation_time.value = venue?.reservation_settings?.last_reservation_time || '';
    form.elements.facebook_url.value = venue?.social_links?.facebook_url || '';
    form.elements.instagram_url.value = venue?.social_links?.instagram_url || '';
    form.elements.tiktok_url.value = venue?.social_links?.tiktok_url || '';

    renderChecks('[data-owner-facilities]', state.facilities, selectedIds(venue?.facilities), 'facility_ids');
    renderChecks('[data-owner-cuisines]', state.cuisines, selectedIds(venue?.cuisine_types), 'cuisine_type_ids');
    renderChecks('[data-owner-payments]', state.payments, selectedIds(venue?.payment_options), 'payment_option_ids');
    renderHours(venue?.opening_hours || []);
    renderGallery();
  }

  function renderSummary() {
    const hasVenue = Boolean(state.venue);
    $('[data-owner-empty]')?.toggleAttribute('hidden', hasVenue);
    $('[data-owner-summary]')?.toggleAttribute('hidden', !hasVenue);
    $('[data-owner-delete-section]')?.toggleAttribute('hidden', !hasVenue);

    if (!hasVenue) return;
    const venue = state.venue;
    const cover = venue.images?.[0];
    $('[data-owner-cover]').src = imageUrl(cover);
    $('[data-owner-title]').textContent = venue.name || 'Venue profile';
    $('[data-owner-type]').textContent = (venue.venue_type || 'venue').replace(/^\w/, (letter) => letter.toUpperCase());
    $('[data-owner-status]').textContent = venue.status || 'Draft';
    $('[data-owner-location]').textContent = [venue.city, venue.country].filter(Boolean).join(', ') || 'Location not set';
    $('[data-owner-image-count]').textContent = `${venue.images?.length || 0} images`;
    $('[data-owner-description]').textContent = venue.description || 'Complete your profile details below.';
  }

  function renderVenueFilter() {
    const select = $('[data-owner-reservation-filter="venue_id"]');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All venues</option>' + state.venues.map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`).join('');
    select.value = current;
  }

  function renderReservationStats() {
    const root = $('[data-owner-reservation-stats]');
    if (!root) return;
    const stats = state.reservationStats || {};
    root.innerHTML = [
      ['Today\'s Reservations', stats.today || 0],
      ['Upcoming Reservations', stats.upcoming || 0],
      ['Completed Reservations', stats.completed || 0],
      ['Cancelled Reservations', stats.cancelled || 0],
    ].map(([label, value]) => `
      <div class="col-md-6 col-xl-3"><div class="reservation-stat"><span>${label}</span><strong>${value}</strong></div></div>
    `).join('');
  }

  function reservationActions(reservation) {
    const id = reservation.id;
    const status = reservation.status;
    return `
      <div class="d-flex gap-1 justify-content-end flex-wrap">
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-view="${id}"><i class="bi bi-eye"></i></button>
        <button class="btn btn-gold-outline btn-sm" type="button" data-owner-reservation-action="confirm" data-owner-reservation-id="${id}" ${status === 'confirmed' || status === 'completed' || status === 'cancelled' ? 'disabled' : ''}>Confirm</button>
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-action="complete" data-owner-reservation-id="${id}" ${status === 'completed' || status === 'cancelled' ? 'disabled' : ''}>Mark Completed</button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-owner-reservation-action="cancel" data-owner-reservation-id="${id}" ${status === 'cancelled' || status === 'completed' ? 'disabled' : ''}>Cancel</button>
      </div>
    `;
  }

  function renderReservations(loading = false) {
    const body = $('[data-owner-reservations-table]');
    if (!body) return;
    if (loading) {
      body.innerHTML = '<tr><td colspan="9"><div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading reservations...</span></div></td></tr>';
      renderReservationStats();
      return;
    }

    body.innerHTML = state.reservations.length ? state.reservations.map((reservation) => `
      <tr>
        <td data-label="ID">#${reservation.id}</td>
        <td data-label="Guest"><span class="fw-semibold">${esc(reservation.guest_name)}</span></td>
        <td data-label="Phone">${esc(reservation.phone || 'Not provided')}</td>
        <td data-label="Party">${reservation.party_size}</td>
        <td data-label="Date">${esc(dateLabel(reservation.reservation_date))}</td>
        <td data-label="Time">${esc(timeLabel(reservation.reservation_time))}</td>
        <td data-label="Status">${statusBadge(reservation.status)}</td>
        <td data-label="Venue">${esc(reservation.venue?.name || '')}</td>
        <td data-label="">${reservationActions(reservation)}</td>
      </tr>
    `).join('') : '<tr><td colspan="9"><div class="dashboard-empty"><i class="bi bi-calendar-check"></i><span>No reservations found.</span></div></td></tr>';
    renderReservationStats();
  }

  function renderReservationDetail(reservation) {
    $('[data-owner-reservation-title]').textContent = `Reservation #${reservation.id}`;
    const body = $('[data-owner-reservation-detail]');
    if (!body) return;
    body.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6"><div class="facility justify-content-between"><span>Guest</span><strong>${esc(reservation.guest_name)}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Status</span>${statusBadge(reservation.status)}</div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Phone</span><strong>${esc(reservation.phone || 'Not provided')}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Party Size</span><strong>${reservation.party_size}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Date</span><strong>${esc(dateLabel(reservation.reservation_date))}</strong></div></div>
        <div class="col-md-6"><div class="facility justify-content-between"><span>Time</span><strong>${esc(timeLabel(reservation.reservation_time))}</strong></div></div>
        <div class="col-12"><div class="facility justify-content-between"><span>Venue</span><strong>${esc(reservation.venue?.name || '')}</strong></div></div>
        <div class="col-12"><div class="facility"><span><span class="text-muted-pro d-block mb-1">Notes</span>${esc(reservation.notes || 'No notes provided.')}</span></div></div>
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
        opens_at: closed ? null : ($(`[data-hours-open="${index}"]`)?.value || null),
        closes_at: closed ? null : ($(`[data-hours-close="${index}"]`)?.value || null),
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
      status: fd.get('status') || 'draft',
      reservation_enabled: form.elements.reservation_enabled.checked,
      min_guests: Number(fd.get('min_guests') || 1),
      max_guests: Number(fd.get('max_guests') || 10),
      reservation_interval_minutes: Number(fd.get('reservation_interval_minutes') || 30),
      last_reservation_time: nullable(fd.get('last_reservation_time')),
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
      window.tkToast?.('Please add a venue name, type, and city.', 'error');
      return;
    }

    setBusy(true);
    try {
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
      window.tkToast?.(method === 'POST' ? 'Venue created successfully.' : 'Venue updated successfully.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function uploadImages(files) {
    if (!state.venue) {
      window.tkToast?.('Create the venue before uploading images.', 'error');
      return;
    }
    const valid = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!valid.length) return;

    setBusy(true);
    try {
      for (const file of valid) {
        const fd = new FormData();
        fd.append('image', file);
        const { data } = await api().fetch(`/owner/venues/${state.venue.slug}/images`, { method: 'POST', body: fd });
        state.venue = data;
        state.venues = state.venues.map((venue) => String(venue.id) === String(data.id) ? data : venue);
      }
      renderSummary();
      fillForm();
      window.tkToast?.('Image uploaded successfully.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
      const input = $('[data-owner-image-input]');
      if (input) input.value = '';
    }
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

  async function reorderImage(imageId, direction) {
    const images = [...(state.venue?.images || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const index = images.findIndex((image) => String(image.id) === String(imageId));
    const next = index + direction;
    if (index < 0 || next < 0 || next >= images.length) return;
    [images[index], images[next]] = [images[next], images[index]];
    const payload = images.map((image, order) => ({ id: image.id, sort_order: order }));

    setBusy(true);
    try {
      const { data } = await api().fetch(`/owner/venues/${state.venue.slug}/images/reorder`, { method: 'PUT', body: { images: payload } });
      state.venue = data;
      renderSummary();
      fillForm();
      window.tkToast?.('Gallery order updated.', 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteVenue() {
    if (!state.venue) return;
    setBusy(true);
    try {
      await api().fetch(`/owner/venues/${state.venue.slug}`, { method: 'DELETE' });
      state.venue = null;
      state.venues = [];
      renderSummary();
      fillForm();
      renderVenueFilter();
      bootstrap.Modal.getOrCreateInstance($('#ownerDeleteModal')).hide();
      window.tkToast?.('Venue deleted successfully.', 'success');
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
      await loadReservations();
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

  async function reservationAction(id, action) {
    try {
      const { data } = await api().fetch(`/owner/reservations/${id}/${action}`, { method: 'PATCH', body: {} });
      state.reservations = state.reservations.map((reservation) => String(reservation.id) === String(id) ? data : reservation);
      renderReservations();
      await loadReservations();
      window.tkToast?.(`Reservation ${action === 'complete' ? 'completed' : `${action}ed`} successfully.`, 'success');
    } catch (err) {
      window.tkToast?.(friendlyError(err), 'error');
    }
  }

  function bindEvents() {
    $('[data-owner-save]')?.addEventListener('click', saveVenue);
    $('[data-owner-start-create]')?.addEventListener('click', () => $('[data-owner-venue-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    $('[data-owner-image-browse]')?.addEventListener('click', () => $('[data-owner-image-input]')?.click());
    $('[data-owner-image-input]')?.addEventListener('change', (event) => uploadImages(event.target.files));
    $('[data-owner-delete-open]')?.addEventListener('click', () => bootstrap.Modal.getOrCreateInstance($('#ownerDeleteModal')).show());
    $('[data-owner-delete-confirm]')?.addEventListener('click', deleteVenue);
    $('[data-owner-reservations-refresh]')?.addEventListener('click', loadReservations);
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
      const reservationButton = event.target.closest('[data-owner-reservation-action]');
      if (reservationButton) {
        reservationAction(reservationButton.dataset.ownerReservationId, reservationButton.dataset.ownerReservationAction);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadData();
  });
})();
