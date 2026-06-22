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
    return String(value || 'Venue').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
      <img class="${index === 0 ? 'g-main' : ''}" src="${esc(imageUrl(image))}" alt="${esc(venue.name)} image ${index + 1}" />
    `).join('');
  }

  function renderPills(selector, items, icon, emptyText) {
    const root = $(selector);
    if (!root) return;
    root.innerHTML = items?.length ? items.map((item) => `
      <div class="col-md-4 col-6"><div class="facility"><i class="bi ${esc(icon(item))}"></i> ${esc(item.name)}</div></div>
    `).join('') : `<div class="col-12 text-muted-pro">${esc(emptyText)}</div>`;
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
    setText('[data-detail-name]', venue.name || 'Venue');
    setText('[data-detail-title]', venue.name || 'Venue');
    setText('[data-detail-type]', titleCase(venue.venue_type));
    setText('[data-detail-cuisines]', listNames(venue.cuisine_types, 'Cuisine not set'));
    setText('[data-detail-location]', [venue.city, venue.country].filter(Boolean).join(', '));
    setText('[data-detail-description]', venue.description || 'This venue has not added a description yet.');
    setText('[data-detail-side-title]', venue.name || 'Venue details');
    setText('[data-detail-side-copy]', `${titleCase(venue.venue_type)} in ${venue.city || 'your city'}`);

    const featured = $('[data-detail-featured]');
    if (featured) featured.hidden = !venue.featured;

    const logo = $('[data-detail-logo]');
    if (logo && venue.logo_image) {
      logo.src = venue.logo_image;
      logo.hidden = false;
    }

    renderGallery(venue);
    renderPills('[data-detail-facilities]', venue.facilities, iconForFacility, 'No facilities listed yet.');
    renderPills('[data-detail-cuisine-list]', venue.cuisine_types, () => 'bi-egg-fried', 'No cuisine types listed yet.');
    renderPills('[data-detail-payments]', venue.payment_options, () => 'bi-credit-card', 'No payment methods listed yet.');
    renderHours(venue.opening_hours || []);
    renderContact(venue);
    hydrateReservationForm(venue);
  }

  function hydrateReservationForm(venue) {
    const form = $('[data-reservation-form]');
    if (!form) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    form.elements.reservation_date.min = new Date().toISOString().slice(0, 10);
    form.elements.reservation_date.value = tomorrow.toISOString().slice(0, 10);
    form.elements.reservation_time.value = venue.reservation_settings?.last_reservation_time || '19:00';
    form.elements.party_size.min = venue.reservation_settings?.min_guests || 1;
    form.elements.party_size.max = venue.reservation_settings?.max_guests || 20;
    form.elements.party_size.value = Math.max(venue.reservation_settings?.min_guests || 1, 2);
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
    button.innerHTML = busy ? '<span class="spinner-border spinner-border-sm me-1"></span>Sending...' : 'Send request';
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
      setText('[data-detail-description]', 'Choose a venue from the discovery page to view details.');
      window.tkToast?.('Choose a venue from discovery first.', 'info');
      return;
    }

    try {
      const { data } = await api().fetch(`/venues/${encodeURIComponent(slug)}`, { skipAuthRedirect: true });
      renderVenue(data);
    } catch (err) {
      setText('[data-detail-title]', 'Venue unavailable');
      setText('[data-detail-description]', 'This venue is not available for reservations right now.');
      window.tkToast?.(err?.message || 'Unable to load venue.', 'error');
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
    $('[data-reservation-form]')?.addEventListener('submit', submitReservation);
  });
})();
