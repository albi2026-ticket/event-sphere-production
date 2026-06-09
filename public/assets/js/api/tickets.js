(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const u = () => window.EventSphereUtils;

  async function listActiveTickets() {
    const { data } = await api().fetch('/me/tickets/active');
    return Array.isArray(data) ? data : [];
  }

  async function listTickets(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const { data, meta } = await api().fetch(`/me/tickets${qs ? `?${qs}` : ''}`);
    return { tickets: Array.isArray(data) ? data : [], meta };
  }

  async function listTicketHistory(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const { data, meta } = await api().fetch(`/me/tickets/history${qs ? `?${qs}` : ''}`);
    return { tickets: Array.isArray(data) ? data : [], meta };
  }

  async function getTicket(ticketId) {
    const { data } = await api().fetch(`/tickets/${ticketId}`);
    return data;
  }

  async function loadQrBlob(ticketId) {
    return api().fetchBlob(`/tickets/${ticketId}/qr-code`);
  }

  async function downloadTicket(ticketId, ticketCode) {
    const blob = await api().fetchBlob(`/tickets/${ticketId}/download`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticketCode || ticketId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderTicketCard(ticket) {
    const ev = ticket.event || {};
    const eventDate = ev.ends_at || ev.starts_at;
    const ended = eventDate && new Date(eventDate) < new Date() && ticket.status === 'valid';
    const eventCancelled = ev.status === 'cancelled';
    const status = (eventCancelled ? 'Event Cancelled' : (ended ? 'Event Ended' : (ticket.status || 'valid').replace(/_/g, ' '))).toUpperCase();
    const date = u().formatEventDate(ev.starts_at, ev.timezone);
    const attendee = ticket.attendee || {};
    const orderNumber = ticket.order?.order_number || '-';
    const ticketType = ticket.ticket_type?.name || 'Ticket';

    return `
      <div class="col-lg-6" data-ticket-id="${ticket.id}">
        <div class="qr-ticket">
          <div class="info">
            <span class="badge-soft" style="position:static;background:rgba(91,140,255,.15);border-color:rgba(91,140,255,.3);color:#93b4ff">${u().escapeHtml(status)}</span>
            <h5 class="mt-2">${u().escapeHtml(ev.title || 'Event')}</h5>
            <div class="ticket-meta">
              <small class="text-muted-pro d-block"><i class="bi bi-geo-alt me-1"></i>${u().escapeHtml(ev.venue_name || '')}${ev.city ? `, ${u().escapeHtml(ev.city)}` : ''}</small>
              <small class="text-muted-pro d-block"><i class="bi bi-calendar3 me-1"></i>${u().escapeHtml(date)}</small>
              <small class="text-muted-pro d-block"><i class="bi bi-ticket-perforated me-1"></i>${u().escapeHtml(ticketType)}</small>
              <small class="text-muted-pro d-block"><i class="bi bi-person me-1"></i>${u().escapeHtml(attendee.name || 'Guest')}${attendee.email ? ` · ${u().escapeHtml(attendee.email)}` : ''}</small>
            </div>
            <div class="ticket-codes small">
              <div>Order <b class="order-code" style="color:var(--text)">${u().escapeHtml(orderNumber)}</b></div>
              <div>Ticket <b class="ticket-code" style="color:var(--text)">${u().escapeHtml(ticket.ticket_code)}</b></div>
            </div>
            <div class="ticket-actions mt-3 d-flex gap-2 flex-wrap">
              <button class="btn btn-glass btn-sm" type="button" data-ticket-details="${ticket.id}"><i class="bi bi-eye me-1"></i> View Ticket</button>
              <button class="btn btn-glass btn-sm" type="button" data-ticket-qr-open="${ticket.id}"><i class="bi bi-qr-code me-1"></i> View QR</button>
              <button class="btn btn-primary-grad btn-sm" data-ticket-download="${ticket.id}" data-ticket-code="${u().escapeHtml(ticket.ticket_code)}"><i class="bi bi-download me-1"></i> Download PDF</button>
            </div>
          </div>
          <div class="qr"><img alt="QR" data-ticket-qr="${ticket.id}" src="" style="min-width:180px;min-height:180px;background:#fff;border-radius:8px"/></div>
        </div>
      </div>`;
  }

  async function hydrateQrImages(root) {
    const imgs = (root || document).querySelectorAll('[data-ticket-qr]');
    for (const img of imgs) {
      const id = img.getAttribute('data-ticket-qr');
      try {
        const blob = await loadQrBlob(id);
        img.src = URL.createObjectURL(blob);
      } catch {
        img.alt = 'QR unavailable';
      }
    }
  }

  window.EventSphereTickets = {
    listActiveTickets,
    listTickets,
    listTicketHistory,
    getTicket,
    loadQrBlob,
    downloadTicket,
    renderTicketCard,
    hydrateQrImages,
  };
})();
