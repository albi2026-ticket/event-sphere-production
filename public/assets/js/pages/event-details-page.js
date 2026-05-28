(function () {
  'use strict';

  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;
  const cart = () => window.EventSphereCart;

  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    if (!slug) {
      window.tkToast?.('Event not specified', 'error');
      return;
    }

    const $ = (sel) => document.querySelector(sel);

    try {
      const event = await eventsApi().getEvent(slug);
      document.title = `${event.title} · TicketHub`;

      const img = u().eventImage(event);
      $('[data-event-banner]')?.setAttribute('src', img);
      const titleEl = $('[data-event-title]');
      if (titleEl) titleEl.textContent = event.title;
      const crumb = $('[data-event-breadcrumb]');
      if (crumb) crumb.textContent = event.title;
      const dateEl = $('[data-event-meta-date]');
      if (dateEl) dateEl.innerHTML = `<i class="bi bi-calendar3 me-1"></i> ${u().escapeHtml(u().formatEventDate(event.starts_at, event.timezone))}`;
      const venueEl = $('[data-event-meta-venue]');
      if (venueEl) venueEl.innerHTML = `<i class="bi bi-geo-alt me-1"></i> ${u().escapeHtml(event.venue_name || '')}${event.city ? `, ${u().escapeHtml(event.city)}` : ''}`;
      const desc = $('[data-event-description]');
      if (desc) desc.textContent = event.description || '';
      const priceEl = $('[data-event-price]');
      if (priceEl) priceEl.textContent = u().formatMoney(event.base_price, event.currency);

      const countdown = $('[data-countdown]');
      if (countdown && event.starts_at) countdown.setAttribute('data-countdown', event.starts_at);

      const select = $('[data-ticket-type-select]');
      const types = event.ticket_types || [];
      if (select) {
        select.innerHTML = types.map((t) =>
          `<option value="${t.id}" data-price="${t.price}" data-min="${t.min_per_order || 1}" data-max="${t.max_per_order || 10}" ${Number(t.quantity_available ?? t.available_quantity ?? 1) <= 0 || t.status === 'sold_out' ? 'disabled' : ''}>${u().escapeHtml(t.name)} · ${u().formatMoney(t.price, t.currency)}${t.status === 'sold_out' ? ' · Sold out' : ''}</option>`,
        ).join('');
      }

      const qtyWrap = $('[data-qty]');
      let selectedType = types.find((t) => Number(t.quantity_available ?? t.available_quantity ?? 1) > 0 && t.status !== 'sold_out') || null;
      if (select && selectedType) select.value = String(selectedType.id);

      select?.addEventListener('change', () => {
        selectedType = types.find((t) => String(t.id) === select.value);
        if (qtyWrap && selectedType) {
          qtyWrap.dataset.price = selectedType.price;
          const input = qtyWrap.querySelector('input');
          if (input) {
            input.min = selectedType.min_per_order || 1;
            input.max = selectedType.max_per_order || 10;
            input.value = Math.max(Number(input.min), Math.min(Number(input.value || input.min), Number(input.max)));
          }
          const out = qtyWrap.querySelector('[data-qty-total]');
          if (out) out.textContent = u().formatMoney(Number(input?.value || 1) * Number(selectedType.price || 0), selectedType.currency || event.currency);
        }
      });

      if (qtyWrap && selectedType) qtyWrap.dataset.price = selectedType.price;
      if (!types.length || !selectedType) {
        document.querySelectorAll('[data-event-buy]').forEach((btn) => {
          btn.classList.add('disabled');
          btn.setAttribute('aria-disabled', 'true');
        });
      }

      document.querySelectorAll('[data-event-buy]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!selectedType) {
            window.tkToast?.('No tickets are currently available for this event.', 'error');
            return;
          }
          if (!window.EventSphereAuth.isLoggedIn()) {
            location.href = `login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
            return;
          }
          const qty = Number($('[data-qty] input')?.value || 1);
          const typeId = Number(select?.value || selectedType?.id);
          try {
            cart().setFromEvent(event, typeId, qty, {
              refund_protection: !!$('[data-refund-protection]')?.checked,
            });
            location.href = 'checkout.html';
          } catch (err) {
            window.tkToast?.(err.message, 'error');
          }
        });
      });

      const favBtn = $('[data-event-fav]');
      favBtn?.setAttribute('data-event-id', event.id);
      favBtn?.setAttribute('data-fav', `event-${event.id}`);
      window.EventSphereFavorites?.syncFavoriteButtons();

      $('[data-organizer-follow]')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.tkToast?.('Organizer follow notifications will use your saved notification preferences.', 'info');
      });
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load event', 'error');
    }
  });
})();
