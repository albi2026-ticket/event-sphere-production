(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  const state = {
    orders: [],
    users: [],
    events: [],
    tickets: [],
    categories: [],
    emailCenter: null,
    auditLogs: [],
    auditMeta: null,
    checkInLogs: [],
    checkInStats: null,
    settings: null,
    userFilters: {},
    eventFilters: {},
    paymentFilters: {},
    ticketFilters: {},
    auditFilters: {},
    checkInFilters: {},
    currentSection: 'overview',
    loading: { users: false, events: false, payments: false, tickets: false, categories: false, emailCenter: false, auditLogs: false, checkIns: false, settings: false },
    errors: { users: null, events: null, payments: null, tickets: null, categories: null, emailCenter: null, auditLogs: null, checkIns: null, settings: null },
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

  function badge(value, label) {
    const key = String(value || 'none').toLowerCase();
    const classKey = key.replace(/\s+/g, '_');
    const safe = u().escapeHtml(label || key.replace(/_/g, ' '));
    return `<span class="badge status-badge status-${u().escapeHtml(classKey)}">${safe}</span>`;
  }

  function verificationBadge(user) {
    const verified = Boolean(user.email_verified_at);
    return `<span class="badge status-badge status-${verified ? 'verified' : 'not_verified'}"><i class="bi ${verified ? 'bi-check-circle' : 'bi-x-circle'} me-1"></i>${verified ? 'Verified' : 'Not Verified'}</span>`;
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

  function eventInventory(event) {
    const tiers = event.ticket_types || [];
    const total = Number(event.total_inventory ?? tiers.reduce((sum, tier) => sum + Number(tier.quantity_total || 0), 0));
    const sold = Number(event.sold_tickets ?? tiers.reduce((sum, tier) => sum + Number(tier.quantity_sold || 0), 0));
    const reserved = tiers.reduce((sum, tier) => sum + Number(tier.quantity_reserved || 0), 0);
    const available = Number(event.available_inventory ?? Math.max(0, total - sold - reserved));
    return { sold, total, available };
  }

  function adminEventState(event) {
    if (event.event_state?.key) return event.event_state;
    if (event.status === 'cancelled' || event.status === 'completed') return { key: 'ended', label: 'Ended' };
    if (event.status !== 'published') return { key: 'draft', label: 'Draft' };

    const end = event.ends_at ? new Date(event.ends_at) : null;
    if (end && !Number.isNaN(end.getTime()) && Date.now() > end.getTime()) {
      return { key: 'ended', label: 'Ended' };
    }

    if (eventInventory(event).available <= 0) return { key: 'sold_out', label: 'Sold Out' };

    const start = event.starts_at ? new Date(event.starts_at) : null;
    return start && !Number.isNaN(start.getTime()) && Date.now() >= start.getTime()
      ? { key: 'live', label: 'Live' }
      : { key: 'upcoming', label: 'Upcoming' };
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

  function eventRevenue(eventId) {
    return state.orders
      .filter((order) => order.payment_status === 'paid')
      .flatMap((order) => order.items || [])
      .filter((item) => String(item.event_id || item.event?.id) === String(eventId))
      .reduce((sum, item) => sum + Number(item.total || 0), 0);
  }

  function organizerRevenue(userId) {
    const eventIds = new Set(state.events.filter((event) => String(event.organizer_id) === String(userId)).map((event) => String(event.id)));
    return state.orders
      .filter((order) => order.payment_status === 'paid')
      .flatMap((order) => order.items || [])
      .filter((item) => eventIds.has(String(item.event_id || item.event?.id)))
      .reduce((sum, item) => sum + Number(item.total || 0), 0);
  }

  function organizerTicketsSold(userId) {
    return state.events
      .filter((event) => String(event.organizer_id) === String(userId))
      .reduce((sum, event) => sum + eventInventory(event).sold, 0);
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

  async function loadSettings() {
    state.loading.settings = true;
    state.errors.settings = null;
    try {
      const { data } = await api().fetch('/admin/settings');
      state.settings = data;
      fillSettingsForms();
    } catch (err) {
      state.errors.settings = err.message || 'Failed to load platform settings';
    } finally {
      state.loading.settings = false;
    }
  }

  async function loadCategories() {
    state.loading.categories = true;
    state.errors.categories = null;
    renderCategories();
    try {
      const { data } = await api().fetch('/admin/categories');
      state.categories = rows(data);
      hydrateReportFilters();
    } catch (err) {
      state.errors.categories = err.message || 'Failed to load categories';
    } finally {
      state.loading.categories = false;
      renderCategories();
    }
  }

  async function loadEmailCenter() {
    state.loading.emailCenter = true;
    state.errors.emailCenter = null;
    renderEmailCenter();
    try {
      const { data } = await api().fetch('/admin/email-center');
      state.emailCenter = data;
    } catch (err) {
      state.errors.emailCenter = err.message || 'Failed to load email center';
    } finally {
      state.loading.emailCenter = false;
      renderEmailCenter();
    }
  }

  async function loadAuditLogs(page = 1) {
    state.loading.auditLogs = true;
    state.errors.auditLogs = null;
    renderAuditLogs();
    try {
      const query = qs({ per_page: 25, page, ...state.auditFilters });
      const res = await api().fetch(`/admin/audit-logs${query ? `?${query}` : ''}`);
      state.auditLogs = rows(res.data);
      state.auditMeta = res.meta || res.raw?.meta || res.raw;
    } catch (err) {
      state.errors.auditLogs = err.message || 'Failed to load audit logs';
    } finally {
      state.loading.auditLogs = false;
      renderAuditLogs();
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
      hydrateReportFilters();
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
      hydrateCheckInEvents();
      hydrateTicketEvents();
      hydrateReportFilters();
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

  async function loadTickets() {
    state.loading.tickets = true;
    state.errors.tickets = null;
    renderTickets();
    try {
      const query = qs({ per_page: 100, ...state.ticketFilters });
      const res = await api().fetch(`/admin/tickets${query ? `?${query}` : ''}`);
      state.tickets = rows(res.data);
    } catch (err) {
      state.errors.tickets = err.message || 'Failed to load tickets';
    } finally {
      state.loading.tickets = false;
      renderKpis();
      renderTickets();
      renderCheckIns();
    }
  }

  async function loadCheckIns() {
    state.loading.checkIns = true;
    state.errors.checkIns = null;
    renderCheckIns();
    try {
      const statsQuery = qs({ event_id: state.checkInFilters.event_id });
      const logsQuery = qs({ per_page: 20, ...state.checkInFilters });
      const [stats, logs] = await Promise.all([
        api().fetch(`/admin/tickets/check-in-stats${statsQuery ? `?${statsQuery}` : ''}`),
        api().fetch(`/admin/validation-logs${logsQuery ? `?${logsQuery}` : ''}`),
      ]);
      state.checkInStats = stats.data;
      state.checkInLogs = rows(logs.data);
    } catch (err) {
      state.errors.checkIns = err.message || 'Failed to load check-in monitoring';
    } finally {
      state.loading.checkIns = false;
      renderCheckIns();
    }
  }

  function hydrateCheckInEvents() {
    const select = document.querySelector('[data-admin-checkin-event]');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All events</option>' + state.events.map((event) => `<option value="${event.id}">${u().escapeHtml(event.title)}</option>`).join('');
    select.value = current;
  }

  function hydrateTicketEvents() {
    const select = document.querySelector('[data-admin-ticket-event]');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All events</option>' + state.events.map((event) => `<option value="${event.id}">${u().escapeHtml(event.title)}</option>`).join('');
    select.value = current;
  }

  function renderKpis() {
    const paidOrders = state.orders.filter((o) => o.payment_status === 'paid');
    const totalGmv = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const serviceFees = paidOrders.reduce((sum, o) => sum + Number(o.service_fee || 0), 0);
    const organizers = state.users.filter((usr) => usr.role === 'organizer' || usr.organizer_status !== 'none');
    const verifiedUsers = state.users.filter((usr) => usr.email_verified_at).length;
    const unverifiedUsers = state.users.filter((usr) => !usr.email_verified_at).length;
    const activeEvents = state.events.filter((event) => event.status === 'published').length;
    const liveEvents = state.events.filter((event) => adminEventState(event).key === 'live').length;
    const upcomingEvents = state.events.filter((event) => adminEventState(event).key === 'upcoming').length;
    const endedEvents = state.events.filter((event) => adminEventState(event).key === 'ended').length;
    const soldOutEvents = state.events.filter((event) => adminEventState(event).key === 'sold_out').length;
    const ticketsSold = state.tickets.length || state.events.reduce((sum, event) => sum + eventInventory(event).sold, 0);
    const checkedIn = Number(state.checkInStats?.checked_in || state.tickets.filter((ticket) => ticket.status === 'checked_in').length);
    const attendanceRate = ticketsSold ? Math.round((checkedIn / ticketsSold) * 100) : 0;
    const row = document.querySelector('[data-admin-kpis]');

    if (!row) return;
    row.innerHTML = `
      ${[
        ['Total Events', state.events.length, `${activeEvents} active`],
        ['Active Events', activeEvents, `${liveEvents} live now`],
        ['Live Events', liveEvents, 'Happening now'],
        ['Upcoming Events', upcomingEvents, 'Published future events'],
        ['Ended Events', endedEvents, 'Completed or past'],
        ['Sold Out Events', soldOutEvents, 'No inventory remaining'],
        ['Total Organizers', organizers.length, `${state.users.filter((u) => u.organizer_status === 'pending').length} pending`],
        ['Total Users', state.users.length, `${state.users.filter((u) => u.status === 'suspended').length} suspended`],
        ['Verified Users', verifiedUsers, 'Email verified'],
        ['Unverified Users', unverifiedUsers, 'Need verification'],
        ['Tickets Sold', ticketsSold, `${checkedIn} checked in`],
        ['Revenue Generated', money(totalGmv, 'USD'), `${paidOrders.length} paid orders`],
        ['Service Fees Collected', money(serviceFees, 'USD'), `${Number(state.settings?.default_service_fee_percentage ?? 10)}% default`],
        ['Check-Ins Completed', checkedIn, `${Number(state.checkInStats?.remaining || 0)} remaining`],
        ['Attendance Rate', `${attendanceRate}%`, 'Checked in / sold'],
      ].map(([label, value, delta]) => `<div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="delta">${delta}</div></div></div>`).join('')}`;
    renderHealth();
  }

  function renderHealth() {
    const wrap = document.querySelector('[data-admin-health]');
    if (!wrap) return;
    const pendingEvents = state.events.filter((e) => ['draft', 'pending_review'].includes(e.status)).length;
    const pendingOrganizers = state.users.filter((usr) => usr.organizer_status === 'pending').length;
    const refunds = state.orders.filter((o) => o.payment_status === 'refunded' || o.refunded_at).length;
    wrap.innerHTML = [
      ['Moderation Queue', pendingEvents, 'pending_review'],
      ['Organizer Requests', pendingOrganizers, 'pending'],
      ['Refunds Tracked', refunds, refunds ? 'refunded' : 'valid'],
      ['Default Service Fee', `${Number(state.settings?.default_service_fee_percentage ?? 10)}%`, 'active'],
    ].map(([label, value, status]) => `<div class="dashboard-mini-row"><span><span class="fw-semibold d-block">${label}</span><small>Platform status</small></span>${badge(status, String(value))}</div>`).join('');
  }

  function renderCharts() {
    const theme = chartTheme();
    const paid = state.orders.filter((o) => o.payment_status === 'paid');
    const byPeriod = (length) => {
      const result = {};
      paid.forEach((o) => {
        const key = (o.created_at || o.paid_at || '').slice(0, length);
        if (!key) return;
        result[key] = result[key] || { revenue: 0, tickets: 0 };
        result[key].revenue += Number(o.total || 0);
        result[key].tickets += (o.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      });
      return result;
    };
    const paidEventRevenue = () => {
      const map = {};
      paid.forEach((order) => {
        (order.items || []).forEach((item) => {
          const title = item.event?.title || item.event_title || 'Unknown event';
          map[title] = (map[title] || 0) + Number(item.total || 0);
        });
      });
      return map;
    };
    const paidCategoryRevenue = () => {
      const eventById = Object.fromEntries(state.events.map((event) => [String(event.id), event]));
      const map = {};
      paid.forEach((order) => {
        (order.items || []).forEach((item) => {
          const category = eventById[String(item.event_id || item.event?.id)]?.category || 'Other';
          map[category] = (map[category] || 0) + Number(item.total || 0);
        });
      });
      return map;
    };
    const paidOrganizerRevenue = () => {
      const eventById = Object.fromEntries(state.events.map((event) => [String(event.id), event]));
      const map = {};
      paid.forEach((order) => {
        (order.items || []).forEach((item) => {
          const event = eventById[String(item.event_id || item.event?.id)];
          const name = event?.organizer?.name || item.event?.organizer?.name || 'Unknown organizer';
          map[name] = (map[name] || 0) + Number(item.total || 0);
        });
      });
      return map;
    };
    const renderBar = (id, labels, values, label) => {
      const canvas = document.getElementById(id);
      if (!canvas || !window.Chart) return;
      const key = `_admin_${id}`;
      if (window[key]) window[key].destroy();
      window[key] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ label, data: values, backgroundColor: theme.primary, borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: theme.text }, grid: { color: theme.grid } }, x: { ticks: { color: theme.text }, grid: { display: false } } } },
      });
    };
    const renderDoughnut = (id, map) => {
      const canvas = document.getElementById(id);
      if (!canvas || !window.Chart) return;
      const labels = Object.keys(map).slice(0, 8);
      const key = `_admin_${id}`;
      if (window[key]) window[key].destroy();
      window[key] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: labels.map((label) => map[label]), backgroundColor: ['#5B8CFF', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#14B8A6', '#F97316', '#64748B'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: theme.text } } } },
      });
    };

    const salesChart = document.querySelector('canvas#salesChart');
    if (salesChart && window.Chart) {
      const monthly = byPeriod(7);
      const byMonth = Object.fromEntries(Object.entries(monthly).map(([key, value]) => [key, value.revenue]));
      const labels = Object.keys(byMonth).sort().slice(-12);
      if (window._salesChart) window._salesChart.destroy();
      window._salesChart = new Chart(salesChart, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Sales', data: labels.map((label) => byMonth[label]), backgroundColor: theme.primary, borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: theme.text }, grid: { color: theme.grid } }, x: { ticks: { color: theme.text }, grid: { display: false } } } },
      });
    }

    const daily = byPeriod(10);
    const dailyLabels = Object.keys(daily).sort().slice(-14);
    renderBar('adminSalesDay', dailyLabels, dailyLabels.map((label) => daily[label].tickets), 'Tickets');
    renderBar('adminSalesWeek', dailyLabels, dailyLabels.map((label) => daily[label].tickets), 'Tickets');
    renderBar('adminRevenueTrend', dailyLabels, dailyLabels.map((label) => daily[label].revenue), 'Revenue');
    renderDoughnut('adminRevenueEvent', paidEventRevenue());
    renderDoughnut('adminRevenueCategory', paidCategoryRevenue());
    renderDoughnut('adminRevenueOrganizer', paidOrganizerRevenue());

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
      body.innerHTML = loadingRow(9, 'Loading users...');
      return;
    }
    if (state.errors.users) {
      body.innerHTML = errorRow(9, state.errors.users, 'data-retry-users');
      return;
    }

    body.innerHTML = state.users.map((usr) => `
      <tr>
        <td data-label="User">${userNameCell(usr)}</td>
        <td data-label="Email">${u().escapeHtml(usr.email)}</td>
        <td data-label="Email Verification"><div title="${usr.email_verified_at ? `Verified ${u().escapeHtml(dateTimeLabel(usr.email_verified_at))}` : 'Email not verified'}">${verificationBadge(usr)}</div><small class="text-muted-pro">${usr.email_verified_at ? dateTimeLabel(usr.email_verified_at) : ''}</small></td>
        <td data-label="Joined">${dateLabel(usr.created_at)}</td>
        <td data-label="Orders">${usr.orders_count ?? 0}</td>
        <td data-label="Role">
          <select class="form-select form-select-sm admin-select" data-user-role="${usr.id}">
            ${['user', 'organizer', 'admin'].map((role) => `<option value="${role}" ${usr.role === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </td>
        <td data-label="Organizer">${badge(usr.organizer_status)}</td>
        <td data-label="Status">${badge(usr.status)}</td>
        <td data-label="Actions" class="text-end">
          <div class="admin-actions">
            ${buttonIcon('bi-eye', 'View profile', `data-view-user="${usr.id}"`)}
            ${buttonIcon('bi-save', 'Save role', `data-save-role="${usr.id}"`)}
            ${usr.status === 'suspended'
              ? buttonIcon('bi-person-check', 'Reactivate user', `data-reactivate-user="${usr.id}"`)
              : buttonIcon('bi-person-slash', 'Suspend user', `data-suspend-user="${usr.id}"`)}
          </div>
        </td>
      </tr>
    `).join('') || emptyRow(9, 'bi-people', 'No users match these filters');
  }

  function renderOrganizers() {
    const body = document.querySelector('[data-admin-organizers] tbody');
    if (!body) return;
    if (state.loading.users) {
      body.innerHTML = loadingRow(7, 'Loading organizers...');
      return;
    }
    if (state.errors.users) {
      body.innerHTML = errorRow(7, state.errors.users, 'data-retry-users');
      return;
    }

    const organizers = state.users.filter((usr) => usr.role === 'organizer' || ['pending', 'approved', 'rejected'].includes(usr.organizer_status));
    body.innerHTML = organizers.map((usr) => `
      <tr>
        <td data-label="Organizer">${userNameCell(usr)}</td>
        <td data-label="Contact"><div>${u().escapeHtml(usr.email)}</div><small class="text-muted-pro">${u().escapeHtml(usr.phone || '')}</small></td>
        <td data-label="Status">${badge(usr.organizer_status)}</td>
        <td data-label="Events">${usr.organized_events_count ?? 0}</td>
        <td data-label="Revenue">${money(organizerRevenue(usr.id), 'USD')}</td>
        <td data-label="Tickets Sold">${organizerTicketsSold(usr.id)}</td>
        <td data-label="Actions" class="text-end">
          <div class="admin-actions">
            ${buttonIcon('bi-eye', 'View profile', `data-view-user="${usr.id}"`)}
            ${buttonIcon('bi-pencil', 'Edit organizer', `data-view-user="${usr.id}"`)}
            <button class="btn btn-glass btn-sm" type="button" data-approve-organizer="${usr.id}" ${usr.organizer_status === 'approved' ? 'disabled' : ''}>Approve</button>
            ${usr.status === 'suspended'
              ? `<button class="btn btn-glass btn-sm" type="button" data-reactivate-user="${usr.id}">Reactivate</button>`
              : `<button class="btn btn-glass btn-sm" type="button" data-suspend-user="${usr.id}">Suspend</button>`}
          </div>
        </td>
      </tr>
    `).join('') || emptyRow(7, 'bi-person-check', 'No organizers found');
    renderOrganizerRanking();
  }

  function renderEvents() {
    const body = document.querySelector('[data-admin-events] tbody');
    if (!body) return;
    if (state.loading.events) {
      body.innerHTML = loadingRow(11, 'Loading events...');
      return;
    }
    if (state.errors.events) {
      body.innerHTML = errorRow(11, state.errors.events, 'data-retry-events');
      return;
    }

    body.innerHTML = state.events.map((event) => {
      const inventory = eventInventory(event);
      const displayState = adminEventState(event);
      const revenue = eventRevenue(event.id);
      return `
        <tr>
          <td data-label="Select"><input class="form-check-input" type="checkbox" data-admin-event-select="${event.id}"></td>
          <td data-label="Event"><div class="fw-semibold">${u().escapeHtml(event.title)}</div><div class="small text-muted-pro">${u().escapeHtml(event.city || '')} · ${u().escapeHtml(u().formatEventDate(event.starts_at, event.timezone))}</div></td>
          <td data-label="Category">${u().escapeHtml(event.category || '-')}</td>
          <td data-label="Organizer">${u().escapeHtml(event.organizer?.name || `#${event.organizer_id}`)}</td>
          <td data-label="Status">${badge(displayState.key, displayState.label)}</td>
          <td data-label="Tickets Sold"><span class="fw-semibold">${inventory.sold} / ${inventory.total}</span></td>
          <td data-label="Inventory">${inventory.available} remaining</td>
          <td data-label="Revenue">${money(revenue, event.currency || 'USD')}</td>
          <td data-label="Service Fee">
            <div class="d-flex gap-2 align-items-center">
              <input class="form-control form-control-sm admin-select" style="max-width:84px" type="number" min="0" max="30" step="0.01" value="${Number(event.service_fee_percentage ?? 10)}" data-event-fee-input="${event.id}"/>
              <button class="btn btn-glass btn-sm" type="button" data-save-event-fee="${event.id}">Save</button>
            </div>
          </td>
          <td data-label="Created">${dateLabel(event.created_at)}</td>
          <td data-label="Actions" class="text-end">
            <div class="admin-actions">
              ${buttonIcon('bi-eye', 'View event', `data-view-event="${event.id}"`)}
              ${buttonIcon('bi-pencil', 'Edit event', `data-edit-event="${event.id}"`)}
              <button class="btn btn-glass btn-sm" type="button" data-publish-event="${event.id}" ${event.status === 'published' ? 'disabled' : ''}>Publish</button>
              <button class="btn btn-glass btn-sm" type="button" data-unpublish-event="${event.id}" ${event.status !== 'published' ? 'disabled' : ''}>Unpublish</button>
              <button class="btn btn-glass btn-sm" type="button" data-feature-event="${event.id}">${event.is_featured ? 'Unfeature' : 'Feature'}</button>
              <button class="btn btn-glass btn-sm" type="button" data-archive-event="${event.id}">Archive</button>
              ${buttonIcon('bi-trash', 'Delete event', `data-delete-event="${event.id}"`)}
            </div>
          </td>
        </tr>
      `;
    }).join('') || emptyRow(11, 'bi-calendar-event', 'No events match these filters');
  }

  function paymentRow(order, actions) {
    const emailSent = Boolean(order.order_confirmation_email_sent_at);
    return `
      <tr>
        <td data-label="Order"><div class="fw-semibold">${u().escapeHtml(order.order_number)}</div><div class="small text-muted-pro">${dateTimeLabel(order.created_at)}</div></td>
        <td data-label="Customer">${u().escapeHtml(order.user?.name || order.user?.email || order.billing_email || '-')}</td>
        <td data-label="Status">${badge(order.payment_status)}</td>
        <td data-label="Provider">${u().escapeHtml(order.payment_provider || '-')}</td>
        <td data-label="Email"><div>${badge(emailSent ? 'sent' : 'not sent')}</div><small class="text-muted-pro">${emailSent ? dateTimeLabel(order.order_confirmation_email_sent_at) : ''}</small></td>
        <td data-label="Total">${money(order.total, order.currency)}</td>
        <td data-label="Actions" class="text-end"><div class="admin-actions">${actions(order)}</div></td>
      </tr>`;
  }

  function renderPayments() {
    const paymentsBody = document.querySelector('[data-admin-payments] tbody');
    const refundsBody = document.querySelector('[data-admin-refunds] tbody');
    if (!paymentsBody || !refundsBody) return;
    if (state.loading.payments) {
      paymentsBody.innerHTML = loadingRow(7, 'Loading payments...');
      refundsBody.innerHTML = loadingRow(7, 'Loading refunds...');
      return;
    }
    if (state.errors.payments) {
      paymentsBody.innerHTML = errorRow(7, state.errors.payments, 'data-retry-payments');
      refundsBody.innerHTML = errorRow(7, state.errors.payments, 'data-retry-payments');
      return;
    }

    const payments = state.orders.filter((o) => o.payment_status !== 'refunded').slice(0, 25);
    const refunds = state.orders.filter((o) => o.payment_status === 'refunded' || o.refunded_at).slice(0, 25);

    paymentsBody.innerHTML = payments.map((order) => paymentRow(order, (o) => `
      ${buttonIcon('bi-receipt', 'Payment details', `data-view-payment="${o.id}"`)}
      <button class="btn btn-glass btn-sm" type="button" data-refund-order="${o.id}" ${o.payment_status !== 'paid' ? 'disabled' : ''}>Refund</button>
    `)).join('') || emptyRow(7, 'bi-credit-card', 'No payments found');

    refundsBody.innerHTML = refunds.map((order) => paymentRow(order, (o) => buttonIcon('bi-receipt', 'Refund details', `data-view-payment="${o.id}"`))).join('') || emptyRow(7, 'bi-arrow-counterclockwise', 'No refunded orders yet');
  }

  function renderTickets() {
    const body = document.querySelector('[data-admin-tickets]');
    if (!body) return;
    if (state.loading.tickets) {
      body.innerHTML = loadingRow(6, 'Loading tickets...');
      return;
    }
    if (state.errors.tickets) {
      body.innerHTML = errorRow(6, state.errors.tickets, 'data-retry-tickets');
      return;
    }
    body.innerHTML = state.tickets.map((ticket) => `
      <tr>
        <td data-label="Ticket Type"><div class="fw-semibold">${u().escapeHtml(ticket.ticket_type?.name || '-')}</div><small class="text-muted-pro">${u().escapeHtml(ticket.ticket_code || '')}</small></td>
        <td data-label="Event">${u().escapeHtml(ticket.event?.title || '-')}</td>
        <td data-label="Attendee"><div>${u().escapeHtml(ticket.attendee?.name || 'Guest')}</div><small class="text-muted-pro">${u().escapeHtml(ticket.attendee?.email || '')}</small></td>
        <td data-label="Purchaser"><div>${u().escapeHtml(ticket.purchaser?.name || ticket.order?.purchaser?.name || '-')}</div><small class="text-muted-pro">${u().escapeHtml(ticket.purchaser?.email || ticket.order?.purchaser?.email || '')}</small></td>
        <td data-label="Status">${badge(ticket.status)}</td>
        <td data-label="Actions" class="text-end">
          <div class="admin-actions">
            ${buttonIcon('bi-eye', 'View ticket', `data-view-ticket="${ticket.id}"`)}
            ${buttonIcon('bi-qr-code', 'View QR', `data-ticket-qr="${ticket.id}"`)}
            <button class="btn btn-glass btn-sm" type="button" data-ticket-manual-validation="${ticket.ticket_code}">Manual Validation</button>
          </div>
        </td>
      </tr>
    `).join('') || emptyRow(6, 'bi-ticket-perforated', 'No tickets match these filters');
  }

  function fillSettingsForms() {
    const settings = state.settings || {};
    const defaultFee = document.querySelector('[data-admin-default-fee]');
    if (defaultFee) defaultFee.value = Number(settings.default_service_fee_percentage ?? 10);
    document.querySelectorAll('[data-admin-platform-settings-form] [name]').forEach((input) => {
      const value = settings[input.name];
      if (value === undefined || value === null) return;
      if (input.name === 'maintenance_mode' || input.name === 'registration_enabled') {
        input.value = value ? '1' : '0';
      } else {
        input.value = value;
      }
    });
  }

  function renderCategories() {
    const body = document.querySelector('[data-admin-categories]');
    if (!body) return;
    if (state.loading.categories) {
      body.innerHTML = loadingRow(6, 'Loading categories...');
      return;
    }
    if (state.errors.categories) {
      body.innerHTML = errorRow(6, state.errors.categories, 'data-retry-categories');
      return;
    }
    body.innerHTML = state.categories.map((category) => `
      <tr>
        <td data-label="Name"><input class="form-control form-control-sm" value="${u().escapeHtml(category.name)}" data-category-name="${category.id}"></td>
        <td data-label="Slug">${u().escapeHtml(category.slug)}</td>
        <td data-label="Icon"><input class="form-control form-control-sm" value="${u().escapeHtml(category.icon || '')}" data-category-icon="${category.id}"></td>
        <td data-label="Events">${category.events_count ?? 0}</td>
        <td data-label="Status">${badge(category.is_active ? 'active' : 'inactive')}</td>
        <td data-label="Actions" class="text-end"><div class="admin-actions"><button class="btn btn-glass btn-sm" data-save-category="${category.id}">Save</button><button class="btn btn-glass btn-sm" data-toggle-category="${category.id}">${category.is_active ? 'Disable' : 'Enable'}</button><button class="btn btn-glass btn-sm" data-delete-category="${category.id}">Delete</button></div></td>
      </tr>
    `).join('') || emptyRow(6, 'bi-tags', 'No categories configured');
  }

  function renderEmailCenter() {
    const statusBody = document.querySelector('[data-admin-email-statuses]');
    const select = document.querySelector('[data-email-template-select]');
    if (statusBody) {
      if (state.loading.emailCenter) {
        statusBody.innerHTML = loadingRow(5, 'Loading email statuses...');
      } else if (state.errors.emailCenter) {
        statusBody.innerHTML = errorRow(5, state.errors.emailCenter, 'data-retry-email-center');
      } else {
        const statuses = state.emailCenter?.email_statuses || [];
        statusBody.innerHTML = statuses.map((email) => `
          <tr><td data-label="Type">${u().escapeHtml(email.label)}</td><td data-label="Recipient">${u().escapeHtml(email.recipient || '-')}</td><td data-label="Reference">${u().escapeHtml(email.reference || '-')}</td><td data-label="Status">${badge(email.sent ? 'sent' : 'not_sent')}</td><td data-label="Timestamp">${dateTimeLabel(email.sent_at)}</td></tr>
        `).join('') || emptyRow(5, 'bi-envelope', 'No email status records yet');
      }
    }
    if (select && state.emailCenter?.templates) {
      const current = select.value;
      select.innerHTML = state.emailCenter.templates.map((template) => `<option value="${template.id}">${u().escapeHtml(template.name)}</option>`).join('');
      select.value = current || String(state.emailCenter.templates[0]?.id || '');
      fillEmailTemplateForm();
    }
  }

  function selectedEmailTemplate() {
    const id = document.querySelector('[data-email-template-select]')?.value;
    return (state.emailCenter?.templates || []).find((template) => String(template.id) === String(id));
  }

  function fillEmailTemplateForm() {
    const form = document.querySelector('[data-email-template-form]');
    const template = selectedEmailTemplate();
    if (!form || !template) return;
    form.elements.subject.value = template.subject || '';
    form.elements.html_template.value = template.html_template || '';
    form.elements.text_template.value = template.text_template || '';
    const preview = document.querySelector('[data-email-template-preview]');
    if (preview) preview.hidden = true;
  }

  function renderAuditLogs() {
    const body = document.querySelector('[data-admin-audit-logs]');
    const pager = document.querySelector('[data-admin-audit-pagination]');
    if (!body) return;
    if (state.loading.auditLogs) {
      body.innerHTML = loadingRow(4, 'Loading audit logs...');
      if (pager) pager.innerHTML = '';
      return;
    }
    if (state.errors.auditLogs) {
      body.innerHTML = errorRow(4, state.errors.auditLogs, 'data-retry-audit-logs');
      if (pager) pager.innerHTML = '';
      return;
    }
    body.innerHTML = state.auditLogs.map((log) => `
      <tr><td data-label="Admin"><div class="fw-semibold">${u().escapeHtml(log.user?.name || 'System')}</div><small class="text-muted-pro">${u().escapeHtml(log.user?.email || '')}</small></td><td data-label="Action">${badge(log.action)}</td><td data-label="Target"><div>${u().escapeHtml(log.auditable_type || '-')}</div><small>${log.auditable_id || ''}</small></td><td data-label="Timestamp">${dateTimeLabel(log.created_at)}</td></tr>
    `).join('') || emptyRow(4, 'bi-activity', 'No audit logs yet');
    if (pager && state.auditMeta?.last_page > 1) {
      const current = Number(state.auditMeta.current_page || 1);
      pager.innerHTML = `<div class="dashboard-pagination"><button class="btn btn-glass btn-sm" data-audit-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}>Previous</button><span class="text-muted-pro small">Page ${current} of ${state.auditMeta.last_page}</span><button class="btn btn-glass btn-sm" data-audit-page="${current + 1}" ${current >= state.auditMeta.last_page ? 'disabled' : ''}>Next</button></div>`;
    } else if (pager) {
      pager.innerHTML = '';
    }
  }

  function renderRevenueKpis() {
    const row = document.querySelector('[data-admin-revenue-kpis]');
    if (!row) return;
    const paid = state.orders.filter((order) => order.payment_status === 'paid');
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueFor = (predicate) => paid
      .filter((order) => predicate(new Date(order.created_at || order.paid_at || 0)))
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    row.innerHTML = `
      <div class="col-md-3"><div class="kpi"><div class="label">Total Revenue</div><div class="value">${money(revenueFor(() => true), 'USD')}</div><div class="delta">${paid.length} paid orders</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">This Month</div><div class="value">${money(revenueFor((date) => date >= startOfMonth), 'USD')}</div><div class="delta">Month to date</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">This Week</div><div class="value">${money(revenueFor((date) => date >= startOfWeek), 'USD')}</div><div class="delta">Week to date</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Today</div><div class="value">${money(revenueFor((date) => date.toISOString().slice(0, 10) === todayKey), 'USD')}</div><div class="delta">Current day</div></div></div>`;
  }

  function renderOrganizerRanking() {
    const wrap = document.querySelector('[data-admin-organizer-ranking]');
    if (!wrap) return;
    const organizers = state.users
      .filter((usr) => usr.role === 'organizer' || usr.organizer_status !== 'none')
      .map((usr) => ({ user: usr, revenue: organizerRevenue(usr.id), tickets: organizerTicketsSold(usr.id) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    wrap.innerHTML = organizers.map((item, index) => `<div class="dashboard-mini-row"><span><span class="fw-semibold d-block">${index + 1}. ${u().escapeHtml(item.user.name || item.user.email)}</span><small>${item.tickets} tickets sold</small></span><span class="fw-semibold">${money(item.revenue, 'USD')}</span></div>`).join('') || '<div class="admin-empty"><i class="bi bi-person-check"></i><span>No organizer performance yet</span></div>';
    renderTopLists();
  }

  function renderTopLists() {
    const topEvents = document.querySelector('[data-admin-top-events]');
    if (topEvents) {
      const events = [...state.events].sort((a, b) => eventRevenue(b.id) - eventRevenue(a.id)).slice(0, 8);
      topEvents.innerHTML = events.map((event, index) => `<div class="dashboard-mini-row"><span><span class="fw-semibold d-block">${index + 1}. ${u().escapeHtml(event.title)}</span><small>${eventInventory(event).sold} tickets sold</small></span><span class="fw-semibold">${money(eventRevenue(event.id), event.currency || 'USD')}</span></div>`).join('') || '<div class="admin-empty"><i class="bi bi-calendar-event"></i><span>No event sales yet</span></div>';
    }
    const topOrganizers = document.querySelector('[data-admin-top-organizers]');
    if (topOrganizers) {
      const organizers = state.users
        .filter((usr) => usr.role === 'organizer' || usr.organizer_status !== 'none')
        .map((usr) => ({ user: usr, revenue: organizerRevenue(usr.id), tickets: organizerTicketsSold(usr.id) }))
        .sort((a, b) => b.tickets - a.tickets)
        .slice(0, 8);
      topOrganizers.innerHTML = organizers.map((item, index) => `<div class="dashboard-mini-row"><span><span class="fw-semibold d-block">${index + 1}. ${u().escapeHtml(item.user.name || item.user.email)}</span><small>${money(item.revenue, 'USD')} revenue</small></span><span class="fw-semibold">${item.tickets}</span></div>`).join('') || '<div class="admin-empty"><i class="bi bi-person-check"></i><span>No organizer sales yet</span></div>';
    }
  }

  function hydrateReportFilters() {
    const organizerSelect = document.querySelector('[data-report-organizer]');
    if (organizerSelect) {
      const current = organizerSelect.value;
      const organizers = state.users.filter((usr) => usr.role === 'organizer' || usr.organizer_status !== 'none');
      organizerSelect.innerHTML = '<option value="">All organizers</option>' + organizers.map((usr) => `<option value="${usr.id}">${u().escapeHtml(usr.name || usr.email)}</option>`).join('');
      organizerSelect.value = current;
    }
    const categorySelect = document.querySelector('[data-report-category]');
    if (categorySelect) {
      const current = categorySelect.value;
      categorySelect.innerHTML = '<option value="">All categories</option>' + state.categories.map((category) => `<option value="${u().escapeHtml(category.name)}">${u().escapeHtml(category.name)}</option>`).join('');
      categorySelect.value = current;
    }
  }

  function reportFilters() {
    return {
      dateFrom: document.querySelector('[data-report-date-from]')?.value || '',
      dateTo: document.querySelector('[data-report-date-to]')?.value || '',
      organizerId: document.querySelector('[data-report-organizer]')?.value || '',
      category: document.querySelector('[data-report-category]')?.value || '',
    };
  }

  function eventMatchesReport(event, filters) {
    if (filters.organizerId && String(event.organizer_id) !== String(filters.organizerId)) return false;
    if (filters.category && event.category !== filters.category) return false;
    return true;
  }

  function orderMatchesReport(order, filters) {
    const date = (order.created_at || order.paid_at || '').slice(0, 10);
    if (filters.dateFrom && date < filters.dateFrom) return false;
    if (filters.dateTo && date > filters.dateTo) return false;
    if (!filters.organizerId && !filters.category) return true;
    const eventById = Object.fromEntries(state.events.map((event) => [String(event.id), event]));
    return (order.items || []).some((item) => eventMatchesReport(eventById[String(item.event_id || item.event?.id)] || {}, filters));
  }

  function reportRows(type) {
    const filters = reportFilters();
    if (type === 'revenue') {
      return {
        title: 'Revenue Report',
        headers: ['Order', 'Customer', 'Revenue', 'Service Fee', 'Date'],
        rows: state.orders.filter((order) => order.payment_status === 'paid' && orderMatchesReport(order, filters)).map((order) => [order.order_number, order.user?.email || order.billing_email || '', money(order.total, order.currency), money(order.service_fee, order.currency), dateTimeLabel(order.created_at)]),
      };
    }
    if (type === 'attendance') {
      return {
        title: 'Attendance Report',
        headers: ['Event', 'Tickets Sold', 'Checked In', 'Remaining'],
        rows: state.events.filter((event) => eventMatchesReport(event, filters)).map((event) => {
          const sold = state.tickets.filter((ticket) => String(ticket.event?.id) === String(event.id)).length || eventInventory(event).sold;
          const checked = state.tickets.filter((ticket) => String(ticket.event?.id) === String(event.id) && ticket.status === 'checked_in').length;
          return [event.title, sold, checked, Math.max(0, sold - checked)];
        }),
      };
    }
    if (type === 'organizers') {
      return {
        title: 'Organizer Report',
        headers: ['Organizer', 'Email', 'Events', 'Tickets Sold', 'Revenue'],
        rows: state.users.filter((usr) => usr.role === 'organizer' || usr.organizer_status !== 'none').filter((usr) => !filters.organizerId || String(usr.id) === String(filters.organizerId)).map((usr) => [usr.name || usr.email, usr.email, usr.organized_events_count || 0, organizerTicketsSold(usr.id), money(organizerRevenue(usr.id), 'USD')]),
      };
    }
    return {
      title: 'Ticket Sales Report',
      headers: ['Event', 'Category', 'Tickets Sold', 'Inventory Remaining', 'Revenue'],
      rows: state.events.filter((event) => eventMatchesReport(event, filters)).map((event) => [event.title, event.category || '', eventInventory(event).sold, eventInventory(event).available, money(eventRevenue(event.id), event.currency || 'USD')]),
    };
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportReport(type, format) {
    const report = reportRows(type);
    if (format === 'pdf') {
      const win = window.open('', '_blank');
      if (!win) {
        window.tkToast?.('Popup blocked. Allow popups to export PDF.', 'error');
        return;
      }
      win.document.write(`<!doctype html><html><head><title>${u().escapeHtml(report.title)}</title><style>body{font-family:Arial,sans-serif;color:#111827;padding:28px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left;font-size:12px}th{background:#f8fafc}.brand{font-weight:700;color:#2563eb}</style></head><body><div class="brand">Event Sphere</div><h1>${u().escapeHtml(report.title)}</h1><p>Generated ${u().escapeHtml(dateTimeLabel(new Date().toISOString()))}</p><table><thead><tr>${report.headers.map((header) => `<th>${u().escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${report.rows.map((row) => `<tr>${row.map((cell) => `<td>${u().escapeHtml(cell)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${report.headers.length}">No data</td></tr>`}</tbody></table><script>window.print();<\/script></body></html>`);
      win.document.close();
      return;
    }
    const csv = [report.headers, ...report.rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-sphere-${type}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderCheckIns() {
    const statsRow = document.querySelector('[data-admin-checkin-stats]');
    const body = document.querySelector('[data-admin-checkin-logs]');
    if (statsRow) {
      const stats = state.checkInStats || { tickets_sold: 0, checked_in: 0, remaining: 0 };
      statsRow.innerHTML = `
        <div class="col-md-4"><div class="kpi"><div class="label">Tickets Sold</div><div class="value">${stats.tickets_sold ?? 0}</div></div></div>
        <div class="col-md-4"><div class="kpi"><div class="label">Checked In</div><div class="value">${stats.checked_in ?? 0}</div></div></div>
        <div class="col-md-4"><div class="kpi"><div class="label">Remaining</div><div class="value">${stats.remaining ?? 0}</div></div></div>`;
    }
    if (!body) return;
    if (state.loading.checkIns) {
      body.innerHTML = loadingRow(6, 'Loading validation logs...');
      return;
    }
    if (state.errors.checkIns) {
      body.innerHTML = errorRow(6, state.errors.checkIns, 'data-retry-checkins');
      return;
    }
    body.innerHTML = state.checkInLogs.map((log) => `
      <tr>
        <td data-label="Result">${badge(log.result)}</td>
        <td data-label="Event">${u().escapeHtml(log.event?.title || '-')}</td>
        <td data-label="Attendee"><div class="fw-semibold">${u().escapeHtml(log.attendee?.name || '-')}</div><small class="text-muted-pro">${u().escapeHtml(log.attendee?.email || '')}</small></td>
        <td data-label="Ticket">${u().escapeHtml(log.ticket_code || log.ticket_uuid || '-')}</td>
        <td data-label="Scanned By">${u().escapeHtml(log.scanner?.name || log.scanner?.email || '-')}</td>
        <td data-label="Time">${dateTimeLabel(log.scanned_at)}</td>
      </tr>
    `).join('') || emptyRow(6, 'bi-clock-history', 'No validation logs yet');
  }

  function renderActivity() {
    const wrap = document.querySelector('[data-admin-activity]');
    if (!wrap) return;

    const activity = [
      ...state.users.slice(0, 8).map((usr) => ({ at: usr.created_at, icon: 'bi-person-plus', text: `User registered: ${usr.email}`, status: usr.email_verified_at ? 'verified' : 'not_verified' })),
      ...state.users.filter((usr) => usr.organizer_status === 'approved').slice(0, 5).map((usr) => ({ at: usr.organizer_approved_at || usr.updated_at, icon: 'bi-person-check', text: `Organizer approved: ${usr.name || usr.email}`, status: 'approved' })),
      ...state.events.slice(0, 8).map((evt) => ({ at: evt.created_at, icon: 'bi-calendar-plus', text: `Event created: ${evt.title}`, status: evt.status })),
      ...state.events.filter((evt) => evt.status === 'published').slice(0, 6).map((evt) => ({ at: evt.updated_at || evt.created_at, icon: 'bi-broadcast', text: `Event published: ${evt.title}`, status: 'published' })),
      ...state.events.filter((evt) => adminEventState(evt).key === 'sold_out').slice(0, 6).map((evt) => ({ at: evt.updated_at || evt.created_at, icon: 'bi-lightning-charge', text: `Event sold out: ${evt.title}`, status: 'sold_out' })),
      ...state.orders.slice(0, 8).map((order) => ({ at: order.updated_at || order.created_at, icon: 'bi-ticket-perforated', text: `Ticket purchased: ${order.order_number}`, status: order.payment_status })),
      ...state.checkInLogs.slice(0, 8).map((log) => ({ at: log.scanned_at, icon: 'bi-qr-code-scan', text: `Attendee checked in: ${log.attendee?.name || log.ticket_code || 'Ticket'}`, status: log.result })),
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
    renderRevenueKpis();
    renderCharts();
    renderUsers();
    renderOrganizers();
    renderEvents();
    renderTickets();
    renderPayments();
    renderCheckIns();
    renderCategories();
    renderEmailCenter();
    renderAuditLogs();
    renderActivity();
    renderTopLists();
  }

  async function refreshAll() {
    renderAll();
    await Promise.all([loadSettings(), loadPayments(), loadUsers(), loadEvents(), loadTickets(), loadCategories(), loadEmailCenter(), loadAuditLogs()]);
    await loadCheckIns();
    renderAll();
  }

  async function refreshCategories() {
    await loadCategories();
  }

  async function refreshEmailCenter() {
    await loadEmailCenter();
  }

  async function refreshAuditLogs(page = 1) {
    await loadAuditLogs(page);
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
    await loadTickets();
    await loadCheckIns();
    renderKpis();
    renderCharts();
    renderEvents();
    renderCheckIns();
    renderActivity();
  }

  async function refreshPayments() {
    await loadPayments();
    renderKpis();
    renderRevenueKpis();
    renderCharts();
    renderPayments();
    renderActivity();
  }

  async function refreshCheckIns() {
    await loadCheckIns();
    renderKpis();
    renderCheckIns();
    renderActivity();
  }

  async function refreshTickets() {
    await loadTickets();
    renderKpis();
    renderTickets();
  }

  function setModal(title, body) {
    const modalEl = document.getElementById('adminDetailModal');
    if (!modalEl) return;
    modalEl.querySelector('.modal-title').textContent = title;
    modalEl.querySelector('.modal-body').innerHTML = body;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }

  function showSection(section) {
    const target = section || 'overview';
    const exists = !!document.querySelector(`[data-admin-section="${target}"]`);
    state.currentSection = exists ? target : 'overview';
    document.querySelectorAll('[data-admin-section]').forEach((panel) => {
      const active = panel.dataset.adminSection === state.currentSection;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    document.querySelectorAll('[data-admin-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.adminNav === state.currentSection);
    });
    window.EventSphereDashboardNav?.close?.();
    if (location.hash.replace('#', '') !== state.currentSection) {
      history.replaceState(null, '', `#${state.currentSection}`);
    }
    renderCharts();
  }

  function bindSectionNavigation() {
    document.querySelectorAll('[data-admin-nav]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showSection(link.dataset.adminNav);
      });
    });
    window.addEventListener('hashchange', () => showSection(location.hash.replace('#', '') || 'overview'));
    showSection(location.hash.replace('#', '') || 'overview');
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
        ['Email verification', verificationBadge(user)],
        ['Verified at', dateTimeLabel(user.email_verified_at)],
        ['Joined', dateLabel(user.created_at)],
        ['Last login', dateTimeLabel(user.last_login_at)],
        ['Orders', String(user.orders_count ?? 0)],
        ['Tickets', String(user.tickets_count ?? 0)],
        ['Events', String(user.organized_events_count ?? 0)],
      ])}
      <h6 class="mt-4">Recent orders</h6>
      ${orders.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${orders.map((order) => `<tr><td>${u().escapeHtml(order.order_number)}</td><td>${badge(order.payment_status)}</td><td>${money(order.total, order.currency)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No recent orders.</p>'}
      <h6 class="mt-4">Organized events</h6>
      ${events.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${events.map((event) => `<tr><td>${u().escapeHtml(event.title)}</td><td>${badge(event.status)}</td><td>${u().escapeHtml(u().formatEventDate(event.starts_at, event.timezone))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No organized events.</p>'}
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
        ['Starts', u().formatEventDate(event.starts_at, event.timezone)],
        ['Tickets', String(event.tickets_count ?? 0)],
        ['Views', String(event.views_count ?? 0)],
      ])}
      <h6 class="mt-4">Moderation notes</h6>
      <p class="text-muted-pro mb-0">${u().escapeHtml(event.moderation_notes || 'No notes recorded.')}</p>
    `);
  }

  async function showTicket(ticketId) {
    setModal('Ticket details', '<div class="py-4 text-muted-pro"><span class="spinner-border spinner-border-sm me-2"></span>Loading ticket...</div>');
    const { data: ticket } = await api().fetch(`/admin/tickets/${ticketId}`);
    setModal(`Ticket ${ticket.ticket_code}`, `
      ${detailList([
        ['Ticket Type', u().escapeHtml(ticket.ticket_type?.name || '-')],
        ['Event', u().escapeHtml(ticket.event?.title || '-')],
        ['Attendee', `${u().escapeHtml(ticket.attendee?.name || 'Guest')}<br><small>${u().escapeHtml(ticket.attendee?.email || '')}</small>`],
        ['Purchaser', `${u().escapeHtml(ticket.purchaser?.name || ticket.order?.purchaser?.name || '-')}<br><small>${u().escapeHtml(ticket.purchaser?.email || ticket.order?.purchaser?.email || '')}</small>`],
        ['Order', u().escapeHtml(ticket.order?.order_number || '-')],
        ['Status', badge(ticket.status)],
        ['Checked in', dateTimeLabel(ticket.checked_in_at)],
      ])}
      <div class="d-flex gap-2 flex-wrap mt-3">
        <button class="btn btn-glass btn-sm" type="button" data-ticket-qr="${ticket.id}">View QR</button>
        <button class="btn btn-glass btn-sm" type="button" data-ticket-manual-validation="${u().escapeHtml(ticket.ticket_code)}">Manual Validation</button>
      </div>
    `);
  }

  function showTicketQr(ticketId) {
    const ticket = state.tickets.find((item) => String(item.id) === String(ticketId));
    const url = ticket?.qr_code_url || `${window.EventSphereConfig.API_BASE_URL}/tickets/${ticketId}/qr-code`;
    setModal('Ticket QR', `<div class="text-center"><img src="${u().escapeHtml(url)}" alt="Ticket QR code" style="max-width:280px;width:100%;background:#fff;border-radius:12px;padding:12px"/><p class="text-muted-pro mt-3 mb-0">${u().escapeHtml(ticket?.ticket_code || '')}</p></div>`);
  }

  async function manualValidateTicket(ticketCode) {
    const { data } = await api().fetch('/admin/tickets/validate', {
      method: 'POST',
      body: { ticket_code: ticketCode, method: 'admin_manual' },
    });
    const validation = data.validation || {};
    setModal('Manual Validation', `
      ${detailList([
        ['Result', badge(validation.result)],
        ['Reason', u().escapeHtml(validation.reason || '-')],
        ['Ticket', u().escapeHtml(data.ticket?.ticket_code || ticketCode || '-')],
        ['Attendee', u().escapeHtml(data.ticket?.attendee?.name || '-')],
        ['Event', u().escapeHtml(data.ticket?.event?.title || '-')],
      ])}
    `);
    await refreshCheckIns();
  }

  function selectedEventIds() {
    return Array.from(document.querySelectorAll('[data-admin-event-select]:checked')).map((input) => input.dataset.adminEventSelect);
  }

  async function bulkEventAction(action) {
    const ids = selectedEventIds();
    if (!ids.length) {
      window.tkToast?.('Select at least one event first.', 'info');
      return;
    }
    if (action === 'delete' && !confirm(`Delete ${ids.length} selected events?`)) return;
    const category = action === 'category' ? prompt('New category for selected events', '') : '';
    if (action === 'category' && !category) return;

    for (const id of ids) {
      if (action === 'publish') await api().fetch(`/admin/events/${id}/publish`, { method: 'POST', body: {} });
      if (action === 'unpublish') await api().fetch(`/admin/events/${id}/unpublish`, { method: 'POST', body: { reason: 'Bulk unpublish' } });
      if (action === 'category') await api().fetch(`/admin/events/${id}`, { method: 'PATCH', body: { category } });
      if (action === 'delete') await api().fetch(`/admin/events/${id}`, { method: 'DELETE' });
    }
    window.tkToast?.('Bulk action completed');
    await refreshEvents();
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
        ['Confirmation email', badge(order.order_confirmation_email_sent_at ? 'sent' : 'not sent')],
        ['Email sent at', dateTimeLabel(order.order_confirmation_email_sent_at)],
        ['Refunded at', dateTimeLabel(order.refunded_at)],
        ['Reference', u().escapeHtml(order.payment_reference || '-')],
      ])}
      <h6 class="mt-4">Items</h6>
      ${items.length ? `<div class="table-responsive"><table class="table table-borderless admin-mini-table"><tbody>${items.map((item) => `<tr><td>${u().escapeHtml(item.event_title || item.event?.title || '-')}</td><td>${u().escapeHtml(item.ticket_type_name || item.ticket_type?.name || '-')}</td><td>x${item.quantity}</td><td><small>Ticket ${money(Number(item.unit_price || 0) * Number(item.quantity || 0), order.currency)}<br>Fee ${money(item.service_fee, order.currency)}</small></td><td>${money(item.total, order.currency)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="text-muted-pro mb-0">No line items.</p>'}
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
      state.userFilters = {
        q: fd.get('q'),
        role: fd.get('role'),
        status: fd.get('status'),
        organizer_status: fd.get('organizer_status'),
        email_verification: fd.get('email_verification'),
        sort: fd.get('sort'),
      };
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

    const ticketForm = document.querySelector('[data-admin-ticket-filters]');
    ticketForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(ticketForm);
      state.ticketFilters = { status: fd.get('status'), event_id: fd.get('event_id') };
      await refreshTickets();
    });

    document.querySelector('[data-reset-admin-tickets]')?.addEventListener('click', async () => {
      ticketForm?.reset();
      state.ticketFilters = {};
      await refreshTickets();
    });

    document.querySelector('[data-admin-default-fee-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const fd = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const { data } = await api().fetch('/admin/settings', {
          method: 'PATCH',
          body: { default_service_fee_percentage: fd.get('default_service_fee_percentage') },
        });
        state.settings = data;
        renderKpis();
        window.tkToast?.('Default service fee updated');
      } catch (err) {
        window.tkToast?.(err.message || 'Default fee update failed', 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });

    document.querySelector('[data-admin-platform-settings-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const fd = new FormData(form);
      const body = {};
      fd.forEach((value, key) => {
        body[key] = value;
      });
      if (button) button.disabled = true;
      try {
        const { data } = await api().fetch('/admin/settings', { method: 'PATCH', body });
        state.settings = data;
        fillSettingsForms();
        renderKpis();
        renderHealth();
        window.tkToast?.('Platform settings updated');
        await refreshAuditLogs();
      } catch (err) {
        window.tkToast?.(err.message || 'Settings update failed', 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });

    document.querySelector('[data-admin-category-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const fd = new FormData(form);
      if (button) button.disabled = true;
      try {
        await api().fetch('/admin/categories', {
          method: 'POST',
          body: {
            name: fd.get('name'),
            icon: fd.get('icon') || 'bi-tag',
            sort_order: fd.get('sort_order') || 0,
          },
        });
        form.reset();
        window.tkToast?.('Category created');
        await Promise.all([refreshCategories(), refreshAuditLogs()]);
      } catch (err) {
        window.tkToast?.(err.message || 'Category creation failed', 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });

    const templateSelect = document.querySelector('[data-email-template-select]');
    templateSelect?.addEventListener('change', fillEmailTemplateForm);

    document.querySelector('[data-email-template-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const template = selectedEmailTemplate();
      if (!template) return;
      const button = form.querySelector('button[type="submit"]');
      const fd = new FormData(form);
      if (button) button.disabled = true;
      try {
        const { data } = await api().fetch(`/admin/email-templates/${template.id}`, {
          method: 'PATCH',
          body: {
            subject: fd.get('subject'),
            html_template: fd.get('html_template'),
            text_template: fd.get('text_template'),
            is_active: true,
          },
        });
        const templates = state.emailCenter?.templates || [];
        const index = templates.findIndex((item) => String(item.id) === String(data.id));
        if (index >= 0) templates[index] = data;
        fillEmailTemplateForm();
        window.tkToast?.('Email template updated');
        await refreshAuditLogs();
      } catch (err) {
        window.tkToast?.(err.message || 'Template update failed', 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });

    const auditForm = document.querySelector('[data-admin-audit-filters]');
    auditForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(auditForm);
      state.auditFilters = { q: fd.get('q'), action: fd.get('action') };
      await refreshAuditLogs();
    });

    document.querySelector('[data-admin-checkin-event]')?.addEventListener('change', async (event) => {
      state.checkInFilters.event_id = event.target.value;
      await refreshCheckIns();
    });
    document.querySelector('[data-admin-checkin-result]')?.addEventListener('change', async (event) => {
      state.checkInFilters.result = event.target.value;
      await refreshCheckIns();
    });
  }

  function bindActions() {
    document.addEventListener('event-sphere:theme-changed', renderCharts);

    document.querySelector('[data-admin-select-all-events]')?.addEventListener('change', (event) => {
      document.querySelectorAll('[data-admin-event-select]').forEach((input) => {
        input.checked = event.target.checked;
      });
    });

    document.addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      try {
        if (button.dataset.retryUsers !== undefined) await refreshUsers();
        if (button.dataset.retryEvents !== undefined) await refreshEvents();
        if (button.dataset.retryPayments !== undefined) await refreshPayments();
        if (button.dataset.retryCheckins !== undefined) await refreshCheckIns();
        if (button.dataset.retryCategories !== undefined) await refreshCategories();
        if (button.dataset.retryEmailCenter !== undefined) await refreshEmailCenter();
        if (button.dataset.retryAuditLogs !== undefined) await refreshAuditLogs();

        if (button.dataset.adminReport) {
          exportReport(button.dataset.adminReport, button.dataset.reportFormat || 'csv');
        }

        if (button.dataset.auditPage) {
          button.disabled = true;
          await refreshAuditLogs(button.dataset.auditPage);
        }

        if (button.dataset.previewEmailTemplate !== undefined) {
          const template = selectedEmailTemplate();
          const preview = document.querySelector('[data-email-template-preview]');
          if (!template || !preview) return;
          button.disabled = true;
          const { data } = await api().fetch(`/admin/email-templates/${template.id}/preview?format=html`);
          preview.hidden = false;
          preview.innerHTML = data.rendered || '<p class="text-muted-pro mb-0">No preview available.</p>';
        }

        if (button.dataset.saveCategory) {
          const categoryId = button.dataset.saveCategory;
          const category = state.categories.find((item) => String(item.id) === String(categoryId));
          button.disabled = true;
          await api().fetch(`/admin/categories/${categoryId}`, {
            method: 'PATCH',
            body: {
              name: document.querySelector(`[data-category-name="${categoryId}"]`)?.value,
              icon: document.querySelector(`[data-category-icon="${categoryId}"]`)?.value || 'bi-tag',
              is_active: Boolean(category?.is_active),
            },
          });
          window.tkToast?.('Category updated');
          await Promise.all([refreshCategories(), refreshAuditLogs()]);
        }

        if (button.dataset.toggleCategory) {
          const categoryId = button.dataset.toggleCategory;
          const category = state.categories.find((item) => String(item.id) === String(categoryId));
          button.disabled = true;
          await api().fetch(`/admin/categories/${categoryId}`, {
            method: 'PATCH',
            body: { is_active: !category?.is_active },
          });
          window.tkToast?.(category?.is_active ? 'Category disabled' : 'Category enabled');
          await Promise.all([refreshCategories(), refreshAuditLogs()]);
        }

        if (button.dataset.deleteCategory) {
          if (!confirm('Delete this category? Events assigned to it must be moved first.')) return;
          button.disabled = true;
          await api().fetch(`/admin/categories/${button.dataset.deleteCategory}`, { method: 'DELETE' });
          window.tkToast?.('Category deleted');
          await Promise.all([refreshCategories(), refreshAuditLogs()]);
        }

        if (button.dataset.viewUser) await showUser(button.dataset.viewUser);
        if (button.dataset.viewEvent) showEvent(button.dataset.viewEvent);
        if (button.dataset.viewTicket) await showTicket(button.dataset.viewTicket);
        if (button.dataset.ticketQr) showTicketQr(button.dataset.ticketQr);
        if (button.dataset.ticketManualValidation) await manualValidateTicket(button.dataset.ticketManualValidation);
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

        if (button.dataset.editEvent) {
          const eventRecord = state.events.find((item) => String(item.id) === String(button.dataset.editEvent));
          const title = prompt('Update event name', eventRecord?.title || '');
          if (title) {
            button.disabled = true;
            await api().fetch(`/admin/events/${button.dataset.editEvent}`, { method: 'PATCH', body: { title } });
            window.EventSphereNotifications?.add({
              type: 'event',
              title: 'Event Updated',
              message: `${title} was updated successfully.`,
            });
            window.tkToast?.('Event updated');
            await refreshEvents();
          }
        }

        if (button.dataset.featureEvent) {
          const eventRecord = state.events.find((item) => String(item.id) === String(button.dataset.featureEvent));
          button.disabled = true;
          await api().fetch(`/admin/events/${button.dataset.featureEvent}`, {
            method: 'PATCH',
            body: { is_featured: !eventRecord?.is_featured },
          });
          window.tkToast?.(eventRecord?.is_featured ? 'Event unfeatured' : 'Event featured');
          await refreshEvents();
        }

        if (button.dataset.archiveEvent) {
          if (!confirm('Archive this event?')) return;
          button.disabled = true;
          await api().fetch(`/admin/events/${button.dataset.archiveEvent}`, { method: 'PATCH', body: { status: 'completed' } });
          window.EventSphereNotifications?.add({
            type: 'event',
            title: 'Event Cancelled',
            message: 'The event was archived and removed from active discovery.',
          });
          window.tkToast?.('Event archived');
          await refreshEvents();
        }

        if (button.dataset.deleteEvent) {
          if (!confirm('Delete this event?')) return;
          button.disabled = true;
          await api().fetch(`/admin/events/${button.dataset.deleteEvent}`, { method: 'DELETE' });
          window.tkToast?.('Event deleted');
          await refreshEvents();
        }

        if (button.dataset.bulkEventAction) {
          button.disabled = true;
          await bulkEventAction(button.dataset.bulkEventAction);
          button.disabled = false;
        }

        if (button.dataset.saveEventFee) {
          button.disabled = true;
          const eventId = button.dataset.saveEventFee;
          const value = document.querySelector(`[data-event-fee-input="${eventId}"]`)?.value;
          await api().fetch(`/admin/events/${eventId}/service-fee`, {
            method: 'PATCH',
            body: { service_fee_percentage: value },
          });
          window.tkToast?.('Event service fee updated');
          await refreshEvents();
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
            ...state.tickets.map((ticket) => ['ticket', ticket.id, ticket.ticket_code, ticket.status]),
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

    bindSectionNavigation();
    bindFilters();
    bindActions();

    try {
      await refreshAll();
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load admin dashboard', 'error');
    }
  });
})();
