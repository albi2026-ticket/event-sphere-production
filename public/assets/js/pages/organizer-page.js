(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  const state = {
    summary: null,
    events: [],
    performance: [],
    inventory: [],
    attendees: [],
    attendeeMeta: null,
    revenue: null,
    trends: [],
    salesDayTrends: [],
    salesWeekTrends: [],
    checkInStats: null,
    checkInLogs: [],
    checkInResult: null,
    scannerStream: null,
    scannerTimer: null,
    lastScannedPayload: '',
    loading: {
      summary: true,
      events: true,
      performance: true,
      inventory: true,
      attendees: true,
      revenue: true,
      ticketAnalytics: true,
      checkInLogs: true,
    },
    errors: {},
    attendeePage: 1,
    groupBy: 'day',
    selectedEvent: null,
    pendingImages: [],
    busy: false,
    currentSection: 'overview',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function rows(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
  }

  function esc(value) {
    return u().escapeHtml(value ?? '');
  }

  function qs(params) {
    const clean = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') clean[key] = value;
    });
    return new URLSearchParams(clean).toString();
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

  function statusBadge(status, label) {
    const value = String(status || 'unknown').toLowerCase();
    const classKey = value.replace(/\s+/g, '_');
    const text = label || value.replace(/_/g, ' ');
    return `<span class="badge status-badge status-${esc(classKey)}">${esc(text)}</span>`;
  }

  function eventInventory(event) {
    const tiers = event.ticket_types || [];
    const total = Number(event.total_inventory ?? tiers.reduce((sum, tier) => sum + Number(tier.quantity_total || 0), 0));
    const sold = Number(event.sold_tickets ?? tiers.reduce((sum, tier) => sum + Number(tier.quantity_sold || 0), 0));
    const reserved = tiers.reduce((sum, tier) => sum + Number(tier.quantity_reserved || 0), 0);
    const available = Number(event.available_inventory ?? Math.max(0, total - sold - reserved));
    return { total, sold, reserved, available };
  }

  function organizerEventState(event) {
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

  function dateLabel(value, timezone) {
    return value ? u().formatEventDate(value, timezone) : '-';
  }

  function loadingRow(cols, label) {
    return `<tr><td colspan="${cols}"><div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>${esc(label)}</span></div></td></tr>`;
  }

  function errorRow(cols, message, retryAttr) {
    return `<tr><td colspan="${cols}"><div class="dashboard-empty text-danger"><i class="bi bi-exclamation-triangle"></i><span>${esc(message)}</span><button class="btn btn-glass btn-sm" type="button" ${retryAttr}>Retry</button></div></td></tr>`;
  }

  function emptyRow(cols, icon, title, detail) {
    return `<tr><td colspan="${cols}"><div class="dashboard-empty"><i class="bi ${icon}"></i><div><div class="fw-semibold">${esc(title)}</div><small>${esc(detail || '')}</small></div></div></td></tr>`;
  }

  function emptyBlock(icon, title, detail) {
    return `<div class="dashboard-empty"><i class="bi ${icon}"></i><div><div class="fw-semibold">${esc(title)}</div><small>${esc(detail || '')}</small></div></div>`;
  }

  function pagination(meta, attr) {
    if (!meta || meta.last_page <= 1) return '';
    const current = Number(meta.current_page || 1);
    const last = Number(meta.last_page || 1);
    return `<div class="dashboard-pagination">
      <button class="btn btn-glass btn-sm" type="button" ${attr}="${current - 1}" ${current <= 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
      <span class="text-muted-pro small">Page ${current} of ${last}</span>
      <button class="btn btn-glass btn-sm" type="button" ${attr}="${current + 1}" ${current >= last ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>
    </div>`;
  }

  async function loadSummary() {
    state.loading.summary = true;
    state.errors.summary = null;
    try {
      const { data } = await api().fetch('/organizer/dashboard/summary');
      state.summary = data;
    } catch (err) {
      state.errors.summary = err.message || 'Failed to load organizer summary';
    } finally {
      state.loading.summary = false;
      renderKpis();
      renderAlert();
    }
  }

  async function loadEvents() {
    state.loading.events = true;
    state.errors.events = null;
    renderEvents();
    try {
      const query = qs({
        per_page: 100,
        sort: 'newest',
        q: $('[data-organizer-event-search]')?.value,
        status: $('[data-organizer-event-status]')?.value,
      });
      const res = await api().fetch(`/organizer/events${query ? `?${query}` : ''}`);
      state.events = rows(res.data);
      hydrateEventFilter();
    } catch (err) {
      state.errors.events = err.message || 'Failed to load events';
    } finally {
      state.loading.events = false;
      renderEvents();
      renderKpis();
      renderOverview();
      renderAlert();
    }
  }

  async function loadPerformance() {
    state.loading.performance = true;
    state.errors.performance = null;
    renderPerformance();
    try {
      const { data } = await api().fetch('/organizer/events/performance?sort=-revenue&per_page=100');
      state.performance = rows(data);
    } catch (err) {
      state.errors.performance = err.message || 'Failed to load ticket performance';
    } finally {
      state.loading.performance = false;
      renderPerformance();
      renderTopEvents();
      renderEvents();
      renderAlert();
    }
  }

  async function loadInventory() {
    state.loading.inventory = true;
    state.errors.inventory = null;
    renderInventory();
    try {
      const { data } = await api().fetch('/organizer/inventory');
      state.inventory = rows(data);
    } catch (err) {
      state.errors.inventory = err.message || 'Failed to load inventory';
    } finally {
      state.loading.inventory = false;
      renderInventory();
      renderAlert();
    }
  }

  async function loadRevenue() {
    state.loading.revenue = true;
    state.errors.revenue = null;
    renderRevenue();
    try {
      const { data } = await api().fetch(`/organizer/analytics/revenue?group_by=${encodeURIComponent(state.groupBy)}`);
      state.revenue = data;
      state.trends = rows(data?.trends);
    } catch (err) {
      state.errors.revenue = err.message || 'Failed to load revenue analytics';
    } finally {
      state.loading.revenue = false;
      renderRevenue();
      renderRevenueKpis();
      renderAlert();
    }
  }

  async function loadTicketAnalytics() {
    state.loading.ticketAnalytics = true;
    state.errors.ticketAnalytics = null;
    renderTicketAnalytics();
    try {
      const [dayRes, weekRes] = await Promise.all([
        api().fetch('/organizer/analytics/sales-trends?group_by=day'),
        api().fetch('/organizer/analytics/sales-trends?group_by=week'),
      ]);
      state.salesDayTrends = rows(dayRes.data);
      state.salesWeekTrends = rows(weekRes.data);
    } catch (err) {
      state.errors.ticketAnalytics = err.message || 'Failed to load ticket analytics';
    } finally {
      state.loading.ticketAnalytics = false;
      renderTicketAnalytics();
      renderAlert();
    }
  }

  async function loadAttendees() {
    state.loading.attendees = true;
    state.errors.attendees = null;
    renderAttendees();
    try {
      const query = qs({
        per_page: 10,
        page: state.attendeePage,
        search: $('[data-attendee-search]')?.value,
        event_id: $('[data-attendee-event]')?.value,
        ticket_status: $('[data-attendee-status]')?.value,
        sort: '-created_at',
      });
      const res = await api().fetch(`/organizer/attendees${query ? `?${query}` : ''}`);
      state.attendees = rows(res.data);
      state.attendeeMeta = res.meta;
    } catch (err) {
      state.errors.attendees = err.message || 'Failed to load attendees';
    } finally {
      state.loading.attendees = false;
      renderAttendees();
      renderAlert();
    }
  }

  function renderAlert() {
    const el = $('[data-organizer-alert]');
    if (!el) return;
    const errors = Object.values(state.errors).filter(Boolean);
    el.innerHTML = errors.length
      ? `<div class="alert border-pro dashboard-note text-danger"><i class="bi bi-exclamation-triangle me-2"></i>${esc(errors[0])}</div>`
      : '';
  }

  function renderKpis() {
    const kpiRow = $('[data-organizer-kpis]');
    if (!kpiRow) return;
    if (state.loading.summary) {
      kpiRow.innerHTML = Array.from({ length: 6 }).map(() => '<div class="col-md-4 col-xl-2"><div class="kpi"><div class="skel dashboard-skel-line"></div><div class="skel dashboard-skel-value"></div></div></div>').join('');
      return;
    }
    const cards = state.summary?.cards || {};
    const liveNow = state.events.filter((event) => organizerEventState(event).key === 'live').length;
    kpiRow.innerHTML = `
      <div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">Total Events</div><div class="value">${cards.events_count ?? 0}</div><div class="delta">${cards.past_events_count ?? 0} past</div></div></div>
      <div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">Active Events</div><div class="value">${cards.published_events_count ?? 0}</div><div class="delta">${cards.sold_out_ticket_types_count ?? 0} sold-out tiers</div></div></div>
      <div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">Tickets Sold</div><div class="value">${cards.tickets_sold ?? 0}</div><div class="delta">${cards.active_tickets_count ?? 0} valid tickets</div></div></div>
      <div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">Revenue</div><div class="value">${u().formatMoney(cards.total_revenue || 0, 'USD')}</div><div class="delta">${cards.paid_orders_count ?? 0} paid orders</div></div></div>
      <div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">Upcoming Events</div><div class="value">${cards.upcoming_events_count ?? 0}</div><div class="delta">${cards.attendees_count ?? 0} attendees</div></div></div>
      <div class="col-md-4 col-xl-2"><div class="kpi"><div class="label">Events Live Now</div><div class="value">${liveNow}</div><div class="delta">${cards.checked_in_count ?? 0} checked in</div></div></div>`;

    const subtitle = $('[data-organizer-subtitle]');
    if (subtitle) subtitle.textContent = `${cards.upcoming_events_count ?? 0} upcoming events · ${cards.sold_out_ticket_types_count ?? 0} sold-out ticket tiers`;
    renderOverview();
    renderRevenueKpis();
    renderSettings();
  }

  function renderOverview() {
    renderRecentActivity();
    renderUpcomingEvents();
    renderTopEvents();
  }

  function renderRecentActivity() {
    const wrap = $('[data-organizer-activity]');
    if (!wrap) return;
    if (state.loading.summary || state.loading.events) {
      wrap.innerHTML = `<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading activity...</span></div>`;
      return;
    }

    const orders = rows(state.summary?.recent_orders).map((order) => ({
      icon: 'bi-ticket-perforated',
      title: 'New ticket purchased',
      detail: `${order.order_number || 'Order'} · ${u().formatMoney(order.total || 0, order.currency || 'USD')}`,
      time: order.created_at,
    }));
    const checkIns = rows(state.summary?.recent_attendees)
      .filter((ticket) => ticket.checked_in_at)
      .map((ticket) => ({
        icon: 'bi-check2-circle',
        title: 'New attendee checked in',
        detail: `${ticket.attendee_name || ticket.attendee?.name || 'Attendee'} · ${ticket.ticket_code || ''}`,
        time: ticket.checked_in_at,
      }));
    const eventActivity = state.events.flatMap((event) => {
      const activity = [];
      if (event.status === 'published') {
        activity.push({
          icon: 'bi-broadcast',
          title: 'Event published',
          detail: event.title,
          time: event.updated_at || event.created_at,
        });
      }
      if (organizerEventState(event).key === 'sold_out') {
        activity.push({
          icon: 'bi-lightning-charge',
          title: 'Event sold out',
          detail: event.title,
          time: event.updated_at || event.starts_at,
        });
      }
      return activity;
    });

    const activity = [...orders, ...checkIns, ...eventActivity]
      .filter((item) => item.time || item.detail)
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 8);

    wrap.innerHTML = activity.map((item) => `
      <div class="dashboard-activity-item">
        <span class="dashboard-activity-icon"><i class="bi ${item.icon}"></i></span>
        <span class="flex-grow-1"><span class="fw-semibold d-block">${esc(item.title)}</span><small>${esc(item.detail || '')}</small></span>
        <small class="text-muted-pro">${item.time ? esc(dateLabel(item.time)) : ''}</small>
      </div>
    `).join('') || emptyBlock('bi-clock-history', 'No recent activity yet', 'Purchases, check-ins, event updates, and sold-out events will appear here.');
  }

  function renderUpcomingEvents() {
    const wrap = $('[data-organizer-upcoming]');
    if (!wrap) return;
    if (state.loading.events) {
      wrap.innerHTML = `<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading events...</span></div>`;
      return;
    }
    const events = state.events
      .filter((event) => ['live', 'upcoming'].includes(organizerEventState(event).key))
      .sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0))
      .slice(0, 6);
    wrap.innerHTML = events.map((event) => {
      const inv = eventInventory(event);
      const stateLabel = organizerEventState(event);
      return `<div class="dashboard-mini-row">
        <div>
          <div class="fw-semibold">${esc(event.title)}</div>
          <small>${esc(dateLabel(event.starts_at, event.timezone))} · ${inv.sold} sold · ${inv.available} remaining</small>
        </div>
        ${statusBadge(stateLabel.key, stateLabel.label)}
      </div>`;
    }).join('') || emptyBlock('bi-calendar-week', 'No upcoming events', 'Published future events and live events will appear here.');
  }

  function renderRevenueKpis() {
    const row = $('[data-organizer-revenue-kpis]');
    if (!row) return;
    if (state.loading.revenue || state.loading.ticketAnalytics) {
      row.innerHTML = Array.from({ length: 4 }).map(() => '<div class="col-md-3"><div class="kpi"><div class="skel dashboard-skel-line"></div><div class="skel dashboard-skel-value"></div></div></div>').join('');
      return;
    }
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueFor = (predicate) => state.salesDayTrends
      .filter((item) => predicate(new Date(item.period)))
      .reduce((sum, item) => sum + Number(item.revenue || 0), 0);
    const total = Number(state.revenue?.total_revenue || 0);
    const today = state.salesDayTrends.find((item) => String(item.period).slice(0, 10) === todayKey);
    row.innerHTML = `
      <div class="col-md-3"><div class="kpi"><div class="label">Total Revenue</div><div class="value">${u().formatMoney(total, 'USD')}</div><div class="delta">${rows(state.revenue?.by_event).length} events selling</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">This Month</div><div class="value">${u().formatMoney(revenueFor((date) => date >= startOfMonth), 'USD')}</div><div class="delta">Month to date</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">This Week</div><div class="value">${u().formatMoney(revenueFor((date) => date >= startOfWeek), 'USD')}</div><div class="delta">Week to date</div></div></div>
      <div class="col-md-3"><div class="kpi"><div class="label">Today</div><div class="value">${u().formatMoney(today?.revenue || 0, 'USD')}</div><div class="delta">${today?.orders_count || 0} orders</div></div></div>`;
  }

  function performanceFor(eventId) {
    return state.performance.find((item) => String(item.event_id) === String(eventId)) || {};
  }

  function renderEvents() {
    const body = $('[data-organizer-events]');
    if (!body) return;
    if (state.loading.events) {
      body.innerHTML = loadingRow(8, 'Loading events...');
      return;
    }
    if (state.errors.events) {
      body.innerHTML = errorRow(8, state.errors.events, 'data-retry-events');
      return;
    }
    body.innerHTML = state.events.map((event) => {
      const perf = performanceFor(event.id);
      const inventory = eventInventory(event);
      const displayState = organizerEventState(event);
      const revenue = perf.revenue ?? 0;
      return `<tr>
        <td data-label="Event"><div class="fw-semibold">${esc(event.title)}</div><small class="text-muted-pro">${esc(event.city || '')}${event.venue_name ? ` · ${esc(event.venue_name)}` : ''}</small></td>
        <td data-label="Status">${statusBadge(displayState.key, displayState.label)}</td>
        <td data-label="Date">${esc(dateLabel(event.starts_at, event.timezone))}</td>
        <td data-label="Service Fee"><span class="fw-semibold">${Number(event.service_fee_percentage ?? 10)}%</span><br><small class="text-muted-pro">Applied at checkout</small></td>
        <td data-label="Sold">${inventory.sold} sold / ${inventory.total} total</td>
        <td data-label="Revenue">${u().formatMoney(revenue, event.currency || 'USD')}</td>
        <td data-label="Available">${inventory.available} remaining</td>
        <td data-label="Actions" class="text-end">
          <div class="dashboard-actions">
            <button class="btn btn-glass btn-sm" type="button" data-event-edit="${event.id}"><i class="bi bi-pencil me-1"></i>Edit</button>
            ${event.status === 'published'
              ? `<button class="btn btn-glass btn-sm" type="button" data-event-unpublish="${event.id}">Unpublish</button>`
              : `<button class="btn btn-glass btn-sm" type="button" data-event-publish="${event.id}">Publish</button>`}
            <button class="btn btn-glass btn-sm" type="button" data-event-analytics="${event.id}"><i class="bi bi-graph-up"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('') || emptyRow(8, 'bi-calendar-event', 'No events found', 'Create an event or adjust your filters.');
  }

  function renderPerformance() {
    const body = $('[data-organizer-performance]');
    if (!body) return;
    if (state.loading.performance) {
      body.innerHTML = loadingRow(5, 'Loading performance...');
      return;
    }
    if (state.errors.performance) {
      body.innerHTML = errorRow(5, state.errors.performance, 'data-retry-performance');
      return;
    }
    body.innerHTML = state.performance.map((item) => {
      const sold = Number(item.tickets_sold || 0);
      const total = Number(item.tickets_total || 0);
      const pct = total ? Math.round((sold / total) * 100) : 0;
      return `<tr>
        <td data-label="Event"><div class="fw-semibold">${esc(item.title)}</div><small class="text-muted-pro">${statusBadge(item.status)}</small></td>
        <td data-label="Sold">${sold}</td>
        <td data-label="Available">${item.tickets_available ?? 0}</td>
        <td data-label="Orders">${item.orders_count ?? 0}</td>
        <td data-label="Check-ins"><div>${item.checked_in_count ?? 0} / ${item.attendees_count ?? 0}</div><div class="progress dashboard-progress"><div class="progress-bar" style="width:${pct}%"></div></div></td>
      </tr>`;
    }).join('') || emptyRow(5, 'bi-graph-up', 'No ticket performance yet', 'Sales and attendance metrics will appear after tickets are purchased.');
  }

  function renderInventory() {
    const wrap = $('[data-organizer-inventory]');
    if (!wrap) return;
    if (state.loading.inventory) {
      wrap.innerHTML = `<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading inventory...</span></div>`;
      return;
    }
    if (state.errors.inventory) {
      wrap.innerHTML = `<div class="dashboard-empty text-danger"><i class="bi bi-exclamation-triangle"></i><span>${esc(state.errors.inventory)}</span><button class="btn btn-glass btn-sm" type="button" data-retry-inventory>Retry</button></div>`;
      return;
    }
    wrap.innerHTML = state.inventory.slice(0, 8).map((tier) => {
      const total = Number(tier.quantity_total || 0);
      const available = Number(tier.quantity_available || 0);
      const sold = Number(tier.quantity_sold || 0);
      const pct = total ? Math.min(100, Math.round((sold / total) * 100)) : 0;
      return `<div class="dashboard-mini-row">
        <div class="flex-grow-1">
          <div class="fw-semibold">${esc(tier.event_title)}</div>
          <small>${esc(tier.name)} · ${available} remaining of ${total}</small>
          <div class="progress dashboard-progress mt-2"><div class="progress-bar" style="width:${pct}%"></div></div>
        </div>
        ${statusBadge(tier.status)}
      </div>`;
    }).join('') || emptyBlock('bi-ticket', 'No ticket tiers yet', 'Create ticket tiers for an event to track inventory.');
  }

  function renderAttendees() {
    const body = $('[data-organizer-attendees]');
    const pager = $('[data-attendee-pagination]');
    if (!body) return;
    if (state.loading.attendees) {
      body.innerHTML = loadingRow(7, 'Loading attendees...');
      if (pager) pager.innerHTML = '';
      return;
    }
    if (state.errors.attendees) {
      body.innerHTML = errorRow(7, state.errors.attendees, 'data-retry-attendees');
      if (pager) pager.innerHTML = '';
      return;
    }
    body.innerHTML = state.attendees.map((ticket) => `
      <tr>
        <td data-label="Attendee"><div class="fw-semibold">${esc(ticket.attendee?.name || 'Guest')}</div><small class="text-muted-pro">${esc(ticket.attendee?.email || '')}${ticket.attendee?.phone ? ` · ${esc(ticket.attendee.phone)}` : ''}</small></td>
        <td data-label="Event">${esc(ticket.event?.title || '-')}</td>
        <td data-label="Ticket"><div>${esc(ticket.ticket_code)}</div><small class="text-muted-pro">${esc(ticket.ticket_type?.name || '')}</small></td>
        <td data-label="Order"><div>${esc(ticket.order?.order_number || '-')}</div><small class="text-muted-pro">Purchased by ${esc(ticket.purchaser?.name || ticket.order?.purchaser?.name || '-')}</small></td>
        <td data-label="Purchase date">${esc(dateLabel(ticket.order?.created_at || ticket.created_at))}</td>
        <td data-label="Status">${statusBadge(ticket.status)}</td>
        <td data-label="Actions" class="text-end"><button class="btn btn-glass btn-sm" type="button" data-attendee-details="${ticket.id}"><i class="bi bi-eye me-1"></i>Details</button></td>
      </tr>
    `).join('') || emptyRow(7, 'bi-people', 'No attendees found', 'Attendees appear here after tickets are issued.');
    if (pager) pager.innerHTML = pagination(state.attendeeMeta, 'data-attendee-page');
  }

  function renderRevenue() {
    renderRevenueChart();
    renderRevenueByEventChart();
    renderRevenueKpis();
    const body = $('[data-organizer-revenue-table]');
    if (!body) return;
    if (state.loading.revenue) {
      body.innerHTML = loadingRow(4, 'Loading revenue...');
      return;
    }
    if (state.errors.revenue) {
      body.innerHTML = errorRow(4, state.errors.revenue, 'data-retry-revenue');
      return;
    }
    const byEvent = rows(state.revenue?.by_event);
    body.innerHTML = byEvent.map((item) => `
      <tr>
        <td data-label="Event"><div class="fw-semibold">${esc(item.title)}</div><small class="text-muted-pro">${esc(item.slug)}</small></td>
        <td data-label="Revenue">${u().formatMoney(item.revenue, item.currency || 'USD')}</td>
        <td data-label="Tickets">${item.tickets_sold ?? 0}</td>
        <td data-label="Orders">${item.orders_count ?? 0}</td>
      </tr>
    `).join('') || emptyRow(4, 'bi-cash-stack', 'No revenue yet', 'Paid orders will populate this table.');
  }

  function renderRevenueChart() {
    const canvas = document.getElementById('chartRev');
    const empty = $('[data-organizer-revenue-empty]');
    if (!canvas || !window.Chart) return;
    if (state.loading.revenue || state.errors.revenue) {
      if (empty) empty.innerHTML = state.errors.revenue ? emptyBlock('bi-exclamation-triangle', 'Revenue chart unavailable', state.errors.revenue) : '';
      return;
    }
    const labels = state.trends.map((item) => String(item.period).slice(0, 10));
    const values = state.trends.map((item) => Number(item.revenue || 0));
    if (window._chartRev) window._chartRev.destroy();
    if (!labels.length) {
      if (empty) empty.innerHTML = emptyBlock('bi-graph-up', 'No revenue trend yet', 'Revenue trends appear after paid orders.');
      return;
    }
    if (empty) empty.innerHTML = '';
    const theme = chartTheme();
    window._chartRev = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Revenue', data: values, borderColor: theme.primary, tension: 0.35, fill: true, backgroundColor: 'rgba(91,140,255,.12)' }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: theme.text }, grid: { color: theme.grid } }, x: { ticks: { color: theme.text }, grid: { display: false } } } },
    });
  }

  function renderRevenueByEventChart() {
    const canvas = document.getElementById('chartCat');
    const empty = $('[data-organizer-event-revenue-empty]');
    if (!canvas || !window.Chart) return;
    if (state.loading.revenue || state.errors.revenue) return;
    const byEvent = rows(state.revenue?.by_event).slice(0, 6);
    if (window._chartCat) window._chartCat.destroy();
    if (!byEvent.length) {
      if (empty) empty.innerHTML = emptyBlock('bi-pie-chart', 'No event revenue yet', 'Revenue by event appears after sales.');
      return;
    }
    if (empty) empty.innerHTML = '';
    const theme = chartTheme();
    window._chartCat = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: byEvent.map((item) => item.title),
        datasets: [{ data: byEvent.map((item) => Number(item.revenue || 0)), backgroundColor: ['#5B8CFF', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6'] }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: theme.text } } } },
    });
  }

  function renderTicketAnalytics() {
    renderSalesChart('chartSalesDay', state.salesDayTrends, '[data-organizer-sales-day-empty]', 'Sales by day');
    renderSalesChart('chartSalesWeek', state.salesWeekTrends, '[data-organizer-sales-week-empty]', 'Sales by week');
    renderTopEvents();
  }

  function renderSalesChart(canvasId, data, emptySelector, label) {
    const canvas = document.getElementById(canvasId);
    const empty = $(emptySelector);
    if (!canvas || !window.Chart) return;
    const chartKey = canvasId === 'chartSalesWeek' ? '_chartSalesWeek' : '_chartSalesDay';
    if (window[chartKey]) window[chartKey].destroy();
    if (state.loading.ticketAnalytics) {
      if (empty) empty.innerHTML = '';
      return;
    }
    if (state.errors.ticketAnalytics) {
      if (empty) empty.innerHTML = emptyBlock('bi-exclamation-triangle', `${label} unavailable`, state.errors.ticketAnalytics);
      return;
    }
    const labels = data.map((item) => String(item.period).slice(0, 10));
    const values = data.map((item) => Number(item.tickets_sold || 0));
    if (!labels.length) {
      if (empty) empty.innerHTML = emptyBlock('bi-bar-chart', `No ${label.toLowerCase()} yet`, 'Ticket sales charts appear after paid orders.');
      return;
    }
    if (empty) empty.innerHTML = '';
    const theme = chartTheme();
    window[chartKey] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Tickets sold', data: values, backgroundColor: 'rgba(91,140,255,.72)', borderColor: theme.primary, borderWidth: 1, borderRadius: 8 }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: theme.text, precision: 0 }, grid: { color: theme.grid } },
          x: { ticks: { color: theme.text }, grid: { display: false } },
        },
      },
    });
  }

  function renderTopEvents() {
    const wrap = $('[data-organizer-top-events]');
    if (!wrap) return;
    if (state.loading.performance) {
      wrap.innerHTML = `<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading top events...</span></div>`;
      return;
    }
    const top = [...state.performance]
      .sort((a, b) => Number(b.tickets_sold || 0) - Number(a.tickets_sold || 0))
      .slice(0, 6);
    wrap.innerHTML = top.map((item, index) => `
      <div class="dashboard-mini-row">
        <div>
          <div class="fw-semibold">${index + 1}. ${esc(item.title)}</div>
          <small>${item.tickets_sold || 0} sold · ${u().formatMoney(item.revenue || 0, item.currency || 'USD')} revenue</small>
        </div>
        ${statusBadge(item.status)}
      </div>
    `).join('') || emptyBlock('bi-trophy', 'No top events yet', 'Best selling and highest revenue events will appear after sales.');
  }

  function hydrateEventFilter() {
    const attendeeSelect = $('[data-attendee-event]');
    if (attendeeSelect) {
      const current = attendeeSelect.value;
      attendeeSelect.innerHTML = '<option value="">All events</option>' + state.events.map((event) => `<option value="${event.id}">${esc(event.title)}</option>`).join('');
      attendeeSelect.value = current;
    }

    const checkInSelect = $('[data-checkin-event]');
    if (checkInSelect) {
      const current = checkInSelect.value;
      checkInSelect.innerHTML = '<option value="">Select event</option>' + state.events.map((event) => `<option value="${event.id}">${esc(event.title)}</option>`).join('');
      checkInSelect.value = current;
      if (!checkInSelect.value && state.events[0]) checkInSelect.value = String(state.events[0].id);
    }
  }

  function renderAll() {
    renderAlert();
    renderKpis();
    renderOverview();
    renderEvents();
    renderPerformance();
    renderInventory();
    renderAttendees();
    renderRevenue();
    renderRevenueKpis();
    renderTicketAnalytics();
    renderCheckInStats();
    renderCheckInLogs();
    renderSettings();
  }

  async function refreshAll() {
    renderAll();
    await Promise.all([loadSummary(), loadEvents(), loadPerformance(), loadInventory(), loadAttendees(), loadRevenue(), loadTicketAnalytics()]);
    await Promise.all([loadCheckInStats(), loadCheckInLogs()]);
    renderAll();
  }

  async function refreshEventsAndAnalytics() {
    await Promise.all([loadSummary(), loadEvents(), loadPerformance(), loadInventory(), loadRevenue(), loadTicketAnalytics()]);
    await Promise.all([loadCheckInStats(), loadCheckInLogs()]);
    renderAll();
  }

  function selectedCheckInEventId() {
    return $('[data-checkin-event]')?.value || '';
  }

  async function loadCheckInStats() {
    const eventId = selectedCheckInEventId();
    if (!eventId) {
      state.checkInStats = null;
      renderCheckInStats();
      return;
    }
    try {
      const { data } = await api().fetch(`/organizer/events/${eventId}/check-in-stats`);
      state.checkInStats = data;
    } catch (err) {
      state.errors.checkIn = err.message || 'Failed to load check-in stats';
    } finally {
      renderCheckInStats();
      renderAlert();
    }
  }

  async function loadCheckInLogs() {
    state.loading.checkInLogs = true;
    const eventId = selectedCheckInEventId();
    renderCheckInLogs();
    try {
      const query = qs({ per_page: 8, event_id: eventId });
      const res = await api().fetch(`/organizer/validation-logs${query ? `?${query}` : ''}`);
      state.checkInLogs = rows(res.data);
    } catch (err) {
      state.errors.checkInLogs = err.message || 'Failed to load validation logs';
    } finally {
      state.loading.checkInLogs = false;
      renderCheckInLogs();
      renderAlert();
    }
  }

  function renderCheckInStats() {
    const row = $('[data-checkin-stats]');
    if (!row) return;
    const stats = state.checkInStats || { tickets_sold: 0, checked_in: 0, remaining: 0 };
    row.innerHTML = `
      <div class="col-md-4"><div class="kpi"><div class="label">Tickets Sold</div><div class="value">${stats.tickets_sold ?? 0}</div></div></div>
      <div class="col-md-4"><div class="kpi"><div class="label">Checked In</div><div class="value">${stats.checked_in ?? 0}</div></div></div>
      <div class="col-md-4"><div class="kpi"><div class="label">Remaining</div><div class="value">${stats.remaining ?? 0}</div></div></div>`;
  }

  function renderCheckInLogs() {
    const body = $('[data-checkin-logs]');
    if (!body) return;
    if (state.loading.checkInLogs) {
      body.innerHTML = loadingRow(4, 'Loading validation logs...');
      return;
    }
    if (state.errors.checkInLogs) {
      body.innerHTML = errorRow(4, state.errors.checkInLogs, 'data-retry-checkin-logs');
      return;
    }
    body.innerHTML = state.checkInLogs.map((log) => `
      <tr>
        <td data-label="Result">${statusBadge(log.result)}</td>
        <td data-label="Attendee"><div class="fw-semibold">${esc(log.attendee?.name || '-')}</div><small class="text-muted-pro">${esc(log.attendee?.email || '')}</small></td>
        <td data-label="Ticket">${esc(log.ticket_code || log.ticket_uuid || '-')}</td>
        <td data-label="Scanned">${esc(dateLabel(log.scanned_at))}</td>
      </tr>
    `).join('') || emptyRow(4, 'bi-clock-history', 'No validation logs yet', 'Scans will appear here.');
  }

  function parseScannerPayload(raw) {
    const value = String(raw || '').trim();
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      return {
        token: parsed.token || '',
        ticket_uuid: parsed.ticket_uuid || parsed.uuid || '',
      };
    } catch {
      return value.startsWith('ES-') ? { ticket_code: value } : { token: value };
    }
  }

  function renderCheckInResult(payload) {
    const wrap = $('[data-checkin-result]');
    if (!wrap) return;
    const validation = payload?.validation;
    const ticket = payload?.ticket;
    if (!validation) {
      wrap.className = 'checkin-result is-empty';
      wrap.innerHTML = `<i class="bi bi-qr-code-scan"></i><div><h5>Ready to validate tickets</h5><p>Select an event, scan a QR code, or search manually.</p></div>`;
      return;
    }
    const result = validation.result || 'invalid';
    const cls = result === 'valid' ? 'is-valid' : result === 'already_used' ? 'is-used' : 'is-invalid';
    wrap.className = `checkin-result ${cls}`;
    wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="eyebrow">${esc(validation.title || 'Scan result')}</div>
          <h5 class="mt-2">${esc(ticket?.attendee?.name || 'Unknown attendee')}</h5>
          <p>${esc(validation.reason || '')}</p>
        </div>
        ${statusBadge(result)}
      </div>
      <div class="dashboard-detail-grid mt-3">
        <div><dt>Event</dt><dd>${esc(ticket?.event?.title || '-')}</dd></div>
        <div><dt>Ticket type</dt><dd>${esc(ticket?.ticket_type?.name || '-')}</dd></div>
        <div><dt>Order</dt><dd>${esc(ticket?.order?.order_number || '-')}</dd></div>
        <div><dt>Checked in</dt><dd>${ticket?.checked_in_at ? esc(dateLabel(ticket.checked_in_at)) : '-'}</dd></div>
      </div>
      ${validation.can_check_in ? `<button class="btn btn-primary-grad mt-3" type="button" data-checkin-confirm><i class="bi bi-check2-circle me-1"></i>Check In</button>` : ''}`;
  }

  async function validateTicket(payload, method = 'qr') {
    const body = { ...payload, event_id: selectedCheckInEventId(), method };
    const { data } = await api().fetch('/organizer/tickets/validate', { method: 'POST', body });
    state.checkInResult = { ...data, payload: body };
    renderCheckInResult(state.checkInResult);
    await Promise.all([loadCheckInStats(), loadCheckInLogs()]);
  }

  async function confirmCheckIn() {
    if (!state.checkInResult?.payload) return;
    try {
      const { data } = await api().fetch('/organizer/tickets/check-in', { method: 'POST', body: state.checkInResult.payload });
      state.checkInResult = { ...data, payload: state.checkInResult.payload };
      renderCheckInResult(state.checkInResult);
      window.tkToast?.('Ticket checked in');
      await Promise.all([loadCheckInStats(), loadCheckInLogs(), loadAttendees(), loadPerformance()]);
    } catch (err) {
      const data = err.payload?.data;
      if (data?.validation) {
        state.checkInResult = { ...data, payload: state.checkInResult.payload };
        renderCheckInResult(state.checkInResult);
      }
      window.tkToast?.(err.message || 'Check-in failed', 'error');
      await Promise.all([loadCheckInStats(), loadCheckInLogs()]);
    }
  }

  async function lookupTickets(search) {
    const wrap = $('[data-checkin-lookup-results]');
    if (!wrap) return;
    wrap.innerHTML = `<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Looking up tickets...</span></div>`;
    const query = qs({ q: search, event_id: selectedCheckInEventId() });
    const res = await api().fetch(`/organizer/tickets/lookup${query ? `?${query}` : ''}`);
    const tickets = rows(res.data);
    wrap.innerHTML = tickets.map((ticket) => `
      <button class="dashboard-mini-row w-100 text-start" type="button" data-checkin-ticket-code="${esc(ticket.ticket_code)}">
        <div>
          <div class="fw-semibold">${esc(ticket.attendee?.name || 'Guest')}</div>
          <small>${esc(ticket.event?.title || '-')} · ${esc(ticket.ticket_type?.name || '-')} · ${esc(ticket.order?.order_number || '-')}</small>
        </div>
        ${statusBadge(ticket.status)}
      </button>
    `).join('') || emptyBlock('bi-search', 'No tickets found', 'Try a ticket code, attendee name, email, or order number.');
  }

  async function startScanner() {
    const video = $('[data-checkin-video]');
    const empty = $('[data-checkin-camera-empty]');
    if (!video) return;
    if (!('BarcodeDetector' in window)) {
      if (empty) empty.innerHTML = '<i class="bi bi-camera-video-off"></i><span>Camera QR scanning is not supported in this browser. Use manual lookup.</span>';
      return;
    }
    try {
      state.scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = state.scannerStream;
      await video.play();
      if (empty) empty.hidden = true;
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      clearInterval(state.scannerTimer);
      state.scannerTimer = setInterval(async () => {
        if (!video.videoWidth) return;
        const codes = await detector.detect(video).catch(() => []);
        const raw = codes[0]?.rawValue;
        if (!raw || raw === state.lastScannedPayload) return;
        state.lastScannedPayload = raw;
        await validateTicket(parseScannerPayload(raw), 'mobile_scanner').catch((err) => window.tkToast?.(err.message || 'Scan failed', 'error'));
      }, 700);
    } catch (err) {
      if (empty) empty.innerHTML = `<i class="bi bi-camera-video-off"></i><span>${esc(err.message || 'Camera unavailable. Use manual lookup.')}</span>`;
    }
  }

  function stopScanner() {
    clearInterval(state.scannerTimer);
    state.scannerTimer = null;
    state.lastScannedPayload = '';
    state.scannerStream?.getTracks?.().forEach((track) => track.stop());
    state.scannerStream = null;
    const video = $('[data-checkin-video]');
    if (video) video.srcObject = null;
    const empty = $('[data-checkin-camera-empty]');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = '<i class="bi bi-camera-video"></i><span>Start camera scanner or use manual lookup.</span>';
    }
  }

  function eventPayload() {
    const form = $('[data-organizer-event-form]');
    const fd = new FormData(form);
    const limitValue = fd.get('max_tickets_per_user') === 'custom'
      ? fd.get('max_tickets_per_user_custom')
      : fd.get('max_tickets_per_user');
    const maxTicketsPerUser = limitValue ? Number(limitValue) : null;

    return {
      title: String(fd.get('title') || '').trim(),
      category: String(fd.get('category') || '').trim(),
      description: String(fd.get('description') || '').trim() || null,
      venue_name: String(fd.get('venue_name') || '').trim(),
      city: String(fd.get('city') || '').trim(),
      address: String(fd.get('address') || '').trim() || null,
      starts_at: fd.get('starts_at'),
      ends_at: fd.get('ends_at') || null,
      timezone: u().EVENT_TIMEZONE || 'Europe/Pristina',
      status: fd.get('status'),
      max_tickets_per_user: Number.isInteger(maxTicketsPerUser) && maxTicketsPerUser > 0 ? maxTicketsPerUser : null,
      visibility: 'public',
      currency: 'USD',
    };
  }

  function formError(message) {
    const el = $('[data-event-form-error]');
    if (el) el.innerHTML = message ? `<div class="alert border-pro dashboard-note text-danger">${esc(message)}</div>` : '';
  }

  function openEventModal(event = null) {
    const form = $('[data-organizer-event-form]');
    if (!form) return;
    form.reset();
    formError('');
    state.selectedEvent = event;
    state.pendingImages = [];
    form.elements.event_id.value = event?.id || '';
    form.elements.title.value = event?.title || '';
    setSelectValue(form.elements.category, event?.category || '');
    form.elements.starts_at.value = toDatetimeLocal(event?.starts_at, event?.timezone);
    form.elements.ends_at.value = toDatetimeLocal(event?.ends_at, event?.timezone);
    form.elements.status.value = event?.status || 'draft';
    setPurchaseLimitValue(event?.max_tickets_per_user || null);
    form.elements.venue_name.value = event?.venue_name || '';
    form.elements.city.value = event?.city || '';
    form.elements.address.value = event?.address || '';
    form.elements.description.value = event?.description || '';
    renderTierRows(event?.ticket_types || []);
    renderGallery(event?.images || []);
    updateImageName(null);
    $('[data-event-modal-title]').textContent = event ? 'Edit event' : 'Create event';
    syncEventSaveLabel();
    bootstrap.Modal.getOrCreateInstance($('#organizerEventModal')).show();
  }

  async function saveEvent() {
    const form = $('[data-organizer-event-form]');
    if (!form || state.busy) return;
    formError('');
    if (!form.reportValidity()) return;
    const payload = eventPayload();
    if (!payload.title || !payload.category || !payload.venue_name || !payload.city || !payload.starts_at) {
      formError('Please complete all required event fields.');
      return;
    }
    const tiers = collectTiers();
    if (!tiers.length) {
      formError('Add at least one ticket type.');
      return;
    }
    const wantsPublished = payload.status === 'published';
    if (wantsPublished && !tiers.some((tier) => tier.status === 'active' && Number(tier.quantity_total) > 0)) {
      formError('Published events need at least one active ticket type with inventory.');
      return;
    }
    const eventId = form.elements.event_id.value;
    try {
      setBusy(true);
      let savedEvent;
      const wasPublished = state.selectedEvent?.status === 'published';
      const shouldDeferPublish = wantsPublished && (!eventId || !wasPublished);
      const basePayload = shouldDeferPublish ? { ...payload, status: 'draft' } : payload;
      if (eventId) {
        const { data } = await api().fetch(`/organizer/events/${eventId}`, { method: 'PATCH', body: basePayload });
        savedEvent = data;
        window.tkToast?.('Event updated');
      } else {
        const { data } = await api().fetch('/organizer/events', { method: 'POST', body: { ...basePayload, status: 'draft' } });
        savedEvent = data;
        if (!shouldDeferPublish) window.tkToast?.('Draft event created');
      }
      await syncTicketTiers(savedEvent.id, tiers);
      await uploadPendingImages(savedEvent);
      if (shouldDeferPublish) {
        await api().fetch(`/organizer/events/${savedEvent.id}`, { method: 'PATCH', body: { status: 'published' } });
        window.tkToast?.('Event published');
      }
      bootstrap.Modal.getOrCreateInstance($('#organizerEventModal')).hide();
      await refreshEventsAndAnalytics();
    } catch (err) {
      formError(err.message || 'Event save failed');
      window.tkToast?.(err.message || 'Event save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function quickStatus(eventId, status) {
    try {
      setBusy(true);
      await api().fetch(`/organizer/events/${eventId}`, { method: 'PATCH', body: { status } });
      window.tkToast?.(status === 'published' ? 'Event published' : 'Event unpublished');
      await refreshEventsAndAnalytics();
    } catch (err) {
      window.tkToast?.(err.message || 'Event status update failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  function renderTierRows(tiers) {
    const wrap = $('[data-organizer-tiers]');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (tiers.length) {
      tiers.forEach(addTierRow);
      return;
    }
    addTierRow({ name: 'Early Bird', price: '0.00', quantity_total: 100, status: 'active' });
    addTierRow({ name: 'General Admission', price: '0.00', quantity_total: 100, status: 'active' });
  }

  function addTierRow(tier = {}) {
    const wrap = $('[data-organizer-tiers]');
    if (!wrap) return;
    const row = document.createElement('div');
    row.className = 'card-pro p-3 mb-2';
    row.dataset.tierRow = '';
    if (tier.id) row.dataset.ticketTypeId = tier.id;
    row.innerHTML = `
      <div class="row g-2 align-items-end">
        <div class="col-md-4"><label class="form-label small">Name</label><input class="form-control" name="tier_name" value="${esc(tier.name || '')}" required/></div>
        <div class="col-md-3"><label class="form-label small">Price</label><input class="form-control" name="tier_price" type="number" min="0" step="0.01" value="${esc(tier.price ?? '0.00')}"/></div>
        <div class="col-md-3"><label class="form-label small">Inventory</label><input class="form-control" name="tier_quantity" type="number" min="0" step="1" value="${esc(tier.quantity_total ?? 0)}"/></div>
        <div class="col-md-2"><label class="form-label small">Status</label><select class="form-select" name="tier_status"><option value="active" ${tier.status === 'active' || tier.status === 'sold_out' ? 'selected' : ''}>Active</option><option value="inactive" ${tier.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="paused" ${tier.status === 'paused' ? 'selected' : ''}>Paused</option></select></div>
        <div class="col-12 d-flex justify-content-between align-items-center gap-2">
          <small class="text-muted-pro">${Number(tier.quantity_sold || 0)} sold · ${Number(tier.quantity_reserved || 0)} reserved</small>
          <button class="btn btn-glass btn-sm" type="button" data-tier-delete><i class="bi bi-trash"></i></button>
        </div>
      </div>`;
    wrap.appendChild(row);
  }

  function collectTiers() {
    return $$('[data-tier-row]').map((row, index) => {
      const name = $('[name="tier_name"]', row)?.value.trim();
      const price = Number($('[name="tier_price"]', row)?.value || 0);
      const quantity = Number($('[name="tier_quantity"]', row)?.value || 0);
      const status = $('[name="tier_status"]', row)?.value || 'active';
      return {
        id: row.dataset.ticketTypeId ? Number(row.dataset.ticketTypeId) : null,
        name,
        price,
        quantity_total: quantity,
        currency: 'USD',
        min_per_order: 1,
        max_per_order: Math.max(1, quantity),
        status: quantity > 0 ? status : 'inactive',
        sort_order: index + 1,
      };
    }).filter((tier) => tier.name && !Number.isNaN(tier.price) && tier.price >= 0 && !Number.isNaN(tier.quantity_total) && tier.quantity_total >= 0);
  }

  async function syncTicketTiers(eventId, tiers) {
    for (const tier of tiers) {
      if (tier.id) {
        await api().fetch(`/organizer/ticket-types/${tier.id}`, { method: 'PATCH', body: tier });
      } else {
        await api().fetch(`/organizer/events/${eventId}/ticket-types`, { method: 'POST', body: tier });
      }
    }
  }

  async function uploadPendingImages(event) {
    for (const [index, image] of state.pendingImages.entries()) {
      const fd = new FormData();
      fd.append('image', image);
      fd.append('type', index === 0 ? 'banner' : 'gallery');
      fd.append('is_primary', index === 0 ? '1' : '0');
      fd.append('sort_order', String(index + 1));
      fd.append('alt_text', event.title || 'Event image');
      await api().fetch(`/organizer/events/${event.id}/images`, { method: 'POST', body: fd });
    }
    state.pendingImages = [];
    updateImageName(null);
  }

  function renderGallery(images) {
    const gallery = $('[data-organizer-gallery]');
    if (!gallery) return;
    gallery.innerHTML = images.length ? images.map((image) => `
      <div class="col-6">
        <div class="card-pro p-2">
          <img src="${esc(image.optimized_url || image.url)}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px"/>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <small class="text-muted-pro">${image.is_primary ? 'Primary' : esc(image.type || 'gallery')}</small>
            <button class="btn btn-glass btn-sm" type="button" data-image-delete="${image.id}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>`).join('') : '<div class="col-12 small text-muted-pro">No uploaded images yet.</div>';
  }

  function updateImageName(files) {
    const label = $('[data-organizer-image-name]');
    if (!label) return;
    label.textContent = files?.length ? (files.length === 1 ? files[0].name : `${files.length} images selected`) : 'No images selected';
  }

  function setPurchaseLimitValue(limit) {
    const select = $('[data-purchase-limit-select]');
    const custom = $('[data-purchase-limit-custom]');
    if (!select || !custom) return;

    const value = limit ? String(limit) : '';
    const preset = ['', '1', '2', '5', '10'].includes(value);

    select.value = preset ? value : 'custom';
    custom.value = preset ? '' : value;
    custom.classList.toggle('d-none', select.value !== 'custom');
    custom.required = select.value === 'custom';
  }

  function syncEventSaveLabel() {
    const form = $('[data-organizer-event-form]');
    const button = $('[data-event-save]');
    if (!form || !button) return;

    const isExisting = !!form.elements.event_id.value;
    const wantsPublished = form.elements.status.value === 'published';

    if (!isExisting && wantsPublished) {
      button.textContent = 'Create & Publish';
    } else if (!isExisting) {
      button.textContent = 'Create Draft';
    } else if (wantsPublished) {
      button.textContent = 'Save Published Event';
    } else {
      button.textContent = 'Save event';
    }
  }

  async function showEventAnalytics(eventId) {
    const event = state.events.find((item) => String(item.id) === String(eventId));
    const perf = performanceFor(eventId);
    const inv = state.inventory.filter((tier) => String(tier.event_id) === String(eventId));
    detailModal(event?.title || 'Event analytics', `
      <div class="dashboard-detail-grid">
        <div><dt>Status</dt><dd>${statusBadge(event?.status)}</dd></div>
        <div><dt>Service Fee</dt><dd>${Number(event?.service_fee_percentage ?? 10)}%</dd></div>
        <div><dt>Revenue</dt><dd>${u().formatMoney(perf.revenue || 0, perf.currency || event?.currency || 'USD')}</dd></div>
        <div><dt>Tickets sold</dt><dd>${perf.tickets_sold ?? 0}</dd></div>
        <div><dt>Tickets remaining</dt><dd>${perf.tickets_available ?? 0}</dd></div>
        <div><dt>Orders</dt><dd>${perf.orders_count ?? 0}</dd></div>
        <div><dt>Check-ins</dt><dd>${perf.checked_in_count ?? 0} / ${perf.attendees_count ?? 0}</dd></div>
      </div>
      <h6 class="mt-4">Ticket tiers</h6>
      <div class="dashboard-stack">
        ${inv.map((tier) => `<div class="dashboard-mini-row"><div><div class="fw-semibold">${esc(tier.name)}</div><small>${tier.quantity_available} remaining · ${tier.quantity_sold} sold</small></div>${statusBadge(tier.status)}</div>`).join('') || '<p class="text-muted-pro mb-0">No ticket tiers yet.</p>'}
      </div>
    `);
  }

  async function showAttendeeDetails(ticketId) {
    const ticket = state.attendees.find((item) => String(item.id) === String(ticketId));
    if (!ticket) return;
    detailModal(ticket.attendee?.name || 'Attendee details', `
      <div class="dashboard-detail-grid">
        <div><dt>Name</dt><dd>${esc(ticket.attendee?.name || 'Guest')}</dd></div>
        <div><dt>Email</dt><dd>${esc(ticket.attendee?.email || '-')}</dd></div>
        <div><dt>Phone</dt><dd>${esc(ticket.attendee?.phone || '-')}</dd></div>
        <div><dt>Purchased by</dt><dd>${esc(ticket.purchaser?.name || ticket.order?.purchaser?.name || '-')} · ${esc(ticket.purchaser?.email || ticket.order?.purchaser?.email || '-')}</dd></div>
        <div><dt>Status</dt><dd>${statusBadge(ticket.status)}</dd></div>
        <div><dt>Ticket</dt><dd>${esc(ticket.ticket_code)}</dd></div>
        <div><dt>Ticket type</dt><dd>${esc(ticket.ticket_type?.name || '-')}</dd></div>
        <div><dt>Event</dt><dd>${esc(ticket.event?.title || '-')}</dd></div>
        <div><dt>Order</dt><dd>${esc(ticket.order?.order_number || '-')}</dd></div>
        <div><dt>Payment</dt><dd>${statusBadge(ticket.order?.payment_status)}</dd></div>
        <div><dt>Checked in</dt><dd>${ticket.checked_in_at ? esc(dateLabel(ticket.checked_in_at)) : '-'}</dd></div>
      </div>
    `);
  }

  function detailModal(title, html) {
    $('[data-organizer-detail-title]').textContent = title;
    $('[data-organizer-detail-body]').innerHTML = html;
    bootstrap.Modal.getOrCreateInstance($('#organizerDetailModal')).show();
  }

  function renderSettings() {
    const wrap = $('[data-organizer-settings-profile]');
    if (!wrap) return;
    const user = auth().getUser();
    const organizer = state.summary?.organizer || user || {};
    wrap.innerHTML = `
      <div><dt>Name</dt><dd>${esc(organizer.name || '-')}</dd></div>
      <div><dt>Email</dt><dd>${esc(organizer.email || '-')}</dd></div>
      <div><dt>Status</dt><dd>${statusBadge(organizer.organizer_status || 'approved')}</dd></div>
      <div><dt>Role</dt><dd>${statusBadge(organizer.role || 'organizer')}</dd></div>`;
  }

  function showSection(section) {
    const target = section || 'overview';
    const exists = !!$(`[data-organizer-section="${target}"]`);
    state.currentSection = exists ? target : 'overview';

    $$('[data-organizer-section]').forEach((panel) => {
      const active = panel.dataset.organizerSection === state.currentSection;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    $$('[data-organizer-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.organizerNav === state.currentSection);
    });
    $('.dash-side')?.classList.remove('open');

    if (location.hash.replace('#', '') !== state.currentSection) {
      history.replaceState(null, '', `#${state.currentSection}`);
    }

    if (state.currentSection === 'revenue') renderRevenue();
    if (state.currentSection === 'ticket-analytics') renderTicketAnalytics();
  }

  function bindSectionNavigation() {
    $$('[data-organizer-nav]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showSection(link.dataset.organizerNav);
      });
    });
    $('[data-toggle-side]')?.addEventListener('click', () => $('.dash-side')?.classList.toggle('open'));
    window.addEventListener('hashchange', () => showSection(location.hash.replace('#', '') || 'overview'));
    showSection(location.hash.replace('#', '') || 'overview');
  }

  function reportData(type) {
    if (type === 'attendees') {
      return {
        title: 'Attendee Report',
        headers: ['Attendee', 'Email', 'Event', 'Ticket Type', 'Order Number', 'Purchase Date', 'Check-In Status'],
        rows: state.attendees.map((ticket) => [
          ticket.attendee?.name || 'Guest',
          ticket.attendee?.email || '',
          ticket.event?.title || '',
          ticket.ticket_type?.name || '',
          ticket.order?.order_number || '',
          dateLabel(ticket.order?.created_at || ticket.created_at),
          ticket.status || '',
        ]),
      };
    }

    if (type === 'revenue') {
      return {
        title: 'Revenue Report',
        headers: ['Event', 'Revenue', 'Tickets Sold', 'Orders'],
        rows: rows(state.revenue?.by_event).map((item) => [
          item.title || '',
          u().formatMoney(item.revenue || 0, item.currency || 'USD'),
          item.tickets_sold || 0,
          item.orders_count || 0,
        ]),
      };
    }

    return {
      title: 'Ticket Sales Report',
      headers: ['Event', 'Status', 'Tickets Sold', 'Tickets Remaining', 'Orders', 'Check-Ins', 'Revenue'],
      rows: state.performance.map((item) => [
        item.title || '',
        item.status || '',
        item.tickets_sold || 0,
        item.tickets_available || 0,
        item.orders_count || 0,
        `${item.checked_in_count || 0} / ${item.attendees_count || 0}`,
        u().formatMoney(item.revenue || 0, item.currency || 'USD'),
      ]),
    };
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadCsv(type) {
    const report = reportData(type);
    const content = [report.headers, ...report.rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-sphere-${type}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportReportPdf(type) {
    const report = reportData(type);
    const rowsHtml = report.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) {
      window.tkToast?.('Popup blocked. Allow popups to export PDF.', 'error');
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${esc(report.title)}</title><style>
      body{font-family:Arial,sans-serif;color:#111827;padding:28px}h1{margin:0 0 4px}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left;font-size:12px}th{background:#f8fafc;text-transform:uppercase;color:#475569}.brand{font-weight:700;color:#2563eb}
    </style></head><body><div class="brand">Event Sphere</div><h1>${esc(report.title)}</h1><p>Generated ${esc(dateLabel(new Date().toISOString()))}</p><table><thead><tr>${report.headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${report.headers.length}">No report data available.</td></tr>`}</tbody></table><script>window.print();<\/script></body></html>`);
    win.document.close();
  }

  function bindFilters() {
    $('[data-organizer-event-status]')?.addEventListener('change', async () => {
      await loadEvents();
      renderEvents();
    });
    $('[data-organizer-event-search]')?.addEventListener('input', debounce(async () => {
      await loadEvents();
      renderEvents();
    }, 250));
    $('[data-attendee-event]')?.addEventListener('change', async () => {
      state.attendeePage = 1;
      await loadAttendees();
      renderAttendees();
    });
    $('[data-attendee-status]')?.addEventListener('change', async () => {
      state.attendeePage = 1;
      await loadAttendees();
      renderAttendees();
    });
    $('[data-attendee-search]')?.addEventListener('input', debounce(async () => {
      state.attendeePage = 1;
      await loadAttendees();
      renderAttendees();
    }, 250));
    $('[data-checkin-event]')?.addEventListener('change', async () => {
      state.checkInResult = null;
      renderCheckInResult(null);
      await Promise.all([loadCheckInStats(), loadCheckInLogs()]);
    });
  }

  function bindActions() {
    document.addEventListener('event-sphere:theme-changed', () => {
      renderRevenueChart();
      renderRevenueByEventChart();
      renderTicketAnalytics();
    });

    $('[data-organizer-new-event]')?.addEventListener('click', () => openEventModal());
    $('[data-organizer-event-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveEvent();
    });
    $('[data-tier-add]')?.addEventListener('click', () => addTierRow({ name: 'New ticket type', price: '0.00', quantity_total: 100, status: 'active' }));
    $('[data-organizer-browse-image]')?.addEventListener('click', (event) => {
      event.preventDefault();
      $('[data-organizer-image-input]')?.click();
    });
    $('[data-organizer-image-input]')?.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
      if (files.some((file) => file.size > 5 * 1024 * 1024)) {
        window.tkToast?.('Images must be 5MB or smaller.', 'error');
        return;
      }
      state.pendingImages = files;
      updateImageName(files);
    });
    $('[data-purchase-limit-select]')?.addEventListener('change', (event) => {
      const custom = $('[data-purchase-limit-custom]');
      if (!custom) return;
      custom.classList.toggle('d-none', event.target.value !== 'custom');
      custom.required = event.target.value === 'custom';
      if (event.target.value !== 'custom') custom.value = '';
      if (event.target.value === 'custom') custom.focus();
    });
    $('[data-organizer-event-form] [name="status"]')?.addEventListener('change', syncEventSaveLabel);

    document.addEventListener('click', async (event) => {
      const tierDelete = event.target.closest('[data-tier-delete]');
      if (tierDelete) {
        const row = tierDelete.closest('[data-tier-row]');
        const id = row?.dataset.ticketTypeId;
        if (id) {
          if (!confirm('Delete this ticket type?')) return;
          try {
            setBusy(true);
            await api().fetch(`/organizer/ticket-types/${id}`, { method: 'DELETE' });
            row.remove();
            window.tkToast?.('Ticket type deleted');
            await refreshEventsAndAnalytics();
          } catch (err) {
            window.tkToast?.(err.message || 'Ticket type delete failed', 'error');
          } finally {
            setBusy(false);
          }
          return;
        }
        if ($$('[data-tier-row]').length <= 1) {
          window.tkToast?.('At least one ticket type is required.', 'info');
          return;
        }
        row?.remove();
        return;
      }

      const imageDelete = event.target.closest('[data-image-delete]');
      if (imageDelete) {
        if (!confirm('Delete this event image?')) return;
        try {
          setBusy(true);
          await api().fetch(`/organizer/event-images/${imageDelete.dataset.imageDelete}`, { method: 'DELETE' });
          const eventId = $('[data-organizer-event-form]')?.elements.event_id.value;
          if (eventId) {
            const { data } = await api().fetch(`/organizer/events/${eventId}`);
            state.selectedEvent = data;
            renderGallery(data.images || []);
          }
          await refreshEventsAndAnalytics();
          window.tkToast?.('Image deleted');
        } catch (err) {
          window.tkToast?.(err.message || 'Image delete failed', 'error');
        } finally {
          setBusy(false);
        }
        return;
      }

      const retryEvents = event.target.closest('[data-retry-events]');
      if (retryEvents) {
        await loadEvents();
        renderEvents();
        return;
      }
      const retrySummary = event.target.closest('[data-retry-summary]');
      if (retrySummary) {
        await Promise.all([loadSummary(), loadEvents()]);
        renderOverview();
        return;
      }
      const retryPerformance = event.target.closest('[data-retry-performance]');
      if (retryPerformance) {
        await loadPerformance();
        renderPerformance();
        return;
      }
      const retryInventory = event.target.closest('[data-retry-inventory]');
      if (retryInventory) {
        await loadInventory();
        renderInventory();
        return;
      }
      const retryAttendees = event.target.closest('[data-retry-attendees]');
      if (retryAttendees) {
        await loadAttendees();
        renderAttendees();
        return;
      }
      const retryRevenue = event.target.closest('[data-retry-revenue]');
      if (retryRevenue) {
        await loadRevenue();
        renderRevenue();
        return;
      }
      const retryCheckInLogs = event.target.closest('[data-retry-checkin-logs]');
      if (retryCheckInLogs) {
        await loadCheckInLogs();
        renderCheckInLogs();
        return;
      }

      const checkInConfirm = event.target.closest('[data-checkin-confirm]');
      if (checkInConfirm) {
        await confirmCheckIn();
        return;
      }

      const lookupTicket = event.target.closest('[data-checkin-ticket-code]');
      if (lookupTicket) {
        await validateTicket({ ticket_code: lookupTicket.dataset.checkinTicketCode }, 'manual');
        return;
      }

      const attendeePage = event.target.closest('[data-attendee-page]');
      if (attendeePage) {
        state.attendeePage = Number(attendeePage.dataset.attendeePage);
        await loadAttendees();
        renderAttendees();
        return;
      }

      const edit = event.target.closest('[data-event-edit]');
      if (edit) {
        const eventRecord = state.events.find((item) => String(item.id) === String(edit.dataset.eventEdit));
        openEventModal(eventRecord);
        return;
      }

      const publish = event.target.closest('[data-event-publish]');
      if (publish) {
        await quickStatus(publish.dataset.eventPublish, 'published');
        return;
      }

      const unpublish = event.target.closest('[data-event-unpublish]');
      if (unpublish) {
        await quickStatus(unpublish.dataset.eventUnpublish, 'draft');
        return;
      }

      const analytics = event.target.closest('[data-event-analytics]');
      if (analytics) {
        await showEventAnalytics(analytics.dataset.eventAnalytics);
        return;
      }

      const attendee = event.target.closest('[data-attendee-details]');
      if (attendee) {
        await showAttendeeDetails(attendee.dataset.attendeeDetails);
        return;
      }

      const report = event.target.closest('[data-report-export]');
      if (report) {
        const type = report.dataset.reportExport;
        if (report.dataset.reportFormat === 'pdf') {
          exportReportPdf(type);
        } else {
          downloadCsv(type);
          window.tkToast?.('Report CSV exported');
        }
      }
    });

    $('[data-checkin-manual-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const search = String(new FormData(event.currentTarget).get('q') || '').trim();
      if (!search) return;
      await lookupTickets(search).catch((err) => window.tkToast?.(err.message || 'Lookup failed', 'error'));
    });
    $('[data-checkin-start-camera]')?.addEventListener('click', startScanner);
    $('[data-checkin-stop-camera]')?.addEventListener('click', stopScanner);

    $$('[data-organizer-range]').forEach((button) => {
      button.addEventListener('click', async () => {
        $$('[data-organizer-range]').forEach((btn) => btn.classList.toggle('active', btn === button));
        state.groupBy = button.dataset.organizerRange;
        await loadRevenue();
        renderRevenue();
      });
    });
  }

  function setBusy(busy) {
    state.busy = busy;
    $$('[data-event-save], [data-event-edit], [data-event-publish], [data-event-unpublish], [data-organizer-new-event]').forEach((button) => {
      button.disabled = busy;
    });
  }

  function setSelectValue(select, value) {
    if (!select) return;
    if (value && !Array.from(select.options).some((option) => option.value === value)) {
      select.add(new Option(value, value));
    }
    select.value = value;
  }

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function toDatetimeLocal(value, timezone) {
    return u().toEventDatetimeLocal(value, timezone);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth().requireAuth(['organizer', 'admin'], { requireApprovedOrganizer: true });
    if (!user) return;

    bindSectionNavigation();
    bindFilters();
    bindActions();

    try {
      await refreshAll();
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load organizer dashboard', 'error');
    }
  });
})();
