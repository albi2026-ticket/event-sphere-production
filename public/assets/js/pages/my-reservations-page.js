(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const tr = (key, fallback, replacements) => window.t?.(key, replacements) || fallback;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const fallbackImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80';
  const statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  const reservationsPerPage = 25;
  let reservations = [];
  let cancelId = null;
  let reservationsRequest = null;
  let reservationsLoaded = false;
  let loadGeneration = 0;
  let lastRenderSignature = '';
  let lastStatsSignature = '';
  const listRoots = new Map();
  const sectionRenderSignatures = new Map();
  const reservationsById = new Map();

  function rootForStatus(status) {
    if (!listRoots.has(status)) {
      listRoots.set(status, document.querySelector(`[data-reservations-list="${status}"]`));
    }

    return listRoots.get(status);
  }

  function onIdle(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 800 });
      return;
    }

    window.setTimeout(callback, 0);
  }

  function statusBadge(status) {
    const map = {
      pending: 'reservation-status-pending',
      confirmed: 'reservation-status-confirmed',
      completed: 'reservation-status-completed',
      cancelled: 'reservation-status-cancelled',
      no_show: 'reservation-status-no_show',
    };
    const keys = {
      pending: 'reservation.reservation_pending',
      confirmed: 'reservation.reservation_confirmed',
      completed: 'reservation.reservation_completed',
      cancelled: 'reservation.reservation_cancelled',
      no_show: 'reservation.no_show',
    };
    const label = tr(keys[status] || 'reservation.reservation_pending', String(status || 'pending').replace(/_/g, ' '));
    return `<span class="reservation-status ${map[status] || ''}">${esc(label)}</span>`;
  }

  function dateLabel(value) {
    if (!value) return tr('reservation.date_not_set', 'Date not set');
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeLabel(value) {
    return String(value || '').slice(0, 5) || tr('reservation.time_not_set', 'Time not set');
  }

  function reservationDateTime(reservation) {
    const date = reservation.reservation_date;
    const time = String(reservation.reservation_time || '').slice(0, 5);
    const parsed = date && time ? new Date(`${date}T${time}:00`) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  function reservationSortValue(reservation) {
    const date = reservation.reservation_date || '';
    const time = String(reservation.reservation_time || '').slice(0, 5);
    return `${date}T${time || '00:00'}:00`;
  }

  function sortReservations(items) {
    return items.sort((a, b) => reservationSortValue(b).localeCompare(reservationSortValue(a)));
  }

  function mergeReservations(items = []) {
    items.forEach((reservation) => {
      if (reservation?.id) reservationsById.set(Number(reservation.id), reservation);
    });
    reservations = sortReservations(Array.from(reservationsById.values()));
  }

  function canCancelReservation(reservation) {
    const status = reservation.status || 'pending';
    const startsAt = reservationDateTime(reservation);
    return ['pending', 'confirmed'].includes(status) && startsAt && startsAt > new Date();
  }

  function dateTimeLabel(value) {
    if (!value) return tr('reservation.not_set', 'Not set');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function venueUrl(reservation) {
    const slug = reservation.venue?.slug;
    return slug ? (window.EventSphereRoutes?.restaurantUrl?.(slug) || `/restaurant/${encodeURIComponent(slug)}`) : '/restaurant';
  }

  function reservationCard(reservation) {
    const image = reservation.venue?.image_url || fallbackImage;
    const status = reservation.status || 'pending';
    const canCancel = canCancelReservation(reservation);
    return `
      <div class="col-md-6 col-xl-4">
        <article class="venue-card venue-card-premium my-reservation-card reservation-card-premium">
          <div class="img-wrap">
            <img loading="lazy" decoding="async" src="${esc(image)}" alt="${esc(`${reservation.venue?.name || tr('common.restaurant_bar', 'Restaurant / Bar')} reservation venue`)}">
            <div class="badges">
              ${statusBadge(status)}
              <span class="fav"><i class="bi bi-calendar-heart"></i></span>
            </div>
          </div>
          <div class="body">
            <div class="d-flex justify-content-between gap-2 align-items-start">
              <h3 class="title m-0">${esc(reservation.venue?.name || tr('common.restaurant_bar', 'Restaurant / Bar'))}</h3>
              <span class="rating"><i class="bi bi-people"></i> ${esc(reservation.party_size || '')}</span>
            </div>
            <div class="meta">
              <span><i class="bi bi-calendar3 me-1"></i>${esc(dateLabel(reservation.reservation_date))}</span>
              <span class="dot"></span>
              <span><i class="bi bi-clock me-1"></i>${esc(timeLabel(reservation.reservation_time))}</span>
            </div>
            <div class="meta">
              <span>${esc(reservation.venue?.city || tr('restaurants.city', 'City'))}</span>
              <span class="dot"></span>
              <span>${esc(reservation.venue?.venue_type || 'restaurant / bar')}</span>
            </div>
            <div class="footer-row my-reservation-actions">
              <button class="btn btn-gold-outline btn-sm" type="button" data-reservation-view="${reservation.id}" data-i18n="buttons.view_reservation">${window.t?.('buttons.view_reservation') || 'View Reservation'}</button>
              ${canCancel ? `<button class="btn btn-glass btn-sm" type="button" data-reservation-cancel="${reservation.id}" data-i18n="buttons.cancel_reservation">${window.t?.('buttons.cancel_reservation') || 'Cancel Reservation'}</button>` : ''}
            </div>
          </div>
        </article>
      </div>
    `;
  }

  function emptyState(status) {
    const labels = {
      pending: 'No pending reservations.',
      confirmed: 'No confirmed reservations.',
      cancelled: 'No cancelled reservations.',
      completed: 'No completed reservations.',
      no_show: 'No no-show reservations.',
    };
    return `
      <div class="col-12">
        <div class="reservation-empty-state">
          <i class="bi bi-calendar-check"></i>
          <h3>${esc(tr({
            pending: 'reservation.pending_reservations',
            confirmed: 'reservation.confirmed_reservations',
            cancelled: 'reservation.cancelled_reservations',
            completed: 'reservation.completed_reservations',
            no_show: 'reservation.no_show_reservations',
          }[status] || 'reservation.no_reservations_found', labels[status]))}</h3>
          <p class="mb-0" data-i18n="empty.no_reservations_found">${tr('empty.no_reservations_found', 'No reservations found.')}</p>
        </div>
      </div>
    `;
  }

  function renderStats(grouped) {
    const root = $('[data-my-reservations-stats]');
    if (!root) return;
    const signature = statuses.map((status) => `${status}:${grouped[status]?.length || 0}`).join('|');
    if (signature === lastStatsSignature) return;
    lastStatsSignature = signature;

    const labels = {
      pending: tr('reservation.pending_reservations', 'Pending Reservations'),
      confirmed: tr('reservation.confirmed_reservations', 'Confirmed Reservations'),
      cancelled: tr('reservation.cancelled_reservations', 'Cancelled Reservations'),
      completed: tr('reservation.completed_reservations', 'Completed Reservations'),
      no_show: tr('reservation.no_show_reservations', 'No Show Reservations'),
    };
    root.innerHTML = statuses.map((status) => `
      <div class="col-md-6 col-xl">
        <div class="reservation-stat">
          <span>${labels[status]}</span>
          <strong>${grouped[status]?.length || 0}</strong>
        </div>
      </div>
    `).join('');
  }

  function render(loading = false) {
    const signature = loading
      ? 'loading'
      : reservations.map((reservation) => `${reservation.id}:${reservation.status}:${reservation.updated_at || reservation.cancelled_at || ''}`).join('|');
    if (signature === lastRenderSignature) return;
    lastRenderSignature = signature;

    const grouped = Object.fromEntries(statuses.map((status) => [status, []]));
    reservations.forEach((reservation) => {
      const status = statuses.includes(reservation.status) ? reservation.status : 'pending';
      grouped[status].push(reservation);
    });
    renderStats(grouped);

    statuses.forEach((status) => {
      const root = rootForStatus(status);
      if (!root) return;
      if (loading) {
        if (sectionRenderSignatures.get(status) === 'loading') return;
        sectionRenderSignatures.set(status, 'loading');
        root.innerHTML = Array.from({ length: 3 }, () => `
          <div class="col-md-6 col-xl-4">
            <div class="reservation-card-skeleton">
              <div class="reservation-skeleton-media"></div>
              <div class="reservation-skeleton-content">
                <div class="reservation-skeleton-line short"></div>
                <div class="reservation-skeleton-line"></div>
                <div class="reservation-skeleton-line"></div>
              </div>
            </div>
          </div>
        `).join('');
        return;
      }
      const sectionSignature = grouped[status]
        .map((reservation) => `${reservation.id}:${reservation.status}:${reservation.updated_at || reservation.cancelled_at || ''}`)
        .join('|') || 'empty';
      if (sectionRenderSignatures.get(status) === sectionSignature) return;
      sectionRenderSignatures.set(status, sectionSignature);
      root.innerHTML = grouped[status].length ? grouped[status].map(reservationCard).join('') : emptyState(status);
    });
  }

  function renderDetail(reservation) {
    $('[data-reservation-detail-title]').textContent = tr('reservation.reservation_details', 'Reservation Details');
    $('[data-reservation-detail-body]').innerHTML = `
      <div class="my-reservation-detail reservation-detail-premium">
        <img loading="lazy" decoding="async" src="${esc(reservation.venue?.image_url || fallbackImage)}" alt="${esc(`${reservation.venue?.name || tr('common.restaurant_bar', 'Restaurant / Bar')} reservation details`)}">
        <div class="facility justify-content-between"><span data-i18n="common.restaurant_bar">${tr('common.restaurant_bar', 'Restaurant / Bar')}</span><strong>${esc(reservation.venue?.name || tr('common.restaurant_bar', 'Restaurant / Bar'))}</strong></div>
        <div class="facility justify-content-between"><span data-i18n="common.status">${window.t?.('common.status') || 'Status'}</span>${statusBadge(reservation.status)}</div>
        <div class="facility justify-content-between"><span data-i18n="common.date">${window.t?.('common.date') || 'Date'}</span><strong>${esc(dateLabel(reservation.reservation_date))}</strong></div>
        <div class="facility justify-content-between"><span data-i18n="common.time">${window.t?.('common.time') || 'Time'}</span><strong>${esc(timeLabel(reservation.reservation_time))}</strong></div>
        <div class="facility justify-content-between"><span data-i18n="common.party_size">${window.t?.('common.party_size') || 'Party size'}</span><strong>${esc(reservation.party_size || '')}</strong></div>
        <div class="facility justify-content-between"><span data-i18n="common.location">${tr('common.location', 'Location')}</span><strong>${esc([reservation.venue?.city, reservation.venue?.country].filter(Boolean).join(', ') || tr('reservation.location_not_set', 'Location not set'))}</strong></div>
        ${reservation.status === 'cancelled' ? `
          <div class="facility justify-content-between"><span data-i18n="reservation.cancelled_at">${tr('reservation.cancelled_at', 'Cancelled At')}</span><strong>${esc(dateTimeLabel(reservation.cancelled_at))}</strong></div>
          ${reservation.owner_cancellation_reason ? `<div class="facility justify-content-between"><span data-i18n="reservation.cancelled_by">${tr('reservation.cancelled_by', 'Cancelled By')}</span><strong>${tr('restaurants.restaurant', 'Restaurant')}</strong></div>` : ''}
          <div class="facility"><span><span class="text-muted-pro d-block mb-1" data-i18n="reservation.reason">${tr('reservation.reason', 'Reason')}</span>${esc(reservation.owner_cancellation_reason || reservation.cancellation_reason || tr('reservation.no_reason_provided', 'No reason provided.'))}</span></div>
        ` : ''}
        <div class="d-grid mt-3"><a class="btn btn-gold-outline" href="${esc(venueUrl(reservation))}" data-i18n="buttons.open_restaurant_bar">${window.t?.('buttons.open_restaurant_bar') || 'Open Restaurant / Bar'}</a></div>
      </div>
    `;
    bootstrap.Modal.getOrCreateInstance($('#reservationDetailModal')).show();
  }

  async function loadReservations() {
    if (reservationsRequest) return reservationsRequest;
    if (reservationsLoaded) return Promise.resolve();
    render(true);

    reservationsRequest = (async () => {
      const generation = ++loadGeneration;
      const firstPage = await api().fetch(`/my-reservations?per_page=${reservationsPerPage}&page=1`);
      if (generation !== loadGeneration) return;

      mergeReservations(Array.isArray(firstPage.data) ? firstPage.data : []);
      render();

      const lastPage = Number(firstPage.meta?.last_page || 1);
      if (lastPage <= 1) {
        reservationsLoaded = true;
        return;
      }

      await new Promise((resolve, reject) => onIdle(async () => {
        for (let page = 2; page <= lastPage; page += 1) {
          try {
            const response = await api().fetch(`/my-reservations?per_page=${reservationsPerPage}&page=${page}`);
            if (generation !== loadGeneration) {
              resolve();
              return;
            }

            mergeReservations(Array.isArray(response.data) ? response.data : []);
            render();
          } catch (err) {
            reject(err);
            return;
          }
        }
        reservationsLoaded = true;
        resolve();
      }));
    })();

    try {
      await reservationsRequest;
    } catch (err) {
      window.tkToast?.(err?.message || tr('loading.loading_reservations', 'Unable to load reservations.'), 'error');
      render();
    } finally {
      reservationsRequest = null;
    }
  }

  async function cancelReservation() {
    if (!cancelId) return;
    const button = $('[data-reservation-cancel-confirm]');
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${tr('reservation.cancelling', 'Cancelling...')}`;
    }
    try {
      const reason = String($('[data-reservation-cancel-reason]')?.value || '').trim();
      const { data } = await api().fetch(`/reservations/${cancelId}/cancel`, {
        method: 'PATCH',
        body: { cancellation_reason: reason || null },
      });
      reservationsById.set(Number(cancelId), data);
      reservations = sortReservations(Array.from(reservationsById.values()));
      lastRenderSignature = '';
      bootstrap.Modal.getInstance($('#reservationCancelModal'))?.hide();
      const reasonField = $('[data-reservation-cancel-reason]');
      if (reasonField) reasonField.value = '';
      cancelId = null;
      render();
      window.tkToast?.(window.t?.('toast.reservation_cancelled_successfully') || 'Reservation cancelled successfully.', 'success');
    } catch (err) {
      window.tkToast?.(err?.originalMessage || err?.message || tr('toast.operation_failed', 'Unable to cancel reservation.'), 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = window.t?.('buttons.cancel_reservation') || 'Cancel reservation';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const user = auth()?.requireAuth(['user', 'organizer', 'admin'], { requireApprovedOrganizer: false });
    if (!user) return;

    loadReservations();

    document.addEventListener('click', (event) => {
      const view = event.target.closest('[data-reservation-view]');
      if (view) {
        const reservation = reservations.find((item) => Number(item.id) === Number(view.dataset.reservationView));
        if (reservation) renderDetail(reservation);
        return;
      }

      const cancel = event.target.closest('[data-reservation-cancel]');
      if (cancel) {
        cancelId = cancel.dataset.reservationCancel;
        const reasonField = $('[data-reservation-cancel-reason]');
        if (reasonField) reasonField.value = '';
        bootstrap.Modal.getOrCreateInstance($('#reservationCancelModal')).show();
      }
    });

    $('[data-reservation-cancel-confirm]')?.addEventListener('click', cancelReservation);
  });

  document.addEventListener('tiketa:language-changed', () => {
    lastRenderSignature = '';
    lastStatsSignature = '';
    sectionRenderSignatures.clear();
    render();
  });
})();
