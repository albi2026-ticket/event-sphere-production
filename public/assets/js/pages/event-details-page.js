(function () {
  'use strict';

  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;
  const cart = () => window.EventSphereCart;
  const tr = (key, fallback, replacements) => window.t?.(key, replacements) || fallback;

  function eventApiImage(event) {
    if (event.banner_image_url) return event.banner_image_url;
    const image = event.images?.[0];
    return image?.optimized_url || image?.url || image?.image_url || '';
  }

  function money(amount, currency) {
    return u().formatMoney(amount, currency || 'USD');
  }

  function onIdle(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 1200 });
      return;
    }

    window.setTimeout(callback, 0);
  }

  function setBannerImage(banner, placeholder, src, title) {
    if (!banner) return;
    if (!src) {
      if (placeholder) placeholder.classList.add('event-banner-empty');
      return;
    }

    window.requestAnimationFrame(() => {
      banner.alt = title || '';
      banner.src = src;
      banner.hidden = false;
      if (placeholder) placeholder.hidden = true;
    });
  }

  function setupCountdown(countdown, event) {
    if (!countdown || !event.starts_at) return;
    if (countdown.dataset.countdown === event.starts_at && countdown._countdownTimer) return;

    countdown.setAttribute('data-countdown', event.starts_at);
    if (event.ends_at) countdown.setAttribute('data-countdown-end', event.ends_at);
    window.EventSphereStartCountdown?.(countdown);

    window.addEventListener('pagehide', () => {
      if (countdown._countdownTimer) window.clearInterval(countdown._countdownTimer);
    }, { once: true });
  }

  function eventLimit(event) {
    const limit = Number(event.max_tickets_per_user || 0);
    return Number.isInteger(limit) && limit > 0 ? limit : null;
  }

  function renderDescription(root, description) {
    const text = String(description || '').trim();
    root.replaceChildren();

    if (!text) {
      root.classList.add('text-muted-pro');
      const empty = document.createElement('p');
      empty.textContent = 'No event description has been added yet.';
      root.appendChild(empty);
      return;
    }

    root.classList.remove('text-muted-pro');
    text.split(/\n{2,}/).forEach((paragraph) => {
      const item = document.createElement('p');
      item.textContent = paragraph.trim();
      root.appendChild(item);
    });
  }

  function loadRelatedEventsWhenVisible(slug) {
    const root = document.querySelector('[data-related-events]');
    if (!root || !eventsApi().getRelatedEvents) return;

    const load = () => {
      if (root.dataset.relatedLoaded === 'true') return;
      root.dataset.relatedLoaded = 'true';
      eventsApi().getRelatedEvents(slug).catch(() => []);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      }, { rootMargin: '240px' });
      observer.observe(root);
      return;
    }

    onIdle(load);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.EventSphereRoutes?.redirectLegacyEvent?.();
    const slug = window.EventSphereRoutes?.eventSlug?.() || '';
    if (!slug) {
      window.tkToast?.(tr('events.event_not_specified', 'Event not specified'), 'error');
      return;
    }

    const $ = (sel) => document.querySelector(sel);
    const els = {
      alert: $('[data-event-alert]'),
      availability: $('[data-event-availability]'),
      banner: $('[data-event-banner]'),
      bannerPlaceholder: $('[data-event-banner-placeholder]'),
      breadcrumb: $('[data-event-breadcrumb]'),
      category: $('[data-event-category]'),
      countdown: $('[data-countdown]'),
      description: $('[data-event-description]'),
      date: $('[data-event-meta-date]'),
      favorite: $('[data-event-fav]'),
      mobileSelect: $('[data-ticket-type-mobile]'),
      mobileSelectButton: $('[data-ticket-type-mobile-button]'),
      mobileSelectMenu: $('[data-ticket-type-mobile-menu]'),
      organizerFollow: $('[data-organizer-follow]'),
      organizerMeta: $('[data-event-organizer-meta]'),
      organizerName: $('[data-event-organizer-name]'),
      price: $('[data-event-price]'),
      purchaseLimit: $('[data-event-purchase-limit]'),
      qtyWrap: $('[data-qty]'),
      select: $('[data-ticket-type-select]'),
      title: $('[data-event-title]'),
      venue: $('[data-event-meta-venue]'),
    };

    try {
      const event = await eventsApi().getEvent(slug);
      document.title = `${event.title} · TicketHub`;
      window.EventSphereRoutes?.setEventCanonical?.(event.slug || slug);

      const img = eventApiImage(event);
      const salesStatus = eventsApi().salesStatus(event);
      if (els.title) els.title.textContent = event.title;
      if (els.breadcrumb) els.breadcrumb.textContent = event.title;
      if (els.category) {
        els.category.dataset.i18n = salesStatus.labelKey || '';
        els.category.textContent = salesStatus.key === 'available' ? (event.category || tr('events.event', 'Event')).toUpperCase() : salesStatus.label.toUpperCase();
      }
      if (els.date) els.date.innerHTML = `<i class="bi bi-calendar3 me-1"></i> ${u().escapeHtml(u().formatEventDate(event.starts_at, event.timezone))}`;
      if (els.venue) els.venue.innerHTML = `<i class="bi bi-geo-alt me-1"></i> ${u().escapeHtml(event.venue_name || '')}${event.city ? `, ${u().escapeHtml(event.city)}` : ''}`;
      if (els.description) renderDescription(els.description, event.description);
      if (els.organizerName) els.organizerName.textContent = event.organizer?.name || tr('events.organizer', 'Event organizer');
      if (els.organizerMeta) {
        els.organizerMeta.dataset.i18n = event.is_verified ? 'events.verified_organizer' : 'events.organizer';
        els.organizerMeta.textContent = event.is_verified ? tr('events.verified_organizer', 'Verified organizer') : tr('events.organizer', 'Organizer');
      }

      setBannerImage(els.banner, els.bannerPlaceholder, img, event.title);

      const lowestPrice = eventsApi().lowestAvailablePrice(event);
      if (els.price) {
        els.price.textContent = salesStatus.canBuy ? money(lowestPrice.amount, lowestPrice.currency) : salesStatus.priceLabel;
      }
      const purchaseLimit = eventLimit(event);
      const salesClosed = salesStatus.key === 'ended';
      const purchasingDisabled = !salesStatus.canBuy;
      if (els.purchaseLimit) {
        els.purchaseLimit.hidden = !purchaseLimit;
        els.purchaseLimit.textContent = purchaseLimit ? `Limit ${purchaseLimit} ticket${purchaseLimit === 1 ? '' : 's'} per user for this event.` : '';
      }

      setupCountdown(els.countdown, event);
      loadRelatedEventsWhenVisible(slug);

      let types = purchasingDisabled ? [] : (event.ticket_types || []);
      let selectedType = null;
      const renderTicketControls = () => {
        if (els.select) {
          els.select.innerHTML = purchasingDisabled
          ? `<option disabled${salesStatus.priceKey ? ` data-i18n="${salesStatus.priceKey}"` : ''}>${salesStatus.priceLabel}</option>`
          : types.map((t) =>
            `<option value="${t.id}" data-price="${t.price}" data-currency="${t.currency || event.currency || 'USD'}" data-min="${t.min_per_order || 1}" data-available="${Number(t.quantity_available ?? t.available_quantity ?? 0)}" ${Number(t.quantity_available ?? t.available_quantity ?? 0) <= 0 || t.status === 'sold_out' || t.status === 'inactive' ? 'disabled' : ''}>${u().escapeHtml(t.name)} · ${money(t.price, t.currency || event.currency)} · ${Number(t.quantity_available ?? t.available_quantity ?? 0)} ${tr('events.left', 'left')}${t.status === 'sold_out' ? ` · ${tr('events.sold_out', 'Sold out')}` : ''}</option>`,
          ).join('') || `<option disabled data-i18n="events.no_ticket_tiers_available">${tr('events.no_ticket_tiers_available', 'No ticket tiers available')}</option>`;
          els.select.disabled = !types.length;
          if (selectedType) els.select.value = String(selectedType.id);
        }
        if (!els.mobileSelect || !els.mobileSelectButton || !els.mobileSelectMenu) return;
        els.mobileSelect.hidden = false;
        els.mobileSelectButton.disabled = !types.length;
        els.mobileSelectButton.dataset.i18n = purchasingDisabled ? (salesStatus.priceKey || '') : 'events.select_ticket_type';
        els.mobileSelectButton.textContent = purchasingDisabled ? salesStatus.priceLabel : tr('events.select_ticket_type', 'Select ticket type');
        els.mobileSelectMenu.innerHTML = purchasingDisabled
          ? `<span class="dropdown-item-text text-muted-pro"${salesStatus.priceKey ? ` data-i18n="${salesStatus.priceKey}"` : ''}>${salesStatus.priceLabel}</span>`
          : types.map((t) => {
            const available = Number(t.quantity_available ?? t.available_quantity ?? 0);
            const disabled = available <= 0 || t.status === 'sold_out' || t.status === 'inactive';
            return `<button class="dropdown-item mobile-ticket-option" type="button" data-mobile-ticket-type="${t.id}" ${disabled ? 'disabled' : ''}>
              <span>${u().escapeHtml(t.name)}</span>
              <small>${money(t.price, t.currency || event.currency)} · ${available} ${tr('events.left', 'left')}${t.status === 'sold_out' ? ` · ${tr('events.sold_out', 'Sold out')}` : ''}</small>
            </button>`;
          }).join('') || `<span class="dropdown-item-text text-muted-pro" data-i18n="events.no_ticket_tiers_available">${tr('events.no_ticket_tiers_available', 'No ticket tiers available')}</span>`;
      };

      selectedType = purchasingDisabled ? null : (eventsApi().availableTicketTypes(event)[0] || null);
      renderTicketControls();

      const syncSelectedType = () => {
        if (els.qtyWrap && selectedType) {
          els.qtyWrap.dataset.price = selectedType.price;
          els.qtyWrap.dataset.currency = selectedType.currency || event.currency || 'USD';
          const input = els.qtyWrap.querySelector('input');
          if (input) {
            input.min = selectedType.min_per_order || 1;
            const available = Number(selectedType.quantity_available ?? selectedType.available_quantity ?? selectedType.remaining ?? 0);
            input.max = purchaseLimit ? Math.min(available, purchaseLimit) : available;
            input.value = Math.max(Number(input.min || 1), Math.min(Number(input.value || 1), Number(input.max || available || 1)));
          }
          const out = els.qtyWrap.querySelector('[data-qty-total]');
          if (out) {
            const subtotal = Number(input?.value || 1) * Number(selectedType.price || 0);
            out.textContent = money(subtotal, selectedType.currency || event.currency);
          }
        }
        if (els.mobileSelectButton && selectedType) {
          const available = Number(selectedType.quantity_available ?? selectedType.available_quantity ?? 0);
          els.mobileSelectButton.removeAttribute('data-i18n');
          els.mobileSelectButton.textContent = `${selectedType.name} · ${money(selectedType.price, selectedType.currency || event.currency)} · ${available} ${tr('events.left', 'left')}`;
        }
      };

      let ticketRefreshPromise = null;
      const refreshTicketAvailability = async () => {
        if (purchasingDisabled || !eventsApi().getTicketTypes) return;
        if (ticketRefreshPromise) return ticketRefreshPromise;

        ticketRefreshPromise = eventsApi().getTicketTypes(event.slug)
          .then((freshTypes) => {
            if (!Array.isArray(freshTypes) || !freshTypes.length) return;
            const selectedId = String(selectedType?.id || els.select?.value || '');
            event.ticket_types = freshTypes;
            types = freshTypes;
            selectedType = types.find((t) => String(t.id) === selectedId)
              || eventsApi().availableTicketTypes(event)[0]
              || null;
            renderTicketControls();
            syncSelectedType();
          })
          .catch(() => {})
          .finally(() => {
            ticketRefreshPromise = null;
          });

        return ticketRefreshPromise;
      };

      els.select?.addEventListener('change', () => {
        selectedType = types.find((t) => String(t.id) === els.select.value);
        const input = els.qtyWrap?.querySelector('input');
        if (input) input.value = selectedType?.min_per_order || 1;
        syncSelectedType();
      });
      els.mobileSelectMenu?.addEventListener('click', (event) => {
        const option = event.target.closest('[data-mobile-ticket-type]');
        if (!option || option.disabled) return;
        selectedType = types.find((t) => String(t.id) === option.dataset.mobileTicketType);
        if (els.select && selectedType) els.select.value = String(selectedType.id);
        const input = els.qtyWrap?.querySelector('input');
        if (input) input.value = selectedType?.min_per_order || 1;
        syncSelectedType();
      });

      const qtyInput = els.qtyWrap?.querySelector('input');
      if (qtyInput) qtyInput.value = selectedType?.min_per_order || 1;
      syncSelectedType();
      const qtyDisabled = purchasingDisabled || !types.length || !selectedType;
      if (els.qtyWrap) {
        els.qtyWrap.querySelectorAll('button, input').forEach((control) => {
          control.disabled = qtyDisabled;
        });
      }
      if (qtyDisabled) {
        document.querySelectorAll('[data-event-buy]').forEach((btn) => {
          btn.classList.add('disabled');
          btn.setAttribute('aria-disabled', 'true');
          btn.dataset.i18n = salesStatus.priceKey || 'buttons.buy_tickets';
          btn.textContent = salesStatus.priceLabel || tr('buttons.buy_tickets', 'Buy tickets');
        });
        if (els.availability) {
          els.availability.dataset.i18n = salesStatus.labelKey || '';
          els.availability.textContent = salesStatus.label;
          els.availability.className = `badge status-badge ${salesClosed ? 'status-cancelled' : 'status-sold_out'}`;
        }
      } else {
        document.querySelectorAll('[data-event-buy]').forEach((btn) => {
          btn.classList.remove('disabled');
          btn.removeAttribute('aria-disabled');
          btn.dataset.i18n = 'buttons.buy_tickets';
          btn.textContent = tr('buttons.buy_tickets', 'Buy tickets');
        });
        if (els.availability) {
          els.availability.dataset.i18n = 'events.available';
          els.availability.textContent = tr('events.available', 'Available');
        }
      }

      document.querySelectorAll('[data-event-buy]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (purchasingDisabled) {
            window.tkToast?.(salesClosed ? tr('events.ticket_sales_closed', 'Ticket sales are closed for this event.') : tr('events.this_event_sold_out', 'This event is sold out.'), 'error');
            return;
          }
          if (!selectedType) {
            window.tkToast?.(tr('events.no_tickets_available', 'No tickets are currently available for this event.'), 'error');
            return;
          }
          if (!window.EventSphereAuth.isLoggedIn()) {
            location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
            return;
          }
          await refreshTicketAvailability();
          if (!selectedType || Number(selectedType.quantity_available ?? selectedType.available_quantity ?? selectedType.remaining ?? 0) <= 0) {
            window.tkToast?.(tr('events.no_tickets_available', 'No tickets are currently available for this event.'), 'error');
            return;
          }
          const qty = Number(els.qtyWrap?.querySelector('input')?.value || 1);
          const typeId = Number(els.select?.value || selectedType?.id);
          try {
            cart().setFromEvent(event, typeId, qty);
            location.href = '/checkout';
          } catch (err) {
            window.tkToast?.(err.message, 'error');
          }
        });
      });

      els.favorite?.setAttribute('data-event-id', event.id);
      els.favorite?.setAttribute('data-fav', `event-${event.id}`);
      if (els.favorite) els.favorite.disabled = false;
      onIdle(() => window.EventSphereFavorites?.syncFavoriteButtons());

      els.organizerFollow?.addEventListener('click', (e) => {
        e.preventDefault();
        window.tkToast?.(tr('events.organizer_follow_notice', 'Organizer follow notifications will use your saved notification preferences.'), 'info');
      });
    } catch (err) {
      if (els.alert) els.alert.innerHTML = `<div class="alert border-pro dashboard-note text-danger"><i class="bi bi-exclamation-triangle me-2"></i>${u().escapeHtml(err.message || tr('events.failed_to_load_event', 'Failed to load event'))}</div>`;
      window.tkToast?.(err.message || tr('events.failed_to_load_event', 'Failed to load event'), 'error');
    }
  });
})();
