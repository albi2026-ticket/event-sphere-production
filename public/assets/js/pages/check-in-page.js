(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  const state = {
    user: null,
    roleBase: '/organizer',
    events: [],
    result: null,
    stats: null,
    logs: [],
    stream: null,
    timer: null,
    lastPayload: '',
  };

  const $ = (sel) => document.querySelector(sel);
  const rows = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
  const esc = (value) => u().escapeHtml(value ?? '');
  const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')).toString();

  function badge(value) {
    const key = String(value || 'unknown').toLowerCase();
    return `<span class="badge status-badge status-${esc(key)}">${esc(key.replace(/_/g, ' '))}</span>`;
  }

  function dateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function selectedEventId() {
    return $('[data-scanner-event]')?.value || '';
  }

  function parsePayload(raw) {
    const value = String(raw || '').trim();
    if (!value) return {};
    try {
      const json = JSON.parse(value);
      return { token: json.token || '', ticket_uuid: json.ticket_uuid || json.uuid || '' };
    } catch {
      return value.startsWith('ES-') ? { ticket_code: value } : { token: value };
    }
  }

  async function loadEvents() {
    const endpoint = state.roleBase === '/admin' ? '/admin/events?per_page=100&sort=newest' : '/organizer/events?per_page=100&sort=newest';
    const res = await api().fetch(endpoint);
    state.events = rows(res.data);
    const select = $('[data-scanner-event]');
    if (select) {
      select.innerHTML = '<option value="">Select event</option>' + state.events.map((event) => `<option value="${event.id}">${esc(event.title)}</option>`).join('');
      if (state.events[0]) select.value = String(state.events[0].id);
    }
  }

  async function loadStats() {
    const eventId = selectedEventId();
    let endpoint;
    if (state.roleBase === '/admin') {
      endpoint = `/admin/tickets/check-in-stats${eventId ? `?event_id=${encodeURIComponent(eventId)}` : ''}`;
    } else if (eventId) {
      endpoint = `/organizer/events/${eventId}/check-in-stats`;
    } else {
      state.stats = { tickets_sold: 0, checked_in: 0, remaining: 0 };
      renderStats();
      return;
    }
    const { data } = await api().fetch(endpoint);
    state.stats = data;
    renderStats();
  }

  async function loadLogs() {
    const query = qs({ per_page: 8, event_id: selectedEventId() });
    const res = await api().fetch(`${state.roleBase}/validation-logs${query ? `?${query}` : ''}`);
    state.logs = rows(res.data);
    renderLogs();
  }

  function renderStats() {
    const row = $('[data-scanner-stats]');
    const stats = state.stats || { tickets_sold: 0, checked_in: 0, remaining: 0 };
    if (!row) return;
    row.innerHTML = `
      <div class="col-md-4"><div class="kpi"><div class="label">Tickets Sold</div><div class="value">${stats.tickets_sold ?? 0}</div></div></div>
      <div class="col-md-4"><div class="kpi"><div class="label">Checked In</div><div class="value">${stats.checked_in ?? 0}</div></div></div>
      <div class="col-md-4"><div class="kpi"><div class="label">Remaining</div><div class="value">${stats.remaining ?? 0}</div></div></div>`;
  }

  function renderLogs() {
    const body = $('[data-scanner-logs]');
    if (!body) return;
    body.innerHTML = state.logs.map((log) => `
      <tr>
        <td>${badge(log.result)}</td>
        <td><div class="fw-semibold">${esc(log.attendee?.name || '-')}</div><small class="text-muted-pro">${esc(log.attendee?.email || '')}</small></td>
        <td>${esc(log.ticket_code || log.ticket_uuid || '-')}</td>
        <td>${dateTime(log.scanned_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-muted-pro">No scan history yet.</td></tr>';
  }

  function renderResult(data) {
    const wrap = $('[data-scanner-result]');
    const validation = data?.validation;
    const ticket = data?.ticket;
    if (!wrap || !validation) return;
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
        ${badge(result)}
      </div>
      <div class="dashboard-detail-grid mt-3">
        <div><dt>Event</dt><dd>${esc(ticket?.event?.title || '-')}</dd></div>
        <div><dt>Ticket type</dt><dd>${esc(ticket?.ticket_type?.name || '-')}</dd></div>
        <div><dt>Order</dt><dd>${esc(ticket?.order?.order_number || '-')}</dd></div>
        <div><dt>Checked in</dt><dd>${ticket?.checked_in_at ? dateTime(ticket.checked_in_at) : '-'}</dd></div>
      </div>
      ${validation.can_check_in ? '<button class="btn btn-primary-grad mt-3" type="button" data-scanner-checkin><i class="bi bi-check2-circle me-1"></i>Check In</button>' : ''}`;
  }

  async function validateTicket(payload, method = 'qr') {
    const body = { ...payload, event_id: selectedEventId(), method };
    const { data } = await api().fetch(`${state.roleBase}/tickets/validate`, { method: 'POST', body });
    state.result = { ...data, payload: body };
    renderResult(state.result);
    await Promise.all([loadStats(), loadLogs()]);
  }

  async function checkIn() {
    if (!state.result?.payload) return;
    try {
      const { data } = await api().fetch(`${state.roleBase}/tickets/check-in`, { method: 'POST', body: state.result.payload });
      state.result = { ...data, payload: state.result.payload };
      renderResult(state.result);
      window.tkToast?.('Ticket checked in');
    } catch (err) {
      if (err.payload?.data?.validation) renderResult(err.payload.data);
      window.tkToast?.(err.message || 'Check-in failed', 'error');
    }
    await Promise.all([loadStats(), loadLogs()]);
  }

  async function lookup(search) {
    const wrap = $('[data-scanner-lookup-results]');
    if (!wrap) return;
    wrap.innerHTML = '<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Looking up tickets...</span></div>';
    const query = qs({ q: search, event_id: selectedEventId() });
    const res = await api().fetch(`${state.roleBase}/tickets/lookup${query ? `?${query}` : ''}`);
    const tickets = rows(res.data);
    wrap.innerHTML = tickets.map((ticket) => `
      <button class="dashboard-mini-row w-100 text-start" type="button" data-scanner-ticket-code="${esc(ticket.ticket_code)}">
        <div><div class="fw-semibold">${esc(ticket.attendee?.name || 'Guest')}</div><small>${esc(ticket.event?.title || '-')} · ${esc(ticket.order?.order_number || '-')}</small></div>
        ${badge(ticket.status)}
      </button>
    `).join('') || '<div class="dashboard-empty"><i class="bi bi-search"></i><span>No tickets found.</span></div>';
  }

  async function startCamera() {
    const video = $('[data-scanner-video]');
    const empty = $('[data-scanner-empty]');
    if (!video) return;
    if (!('BarcodeDetector' in window)) {
      if (empty) empty.innerHTML = '<i class="bi bi-camera-video-off"></i><span>Camera QR scanning is not supported in this browser. Use manual lookup.</span>';
      return;
    }
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = state.stream;
    await video.play();
    if (empty) empty.hidden = true;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    clearInterval(state.timer);
    state.timer = setInterval(async () => {
      const codes = await detector.detect(video).catch(() => []);
      const raw = codes[0]?.rawValue;
      if (!raw || raw === state.lastPayload) return;
      state.lastPayload = raw;
      await validateTicket(parsePayload(raw), 'mobile_scanner').catch((err) => window.tkToast?.(err.message || 'Scan failed', 'error'));
    }, 700);
  }

  function stopCamera() {
    clearInterval(state.timer);
    state.timer = null;
    state.lastPayload = '';
    state.stream?.getTracks?.().forEach((track) => track.stop());
    state.stream = null;
    const video = $('[data-scanner-video]');
    if (video) video.srcObject = null;
    const empty = $('[data-scanner-empty]');
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = '<i class="bi bi-camera-video"></i><span>Start the camera or use manual lookup.</span>';
    }
  }

  function bind() {
    $('[data-scanner-event]')?.addEventListener('change', async () => {
      state.result = null;
      await Promise.all([loadStats(), loadLogs()]);
    });
    $('[data-scanner-start]')?.addEventListener('click', () => startCamera().catch((err) => window.tkToast?.(err.message || 'Camera unavailable', 'error')));
    $('[data-scanner-stop]')?.addEventListener('click', stopCamera);
    $('[data-scanner-manual-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const search = String(new FormData(event.currentTarget).get('q') || '').trim();
      if (search) await lookup(search).catch((err) => window.tkToast?.(err.message || 'Lookup failed', 'error'));
    });
    document.addEventListener('click', async (event) => {
      const ticket = event.target.closest('[data-scanner-ticket-code]');
      if (ticket) await validateTicket({ ticket_code: ticket.dataset.scannerTicketCode }, 'manual');
      if (event.target.closest('[data-scanner-checkin]')) await checkIn();
    });
    window.addEventListener('beforeunload', stopCamera);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    state.user = auth().requireAuth(['organizer', 'admin'], { requireApprovedOrganizer: false });
    if (!state.user) return;
    state.roleBase = state.user.role === 'admin' ? '/admin' : '/organizer';
    $('[data-admin-back]')?.toggleAttribute('hidden', state.user.role !== 'admin');
    $('[data-organizer-back]')?.toggleAttribute('hidden', state.user.role === 'admin');
    bind();
    await loadEvents();
    await Promise.all([loadStats(), loadLogs()]);
  });
})();
