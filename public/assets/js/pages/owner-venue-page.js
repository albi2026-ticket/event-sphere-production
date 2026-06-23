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
    reservationStats: { pending: 0, confirmed: 0, cancelled: 0, today: 0 },
    reservationFilters: { view: '', status: '', date: '', venue_id: '' },
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

  function dateTimeLabel(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
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
  }

  function renderSummary() {
    const hasVenue = Boolean(state.venue);
    $('[data-owner-empty]')?.toggleAttribute('hidden', hasVenue);
    $('[data-owner-summary]')?.toggleAttribute('hidden', !hasVenue);
    $('[data-owner-delete-section]')?.toggleAttribute('hidden', !hasVenue);
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
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All restaurants & bars</option>' + state.venues.map((venue) => `<option value="${venue.id}">${esc(venue.name)}</option>`).join('');
    select.value = current;
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
    return `
      <div class="owner-reservation-actions">
        <button class="btn btn-glass btn-sm" type="button" data-owner-reservation-view="${id}">
          <i class="bi bi-eye"></i><span>View Details</span>
        </button>
        <button class="btn btn-gold-outline btn-sm" type="button" data-owner-reservation-action="confirm" data-owner-reservation-id="${id}" ${status === 'confirmed' || status === 'completed' || status === 'cancelled' ? 'disabled' : ''}>
          <i class="bi bi-check2-circle"></i><span>Confirm</span>
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-owner-reservation-action="cancel" data-owner-reservation-id="${id}" ${status === 'cancelled' || status === 'completed' ? 'disabled' : ''}>
          <i class="bi bi-x-circle"></i><span>Cancel</span>
        </button>
      </div>
    `;
  }

  function renderReservations(loading = false) {
    const body = $('[data-owner-reservations-table]');
    if (!body) return;
    if (loading) {
      body.innerHTML = '<tr><td colspan="7"><div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading reservations...</span></div></td></tr>';
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
        <div class="col-12"><div class="facility justify-content-between"><span>Restaurant / Bar</span><strong>${esc(reservation.venue?.name || '')}</strong></div></div>
        <div class="col-12"><div class="facility"><span><span class="text-muted-pro d-block mb-1">Notes</span>${esc(reservation.notes || 'No notes provided.')}</span></div></div>
        ${reservation.status === 'cancelled' ? `
          <div class="col-md-6"><div class="facility justify-content-between"><span>Cancelled At</span><strong>${esc(dateTimeLabel(reservation.cancelled_at))}</strong></div></div>
          <div class="col-12"><div class="facility"><span><span class="text-muted-pro d-block mb-1">Cancellation Reason</span>${esc(reservation.cancellation_reason || 'No reason provided.')}</span></div></div>
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
    hydrateTimeSelects();
    bindEvents();
    loadData();
  });
})();
