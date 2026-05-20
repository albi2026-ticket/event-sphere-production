(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth().requireAuth(['organizer', 'admin'], { requireApprovedOrganizer: true });
    if (!user) return;

    try {
      const { data: summary } = await api().fetch('/organizer/dashboard/summary');
      const cards = summary.cards || {};

      const kpiRow = document.querySelector('[data-organizer-kpis]');
      if (kpiRow) {
        kpiRow.innerHTML = `
          <div class="col-md-3"><div class="kpi"><div class="label">Revenue</div><div class="value">${u().formatMoney(cards.total_revenue, 'USD')}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Tickets sold</div><div class="value">${cards.tickets_sold ?? 0}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Events</div><div class="value">${cards.events_count ?? 0}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Attendees</div><div class="value">${cards.attendees_count ?? 0}</div></div></div>`;
      }

      const { data: trends } = await api().fetch('/organizer/analytics/sales-trends');
      const revChart = document.getElementById('chartRev');
      if (revChart && window.Chart && Array.isArray(trends)) {
        const labels = trends.map((t) => String(t.period).slice(0, 10));
        const values = trends.map((t) => Number(t.revenue));
        if (window._chartRev) window._chartRev.destroy();
        window._chartRev = new Chart(revChart, {
          type: 'line',
          data: { labels, datasets: [{ label: 'Revenue', data: values, borderColor: '#5B8CFF', tension: 0.35, fill: true, backgroundColor: 'rgba(91,140,255,.12)' }] },
          options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94A3B8' } }, x: { ticks: { color: '#94A3B8' } } } },
        });
      }

      const { data: analytics } = await api().fetch('/organizer/analytics');
      const catChart = document.getElementById('chartCat');
      if (catChart && window.Chart && analytics?.revenue_by_event) {
        const byEvent = Array.isArray(analytics.revenue_by_event) ? analytics.revenue_by_event : [];
        if (window._chartCat) window._chartCat.destroy();
        window._chartCat = new Chart(catChart, {
          type: 'doughnut',
          data: {
            labels: byEvent.map((e) => e.title),
            datasets: [{ data: byEvent.map((e) => Number(e.revenue)), backgroundColor: ['#5B8CFF', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899'] }],
          },
          options: { plugins: { legend: { labels: { color: '#94A3B8' } } } },
        });
      }

      const attBody = document.querySelector('[data-organizer-attendees] tbody');
      if (attBody) {
        const res = await api().fetch('/organizer/orders/recent?per_page=5');
        const orders = Array.isArray(res.data) ? res.data : [];
        attBody.innerHTML = orders.map((o) =>
          `<tr><td>${u().escapeHtml(o.user?.name || o.billing_first_name || 'Guest')}</td><td>${u().escapeHtml(o.items?.[0]?.event_title || '—')}</td><td>${o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}</td><td>${u().formatMoney(o.total, o.currency)}</td><td><span class="badge" style="background:rgba(34,197,94,.15);color:#86efac">${u().escapeHtml(o.payment_status)}</span></td><td></td></tr>`,
        ).join('') || '<tr><td colspan="6" class="text-muted-pro">No recent orders</td></tr>';
      }

      const form = document.querySelector('[data-organizer-event-form]');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          try {
            await api().fetch('/organizer/events', {
              method: 'POST',
              body: {
                title: fd.get('title'),
                category: fd.get('category'),
                description: fd.get('description'),
                venue_name: fd.get('venue_name'),
                city: fd.get('city'),
                starts_at: fd.get('starts_at'),
                status: 'draft',
                visibility: 'public',
              },
            });
            window.tkToast?.('Event created');
            form.reset();
          } catch (err) {
            window.tkToast?.(err.message, 'error');
          }
        });
      }
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load organizer dashboard', 'error');
    }
  });
})();
