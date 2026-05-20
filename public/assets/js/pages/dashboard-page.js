(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const ticketsApi = () => window.EventSphereTickets;
  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;

  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth().requireAuth(['user', 'organizer', 'admin']);
    if (!user) return;

    document.querySelector('[data-dashboard-greeting]')?.replaceChildren(
      document.createTextNode(`Hi, ${user.name || user.email} 👋`),
    );

    try {
      const { data: summary } = await api().fetch('/me/dashboard/summary');

      const kpiRow = document.querySelector('[data-dashboard-kpis]');
      if (kpiRow && summary?.stats) {
        const c = summary.stats;
        kpiRow.innerHTML = `
          <div class="col-md-3"><div class="kpi"><div class="label">Upcoming events</div><div class="value">${c.upcoming_events_count ?? 0}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Tickets owned</div><div class="value">${c.active_tickets_count ?? 0}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Saved events</div><div class="value">${c.favorites_count ?? 0}</div></div></div>
          <div class="col-md-3"><div class="kpi"><div class="label">Orders</div><div class="value">${c.orders_count ?? 0}</div></div></div>`;
      }

      const ticketsEl = document.querySelector('[data-dashboard-tickets]');
      if (ticketsEl) {
        const tickets = await ticketsApi().listActiveTickets();
        if (!tickets.length) {
          ticketsEl.innerHTML = '<div class="col-12 text-muted-pro">No active tickets yet.</div>';
        } else {
          ticketsEl.innerHTML = tickets.map((t) => ticketsApi().renderTicketCard(t)).join('');
          ticketsEl.querySelectorAll('[data-ticket-download]').forEach((btn) => {
            btn.addEventListener('click', () => {
              ticketsApi().downloadTicket(btn.dataset.ticketDownload, btn.dataset.ticketCode);
            });
          });
          await ticketsApi().hydrateQrImages(ticketsEl);
        }
      }

      const favEl = document.querySelector('[data-dashboard-favorites]');
      if (favEl) {
        const favs = await window.EventSphereFavorites.listFavorites();
        const events = favs.map((f) => (f.event?.data || f.event || f)).filter((e) => e && e.title);
        favEl.innerHTML = events.length
          ? events.map((e, i) => eventsApi().renderEventCard(e, i)).join('')
          : '<div class="col-12 text-muted-pro">No favorites yet.</div>';
        window.EventSphereFavorites.syncFavoriteButtons();
      }

      const activityEl = document.querySelector('[data-dashboard-activity]');
      if (activityEl && summary?.recent?.orders) {
        activityEl.innerHTML = summary.recent.orders.map((o) =>
          `<li class="d-flex gap-3 py-2 border-top border-pro"><i class="bi bi-cart-check text-success"></i><div><div>Order <b>${u().escapeHtml(o.order_number)}</b> · ${u().formatMoney(o.total, o.currency)}</div><small class="text-muted-pro">${u().escapeHtml(o.payment_status)}</small></div></li>`,
        ).join('') || '<li class="text-muted-pro">No recent activity</li>';
      }

      const profileForm = document.querySelector('[data-profile-form]');
      if (profileForm) {
        const { data: profile } = await api().fetch('/me/profile');
        const nameInput = profileForm.querySelector('[name="name"]');
        if (nameInput) nameInput.value = profile.name || '';
        const emailInput = profileForm.querySelector('[name="email"]');
        if (emailInput) emailInput.value = profile.email || '';
        const phoneInput = profileForm.querySelector('[name="phone"]');
        if (phoneInput) phoneInput.value = profile.phone || '';
        const cityInput = profileForm.querySelector('[name="default_city"]');
        if (cityInput) cityInput.value = profile.default_city || '';
        profileForm.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fd = new FormData(profileForm);
          try {
            await api().fetch('/me/profile', {
              method: 'PATCH',
              body: {
                name: fd.get('name'),
                phone: fd.get('phone'),
                default_city: fd.get('default_city'),
              },
            });
            window.tkToast?.('Profile saved');
            await auth().refreshUser();
          } catch (err) {
            window.tkToast?.(err.message, 'error');
          }
        });
      }
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load dashboard', 'error');
    }
  });
})();
