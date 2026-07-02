(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;
  const $ = (sel) => document.querySelector(sel);
  const esc = (value) => u().escapeHtml(value ?? '');
  const tr = (key, fallback) => window.t?.(key) || fallback || key;

  function dateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function badge(value) {
    const key = String(value || 'unknown').toLowerCase();
    const classKey = key.replace(/\s+/g, '_');
    return `<span class="badge status-badge status-${esc(classKey)}">${esc(key.replace(/_/g, ' '))}</span>`;
  }

  function eventCard(event) {
    const image = event.banner_image_url || event.images?.[0]?.url || '../assets/img/concert-hero.svg';

    return `
      <div class="col-md-6">
        <div class="dashboard-mini-row align-items-start h-100">
          <img class="rounded-3" style="width:96px;aspect-ratio:4/3;object-fit:cover" src="${esc(image)}" alt="${esc(event.title)}">
          <span class="flex-grow-1">
            <span class="fw-semibold d-block">${esc(event.title)}</span>
            <small>${dateTime(event.starts_at)} · ${esc(event.venue_name || '-')}</small>
          </span>
          <a class="btn btn-glass btn-sm" href="/check-in?event_id=${encodeURIComponent(event.id)}" data-i18n="buttons.open">${window.t?.('buttons.open') || 'Open'}</a>
        </div>
      </div>`;
  }

  function renderEvents(events) {
    const wrap = $('[data-scanner-assigned-event]');
    const scanLink = $('[data-scanner-scan-link]');
    if (!wrap) return;

    if (!events.length) {
      wrap.innerHTML = `
        <div class="col-12">
          <div class="dashboard-empty">
            <i class="bi bi-calendar-x"></i>
            <span data-i18n="empty.no_scanner_event">${window.t?.('empty.no_scanner_event') || 'No event has been assigned to this scanner account.'}</span>
          </div>
        </div>`;
      scanLink?.classList.add('disabled');
      scanLink?.setAttribute('aria-disabled', 'true');
      return;
    }

    if (events.length > 1) {
      wrap.innerHTML = `
        <div class="col-12">
          <div class="eyebrow mb-2">${esc(tr('scanner.assigned_events', 'Assigned Events'))}</div>
          <h2 class="mb-3" style="font-size:1.55rem">${esc(tr('scanner.select_event_to_scan', 'Select an event to scan'))}</h2>
        </div>
        ${events.map(eventCard).join('')}`;
      scanLink?.classList.add('disabled');
      scanLink?.setAttribute('aria-disabled', 'true');
      return;
    }

    const event = events[0];
    const image = event.banner_image_url || event.images?.[0]?.url || '../assets/img/concert-hero.svg';
    scanLink?.classList.remove('disabled');
    scanLink?.removeAttribute('aria-disabled');
    scanLink?.setAttribute('href', `/check-in?event_id=${encodeURIComponent(event.id)}`);
    wrap.innerHTML = `
      <div class="col-md-5">
        <img class="img-fluid rounded-3 w-100" style="aspect-ratio:16/10;object-fit:cover" src="${esc(image)}" alt="${esc(event.title)}">
      </div>
      <div class="col-md-7">
        <div class="eyebrow mb-2">${esc(tr('scanner.assigned_event', 'Assigned Event'))}</div>
        <h2 class="mb-3" style="font-size:1.55rem">${esc(event.title)}</h2>
        <div class="dashboard-detail-grid">
          <div><dt>${esc(tr('common.date', 'Date'))}</dt><dd>${dateTime(event.starts_at)}</dd></div>
          <div><dt>${esc(tr('venue.name', 'Venue'))}</dt><dd>${esc(event.venue_name || '-')}</dd></div>
          <div><dt>${esc(tr('common.location', 'Location'))}</dt><dd>${esc([event.city, event.country].filter(Boolean).join(', ') || '-')}</dd></div>
          <div><dt>${esc(tr('admin.status', 'Status'))}</dt><dd>${badge(event.status)}</dd></div>
        </div>
      </div>`;
  }

  function renderScans(scans) {
    const body = $('[data-scanner-recent-scans]');
    if (!body) return;
    body.innerHTML = scans.map((scan) => `
      <tr>
        <td data-label="Result">${badge(scan.result)}</td>
        <td data-label="Attendee"><div class="fw-semibold">${esc(scan.attendee?.name || '-')}</div><small class="text-muted-pro">${esc(scan.attendee?.email || '')}</small></td>
        <td data-label="Event">${esc(scan.event?.title || '-')}</td>
        <td data-label="Ticket">${esc(scan.ticket_code || scan.ticket_uuid || '-')}</td>
        <td data-label="Time">${dateTime(scan.scanned_at)}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="text-muted-pro">${esc(tr('scanner.no_scans_yet', 'No scans yet.'))}</td></tr>`;
  }

  document.addEventListener('tiketa:language-changed', () => {
    renderEvents(window.__scannerDashboardEvents || []);
    renderScans(window.__scannerDashboardScans || []);
  });

  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth().requireAuth(['scanner']);
    if (!user) return;

    try {
      const { data } = await api().fetch('/scanner/dashboard');
      window.__scannerDashboardEvents = data.assigned_events || (data.assigned_event ? [data.assigned_event] : []);
      renderEvents(window.__scannerDashboardEvents);
      const total = $('[data-scanner-total-today]');
      if (total) total.textContent = data.total_scanned_today ?? 0;
      window.__scannerDashboardScans = data.recent_scans || [];
      renderScans(window.__scannerDashboardScans);
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load scanner dashboard', 'error');
    }
  });
})();
