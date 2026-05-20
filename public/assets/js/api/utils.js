(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(amount, currency) {
    const n = Number(amount);
    const cur = (currency || 'USD').toUpperCase();
    if (Number.isNaN(n)) return `$0`;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  }

  function formatEventDate(startsAt, timezone) {
    if (!startsAt) return '';
    const d = new Date(startsAt);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || undefined,
    });
  }

  function eventImage(event) {
    if (event.banner_image_url) return event.banner_image_url;
    const img = event.images?.[0];
    return img?.url || img?.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80';
  }

  function paginateLinks(meta, onPage) {
    if (!meta || meta.last_page <= 1) return '';
    const cur = meta.current_page;
    const last = meta.last_page;
    let html = '<nav class="d-flex justify-content-center mt-5"><ul class="pagination">';
    html += `<li class="page-item ${cur <= 1 ? 'disabled' : ''}"><a class="page-link bg-card border-pro text-muted-pro" href="#" data-page="${cur - 1}"><i class="bi bi-chevron-left"></i></a></li>`;
    for (let p = Math.max(1, cur - 2); p <= Math.min(last, cur + 2); p++) {
      html += `<li class="page-item ${p === cur ? 'active' : ''}"><a class="page-link ${p === cur ? '' : 'bg-card border-pro'}" style="${p === cur ? 'background:var(--grad-primary);border:none' : 'color:var(--text)'}" href="#" data-page="${p}">${p}</a></li>`;
    }
    html += `<li class="page-item ${cur >= last ? 'disabled' : ''}"><a class="page-link bg-card border-pro" style="color:var(--text)" href="#" data-page="${cur + 1}"><i class="bi bi-chevron-right"></i></a></li>`;
    html += '</ul></nav>';
    return html;
  }

  window.EventSphereUtils = {
    escapeHtml,
    formatMoney,
    formatEventDate,
    eventImage,
    paginateLinks,
  };
})();
