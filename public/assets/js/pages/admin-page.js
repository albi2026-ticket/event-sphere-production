(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  document.addEventListener('DOMContentLoaded', async () => {
    if (!auth().requireAuth(['admin'])) return;

    try {
      const paymentsRes = await api().fetch('/admin/payments?per_page=50');
      const orders = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.data || [];

      let totalGmv = 0;
      let paidCount = 0;
      orders.forEach((o) => {
        if (o.payment_status === 'paid') {
          totalGmv += Number(o.total);
          paidCount++;
        }
      });

      const kpiRow = document.querySelector('[data-admin-kpis]');
      if (kpiRow) {
        kpiRow.innerHTML = `
          <div class="col-md-3"><div class="kpi"><div class="label">Paid GMV</div><div class="value">${u().formatMoney(totalGmv, 'USD')}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Paid orders</div><div class="value">${paidCount}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Total orders</div><div class="value">${orders.length}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Pending</div><div class="value">${orders.filter((o) => o.payment_status === 'pending').length}</div></div></div>`;
      }

      const refundsBody = document.querySelector('[data-admin-refunds] tbody');
      if (refundsBody) {
        const refundable = orders.filter((o) => o.payment_status === 'paid').slice(0, 5);
        refundsBody.innerHTML = refundable.map((o) =>
          `<tr><td>${u().escapeHtml(o.order_number)}</td><td>${u().escapeHtml(o.user?.name || o.user?.email || '')}</td><td>${u().formatMoney(o.total, o.currency)}</td><td><button class="btn btn-glass btn-sm" data-refund-order="${o.id}">Refund</button></td></tr>`,
        ).join('') || '<tr><td colspan="4" class="text-muted-pro">No paid orders</td></tr>';

        refundsBody.querySelectorAll('[data-refund-order]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            if (!confirm('Issue full refund for this order?')) return;
            try {
              await api().fetch(`/admin/payments/${btn.dataset.refundOrder}/refund`, { method: 'POST', body: {} });
              window.tkToast?.('Refund processed');
              location.reload();
            } catch (err) {
              window.tkToast?.(err.message, 'error');
            }
          });
        });
      }

      const eventsRes = await api().fetch('/admin/events?per_page=10');
      const events = Array.isArray(eventsRes.data) ? eventsRes.data : [];

      const salesChart = document.getElementById('sales');
      if (salesChart && window.Chart) {
        const byMonth = {};
        orders.filter((o) => o.payment_status === 'paid').forEach((o) => {
          const m = (o.created_at || '').slice(0, 7);
          if (m) byMonth[m] = (byMonth[m] || 0) + Number(o.total);
        });
        const labels = Object.keys(byMonth).sort();
        if (window._salesChart) window._salesChart.destroy();
        window._salesChart = new Chart(salesChart, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Sales', data: labels.map((l) => byMonth[l]), backgroundColor: '#5B8CFF' }] },
          options: { plugins: { legend: { display: false } } },
        });
      }

      const usersBody = document.querySelector('[data-admin-users] tbody');
      if (usersBody) {
        const uniqueUsers = new Map();
        orders.forEach((o) => {
          if (o.user) uniqueUsers.set(o.user.id, o.user);
        });
        const users = [...uniqueUsers.values()].slice(0, 10);
        usersBody.innerHTML = users.map((usr) =>
          `<tr><td>${u().escapeHtml(usr.name)}</td><td>${u().escapeHtml(usr.email)}</td><td>—</td><td>—</td><td><span class="badge" style="background:rgba(34,197,94,.15);color:#86efac">Active</span></td><td></td></tr>`,
        ).join('') || '<tr><td colspan="6" class="text-muted-pro">No users from orders yet</td></tr>';
      }

      const fraudBody = document.querySelector('[data-admin-fraud] tbody');
      if (fraudBody) {
        const flagged = orders.filter((o) => o.fraud_status).slice(0, 5);
        fraudBody.innerHTML = flagged.map((o) =>
          `<tr><td>${u().escapeHtml(o.order_number)}</td><td>${u().escapeHtml(o.fraud_status)}</td><td>${o.fraud_score ?? '—'}</td></tr>`,
        ).join('') || '<tr><td colspan="3" class="text-muted-pro">No flagged orders</td></tr>';
      }
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load admin dashboard', 'error');
    }
  });
})();
