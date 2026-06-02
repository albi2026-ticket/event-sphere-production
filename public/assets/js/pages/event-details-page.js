(function () {
  'use strict';

  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;
  const cart = () => window.EventSphereCart;

  function eventApiImage(event) {
    if (event.banner_image_url) return event.banner_image_url;
    const image = event.images?.[0];
    return image?.optimized_url || image?.url || image?.image_url || '';
  }

  function money(amount, currency) {
    return u().formatMoney(amount, currency || 'USD');
  }

  function eventLimit(event) {
    const limit = Number(event.max_tickets_per_user || 0);
    return Number.isInteger(limit) && limit > 0 ? limit : null;
  }

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

      const img = eventApiImage(event);
      const banner = $('[data-event-banner]');
      const bannerPlaceholder = $('[data-event-banner-placeholder]');
      if (banner && img) {
        banner.setAttribute('src', img);
        banner.hidden = false;
      }
      if (bannerPlaceholder && img) bannerPlaceholder.hidden = true;
      if (bannerPlaceholder && !img) bannerPlaceholder.classList.add('event-banner-empty');

      const titleEl = $('[data-event-title]');
      if (titleEl) titleEl.textContent = event.title;
      const crumb = $('[data-event-breadcrumb]');
      if (crumb) crumb.textContent = event.title;
      const category = $('[data-event-category]');
      if (category) category.textContent = (event.category || 'Event').toUpperCase();
      const dateEl = $('[data-event-meta-date]');
      if (dateEl) dateEl.innerHTML = `<i class="bi bi-calendar3 me-1"></i> ${u().escapeHtml(u().formatEventDate(event.starts_at, event.timezone))}`;
      const venueEl = $('[data-event-meta-venue]');
      if (venueEl) venueEl.innerHTML = `<i class="bi bi-geo-alt me-1"></i> ${u().escapeHtml(event.venue_name || '')}${event.city ? `, ${u().escapeHtml(event.city)}` : ''}`;
      const desc = $('[data-event-description]');
      if (desc) {
        desc.classList.toggle('text-muted-pro', !event.description);
        desc.textContent = event.description || 'No event description has been added yet.';
      }
      const organizerName = $('[data-event-organizer-name]');
      if (organizerName) organizerName.textContent = event.organizer?.name || 'Event organizer';
      const organizerMeta = $('[data-event-organizer-meta]');
      if (organizerMeta) organizerMeta.textContent = event.is_verified ? 'Verified organizer' : 'Organizer';

      const priceEl = $('[data-event-price]');
      const lowestPrice = eventsApi().lowestAvailablePrice(event);
      if (priceEl) {
        priceEl.textContent = money(lowestPrice.amount, lowestPrice.currency);
      }
      const purchaseLimit = eventLimit(event);
      const salesClosed = u().isEventSalesClosed(event);
      const purchaseLimitEl = $('[data-event-purchase-limit]');
      if (purchaseLimitEl) {
        purchaseLimitEl.hidden = !purchaseLimit;
        purchaseLimitEl.textContent = purchaseLimit ? `Limit ${purchaseLimit} ticket${purchaseLimit === 1 ? '' : 's'} per user for this event.` : '';
      }

      const countdown = $('[data-countdown]');
      if (countdown && event.starts_at) {
        countdown.setAttribute('data-countdown', event.starts_at);
        if (event.ends_at) countdown.setAttribute('data-countdown-end', event.ends_at);
        window.EventSphereStartCountdown?.(countdown);
      }

      const select = $('[data-ticket-type-select]');
      const mobileSelect = $('[data-ticket-type-mobile]');
      const mobileSelectButton = $('[data-ticket-type-mobile-button]');
      const mobileSelectMenu = $('[data-ticket-type-mobile-menu]');
      const types = salesClosed ? [] : (event.ticket_types || []);
      if (select) {
        select.innerHTML = salesClosed
          ? '<option disabled>Sales closed</option>'
          : types.map((t) =>
            `<option value="${t.id}" data-price="${t.price}" data-currency="${t.currency || event.currency || 'USD'}" data-min="${t.min_per_order || 1}" data-available="${Number(t.quantity_available ?? t.available_quantity ?? 0)}" ${Number(t.quantity_available ?? t.available_quantity ?? 0) <= 0 || t.status === 'sold_out' || t.status === 'inactive' ? 'disabled' : ''}>${u().escapeHtml(t.name)} · ${money(t.price, t.currency || event.currency)} · ${Number(t.quantity_available ?? t.available_quantity ?? 0)} left${t.status === 'sold_out' ? ' · Sold out' : ''}</option>`,
          ).join('') || '<option disabled>No ticket tiers available</option>';
        select.disabled = !types.length;
      }
      const syncMobileOptions = () => {
        if (!mobileSelect || !mobileSelectButton || !mobileSelectMenu) return;
        mobileSelect.hidden = false;
        mobileSelectButton.disabled = !types.length;
        mobileSelectButton.textContent = salesClosed ? 'Sales closed' : 'Select ticket type';
        mobileSelectMenu.innerHTML = salesClosed
          ? '<span class="dropdown-item-text text-muted-pro">Sales closed</span>'
          : types.map((t) => {
            const available = Number(t.quantity_available ?? t.available_quantity ?? 0);
            const disabled = available <= 0 || t.status === 'sold_out' || t.status === 'inactive';
            return `<button class="dropdown-item mobile-ticket-option" type="button" data-mobile-ticket-type="${t.id}" ${disabled ? 'disabled' : ''}>
              <span>${u().escapeHtml(t.name)}</span>
              <small>${money(t.price, t.currency || event.currency)} · ${available} left${t.status === 'sold_out' ? ' · Sold out' : ''}</small>
            </button>`;
          }).join('') || '<span class="dropdown-item-text text-muted-pro">No ticket tiers available</span>';
      };
      syncMobileOptions();

      const qtyWrap = $('[data-qty]');
      let selectedType = salesClosed ? null : (eventsApi().availableTicketTypes(event)[0] || null);
      if (select && selectedType) select.value = String(selectedType.id);

      const syncSelectedType = () => {
        if (qtyWrap && selectedType) {
          qtyWrap.dataset.price = selectedType.price;
          qtyWrap.dataset.currency = selectedType.currency || event.currency || 'USD';
          const input = qtyWrap.querySelector('input');
          if (input) {
            input.min = selectedType.min_per_order || 1;
            const available = Number(selectedType.quantity_available ?? selectedType.available_quantity ?? selectedType.remaining ?? 0);
            input.max = purchaseLimit ? Math.min(available, purchaseLimit) : available;
            input.value = Math.max(Number(input.min || 1), Math.min(Number(input.value || 1), Number(input.max || available || 1)));
          }
          const out = qtyWrap.querySelector('[data-qty-total]');
          if (out) {
            const subtotal = Number(input?.value || 1) * Number(selectedType.price || 0);
            out.textContent = money(subtotal, selectedType.currency || event.currency);
          }
        }
        if (mobileSelectButton && selectedType) {
          const available = Number(selectedType.quantity_available ?? selectedType.available_quantity ?? 0);
          mobileSelectButton.textContent = `${selectedType.name} · ${money(selectedType.price, selectedType.currency || event.currency)} · ${available} left`;
        }
      };

      select?.addEventListener('change', () => {
        selectedType = types.find((t) => String(t.id) === select.value);
        const input = qtyWrap?.querySelector('input');
        if (input) input.value = selectedType?.min_per_order || 1;
        syncSelectedType();
      });
      mobileSelectMenu?.addEventListener('click', (event) => {
        const option = event.target.closest('[data-mobile-ticket-type]');
        if (!option || option.disabled) return;
        selectedType = types.find((t) => String(t.id) === option.dataset.mobileTicketType);
        if (select && selectedType) select.value = String(selectedType.id);
        const input = qtyWrap?.querySelector('input');
        if (input) input.value = selectedType?.min_per_order || 1;
        syncSelectedType();
      });

      const qtyInput = qtyWrap?.querySelector('input');
      if (qtyInput) qtyInput.value = selectedType?.min_per_order || 1;
      syncSelectedType();
      if (salesClosed || !types.length || !selectedType) {
        document.querySelectorAll('[data-event-buy]').forEach((btn) => {
          btn.classList.add('disabled');
          btn.setAttribute('aria-disabled', 'true');
          btn.textContent = salesClosed ? 'Sales Closed' : 'Buy tickets';
        });
        const availability = $('[data-event-availability]');
        if (availability) {
          availability.textContent = salesClosed ? 'Sales Closed' : 'Unavailable';
          availability.className = `badge status-badge ${salesClosed ? 'status-cancelled' : 'status-active'}`;
        }
      } else {
        document.querySelectorAll('[data-event-buy]').forEach((btn) => {
          btn.classList.remove('disabled');
          btn.removeAttribute('aria-disabled');
          btn.textContent = 'Buy tickets';
        });
        const availability = $('[data-event-availability]');
        if (availability) availability.textContent = 'Available';
      }

      document.querySelectorAll('[data-event-buy]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (salesClosed) {
            window.tkToast?.('Ticket sales are closed for this event.', 'error');
            return;
          }
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
            cart().setFromEvent(event, typeId, qty);
            location.href = 'checkout.html';
          } catch (err) {
            window.tkToast?.(err.message, 'error');
          }
        });
      });

      const favBtn = $('[data-event-fav]');
      favBtn?.setAttribute('data-event-id', event.id);
      favBtn?.setAttribute('data-fav', `event-${event.id}`);
      if (favBtn) favBtn.disabled = false;
      window.EventSphereFavorites?.syncFavoriteButtons();

      $('[data-organizer-follow]')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.tkToast?.('Organizer follow notifications will use your saved notification preferences.', 'info');
      });
    } catch (err) {
      const alert = $('[data-event-alert]');
      if (alert) alert.innerHTML = `<div class="alert border-pro dashboard-note text-danger"><i class="bi bi-exclamation-triangle me-2"></i>${u().escapeHtml(err.message || 'Failed to load event')}</div>`;
      window.tkToast?.(err.message || 'Failed to load event', 'error');
    }
  });
})();
