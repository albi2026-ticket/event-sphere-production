(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const fallbackImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=80';
  const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  let reservations = [];
  let cancelId = null;

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
    if (!value) return 'Date not set';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function timeLabel(value) {
    return String(value || '').slice(0, 5) || 'Time not set';
  }

  function venueUrl(reservation) {
    const slug = reservation.venue?.slug;
    return slug ? `venue.html?venue=${encodeURIComponent(slug)}` : 'venue.html';
  }

  function reservationCard(reservation) {
    const image = reservation.venue?.image_url || fallbackImage;
    const status = reservation.status || 'pending';
    const canCancel = status === 'pending';
    return `
      <div class="col-md-6 col-xl-4">
        <article class="venue-card my-reservation-card">
          <div class="img-wrap">
            <img src="${esc(image)}" alt="">
            <div class="badges">
              ${statusBadge(status)}
              <span class="fav"><i class="bi bi-calendar-heart"></i></span>
            </div>
          </div>
          <div class="body">
            <div class="d-flex justify-content-between gap-2 align-items-start">
              <h3 class="title m-0">${esc(reservation.venue?.name || 'Venue')}</h3>
              <span class="rating"><i class="bi bi-people"></i> ${esc(reservation.party_size || '')}</span>
            </div>
            <div class="meta">
              <span><i class="bi bi-calendar3 me-1"></i>${esc(dateLabel(reservation.reservation_date))}</span>
              <span class="dot"></span>
              <span><i class="bi bi-clock me-1"></i>${esc(timeLabel(reservation.reservation_time))}</span>
            </div>
            <div class="meta">
              <span>${esc(reservation.venue?.city || 'City')}</span>
              <span class="dot"></span>
              <span>${esc(reservation.venue?.venue_type || 'venue')}</span>
            </div>
            <div class="footer-row my-reservation-actions">
              <button class="btn btn-gold-outline btn-sm" type="button" data-reservation-view="${reservation.id}">View Reservation</button>
              ${canCancel ? `<button class="btn btn-glass btn-sm" type="button" data-reservation-cancel="${reservation.id}">Cancel Reservation</button>` : ''}
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
    };
    return `
      <div class="col-12">
        <div class="reservation-empty-state">
          <i class="bi bi-calendar-check"></i>
          <h3>${labels[status]}</h3>
          <p class="mb-0">Your ${status} reservations will appear here.</p>
        </div>
      </div>
    `;
  }

  function renderStats(grouped) {
    const root = $('[data-my-reservations-stats]');
    if (!root) return;
    const labels = {
      pending: 'Pending Reservations',
      confirmed: 'Confirmed Reservations',
      cancelled: 'Cancelled Reservations',
      completed: 'Completed Reservations',
    };
    root.innerHTML = statuses.map((status) => `
      <div class="col-md-6 col-xl-3">
        <div class="reservation-stat">
          <span>${labels[status]}</span>
          <strong>${grouped[status]?.length || 0}</strong>
        </div>
      </div>
    `).join('');
  }

  function render(loading = false) {
    const grouped = Object.fromEntries(statuses.map((status) => [status, []]));
    reservations.forEach((reservation) => {
      const status = statuses.includes(reservation.status) ? reservation.status : 'pending';
      grouped[status].push(reservation);
    });
    renderStats(grouped);

    statuses.forEach((status) => {
      const root = document.querySelector(`[data-reservations-list="${status}"]`);
      if (!root) return;
      if (loading) {
        root.innerHTML = '<div class="col-12"><div class="reservation-empty-state"><span class="spinner-border spinner-border-sm me-2"></span>Loading reservations...</div></div>';
        return;
      }
      root.innerHTML = grouped[status].length ? grouped[status].map(reservationCard).join('') : emptyState(status);
    });
  }

  function renderDetail(reservation) {
    $('[data-reservation-detail-title]').textContent = `Reservation #${reservation.id}`;
    $('[data-reservation-detail-body]').innerHTML = `
      <div class="my-reservation-detail">
        <img src="${esc(reservation.venue?.image_url || fallbackImage)}" alt="">
        <div class="facility justify-content-between"><span>Venue</span><strong>${esc(reservation.venue?.name || 'Venue')}</strong></div>
        <div class="facility justify-content-between"><span>Status</span>${statusBadge(reservation.status)}</div>
        <div class="facility justify-content-between"><span>Date</span><strong>${esc(dateLabel(reservation.reservation_date))}</strong></div>
        <div class="facility justify-content-between"><span>Time</span><strong>${esc(timeLabel(reservation.reservation_time))}</strong></div>
        <div class="facility justify-content-between"><span>Party size</span><strong>${esc(reservation.party_size || '')}</strong></div>
        <div class="facility justify-content-between"><span>Location</span><strong>${esc([reservation.venue?.city, reservation.venue?.country].filter(Boolean).join(', ') || 'Location not set')}</strong></div>
        <div class="d-grid mt-3"><a class="btn btn-gold-outline" href="${esc(venueUrl(reservation))}">Open Venue</a></div>
      </div>
    `;
    bootstrap.Modal.getOrCreateInstance($('#reservationDetailModal')).show();
  }

  async function loadReservations() {
    render(true);
    try {
      const { data } = await api().fetch('/my-reservations?per_page=100');
      reservations = Array.isArray(data) ? data : [];
      render();
    } catch (err) {
      window.tkToast?.(err?.message || 'Unable to load reservations.', 'error');
      render();
    }
  }

  async function cancelReservation() {
    if (!cancelId) return;
    const button = $('[data-reservation-cancel-confirm]');
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Cancelling...';
    }
    try {
      const { data } = await api().fetch(`/reservations/${cancelId}/cancel`, { method: 'PATCH' });
      reservations = reservations.map((reservation) => Number(reservation.id) === Number(cancelId) ? data : reservation);
      bootstrap.Modal.getInstance($('#reservationCancelModal'))?.hide();
      cancelId = null;
      render();
      window.tkToast?.('Reservation cancelled successfully.', 'success');
    } catch (err) {
      window.tkToast?.(err?.originalMessage || err?.message || 'Unable to cancel reservation.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Cancel reservation';
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
        bootstrap.Modal.getOrCreateInstance($('#reservationCancelModal')).show();
      }
    });

    $('[data-reservation-cancel-confirm]')?.addEventListener('click', cancelReservation);
  });
})();
