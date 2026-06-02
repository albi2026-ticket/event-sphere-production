(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  const state = {
    orders: [],
    users: [],
    events: [],
    userFilters: {},
    eventFilters: {},
    paymentFilters: {},
    loading: { users: false, events: false, payments: false },
    errors: { users: null, events: null, payments: null },
  };

  function rows(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function qs(params) {
    const clean = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') clean[key] = value;
    });
    return new URLSearchParams(clean).toString();
  }

  function money(amount, currency) {
    return u().formatMoney(amount || 0, currency || 'USD');
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function chartTheme() {
    return {
      text: cssVar('--muted') || '#94A3B8',
      grid: cssVar('--border') || 'rgba(148,163,184,.16)',
      primary: cssVar('--primary') || '#5B8CFF',
    };
  }

  function badge(value) {
    const key = String(value || 'none').toLowerCase();
    const safe = u().escapeHtml(key.replace(/_/g, ' '));
    return `<span class="badge status-badge status-${u().escapeHtml(key)}">${safe}</span>`;
  }

  function dateLabel(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function dateTimeLabel(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function buttonIcon(icon, label, attrs, extraClass = 'btn-glass') {
    return `<button class="btn ${extraClass} btn-sm" type="button" ${attrs} title="${u().escapeHtml(label)}"><i class="bi ${icon}"></i><span class="visually-hidden">${u().escapeHtml(label)}</span></button>`;
  }

  function loadingRow(cols, label) {
    return `<tr><td colspan="${cols}" class="py-4 text-muted-pro"><span class="spinner-border spinner-border-sm me-2"></span>${label}</td></tr>`;
  }

  function errorRow(cols, label, retryAttr) {
    return `<tr><td colspan="${cols}" class="py-4"><div class="admin-empty text-danger"><i class="bi bi-exclamation-triangle"></i><span>${u().escapeHtml(label)}</span><button class="btn btn-glass btn-sm" type="button" ${retryAttr}>Retry</button></div></td></tr>`;
  }

  function emptyRow(cols, icon, label) {
    return `<tr><td colspan="${cols}" class="py-4"><div class="admin-empty"><i class="bi ${icon}"></i><span>${u().escapeHtml(label)}</span></div></td></tr>`;
  }

  function userNameCell(user) {
    const name = user.name || user.email || `User #${user.id}`;
    const avatar = user.avatar_url || `https://i.pravatar.cc/80?u=${encodeURIComponent(user.email || user.id)}`;
    return `<div class="d-flex align-items-center gap-2"><img src="${u().escapeHtml(avatar)}" class="rounded-circle admin-avatar" alt=""/> <div><div class="fw-semibold">${u().escapeHtml(name)}</div><div class="small text-muted-pro">#${user.id}</div></div></div>`;
  }

  async function loadPayments() {
    state.loading.payments = true;
    state.errors.payments = null;
    renderPayments();
    try {
      const query = qs({ per_page: 100, ...state.paymentFilters });
      const res = await api().fetch(`/admin/payments${query ? `?${query}` : ''}`);
      state.orders = rows(res.data);
    } catch (err) {
      state.errors.payments = err.message || 'Failed to load payments';
    } finally {
      state.loading.payments = false;
      renderKpis();
      renderCharts();
      renderPayments();
      renderActivity();
    }
  }

  async function loadUsers() {
    state.loading.users = true;
    state.errors.users = null;
    renderUsers();
    renderOrganizers();
    try {
      const query = qs({ per_page: 100, ...state.userFilters });
      const res = await api().fetch(`/admin/users${query ? `?${query}` : ''}`);
      state.users = rows(res.data);
    } catch (err) {
      state.errors.users = err.message || 'Failed to load users';
    } finally {
      state.loading.users = false;
      renderKpis();
      renderUsers();
      renderOrganizers();
      renderActivity();
    }
  }

  async function loadEvents() {
    state.loading.events = true;
    state.errors.events = null;
    renderEvents();
    try {
      const query = qs({ per_page: 100, sort: 'newest', ...state.eventFilters });
      const res = await api().fetch(`/admin/events${query ? `?${query}` : ''}`);
      state.events = rows(res.data);
    } catch (err) {
      state.errors.events = err.message || 'Failed to load events';
    } finally {
      state.loading.events = false;
      renderKpis();
      renderCharts();
      renderEvents();
      renderActivity();
    }
  }

  function renderKpis() {
    const paidOrders = state.orders.filter((o) => o.payment_status === 'paid');
    const refundedOrders = state.orders.filter((o) => o.payment_status === 'refunded');
    const totalGmv = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const pendingEvents = state.events.filter((e) => ['draft', 'pending_review'].includes(e.status)).length;
    const pendingOrganizers = state.users.filter((usr) => usr.organizer_status === 'pending').length;
    const suspendedUsers = state.users.filter((usr) => usr.status === 'suspended').length;
    const row = document.querySelector('[data-admin-kpis]');

    if (!row) return;
    row.innerHTML = `
      <div class="col-md-3"><div class="kpi"><div class="label">Paid GMV</div><div class="value">${money(totalGmv, 'USD')}</div><div class="delta">${paidOrders.length} paid orders</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Users</div><div class="value">${state.users.length}</div><div class="delta ${suspendedUsers ? 'neg' : ''}">${suspendedUsers} suspended</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Moderation queue</div><div class="value">${pendingEvents}</div><div class="delta">${state.events.length} total events</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Organizer requests</div><div class="value">${pendingOrganizers}</div><div class="delta">${refundedOrders.length} refunds tracked</div></div></div>`;
  }

  function renderCharts() {
    const theme = chartTheme();
    const salesChart = document.querySelector('canvas#salesChart');
    if (salesChart && window.Chart) {
      const byMonth = {};
      state.orders.filter((o) => o.payment_status === 'paid').forEach((o) => {
        const month = (o.created_at || o.paid_at || '').slice(0, 7);
        if (month) byMonth[month] = (byMonth[month] || 0) + Number(o.total || 0);
      });
      const labels = Object.keys(byMonth).sort().slice(-12);
      if (window._salesChart) window._salesChart.destroy();
      window._salesChart = new Chart(salesChart, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Sales', data: labels.map((label) => byMonth[label]), backgroundColor: theme.primary, borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: theme.text }, grid: { color: theme.grid } }, x: { ticks: { color: theme.text }, grid: { display: false } } } },
      });
    }

    const catChart = document.getElementById('cat');
    if (catChart && window.Chart) {
      const byCategory = {};
      state.events.forEach((event) => {
        const category = event.category || 'Other';
        byCategory[category] = (byCategory[category] || 0) + 1;
      });
      const labels = Object.keys(byCategory).slice(0, 8);
      if (window._catChart) window._catChart.destroy();
      window._catChart = new Chart(catChart, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: labels.map((label) => byCategory[label]), backgroundColor: ['#5B8CFF', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#14B8A6', '#F97316', '#64748B'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: theme.text } } } },
      });
    }
  }

  function renderUsers() {
    const body = document.querySelector('[data-admin-users] tbody');
    if (!body) return;
    if (state.loading.users) {
      body.innerHTML = loadingRow(8, 'Loading users...');
      return;
    }
    if (state.errors.users) {
      body.innerHTML = errorRow(8, state.errors.users, 'data-retry-users');
      return;
    }

    body.innerHTML = state.users.map((usr) => `
      <tr>
        <td>${userNameCell(usr)}</td>
        <td>${u().escapeHtml(usr.email)}</td>
        <td>${dateLabel(usr.created_at)}</td>
        <td>${usr.orders_count ?? 0}</td>
        <td>
          <select class="form-select form-select-sm admin-select" data-user-role="${usr.id}">
            ${['user', 'organizer', 'admin'].map((role) => `<option value="${role}" ${usr.role === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </td>
        <td>${badge(usr.organizer_status)}</td>
        <td>${badge(usr.status)}</td>
        <td class="text-end">
          <div class="admin-actions">
            ${buttonIcon('bi-eye', 'View profile', `data-view-user="${usr.id}"`)}
            ${buttonIcon('bi-save', 'Save role', `data-save-role="${usr.id}"`)}
            ${usr.status === 'suspended'
              ? buttonIcon('bi-person-check', 'Reactivate user', `data-reactivate-user="${usr.id}"`)
              : buttonIcon('bi-person-slash', 'Suspend user', `data-suspend-user="${usr.id}"`)}
          </div>
        </td>
      </tr>
    `).join('') || emptyRow(8, 'bi-people', 'No users match these filters');
  }

  function renderOrganizers() {
    const body = document.querySelector('[data-admin-organizers] tbody');
    if (!body) return;
    if (state.loading.users) {
      body.innerHTML = loadingRow(5, 'Loading organizer requests...');
      return;
    }
    if (state.errors.users) {
      body.innerHTML = errorRow(5, state.errors.users, 'data-retry-users');
      return;
    }

    const organizers = state.users.filter((usr) => usr.role === 'organizer' || ['pending', 'approved', 'rejected'].includes(usr.organizer_status));
    body.innerHTML = organizers.map((usr) => `
      <tr>
        <td>${userNameCell(usr)}</td>
        <td>${u().escapeHtml(usr.email)}</td>
        <td>${badge(usr.organizer_status)}</td>
        <td>${usr.organized_events_count ?? 0}</td>
        <td class="text-end">
          <div class="admin-actions">
            ${buttonIcon('bi-eye', 'View profile', `data-view-user="${usr.id}"`)}
            <button class="btn btn-glass btn-sm" type="button" data-approve-organizer="${usr.id}" ${usr.organizer_status === 'approved' ? 'disabled' : ''}>Approve</button>
            <button class="btn btn-glass btn-sm" type="button" data-reject-organizer="${usr.id}" ${usr.organizer_status === 'rejected' ? 'disabled' : ''}>Reject</button>
          </div>
        </td>
      </tr>
    `).join('') || emptyRow(5, 'bi-person-check', 'No organizer requests yet');
  }

  function renderEvents() {
    const body = document.querySelector('[data-admin-events] tbody');
    if (!body) return;
    if (state.loading.events) {
      body.innerHTML = loadingRow(7, 'Loading events...');
      return;
    }
    if (state.errors.events) {
      body.innerHTML = errorRow(7, state.errors.events, 'data-retry-events');
      return;
    }

    body.innerHTML = state.events.map((event) => `
      <tr>
        <td><div class="fw-semibold">${u().escapeHtml(event.title)}</div><div class="small text-muted-pro">${u().escapeHtml(event.category || '')} · ${u().escapeHtml(event.city || '')}</div></td>
        <td>${u().escapeHtml(event.organizer?.name || `#${event.organizer_id}`)}</td>
        <td>${dateLabel(event.starts_at)}</td>
        <td>${badge(event.status)}</td>
        <td>${event.visibility ? badge(event.visibility) : '-'}</td>
        <td><span class="small text-muted-pro">${u().escapeHtml(event.moderation_notes || '-')}</span></td>
        <td class="text-end">
          <div class="admin-actions">
            ${buttonIcon('bi-eye', 'View event', `data-view-event="${event.id}"`)}
            <button class="btn btn-glass btn-sm" type="button" data-publish-event="${event.id}" ${event.status === 'published' ? 'disabled' : ''}>Approve</button>
            <button class="btn btn-glass btn-sm" type="button" data-reject-event="${event.id}" ${event.status === 'rejected' ? 'disabled' : ''}>Reject</button>
            <button class="btn btn-glass btn-sm" type="button" data-unpublish-event="${event.id}" ${event.status !== 'published' ? 'disabled' : ''}>Unpublish</button>
          </div>
        </td>
      </tr>
    `).join('') || emptyRow(7, 'bi-calendar-event', 'No events match these filters');
  }

  function paymentRow(order, actions) {
    return `
      <tr>
        <td><div class="fw-semibold">${u().escapeHtml(order.order_number)}</div><div class="small text-muted-pro">${dateTimeLabel(order.created_at)}</div></td>
        <td>${u().escapeHtml(order.user?.name || order.user?.email || order.billing_email || '-')}</td>
        <td>${badge(order.payment_status)}</td>
        <td>${u().escapeHtml(order.payment_provider || '-')}</td>
        <td>${money(order.total, order.currency)}</td>
        <td class="text-end"><div class="admin-actions">${actions(order)}</div></td>
      </tr>`;
  }

  function renderPayments() {
    const paymentsBody = document.querySelector('[data-admin-payments] tbody');
    const refundsBody = document.querySelector('[data-admin-refunds] tbody');
    if (!paymentsBody || !refundsBody) return;
    if (state.loading.payments) {
      paymentsBody.innerHTML = loadingRow(6, 'Loading payments...');
      refundsBody.innerHTML = loadingRow(6, 'Loading refunds...');
      return;
    }
    if (state.errors.payments) {
      paymentsBody.innerHTML = errorRow(6, state.errors.payments, 'data-retry-payments');
      refundsBody.innerHTML = errorRow(6, state.errors.payments, 'data-retry-payments');
      return;
    }

    const payments = state.orders.filter((o) => o.payment_status !== 'refunded').slice(0, 25);
    const refunds = state.orders.filter((o) => o.payment_status === 'refunded' || o.refunded_at).slice(0, 25);

    paymentsBody.innerHTML = payments.map((order) => paymentRow(order, (o) => `
      ${buttonIcon('bi-receipt', 'Payment details', `data-view-payment="${o.id}"`)}
      <button class="btn btn-glass btn-sm" type="button" data-refund-order="${o.id}" ${o.payment_status !== 'paid' ? 'disabled' : ''}>Refund</button>
    `)).join('') || emptyRow(6, 'bi-credit-card', 'No payments found');

    refundsBody.innerHTML = refunds.map((order) => paymentRow(order, (o) => buttonIcon('bi-receipt', 'Refund details', `data-view-payment="${o.id}"`))).join('') || emptyRow(6, 'bi-arrow-counterclockwise', 'No refunded orders yet');
  }

  function renderActivity() {
    const wrap = document.querySelector('[data-admin-activity]');
    if (!wrap) return;

    const activity = [
      ...state.users.slice(0, 5).map((usr) => ({ at: usr.created_at, icon: 'bi-person-plus', text: `${usr.email} joined`, status: usr.status })),
      ...state.events.slice(0, 5).map((evt) => ({ at: evt.updated_at || evt.created_at, icon: 'bi-calendar-event', text: `${evt.title} is ${evt.status}`, status: evt.status })),
      ...state.orders.slice(0, 5).map((order) => ({ at: order.updated_at || order.created_at, icon: 'bi-credit-card', text: `${order.order_number} ${order.payment_status}`, status: order.payment_status })),
    ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 8);

    wrap.innerHTML = activity.map((item) => `
      <div class="activity-item">
        <i class="bi ${item.icon}"></i>
        <div class="flex-grow-1"><div>${u().escapeHtml(item.text)}</div><small>${dateTimeLabel(item.at)}</small></div>
        ${badge(item.status)}
      </div>
    `).join('') || '<div class="admin-empty py-4"><i class="bi bi-clock-history"></i><span>No recent activity yet</span></div>';
  }

  function renderAll() {
    renderKpis();
    renderCharts();
    renderUsers();
    renderOrganizers();
    renderEvents();
    renderPayments();
    renderActivity();
  }

  async function refreshAll() {
    renderAll();
    await Promise.all([loadPayments(), loadUsers(), loadEvents()]);
    renderAll();
  }

  async function refreshUsers() {
    await loadUsers();
    renderKpis();
    renderUsers();
    renderOrganizers();
    renderActivity();
  }

  async function refreshEvents() {
    await loadEvents();
    renderKpis();
    renderCharts();
    renderEvents();
    renderActivity();
  }

  async function refreshPayments() {
    await loadPayments();
    renderKpis();
    renderCharts();
    renderPayments();
    renderActivity();
  }

  function setModal(title, body) {
    const modalEl = document.getElementById('adminDetailModal');
    if (!modalEl) return;
    modalEl.querySelector('.modal-title').textContent = title;
    modalEl.querySelector('.modal-body').innerHTML = body;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function detailList(items) {
    return `<dl class="admin-detail-list">${items.map(([label, value]) => `<div><dt>${u().escapeHtml(label)}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
  }

  async function showUser(userId) {
    setModal('User profile', '<div class="py-4 text-muted-pro"><span class="spinner-border spinner-border-sm me-2"></span>Loading profile...</div>');
    const res = await api().fetch(`/admin/users/${userId}`);
    const user = res.data;
    const orders = user.orders || [];
    const events = user.organized_events || [];
    setModal(user.name || user.email, `
      ${detailList([
        ['Email', u().escapeHtml(user.email)],
        ['Role', badge(user.role)],
        ['Status', badge(user.status)],
        ['Organizer', badge(user.organizer_status)],
        ['Joined', dateLabel(user.created_at)],
        ['Last login', dateTimeLabel(user.last_login_at)],
        ['Orders', String(user.orders_count ?? 0)],
        ['Tickets', String(user.tickets_count ?? 0)],
        ['Events', String(user.organized_events_count ?? 0)],
      ])}
      <h6 class="mt-4">Recent orders</h6>
      ${orders.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${orders.map((order) => `<tr><td>${u().escapeHtml(order.order_number)}</td><td>${badge(order.payment_status)}</td><td>${money(order.total, order.currency)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No recent orders.</p>'}
      <h6 class="mt-4">Organized events</h6>
      ${events.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${events.map((event) => `<tr><td>${u().escapeHtml(event.title)}</td><td>${badge(event.status)}</td><td>${dateLabel(event.starts_at)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No organized events.</p>'}
    `);
  }

  function showEvent(eventId) {
    const event = state.events.find((item) => String(item.id) === String(eventId));
    if (!event) return;
    setModal(event.title, `
      ${detailList([
        ['Organizer', u().escapeHtml(event.organizer?.name || `#${event.organizer_id}`)],
        ['Status', badge(event.status)],
        ['Visibility', badge(event.visibility || 'public')],
        ['Category', u().escapeHtml(event.category || '-')],
        ['City', u().escapeHtml(event.city || '-')],
        ['Starts', dateTimeLabel(event.starts_at)],
        ['Tickets', String(event.tickets_count ?? 0)],
        ['Views', String(event.views_count ?? 0)],
      ])}
      <h6 class="mt-4">Moderation notes</h6>
      <p class="text-muted-pro mb-0">${u().escapeHtml(event.moderation_notes || 'No notes recorded.')}</p>
    `);
  }

  async function showPayment(orderId) {
    setModal('Payment details', '<div class="py-4 text-muted-pro"><span class="spinner-border spinner-border-sm me-2"></span>Loading payment...</div>');
    const res = await api().fetch(`/admin/payments/${orderId}`);
    const order = res.data;
    const items = order.items || [];
    const tickets = order.tickets || [];
    setModal(`Payment ${order.order_number}`, `
      ${detailList([
        ['Customer', u().escapeHtml(order.user?.name || order.user?.email || order.billing_email || '-')],
        ['Status', badge(order.payment_status)],
        ['Order status', badge(order.status)],
        ['Provider', u().escapeHtml(order.payment_provider || '-')],
        ['Total', money(order.total, order.currency)],
        ['Subtotal', money(order.subtotal, order.currency)],
        ['Service fee', money(order.service_fee, order.currency)],
        ['Paid at', dateTimeLabel(order.paid_at)],
        ['Refunded at', dateTimeLabel(order.refunded_at)],
        ['Reference', u().escapeHtml(order.payment_reference || '-')],
      ])}
      <h6 class="mt-4">Items</h6>
      ${items.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${items.map((item) => `<tr><td>${u().escapeHtml(item.event_title || item.event?.title || '-')}</td><td>${u().escapeHtml(item.ticket_type_name || item.ticket_type?.name || '-')}</td><td>x${item.quantity}</td><td>${money(item.total, order.currency)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No line items.</p>'}
      <h6 class="mt-4">Tickets and attendees</h6>
      ${tickets.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${tickets.map((ticket) => `<tr><td><div class="fw-semibold">${u().escapeHtml(ticket.attendee_name || ticket.user?.name || 'Guest')}</div><small>${u().escapeHtml(ticket.attendee_email || ticket.user?.email || '')}</small></td><td>${u().escapeHtml(ticket.event?.title || '-')}</td><td>${u().escapeHtml(ticket.ticket_type?.name || '-')}</td><td><small>Paid by ${u().escapeHtml(order.user?.name || order.billing_email || '-')}</small></td><td>${u().escapeHtml(ticket.ticket_code || '-')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No tickets issued yet.</p>'}
    `);
  }

  async function eventModeration(eventId, action) {
    const labels = { publish: 'Approve event', reject: 'Reject event', unpublish: 'Unpublish event' };
    const note = action === 'publish' ? '' : prompt(`${labels[action]} - add moderation notes`, '');
    if (note === null) return;
    const body = action === 'publish' ? {} : { reason: note };
    await api().fetch(`/admin/events/${eventId}/${action}`, { method: 'POST', body });
    window.tkToast?.(labels[action]);
    await refreshEvents();
  }

  function bindFilters() {
    const userForm = document.querySelector('[data-admin-user-filters]');
    userForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(userForm);
      state.userFilters = { q: fd.get('q'), role: fd.get('role'), status: fd.get('status'), organizer_status: fd.get('organizer_status') };
      await refreshUsers();
    });

    document.querySelector('[data-reset-admin-users]')?.addEventListener('click', async () => {
      userForm?.reset();
      state.userFilters = {};
      await refreshUsers();
    });

    const eventForm = document.querySelector('[data-admin-event-filters]');
    eventForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(eventForm);
      state.eventFilters = { q: fd.get('q'), status: fd.get('status') };
      await refreshEvents();
    });

    document.querySelector('[data-reset-admin-events]')?.addEventListener('click', async () => {
      eventForm?.reset();
      state.eventFilters = {};
      await refreshEvents();
    });

    const paymentForm = document.querySelector('[data-admin-payment-filters]');
    paymentForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(paymentForm);
      state.paymentFilters = { payment_status: fd.get('payment_status'), payment_provider: fd.get('payment_provider') };
      await refreshPayments();
    });

    document.querySelector('[data-reset-admin-payments]')?.addEventListener('click', async () => {
      paymentForm?.reset();
      state.paymentFilters = {};
      await refreshPayments();
    });
  }

  function bindActions() {
    document.addEventListener('event-sphere:theme-changed', renderCharts);

    document.addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      try {
        if (button.dataset.retryUsers !== undefined) await refreshUsers();
        if (button.dataset.retryEvents !== undefined) await refreshEvents();
        if (button.dataset.retryPayments !== undefined) await refreshPayments();

        if (button.dataset.viewUser) await showUser(button.dataset.viewUser);
        if (button.dataset.viewEvent) showEvent(button.dataset.viewEvent);
        if (button.dataset.viewPayment) await showPayment(button.dataset.viewPayment);

        if (button.dataset.saveRole) {
          button.disabled = true;
          const userId = button.dataset.saveRole;
          const role = document.querySelector(`[data-user-role="${userId}"]`)?.value;
          await api().fetch(`/admin/users/${userId}/role`, { method: 'PATCH', body: { role } });
          window.tkToast?.('User role updated');
          await refreshUsers();
        }

        if (button.dataset.suspendUser) {
          if (!confirm('Suspend this user?')) return;
          button.disabled = true;
          await api().fetch(`/admin/users/${button.dataset.suspendUser}/suspend`, { method: 'POST', body: {} });
          window.tkToast?.('User suspended');
          await refreshUsers();
        }

        if (button.dataset.reactivateUser) {
          button.disabled = true;
          await api().fetch(`/admin/users/${button.dataset.reactivateUser}/reactivate`, { method: 'POST', body: {} });
          window.tkToast?.('User reactivated');
          await refreshUsers();
        }

        if (button.dataset.approveOrganizer) {
          button.disabled = true;
          await api().fetch(`/admin/users/${button.dataset.approveOrganizer}/approve-organizer`, { method: 'POST', body: {} });
          window.tkToast?.('Organizer approved');
          await refreshUsers();
        }

        if (button.dataset.rejectOrganizer) {
          const reason = prompt('Reject organizer request - add a note', '');
          if (reason === null) return;
          button.disabled = true;
          await api().fetch(`/admin/users/${button.dataset.rejectOrganizer}/reject-organizer`, { method: 'POST', body: { reason } });
          window.tkToast?.('Organizer rejected');
          await refreshUsers();
        }

        if (button.dataset.publishEvent) {
          button.disabled = true;
          await eventModeration(button.dataset.publishEvent, 'publish');
        }

        if (button.dataset.rejectEvent) {
          button.disabled = true;
          await eventModeration(button.dataset.rejectEvent, 'reject');
        }

        if (button.dataset.unpublishEvent) {
          button.disabled = true;
          await eventModeration(button.dataset.unpublishEvent, 'unpublish');
        }

        if (button.dataset.refundOrder) {
          if (!confirm('Issue full refund for this order?')) return;
          button.disabled = true;
          await api().fetch(`/admin/payments/${button.dataset.refundOrder}/refund`, { method: 'POST', body: { reason: 'requested_by_customer' } });
          window.tkToast?.('Refund processed');
          await refreshPayments();
        }

        if (button.dataset.adminAlerts) {
          window.tkToast?.('No unresolved platform alerts');
        }

        if (button.dataset.adminExport) {
          const csv = [
            ['section', 'id', 'name', 'status'],
            ...state.users.map((usr) => ['user', usr.id, usr.email, usr.status]),
            ...state.events.map((evt) => ['event', evt.id, evt.title, evt.status]),
            ...state.orders.map((order) => ['order', order.id, order.order_number, order.payment_status]),
          ].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'event-sphere-admin-export.csv';
          link.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        button.disabled = false;
        window.tkToast?.(err.message || 'Admin action failed', 'error');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!auth().requireAuth(['admin'])) return;

    bindFilters();
    bindActions();

    try {
      await refreshAll();
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load admin dashboard', 'error');
    }
  });
})();
