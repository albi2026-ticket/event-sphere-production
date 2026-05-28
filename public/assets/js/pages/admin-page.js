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

  function badge(value) {
    const colors = {
      active: 'rgba(34,197,94,.15);color:#86efac',
      approved: 'rgba(34,197,94,.15);color:#86efac',
      paid: 'rgba(34,197,94,.15);color:#86efac',
      published: 'rgba(34,197,94,.15);color:#86efac',
      pending: 'rgba(245,158,11,.15);color:#fcd34d',
      draft: 'rgba(245,158,11,.15);color:#fcd34d',
      rejected: 'rgba(239,68,68,.18);color:#fca5a5',
      banned: 'rgba(239,68,68,.18);color:#fca5a5',
      suspended: 'rgba(239,68,68,.18);color:#fca5a5',
      refunded: 'rgba(91,140,255,.15);color:#93b4ff',
    };
    const safe = u().escapeHtml(value || 'none');
    return `<span class="badge" style="background:${colors[value] || 'rgba(148,163,184,.15);color:#cbd5e1'}">${safe}</span>`;
  }

  function dateLabel(value) {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '-';
    }
  }

  function userNameCell(user) {
    const name = user.name || user.email || `User #${user.id}`;
    return `<div class="d-flex align-items-center gap-2"><img src="${u().escapeHtml(user.avatar_url || `https://i.pravatar.cc/40?u=${encodeURIComponent(user.email || user.id)}`)}" class="rounded-circle" width="32" height="32" alt=""/> ${u().escapeHtml(name)}</div>`;
  }

  async function loadPayments() {
    const res = await api().fetch('/admin/payments?per_page=100');
    state.orders = rows(res.data);
  }

  async function loadUsers() {
    const query = qs({ per_page: 50, ...state.userFilters });
    const res = await api().fetch(`/admin/users${query ? `?${query}` : ''}`);
    state.users = rows(res.data);
  }

  async function loadEvents() {
    const query = qs({ per_page: 50, sort: 'newest', ...state.eventFilters });
    const res = await api().fetch(`/admin/events${query ? `?${query}` : ''}`);
    state.events = rows(res.data);
  }

  function renderKpis() {
    const paidOrders = state.orders.filter((o) => o.payment_status === 'paid');
    const totalGmv = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const activeEvents = state.events.filter((e) => e.status === 'published').length;
    const pendingOrganizers = state.users.filter((usr) => usr.organizer_status === 'pending').length;
    const row = document.querySelector('[data-admin-kpis]');

    if (!row) return;
    row.innerHTML = `
      <div class="col-md-3"><div class="kpi"><div class="label">Paid GMV</div><div class="value">${u().formatMoney(totalGmv, 'USD')}</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Users</div><div class="value">${state.users.length}</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Active events</div><div class="value">${activeEvents}</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Organizer requests</div><div class="value">${pendingOrganizers}</div></div></div>`;
  }

  function renderCharts() {
    const salesChart = document.querySelector('canvas#sales');
    if (salesChart && window.Chart) {
      const byMonth = {};
      state.orders.filter((o) => o.payment_status === 'paid').forEach((o) => {
        const month = (o.created_at || o.paid_at || '').slice(0, 7);
        if (month) byMonth[month] = (byMonth[month] || 0) + Number(o.total || 0);
      });
      const labels = Object.keys(byMonth).sort();
      if (window._salesChart) window._salesChart.destroy();
      window._salesChart = new Chart(salesChart, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Sales', data: labels.map((label) => byMonth[label]), backgroundColor: '#5B8CFF' }] },
        options: { plugins: { legend: { display: false } } },
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
        options: { plugins: { legend: { position: 'bottom' } } },
      });
    }
  }

  function renderUsers() {
    const body = document.querySelector('[data-admin-users] tbody');
    if (!body) return;

    body.innerHTML = state.users.map((usr) => `
      <tr>
        <td>${userNameCell(usr)}</td>
        <td>${u().escapeHtml(usr.email)}</td>
        <td>${dateLabel(usr.created_at)}</td>
        <td>${usr.orders_count ?? 0}</td>
        <td>
          <select class="form-select form-select-sm" data-user-role="${usr.id}">
            ${['user', 'organizer', 'admin'].map((role) => `<option value="${role}" ${usr.role === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </td>
        <td>${badge(usr.organizer_status)}</td>
        <td>${badge(usr.status)}</td>
        <td class="text-end"><button class="btn btn-glass btn-sm" type="button" data-save-role="${usr.id}">Save</button></td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-muted-pro">No users found</td></tr>';
  }

  function renderOrganizers() {
    const body = document.querySelector('[data-admin-organizers] tbody');
    if (!body) return;

    const organizers = state.users.filter((usr) => usr.role === 'organizer' || usr.organizer_status === 'pending' || usr.organizer_status === 'rejected');
    body.innerHTML = organizers.map((usr) => `
      <tr>
        <td>${u().escapeHtml(usr.name || usr.email)}</td>
        <td>${u().escapeHtml(usr.email)}</td>
        <td>${badge(usr.organizer_status)}</td>
        <td>${usr.organized_events_count ?? 0}</td>
        <td class="text-end">
          <button class="btn btn-glass btn-sm" type="button" data-approve-organizer="${usr.id}" ${usr.organizer_status === 'approved' ? 'disabled' : ''}>Approve</button>
          <button class="btn btn-glass btn-sm" type="button" data-reject-organizer="${usr.id}" ${usr.organizer_status === 'rejected' ? 'disabled' : ''}>Reject</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-muted-pro">No organizer requests</td></tr>';
  }

  function renderEvents() {
    const body = document.querySelector('[data-admin-events] tbody');
    if (!body) return;

    body.innerHTML = state.events.map((event) => `
      <tr>
        <td><div class="fw-semibold">${u().escapeHtml(event.title)}</div><div class="small text-muted-pro">${u().escapeHtml(event.category || '')} · ${u().escapeHtml(event.city || '')}</div></td>
        <td>${u().escapeHtml(event.organizer?.name || `#${event.organizer_id}`)}</td>
        <td>${dateLabel(event.starts_at)}</td>
        <td>${badge(event.status)}</td>
        <td>${event.tickets_count ?? event.ticket_types?.reduce((sum, tier) => sum + Number(tier.quantity_total || 0), 0) ?? 0}</td>
        <td class="text-end">
          <button class="btn btn-glass btn-sm" type="button" data-publish-event="${event.id}" ${event.status === 'published' ? 'disabled' : ''}>Publish</button>
          <button class="btn btn-glass btn-sm" type="button" data-reject-event="${event.id}" ${event.status === 'rejected' ? 'disabled' : ''}>Reject</button>
          <button class="btn btn-glass btn-sm" type="button" data-delete-event="${event.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-muted-pro">No events found</td></tr>';
  }

  function renderRefunds() {
    const body = document.querySelector('[data-admin-refunds] tbody');
    if (!body) return;

    const refundable = state.orders.filter((o) => o.payment_status === 'paid').slice(0, 10);
    body.innerHTML = refundable.map((o) => `
      <tr>
        <td>${u().escapeHtml(o.order_number)}</td>
        <td>${u().escapeHtml(o.user?.name || o.user?.email || '')}</td>
        <td>${u().formatMoney(o.total, o.currency)}</td>
        <td class="text-end"><button class="btn btn-glass btn-sm" type="button" data-refund-order="${o.id}">Refund</button></td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-muted-pro">No paid orders</td></tr>';
  }

  function renderFraud() {
    const body = document.querySelector('[data-admin-fraud] tbody');
    if (!body) return;

    const flagged = state.orders.filter((o) => o.fraud_status || Number(o.fraud_score || 0) > 0).slice(0, 10);
    body.innerHTML = flagged.map((o) => `
      <tr>
        <td>${u().escapeHtml(o.order_number)}</td>
        <td>${badge(o.fraud_status || 'low')} ${o.fraud_score ?? ''}</td>
        <td>${u().escapeHtml(o.payment_status || '-')}</td>
        <td><button class="btn btn-glass btn-sm" type="button" data-review-order="${o.id}">Review</button></td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-muted-pro">No flagged orders</td></tr>';
  }

  function renderAll() {
    renderKpis();
    renderCharts();
    renderUsers();
    renderOrganizers();
    renderEvents();
    renderRefunds();
    renderFraud();
  }

  async function refreshAll() {
    await Promise.all([loadPayments(), loadUsers(), loadEvents()]);
    renderAll();
  }

  async function refreshUsers() {
    await loadUsers();
    renderKpis();
    renderUsers();
    renderOrganizers();
  }

  async function refreshEvents() {
    await loadEvents();
    renderKpis();
    renderCharts();
    renderEvents();
  }

  function bindFilters() {
    const userForm = document.querySelector('[data-admin-user-filters]');
    userForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fd = new FormData(userForm);
      state.userFilters = { q: fd.get('q'), role: fd.get('role'), organizer_status: fd.get('organizer_status') };
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
  }

  function bindActions() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      try {
        if (button.dataset.saveRole) {
          button.disabled = true;
          const userId = button.dataset.saveRole;
          const role = document.querySelector(`[data-user-role="${userId}"]`)?.value;
          await api().fetch(`/admin/users/${userId}/role`, { method: 'PATCH', body: { role } });
          window.tkToast?.('User role updated');
          await refreshUsers();
        }

        if (button.dataset.approveOrganizer) {
          button.disabled = true;
          await api().fetch(`/admin/users/${button.dataset.approveOrganizer}/approve-organizer`, { method: 'POST', body: {} });
          window.tkToast?.('Organizer approved');
          await refreshUsers();
        }

        if (button.dataset.rejectOrganizer) {
          if (!confirm('Reject this organizer request?')) return;
          button.disabled = true;
          await api().fetch(`/admin/users/${button.dataset.rejectOrganizer}/reject-organizer`, { method: 'POST', body: {} });
          window.tkToast?.('Organizer rejected');
          await refreshUsers();
        }

        if (button.dataset.publishEvent) {
          button.disabled = true;
          await api().fetch(`/admin/events/${button.dataset.publishEvent}/publish`, { method: 'POST', body: {} });
          window.tkToast?.('Event published');
          await refreshEvents();
        }

        if (button.dataset.rejectEvent) {
          if (!confirm('Reject this event?')) return;
          button.disabled = true;
          await api().fetch(`/admin/events/${button.dataset.rejectEvent}/reject`, { method: 'POST', body: {} });
          window.tkToast?.('Event rejected');
          await refreshEvents();
        }

        if (button.dataset.deleteEvent) {
          if (!confirm('Delete this event?')) return;
          button.disabled = true;
          await api().fetch(`/admin/events/${button.dataset.deleteEvent}`, { method: 'DELETE' });
          window.tkToast?.('Event deleted');
          await refreshEvents();
        }

        if (button.dataset.refundOrder) {
          if (!confirm('Issue full refund for this order?')) return;
          button.disabled = true;
          await api().fetch(`/admin/payments/${button.dataset.refundOrder}/refund`, { method: 'POST', body: { reason: 'requested_by_customer' } });
          window.tkToast?.('Refund processed');
          await loadPayments();
          renderKpis();
          renderRefunds();
          renderFraud();
        }

        if (button.dataset.reviewOrder) {
          window.tkToast?.('Order review opened');
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
