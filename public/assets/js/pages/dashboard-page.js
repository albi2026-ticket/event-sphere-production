(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const ticketsApi = () => window.EventSphereTickets;
  const ordersApi = () => window.EventSphereOrders;
  const favApi = () => window.EventSphereFavorites;
  const u = () => window.EventSphereUtils;

  const state = {
    summary: null,
    profile: null,
    upcomingEvents: [],
    activeTickets: [],
    tickets: [],
    ticketMeta: null,
    orders: [],
    orderMeta: null,
    favorites: [],
    favoriteMeta: null,
    loading: {
      summary: true,
      profile: true,
      upcoming: true,
      tickets: true,
      orders: true,
      favorites: true,
    },
    errors: {},
    ticketView: 'active',
    ticketPage: 1,
    orderPage: 1,
    favoritePage: 1,
  };

  function rows(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
  }

  function escape(value) {
    return u().escapeHtml(value ?? '');
  }

  function statusBadge(status) {
    const value = String(status || 'unknown').toLowerCase();
    return `<span class="badge status-badge status-${escape(value)}">${escape(value.replace(/_/g, ' '))}</span>`;
  }

  function dateLabel(value, timezone) {
    return value ? u().formatEventDate(value, timezone) : '-';
  }

  function shortDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function emptyState(icon, title, detail, action = '') {
    return `
      <div class="dashboard-empty">
        <i class="bi ${icon}"></i>
        <div>
          <div class="fw-semibold">${escape(title)}</div>
          ${detail ? `<small>${escape(detail)}</small>` : ''}
          ${action}
        </div>
      </div>`;
  }

  function loadingState(label) {
    return `<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>${escape(label)}</span></div>`;
  }

  function errorState(message, retryAttr) {
    return `<div class="dashboard-empty text-danger"><i class="bi bi-exclamation-triangle"></i><span>${escape(message)}</span><button class="btn btn-glass btn-sm" type="button" ${retryAttr}>Retry</button></div>`;
  }

  function pagination(meta, attr) {
    if (!meta || meta.last_page <= 1) return '';
    const cur = Number(meta.current_page || 1);
    const last = Number(meta.last_page || 1);
    return `
      <div class="dashboard-pagination">
        <button class="btn btn-glass btn-sm" type="button" ${attr}="${cur - 1}" ${cur <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
        <span class="text-muted-pro small">Page ${cur} of ${last}</span>
        <button class="btn btn-glass btn-sm" type="button" ${attr}="${cur + 1}" ${cur >= last ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>
      </div>`;
  }

  async function loadSummary() {
    state.loading.summary = true;
    state.errors.summary = null;
    try {
      const { data } = await api().fetch('/me/dashboard/summary');
      state.summary = data;
    } catch (err) {
      state.errors.summary = err.message || 'Failed to load dashboard summary';
    } finally {
      state.loading.summary = false;
      renderGreeting();
      renderAlert();
      renderKpis();
      renderActivity();
    }
  }

  async function loadProfile() {
    state.loading.profile = true;
    state.errors.profile = null;
    try {
      const { data } = await api().fetch('/me/profile');
      state.profile = data;
    } catch (err) {
      state.errors.profile = err.message || 'Failed to load profile';
    } finally {
      state.loading.profile = false;
      renderGreeting();
      hydrateProfileForm();
    }
  }

  async function loadUpcomingEvents() {
    state.loading.upcoming = true;
    state.errors.upcoming = null;
    renderUpcomingEvents();
    try {
      const result = await api().fetch('/me/dashboard/upcoming-events');
      state.upcomingEvents = rows(result.raw || result.data);
    } catch (err) {
      state.errors.upcoming = err.message || 'Failed to load upcoming events';
    } finally {
      state.loading.upcoming = false;
      renderUpcomingEvents();
      renderAlert();
    }
  }

  function ticketParams() {
    const search = document.querySelector('[data-ticket-search]')?.value;
    const status = document.querySelector('[data-ticket-status]')?.value;
    const params = { per_page: 6, page: state.ticketPage };

    if (search) params.search = search;
    if (status) params.status = status;

    if (state.ticketView === 'active') {
      params.status = status || 'active';
      params.sort = 'starts_at';
      params.upcoming = 1;
    } else if (state.ticketView === 'upcoming') {
      params.upcoming = 1;
      params.sort = 'starts_at';
    } else if (state.ticketView === 'past') {
      params.per_page = 8;
    } else {
      params.sort = '-created_at';
    }

    return params;
  }

  async function loadTickets() {
    state.loading.tickets = true;
    state.errors.tickets = null;
    renderTickets();
    try {
      const params = ticketParams();
      let result;
      if (state.ticketView === 'past') {
        result = await ticketsApi().listTicketHistory(params);
      } else {
        result = await ticketsApi().listTickets(params);
      }
      state.tickets = result.tickets;
      state.ticketMeta = result.meta;
    } catch (err) {
      state.errors.tickets = err.message || 'Failed to load tickets';
    } finally {
      state.loading.tickets = false;
      renderTickets();
      renderActivity();
      renderAlert();
    }
  }

  async function loadOrders() {
    state.loading.orders = true;
    state.errors.orders = null;
    renderOrders();
    try {
      const status = document.querySelector('[data-order-filter]')?.value;
      const search = document.querySelector('[data-order-search]')?.value;
      const result = await ordersApi().listMyOrders({
        per_page: 8,
        page: state.orderPage,
        sort: '-created_at',
        payment_status: status,
        search,
      });
      state.orders = result.orders;
      state.orderMeta = result.meta;
    } catch (err) {
      state.errors.orders = err.message || 'Failed to load orders';
    } finally {
      state.loading.orders = false;
      renderOrders();
      renderActivity();
      renderAlert();
    }
  }

  async function loadFavorites() {
    state.loading.favorites = true;
    state.errors.favorites = null;
    renderFavorites();
    try {
      const search = document.querySelector('[data-favorite-search]')?.value;
      const sort = document.querySelector('[data-favorite-sort]')?.value || '-created_at';
      const qs = new URLSearchParams({ per_page: 6, page: state.favoritePage, sort });
      if (search) qs.set('search', search);
      const { data, meta } = await api().fetch(`/me/favorites?${qs.toString()}`);
      state.favorites = rows(data);
      state.favoriteMeta = meta;
    } catch (err) {
      state.errors.favorites = err.message || 'Failed to load favorites';
    } finally {
      state.loading.favorites = false;
      renderFavorites();
      renderActivity();
      renderAlert();
    }
  }

  function renderGreeting() {
    const user = state.profile || state.summary?.profile || auth().getUser?.();
    const name = user?.name || user?.email || 'there';
    document.querySelector('[data-dashboard-greeting]')?.replaceChildren(document.createTextNode(`Hi, ${name}`));

    const upcoming = state.summary?.stats?.upcoming_events_count ?? 0;
    const subtitle = upcoming
      ? `You have ${upcoming} upcoming event${upcoming === 1 ? '' : 's'} on your account.`
      : 'Your tickets, orders, favorites, and profile live here.';
    document.querySelector('[data-dashboard-subtitle]')?.replaceChildren(document.createTextNode(subtitle));
  }

  function renderAlert() {
    const el = document.querySelector('[data-dashboard-alert]');
    if (!el) return;
    const errors = Object.values(state.errors).filter(Boolean);
    el.innerHTML = errors.length
      ? `<div class="alert border-pro dashboard-note text-danger"><i class="bi bi-exclamation-triangle me-2"></i>${escape(errors[0])}</div>`
      : '';
  }

  function renderKpis() {
    const kpiRow = document.querySelector('[data-dashboard-kpis]');
    if (!kpiRow) return;
    if (state.loading.summary) {
      kpiRow.innerHTML = Array.from({ length: 4 }).map(() => '<div class="col-md-3"><div class="kpi"><div class="skel dashboard-skel-line"></div><div class="skel dashboard-skel-value"></div></div></div>').join('');
      return;
    }
    const stats = state.summary?.stats || {};
    kpiRow.innerHTML = `
      <div class="col-md-3"><div class="kpi"><div class="label">Upcoming events</div><div class="value">${stats.upcoming_events_count ?? 0}</div><div class="delta">From active tickets</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Active tickets</div><div class="value">${stats.active_tickets_count ?? 0}</div><div class="delta">${stats.tickets_count ?? 0} total tickets</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Total orders</div><div class="value">${stats.orders_count ?? 0}</div><div class="delta">${u().formatMoney(stats.total_spent || 0, 'USD')} spent</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Favorites</div><div class="value">${stats.favorites_count ?? 0}</div><div class="delta">Saved events</div></div></div>`;
  }

  function renderUpcomingEvents() {
    const el = document.querySelector('[data-dashboard-upcoming-events]');
    if (!el) return;
    if (state.loading.upcoming) {
      el.innerHTML = loadingState('Loading upcoming events...');
      return;
    }
    if (state.errors.upcoming) {
      el.innerHTML = errorState(state.errors.upcoming, 'data-retry-upcoming');
      return;
    }
    el.innerHTML = state.upcomingEvents.slice(0, 4).map((event) => `
      <a class="dashboard-event-row" href="event-details.html?slug=${encodeURIComponent(event.slug)}">
        <img src="${escape(u().eventImage(event))}" alt=""/>
        <div class="flex-grow-1">
          <div class="fw-semibold">${escape(event.title)}</div>
          <small>${escape(event.venue_name || '')}${event.city ? `, ${escape(event.city)}` : ''}</small>
        </div>
        <div class="text-end small text-muted-pro">${escape(dateLabel(event.starts_at, event.timezone))}</div>
      </a>
    `).join('') || emptyState('bi-calendar2-plus', 'No upcoming events', 'When you buy tickets for future events, they will appear here.', '<a class="btn btn-glass btn-sm mt-2" href="events.html">Browse events</a>');
  }

  function renderTickets() {
    const el = document.querySelector('[data-dashboard-tickets]');
    const pager = document.querySelector('[data-ticket-pagination]');
    if (!el) return;
    if (state.loading.tickets) {
      el.innerHTML = `<div class="col-12">${loadingState('Loading tickets...')}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    if (state.errors.tickets) {
      el.innerHTML = `<div class="col-12">${errorState(state.errors.tickets, 'data-retry-tickets')}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    el.innerHTML = state.tickets.length
      ? state.tickets.map((ticket) => ticketsApi().renderTicketCard(ticket)).join('')
      : `<div class="col-12">${emptyState('bi-ticket-perforated', 'No tickets found', 'Try another filter or browse events to buy tickets.', '<a class="btn btn-glass btn-sm mt-2" href="events.html">Find events</a>')}</div>`;
    ticketsApi().hydrateQrImages(el);
    if (pager) pager.innerHTML = pagination(state.ticketMeta, 'data-ticket-page');
  }

  function renderOrders() {
    const body = document.querySelector('[data-dashboard-orders] tbody');
    const pager = document.querySelector('[data-order-pagination]');
    if (!body) return;
    if (state.loading.orders) {
      body.innerHTML = `<tr><td colspan="6">${loadingState('Loading orders...')}</td></tr>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    if (state.errors.orders) {
      body.innerHTML = `<tr><td colspan="6">${errorState(state.errors.orders, 'data-retry-orders')}</td></tr>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    body.innerHTML = state.orders.map((order) => `
      <tr>
        <td data-label="Order"><div class="fw-semibold">${escape(order.order_number)}</div><small class="text-muted-pro">${escape(order.status || '')}</small></td>
        <td data-label="Date">${escape(shortDate(order.created_at))}</td>
        <td data-label="Payment">${statusBadge(order.payment_status)}</td>
        <td data-label="Total">${u().formatMoney(order.total, order.currency)}</td>
        <td data-label="Tickets">${rows(order.tickets).length}</td>
        <td data-label="Actions" class="text-end">
          <div class="dashboard-actions">
            <button class="btn btn-glass btn-sm" type="button" data-order-details="${order.id}"><i class="bi bi-eye me-1"></i>Details</button>
            <button class="btn btn-glass btn-sm" type="button" data-order-receipt="${order.id}" data-order-number="${escape(order.order_number)}"><i class="bi bi-download me-1"></i>Receipt</button>
          </div>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="6">${emptyState('bi-receipt', 'No orders found', 'Completed orders will appear here after checkout.')}</td></tr>`;
    if (pager) pager.innerHTML = pagination(state.orderMeta, 'data-order-page');
  }

  function favoriteEvent(favorite) {
    const event = favorite.event?.data || favorite.event || favorite;
    return event && event.title ? event : null;
  }

  function renderFavoriteCard(favorite) {
    const event = favoriteEvent(favorite);
    if (!event) return '';
    const img = u().eventImage(event);
    const price = event.base_price ?? event.ticket_types?.[0]?.price ?? 0;
    return `
      <div class="col-md-6 col-xl-4">
        <article class="card-pro dashboard-favorite-card">
          <div class="thumb">
            <span class="badge-soft">${escape((event.category || 'EVENT').toUpperCase())}</span>
            <img loading="lazy" src="${escape(img)}" alt=""/>
          </div>
          <div class="body">
            <div class="meta"><i class="bi bi-calendar3"></i> ${escape(dateLabel(event.starts_at, event.timezone))}</div>
            <h3 class="title">${escape(event.title)}</h3>
            <div class="venue"><i class="bi bi-geo-alt"></i> ${escape(event.venue_name || '')}${event.city ? `, ${escape(event.city)}` : ''}</div>
            <div class="foot">
              <div class="price">From ${u().formatMoney(price, event.currency)}</div>
              <div class="dashboard-actions">
                <a class="btn btn-glass btn-sm" href="event-details.html?slug=${encodeURIComponent(event.slug)}">Open</a>
                <button class="btn btn-glass btn-sm" type="button" data-remove-favorite="${event.id}"><i class="bi bi-heartbreak"></i></button>
              </div>
            </div>
          </div>
        </article>
      </div>`;
  }

  function renderFavorites() {
    const el = document.querySelector('[data-dashboard-favorites]');
    const pager = document.querySelector('[data-favorite-pagination]');
    if (!el) return;
    if (state.loading.favorites) {
      el.innerHTML = `<div class="col-12">${loadingState('Loading favorites...')}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    if (state.errors.favorites) {
      el.innerHTML = `<div class="col-12">${errorState(state.errors.favorites, 'data-retry-favorites')}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    el.innerHTML = state.favorites.length
      ? state.favorites.map(renderFavoriteCard).join('')
      : `<div class="col-12">${emptyState('bi-heart', 'No favorites yet', 'Save events you like and they will appear here.', '<a class="btn btn-glass btn-sm mt-2" href="events.html">Browse events</a>')}</div>`;
    if (pager) pager.innerHTML = pagination(state.favoriteMeta, 'data-favorite-page');
  }

  function renderActivity() {
    const activityEl = document.querySelector('[data-dashboard-activity]');
    if (!activityEl) return;
    if (state.loading.summary || state.loading.orders || state.loading.tickets || state.loading.favorites) {
      activityEl.innerHTML = `<li>${loadingState('Loading activity...')}</li>`;
      return;
    }

    const activities = [
      ...(state.summary?.recent?.orders || []).map((order) => ({
        at: order.created_at,
        icon: 'bi-receipt',
        title: `Order ${order.order_number}`,
        detail: `${order.payment_status || order.status} · ${u().formatMoney(order.total, order.currency)}`,
      })),
      ...state.tickets.slice(0, 3).map((ticket) => ({
        at: ticket.created_at,
        icon: 'bi-ticket-perforated',
        title: ticket.event?.title || ticket.ticket_code,
        detail: `Ticket ${ticket.ticket_code} · ${ticket.status}`,
      })),
      ...state.favorites.slice(0, 3).map((favorite) => {
        const event = favoriteEvent(favorite);
        return {
          at: favorite.created_at,
          icon: 'bi-heart',
          title: event?.title || 'Saved event',
          detail: 'Added to favorites',
        };
      }),
    ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 8);

    activityEl.innerHTML = activities.map((item, index) => `
      <li class="dashboard-activity-item ${index ? 'border-top border-pro' : ''}">
        <i class="bi ${item.icon}"></i>
        <div>
          <div>${escape(item.title)}</div>
          <small class="text-muted-pro">${escape(item.detail)} · ${escape(shortDate(item.at))}</small>
        </div>
      </li>
    `).join('') || `<li>${emptyState('bi-clock-history', 'No recent activity', 'Your purchases, tickets, and favorites will show here.')}</li>`;
  }

  function hydrateProfileForm() {
    const profileForm = document.querySelector('[data-profile-form]');
    const profile = state.profile || {};
    if (!profileForm) return;
    ['name', 'email', 'phone', 'default_city'].forEach((name) => {
      const input = profileForm.querySelector(`[name="${name}"]`);
      if (input) input.value = profile[name] || '';
    });
    document.querySelectorAll('[data-preference-toggle]').forEach((input) => {
      input.checked = !!profile[input.name];
      input.disabled = false;
    });
  }

  function detailModal(title, html) {
    document.querySelector('[data-dashboard-detail-title]').textContent = title;
    document.querySelector('[data-dashboard-detail-body]').innerHTML = html;
    const modalEl = document.getElementById('dashboardDetailModal');
    if (modalEl && window.bootstrap) bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function renderAll() {
    renderGreeting();
    renderAlert();
    renderKpis();
    renderUpcomingEvents();
    renderTickets();
    renderOrders();
    renderFavorites();
    renderActivity();
    hydrateProfileForm();
  }

  async function refreshAll() {
    renderAll();
    await Promise.all([loadSummary(), loadProfile(), loadUpcomingEvents(), loadTickets(), loadOrders(), loadFavorites()]);
    renderAll();
  }

  async function refreshTickets() {
    await loadTickets();
    renderKpis();
    renderTickets();
    renderActivity();
  }

  async function refreshOrders() {
    await loadOrders();
    renderKpis();
    renderOrders();
    renderActivity();
  }

  async function refreshFavorites() {
    await loadFavorites();
    renderKpis();
    renderFavorites();
    renderActivity();
  }

  function showProfileError(message) {
    const el = document.querySelector('[data-profile-error]');
    if (el) el.innerHTML = message ? `<div class="alert border-pro text-danger dashboard-note">${escape(message)}</div>` : '';
  }

  async function saveProfile(payload, button) {
    showProfileError('');
    if (payload.name !== undefined && String(payload.name).trim().length < 2) {
      showProfileError('Name must be at least 2 characters.');
      return;
    }
    if (payload.phone && String(payload.phone).length > 50) {
      showProfileError('Phone must be 50 characters or fewer.');
      return;
    }
    if (button) button.disabled = true;
    try {
      const { data } = await api().fetch('/me/profile', { method: 'PATCH', body: payload });
      state.profile = data;
      await auth().refreshUser();
      renderGreeting();
      hydrateProfileForm();
      window.tkToast?.('Profile updated');
    } catch (err) {
      showProfileError(err.message || 'Profile update failed');
      window.tkToast?.(err.message || 'Profile update failed', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bindForms() {
    const profileForm = document.querySelector('[data-profile-form]');
    profileForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = profileForm.querySelector('[type="submit"]');
      const fd = new FormData(profileForm);
      await saveProfile({
        name: String(fd.get('name') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        default_city: String(fd.get('default_city') || '').trim(),
      }, button);
    });

    document.querySelectorAll('[data-preference-toggle]').forEach((input) => {
      input.disabled = true;
      input.addEventListener('change', () => saveProfile({ [input.name]: input.checked }, input));
    });

    document.querySelectorAll('[data-ticket-view]').forEach((button) => {
      button.addEventListener('click', async () => {
        document.querySelectorAll('[data-ticket-view]').forEach((btn) => btn.classList.toggle('active', btn === button));
        state.ticketView = button.dataset.ticketView;
        state.ticketPage = 1;
        await refreshTickets();
      });
    });

    const ticketStatus = document.querySelector('[data-ticket-status]');
    ticketStatus?.addEventListener('change', async () => {
      state.ticketPage = 1;
      await refreshTickets();
    });

    const ticketSearch = document.querySelector('[data-ticket-search]');
    ticketSearch?.addEventListener('input', (event) => {
      clearTimeout(event.target._dashboardSearchTimer);
      event.target._dashboardSearchTimer = setTimeout(async () => {
        state.ticketPage = 1;
        await refreshTickets();
      }, 250);
    });

    document.querySelector('[data-order-filter]')?.addEventListener('change', async () => {
      state.orderPage = 1;
      await refreshOrders();
    });

    document.querySelector('[data-order-search]')?.addEventListener('input', (event) => {
      clearTimeout(event.target._dashboardSearchTimer);
      event.target._dashboardSearchTimer = setTimeout(async () => {
        state.orderPage = 1;
        await refreshOrders();
      }, 250);
    });

    document.querySelector('[data-favorite-sort]')?.addEventListener('change', async () => {
      state.favoritePage = 1;
      await refreshFavorites();
    });

    document.querySelector('[data-favorite-search]')?.addEventListener('input', (event) => {
      clearTimeout(event.target._dashboardSearchTimer);
      event.target._dashboardSearchTimer = setTimeout(async () => {
        state.favoritePage = 1;
        await refreshFavorites();
      }, 250);
    });
  }

  async function showTicketDetails(ticketId) {
    const ticket = await ticketsApi().getTicket(ticketId);
    detailModal('Ticket details', `
      <div class="dashboard-detail-grid">
        <div><dt>Event</dt><dd>${escape(ticket.event?.title || 'Event')}</dd></div>
        <div><dt>Status</dt><dd>${statusBadge(ticket.status)}</dd></div>
        <div><dt>Ticket code</dt><dd>${escape(ticket.ticket_code)}</dd></div>
        <div><dt>Ticket type</dt><dd>${escape(ticket.ticket_type?.name || '-')}</dd></div>
        <div><dt>Attendee</dt><dd>${escape(ticket.attendee?.name || 'Guest')}</dd></div>
        <div><dt>Attendee email</dt><dd>${escape(ticket.attendee?.email || '-')}</dd></div>
        <div><dt>Purchased by</dt><dd>${escape(ticket.purchaser?.name || ticket.order?.purchaser?.name || '-')}</dd></div>
        <div><dt>Date</dt><dd>${escape(dateLabel(ticket.event?.starts_at, ticket.event?.timezone))}</dd></div>
        <div><dt>Venue</dt><dd>${escape(ticket.event?.venue_name || '')}${ticket.event?.city ? `, ${escape(ticket.event.city)}` : ''}</dd></div>
        <div><dt>Seat</dt><dd>${escape(ticket.seat_label || '-')}</dd></div>
        <div><dt>Order</dt><dd>${escape(ticket.order?.order_number || '-')}</dd></div>
      </div>
      <div class="d-flex gap-2 mt-4 flex-wrap">
        <button class="btn btn-primary-grad btn-sm" type="button" data-ticket-download="${ticket.id}" data-ticket-code="${escape(ticket.ticket_code)}"><i class="bi bi-download me-1"></i>Download ticket</button>
        <button class="btn btn-glass btn-sm" type="button" data-ticket-qr-open="${ticket.id}"><i class="bi bi-qr-code me-1"></i>View QR code</button>
      </div>
    `);
  }

  async function showQr(ticketId) {
    detailModal('Ticket QR code', `<div class="dashboard-qr-wrap">${loadingState('Loading QR code...')}</div>`);
    try {
      const blob = await ticketsApi().loadQrBlob(ticketId);
      const url = URL.createObjectURL(blob);
      document.querySelector('[data-dashboard-detail-body]').innerHTML = `<div class="dashboard-qr-wrap"><img src="${url}" alt="Ticket QR code"/></div>`;
    } catch (err) {
      document.querySelector('[data-dashboard-detail-body]').innerHTML = errorState(err.message || 'QR code failed to load', 'data-retry-tickets');
    }
  }

  async function showOrderDetails(orderId) {
    const order = await ordersApi().getOrder(orderId);
    const items = rows(order.items);
    const tickets = rows(order.tickets);
    detailModal('Order details', `
      <div class="dashboard-detail-grid">
        <div><dt>Order</dt><dd>${escape(order.order_number)}</dd></div>
        <div><dt>Payment</dt><dd>${statusBadge(order.payment_status)}</dd></div>
        <div><dt>Status</dt><dd>${statusBadge(order.status)}</dd></div>
        <div><dt>Purchased</dt><dd>${escape(shortDate(order.created_at))}</dd></div>
        <div><dt>Total</dt><dd>${u().formatMoney(order.total, order.currency)}</dd></div>
        <div><dt>Purchaser</dt><dd>${escape(order.purchaser?.name || '-')} · ${escape(order.purchaser?.email || '-')}</dd></div>
        <div><dt>Attendees</dt><dd>${order.attendee_count ?? tickets.length}</dd></div>
      </div>
      <h6 class="mt-4">Items</h6>
      <div class="table-responsive"><table class="table table-borderless dashboard-table mb-0"><tbody>
        ${items.map((item) => `<tr><td data-label="Event">${escape(item.event_title || item.event?.title || 'Event')}</td><td data-label="Ticket">${escape(item.ticket_type_name || item.ticket_type?.name || 'Ticket')}</td><td data-label="Qty">x${item.quantity}</td><td data-label="Total">${u().formatMoney(item.total, order.currency)}</td></tr>`).join('') || '<tr><td colspan="4">No line items</td></tr>'}
      </tbody></table></div>
      <h6 class="mt-4">Ticket access</h6>
      <div class="dashboard-stack">
        ${tickets.map((ticket) => `<div class="dashboard-mini-row"><div><div class="fw-semibold">${escape(ticket.attendee?.name || 'Guest')}</div><small>${escape(ticket.ticket_code)} · ${escape(ticket.ticket_type?.name || ticket.event?.title || '')}</small></div><button class="btn btn-glass btn-sm" type="button" data-ticket-download="${ticket.id}" data-ticket-code="${escape(ticket.ticket_code)}"><i class="bi bi-download me-1"></i>Download</button></div>`).join('') || '<p class="text-muted-pro mb-0">No tickets attached to this order.</p>'}
      </div>
    `);
  }

  function bindActions() {
    document.addEventListener('click', async (event) => {
      const retrySummary = event.target.closest('[data-retry-summary]');
      if (retrySummary) {
        await loadSummary();
        renderAll();
        return;
      }

      const retryUpcoming = event.target.closest('[data-retry-upcoming]');
      if (retryUpcoming) {
        await loadUpcomingEvents();
        renderUpcomingEvents();
        return;
      }

      const retryTickets = event.target.closest('[data-retry-tickets]');
      if (retryTickets) {
        await refreshTickets();
        return;
      }

      const retryOrders = event.target.closest('[data-retry-orders]');
      if (retryOrders) {
        await refreshOrders();
        return;
      }

      const retryFavorites = event.target.closest('[data-retry-favorites]');
      if (retryFavorites) {
        await refreshFavorites();
        return;
      }

      const ticketPage = event.target.closest('[data-ticket-page]');
      if (ticketPage) {
        state.ticketPage = Number(ticketPage.dataset.ticketPage);
        await refreshTickets();
        return;
      }

      const orderPage = event.target.closest('[data-order-page]');
      if (orderPage) {
        state.orderPage = Number(orderPage.dataset.orderPage);
        await refreshOrders();
        return;
      }

      const favoritePage = event.target.closest('[data-favorite-page]');
      if (favoritePage) {
        state.favoritePage = Number(favoritePage.dataset.favoritePage);
        await refreshFavorites();
        return;
      }

      const ticketDownload = event.target.closest('[data-ticket-download]');
      if (ticketDownload) {
        event.preventDefault();
        try {
          await ticketsApi().downloadTicket(ticketDownload.dataset.ticketDownload, ticketDownload.dataset.ticketCode);
        } catch (err) {
          window.tkToast?.(err.message || 'Ticket download failed', 'error');
        }
        return;
      }

      const ticketDetails = event.target.closest('[data-ticket-details]');
      if (ticketDetails) {
        event.preventDefault();
        try {
          await showTicketDetails(ticketDetails.dataset.ticketDetails);
        } catch (err) {
          window.tkToast?.(err.message || 'Ticket details failed', 'error');
        }
        return;
      }

      const qrOpen = event.target.closest('[data-ticket-qr-open]');
      if (qrOpen) {
        event.preventDefault();
        await showQr(qrOpen.dataset.ticketQrOpen);
        return;
      }

      const orderDetails = event.target.closest('[data-order-details]');
      if (orderDetails) {
        event.preventDefault();
        try {
          await showOrderDetails(orderDetails.dataset.orderDetails);
        } catch (err) {
          window.tkToast?.(err.message || 'Order details failed', 'error');
        }
        return;
      }

      const receipt = event.target.closest('[data-order-receipt]');
      if (receipt) {
        event.preventDefault();
        try {
          await ordersApi().downloadReceipt(receipt.dataset.orderReceipt, receipt.dataset.orderNumber);
        } catch (err) {
          window.tkToast?.(err.message || 'Receipt download failed', 'error');
        }
        return;
      }

      const removeFavorite = event.target.closest('[data-remove-favorite]');
      if (removeFavorite) {
        event.preventDefault();
        try {
          await favApi().removeFavorite(Number(removeFavorite.dataset.removeFavorite));
          window.tkToast?.('Removed from favorites', 'info');
          await Promise.all([loadSummary(), loadFavorites()]);
          renderKpis();
          renderFavorites();
          renderActivity();
        } catch (err) {
          window.tkToast?.(err.message || 'Favorite removal failed', 'error');
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth().requireAuth(['user', 'organizer', 'admin']);
    if (!user) return;

    bindForms();
    bindActions();

    try {
      await refreshAll();
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load dashboard', 'error');
    }
  });
})();
