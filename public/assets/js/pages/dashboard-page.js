(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const ticketsApi = () => window.EventSphereTickets;
  const eventsApi = () => window.EventSphereEvents;
  const ordersApi = () => window.EventSphereOrders;
  const favApi = () => window.EventSphereFavorites;
  const u = () => window.EventSphereUtils;

  const state = {
    summary: null,
    profile: null,
    tickets: [],
    ticketHistory: [],
    orders: [],
    favorites: [],
  };

  function rows(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
  }

  function statusBadge(status) {
    const colors = {
      active: 'rgba(91,140,255,.15);color:#93b4ff',
      paid: 'rgba(34,197,94,.15);color:#86efac',
      used: 'rgba(148,163,184,.15);color:#cbd5e1',
      refunded: 'rgba(239,68,68,.18);color:#fca5a5',
      cancelled: 'rgba(239,68,68,.18);color:#fca5a5',
      pending: 'rgba(245,158,11,.15);color:#fcd34d',
      unpaid: 'rgba(245,158,11,.15);color:#fcd34d',
    };
    const value = status || 'unknown';
    return `<span class="badge" style="background:${colors[value] || 'rgba(148,163,184,.15);color:#cbd5e1'}">${u().escapeHtml(value)}</span>`;
  }

  function dateLabel(value, timezone) {
    return value ? u().formatEventDate(value, timezone) : '-';
  }

  async function loadSummary() {
    const { data } = await api().fetch('/me/dashboard/summary');
    state.summary = data;
  }

  async function loadProfile() {
    const { data } = await api().fetch('/me/profile');
    state.profile = data;
  }

  async function loadTickets() {
    state.tickets = await ticketsApi().listActiveTickets();
    const selectedStatus = document.querySelector('[data-ticket-filter]')?.value;
    if (selectedStatus && selectedStatus !== 'active') {
      const result = await ticketsApi().listTickets({ status: selectedStatus, per_page: 25 });
      state.ticketHistory = result.tickets;
      return;
    }

    if (selectedStatus === 'active') {
      state.ticketHistory = state.tickets;
      return;
    }

    const result = await ticketsApi().listTickets({ per_page: 25, sort: '-created_at' });
    state.ticketHistory = result.tickets;
  }

  async function loadOrders() {
    const status = document.querySelector('[data-order-filter]')?.value;
    const search = document.querySelector('[data-order-search]')?.value;
    const result = await ordersApi().listMyOrders({
      per_page: 25,
      sort: '-created_at',
      payment_status: status,
      search,
    });
    state.orders = result.orders;
  }

  async function loadFavorites() {
    state.favorites = await favApi().listFavorites();
  }

  function renderGreeting() {
    const user = auth().getUser?.() || state.profile;
    document.querySelector('[data-dashboard-greeting]')?.replaceChildren(
      document.createTextNode(`Hi, ${user?.name || user?.email || 'there'}`),
    );
  }

  function renderKpis() {
    const kpiRow = document.querySelector('[data-dashboard-kpis]');
    const stats = state.summary?.stats;
    if (!kpiRow || !stats) return;

    kpiRow.innerHTML = `
      <div class="col-md-3"><div class="kpi"><div class="label">Upcoming events</div><div class="value">${stats.upcoming_events_count ?? 0}</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Tickets owned</div><div class="value">${stats.active_tickets_count ?? 0}</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Saved events</div><div class="value">${stats.favorites_count ?? 0}</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Orders</div><div class="value">${stats.orders_count ?? 0}</div></div></div>`;
  }

  function renderActiveTickets() {
    const ticketsEl = document.querySelector('[data-dashboard-tickets]');
    if (!ticketsEl) return;

    if (!state.tickets.length) {
      ticketsEl.innerHTML = '<div class="col-12 text-muted-pro">No active tickets yet.</div>';
      return;
    }

    ticketsEl.innerHTML = state.tickets.map((ticket) => ticketsApi().renderTicketCard(ticket)).join('');
    ticketsApi().hydrateQrImages(ticketsEl);
  }

  function renderTicketHistory() {
    const body = document.querySelector('[data-dashboard-ticket-history] tbody');
    if (!body) return;

    body.innerHTML = state.ticketHistory.map((ticket) => `
      <tr>
        <td><div class="fw-semibold">${u().escapeHtml(ticket.ticket_code)}</div><small class="text-muted-pro">${u().escapeHtml(ticket.ticket_type?.name || '')}</small></td>
        <td><div>${u().escapeHtml(ticket.event?.title || 'Event')}</div><small class="text-muted-pro">${u().escapeHtml(dateLabel(ticket.event?.starts_at, ticket.event?.timezone))}</small></td>
        <td>${statusBadge(ticket.status)}</td>
        <td class="text-end">
          <button class="btn btn-glass btn-sm" type="button" data-ticket-details="${ticket.id}">Details</button>
          <button class="btn btn-glass btn-sm" type="button" data-ticket-download="${ticket.id}" data-ticket-code="${u().escapeHtml(ticket.ticket_code)}">Download</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-muted-pro">No tickets found</td></tr>';
  }

  function renderOrders() {
    const body = document.querySelector('[data-dashboard-orders] tbody');
    if (!body) return;

    body.innerHTML = state.orders.map((order) => `
      <tr>
        <td><div class="fw-semibold">${u().escapeHtml(order.order_number)}</div><small class="text-muted-pro">${u().escapeHtml(dateLabel(order.created_at))}</small></td>
        <td>${statusBadge(order.payment_status)}</td>
        <td>${u().formatMoney(order.total, order.currency)}</td>
        <td class="text-end">
          <button class="btn btn-glass btn-sm" type="button" data-order-details="${order.id}">Details</button>
          <button class="btn btn-glass btn-sm" type="button" data-order-receipt="${order.id}" data-order-number="${u().escapeHtml(order.order_number)}">Receipt</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-muted-pro">No orders found</td></tr>';
  }

  function renderFavorites() {
    const favEl = document.querySelector('[data-dashboard-favorites]');
    if (!favEl) return;

    const events = state.favorites.map((fav) => (fav.event?.data || fav.event || fav)).filter((event) => event && event.title);
    favEl.innerHTML = events.length
      ? events.map((event, index) => eventsApi().renderEventCard(event, index)).join('')
      : '<div class="col-12 text-muted-pro">No favorites yet.</div>';
    favApi().syncFavoriteButtons();
  }

  function renderActivity() {
    const activityEl = document.querySelector('[data-dashboard-activity]');
    const recentOrders = state.summary?.recent?.orders || state.orders.slice(0, 5);
    if (!activityEl) return;

    activityEl.innerHTML = recentOrders.map((order, index) => `
      <li class="d-flex gap-3 py-2 ${index ? 'border-top border-pro' : ''}">
        <i class="bi bi-cart-check text-success"></i>
        <div>
          <div>Order <b>${u().escapeHtml(order.order_number)}</b> · ${u().formatMoney(order.total, order.currency)}</div>
          <small class="text-muted-pro">${u().escapeHtml(order.payment_status || order.status || '')}</small>
        </div>
      </li>
    `).join('') || '<li class="text-muted-pro">No recent activity</li>';
  }

  function renderNotifications() {
    const list = document.querySelector('[data-dashboard-notifications]');
    if (!list) return;

    if (localStorage.getItem('event_sphere_notifications_read') === '1') {
      list.innerHTML = '<li class="py-3 text-muted-pro">No unread notifications</li>';
      return;
    }

    const notifications = [];
    if (state.tickets.length) notifications.push(['Your QR is ready', state.tickets[0].event?.title || 'Your upcoming event']);
    if (state.favorites.length) notifications.push(['Saved events synced', `${state.favorites.length} favorite event${state.favorites.length === 1 ? '' : 's'}`]);
    if (state.orders.length) notifications.push(['Latest order updated', state.orders[0].order_number]);

    list.innerHTML = notifications.map(([title, detail], index) => `
      <li class="py-3 ${index < notifications.length - 1 ? 'border-bottom border-pro' : ''}">
        <div class="fw-semibold">${u().escapeHtml(title)}</div>
        <small class="text-muted-pro">${u().escapeHtml(detail)}</small>
      </li>
    `).join('') || '<li class="py-3 text-muted-pro">No unread notifications</li>';
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
    });

    const citySelect = document.querySelector('[data-preference-city]');
    if (citySelect && profile.default_city) {
      const exists = [...citySelect.options].some((option) => option.value === profile.default_city);
      if (!exists) citySelect.add(new Option(profile.default_city, profile.default_city));
      citySelect.value = profile.default_city;
    }
  }

  function detailModal(title, html) {
    document.querySelector('[data-dashboard-detail-title]').textContent = title;
    document.querySelector('[data-dashboard-detail-body]').innerHTML = html;
    const modalEl = document.getElementById('dashboardDetailModal');
    if (modalEl && window.bootstrap) new bootstrap.Modal(modalEl).show();
  }

  async function refreshAll() {
    await Promise.all([loadSummary(), loadProfile(), loadTickets(), loadOrders(), loadFavorites()]);
    renderGreeting();
    renderKpis();
    renderActiveTickets();
    renderTicketHistory();
    renderOrders();
    renderFavorites();
    renderActivity();
    renderNotifications();
    hydrateProfileForm();
  }

  async function saveProfile(payload, button) {
    if (button) button.disabled = true;
    try {
      const { data } = await api().fetch('/me/profile', { method: 'PATCH', body: payload });
      state.profile = data;
      await auth().refreshUser();
      renderGreeting();
      hydrateProfileForm();
      window.tkToast?.('Settings saved');
    } catch (err) {
      window.tkToast?.(err.message || 'Settings update failed', 'error');
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
        name: fd.get('name'),
        phone: fd.get('phone'),
        default_city: fd.get('default_city'),
      }, button);
    });

    document.querySelectorAll('[data-preference-toggle]').forEach((input) => {
      input.addEventListener('change', () => saveProfile({ [input.name]: input.checked }, input));
    });

    document.querySelector('[data-preference-city]')?.addEventListener('change', (event) => {
      saveProfile({ default_city: event.target.value }, event.target);
    });

    document.querySelector('[data-ticket-filter]')?.addEventListener('change', async () => {
      await loadTickets();
      renderActiveTickets();
      renderTicketHistory();
    });

    document.querySelector('[data-order-filter]')?.addEventListener('change', async () => {
      await loadOrders();
      renderOrders();
    });

    document.querySelector('[data-order-search]')?.addEventListener('input', async (event) => {
      clearTimeout(event.target._dashboardSearchTimer);
      event.target._dashboardSearchTimer = setTimeout(async () => {
        await loadOrders();
        renderOrders();
      }, 250);
    });
  }

  function bindActions() {
    document.addEventListener('click', async (event) => {
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
          const ticket = await ticketsApi().getTicket(ticketDetails.dataset.ticketDetails);
          detailModal('Ticket details', `
            <div class="mb-2"><strong>${u().escapeHtml(ticket.event?.title || 'Event')}</strong></div>
            <div class="text-muted-pro mb-3">${u().escapeHtml(ticket.event?.venue_name || '')}${ticket.event?.city ? `, ${u().escapeHtml(ticket.event.city)}` : ''} · ${u().escapeHtml(dateLabel(ticket.event?.starts_at, ticket.event?.timezone))}</div>
            <p><strong>Ticket:</strong> ${u().escapeHtml(ticket.ticket_code)}</p>
            <p><strong>Type:</strong> ${u().escapeHtml(ticket.ticket_type?.name || '-')}</p>
            <p><strong>Status:</strong> ${u().escapeHtml(ticket.status)}</p>
            <p><strong>Order:</strong> ${u().escapeHtml(ticket.order?.order_number || '-')}</p>
          `);
        } catch (err) {
          window.tkToast?.(err.message || 'Ticket details failed', 'error');
        }
        return;
      }

      const orderDetails = event.target.closest('[data-order-details]');
      if (orderDetails) {
        event.preventDefault();
        try {
          const order = await ordersApi().getOrder(orderDetails.dataset.orderDetails);
          const items = rows(order.items).map((item) => `<li>${u().escapeHtml(item.event_title || item.event?.title || 'Event')} · ${u().escapeHtml(item.ticket_type_name || item.ticket_type?.name || 'Ticket')} x ${item.quantity}</li>`).join('');
          detailModal('Order details', `
            <p><strong>Order:</strong> ${u().escapeHtml(order.order_number)}</p>
            <p><strong>Status:</strong> ${u().escapeHtml(order.status)} · ${u().escapeHtml(order.payment_status)}</p>
            <p><strong>Total:</strong> ${u().formatMoney(order.total, order.currency)}</p>
            <ul>${items || '<li>No line items</li>'}</ul>
          `);
        } catch (err) {
          window.tkToast?.(err.message || 'Order details failed', 'error');
        }
        return;
      }

      const lifecycleAction = event.target.closest('[data-ticket-transfer], [data-ticket-resell]');
      if (lifecycleAction) {
        event.preventDefault();
        window.tkToast?.('Ticket transfer and resale need backend workflow support before they can be completed.', 'info');
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

      const markRead = event.target.closest('[data-mark-notifications-read]');
      if (markRead) {
        event.preventDefault();
        localStorage.setItem('event_sphere_notifications_read', '1');
        renderNotifications();
        window.tkToast?.('Notifications marked read');
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
