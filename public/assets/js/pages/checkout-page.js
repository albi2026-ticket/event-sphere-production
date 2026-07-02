(function () {
  'use strict';

  const auth = () => window.EventSphereAuth;
  const cart = () => window.EventSphereCart;
  const orders = () => window.EventSphereOrders;
  const u = () => window.EventSphereUtils;
  const tr = (key, fallback, replacements) => window.t?.(key, replacements) || fallback;

  function defer(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 800 });
      return;
    }

    window.setTimeout(callback, 0);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    auth().requireAuth(['user', 'organizer', 'admin']);

    const c = cart().getCart();
    const els = {
      attendeeFields: document.querySelector('[data-attendee-fields]'),
      backLink: document.querySelector('[data-checkout-back]'),
      form: document.querySelector('[data-checkout-form]'),
      payBtn: document.querySelector('[data-checkout-pay]'),
      summary: document.querySelector('[data-checkout-summary]'),
    };

    if (!c || !c.items?.length) {
      window.tkToast?.(tr('checkout.cart_empty', 'Your cart is empty'), 'info');
      setTimeout(() => { location.href = '/events/list'; }, 800);
      return;
    }

    const item = c.items[0];
    if (els.backLink) {
      els.backLink.href = c.source_url || (c.event_slug ? `/event?id=${encodeURIComponent(c.event_slug)}` : '/events/list');
    }
    const feePercentage = Number(c.service_fee_percentage ?? 10);
    const subtotal = Number(item.unit_price) * Number(item.quantity);
    const serviceFee = Math.round(subtotal * (feePercentage / 100) * 100) / 100;
    const total = subtotal + serviceFee;
    let checkoutReservation = null;
    let reservationExpired = false;
    let countdownInterval = null;
    let checkoutInFlight = false;
    let reservationCountdown = null;
    let reservationMessage = null;
    const quantity = Math.max(1, Number(item.quantity || 1));
    const formattedTotal = u().formatMoney(total, c.currency);

    function reservationSecondsRemaining() {
      if (!checkoutReservation?.expires_at) return 0;
      return Math.max(0, Math.floor((new Date(checkoutReservation.expires_at).getTime() - Date.now()) / 1000));
    }

    function formatCountdown(seconds) {
      const safeSeconds = Math.max(0, Number(seconds) || 0);
      const minutes = Math.floor(safeSeconds / 60);
      const remainder = safeSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    }

    function markReservationExpired() {
      reservationExpired = true;
      if (countdownInterval) clearInterval(countdownInterval);
      reservationCountdown?.replaceChildren(document.createTextNode('00:00'));
      reservationMessage?.replaceChildren(document.createTextNode(tr('checkout.reservation_expired_message', 'Your reservation has expired.')));
      if (els.payBtn) {
        els.payBtn.disabled = true;
        els.payBtn.textContent = tr('checkout.reservation_expired', 'Reservation expired');
      }
    }

    function startCountdown() {
      const tick = () => {
        const seconds = reservationSecondsRemaining();
        if (reservationCountdown) reservationCountdown.textContent = formatCountdown(seconds);
        if (seconds <= 0) markReservationExpired();
      };

      tick();
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(tick, 1000);
    }

    function renderSummary() {
      if (!els.summary) return;

      const inner = `
        <div class="d-flex gap-3 mb-3 pb-3 border-bottom" style="border-color:var(--border) !important">
          <img src="${u().escapeHtml(c.event_image)}" loading="eager" decoding="async" style="width:70px;height:70px;object-fit:cover;border-radius:10px"/>
          <div><div class="fw-semibold">${u().escapeHtml(c.event_title)}</div>
          <small class="text-muted-pro">${u().escapeHtml(c.venue_name || '')}</small><br>
          <small class="text-muted-pro">${item.quantity}× ${u().escapeHtml(item.ticket_type_name)}</small>
          ${c.max_tickets_per_user ? `<br><small class="text-muted-pro">${tr('events.purchase_limit', 'Limit {count} ticket(s) per user', { count: c.max_tickets_per_user })}</small>` : ''}</div>
        </div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro" data-i18n="checkout.subtotal">${tr('checkout.subtotal', 'Subtotal')}</span><span>${u().formatMoney(subtotal, c.currency)}</span></div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro"><span data-i18n="checkout.service_fee">${tr('checkout.service_fee', 'Service fee')}</span> (${feePercentage}%)</span><span>${u().formatMoney(serviceFee, c.currency)}</span></div>
        <hr class="divider"/>
        <div class="d-flex align-items-center justify-content-between gap-3 mb-3 rounded-3 p-3" style="background:rgba(49,130,206,.08);border:1px solid rgba(49,130,206,.18)">
          <small class="text-muted-pro" data-reservation-message data-i18n="checkout.preparing_reservation">${tr('checkout.preparing_reservation', 'Preparing ticket reservation...')}</small>
          <span class="fw-bold" data-reservation-countdown>--:--</span>
        </div>
        <div class="d-flex justify-content-between fw-bold fs-5"><span data-i18n="checkout.total">${tr('checkout.total', 'Total')}</span><span>${formattedTotal}</span></div>`;
      els.summary.innerHTML = `<h6 class="mb-3" data-i18n="checkout.order_summary">${tr('checkout.order_summary', 'Order summary')}</h6>${inner}`;
      reservationCountdown = els.summary.querySelector('[data-reservation-countdown]');
      reservationMessage = els.summary.querySelector('[data-reservation-message]');
    }

    function setPayReady(ready) {
      if (!els.payBtn) return;
      els.payBtn.disabled = !ready;
      els.payBtn.textContent = ready ? `${tr('checkout.pay', 'Pay')} ${formattedTotal}` : tr('checkout.preparing_checkout', 'Preparing checkout...');
    }

    function renderAttendeeFields() {
      if (!els.attendeeFields) return Promise.resolve();

      const attendeeHtml = Array.from({ length: quantity }, (_, index) => `
        <div class="${index > 0 ? 'pt-3 mt-3 border-top' : ''}" style="${index > 0 ? 'border-color:var(--border) !important' : ''}">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-semibold"><span data-i18n="forms.ticket">${window.t?.('forms.ticket') || 'Ticket'}</span> ${index + 1}</div>
            <small class="text-muted-pro">${u().escapeHtml(item.ticket_type_name || 'Ticket')}</small>
          </div>
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label" data-i18n="forms.full_name">${window.t?.('forms.full_name') || 'Full name'}</label><input class="form-control" name="attendees[${index}][name]" required placeholder="${window.t?.('forms.attendee_name') || 'Attendee name'}" data-i18n-attr="placeholder:forms.attendee_name"/></div>
            <div class="col-md-6"><label class="form-label" data-i18n="forms.email">${window.t?.('forms.email') || 'Email'}</label><input class="form-control" type="email" name="attendees[${index}][email]" required placeholder="attendee@email.com"/></div>
            <div class="col-md-6"><label class="form-label" data-i18n="forms.phone">${window.t?.('forms.phone') || 'Phone'}</label><input class="form-control" name="attendees[${index}][phone]" placeholder="+1 (555) 000-0000"/></div>
          </div>
        </div>`).join('');

      return new Promise((resolve) => {
        defer(() => {
          els.attendeeFields.innerHTML = attendeeHtml;
          resolve();
        });
      });
    }

    renderSummary();
    setPayReady(false);
    const attendeeRenderPromise = renderAttendeeFields();

    try {
      checkoutReservation = await orders().createCheckoutReservation(item.ticket_type_id, item.quantity);
      cart().setCart(Object.assign({}, c, {
        checkout_reservation_id: checkoutReservation.id,
        checkout_reservation_expires_at: checkoutReservation.expires_at,
      }));
      if (reservationMessage) reservationMessage.textContent = 'Your tickets are reserved for 5 minutes.';
      await attendeeRenderPromise;
      setPayReady(true);
      startCountdown();
    } catch (err) {
      window.tkToast?.(err.message || tr('checkout.unable_reserve_tickets', 'Unable to reserve these tickets.'), 'error');
      if (els.payBtn) {
        els.payBtn.disabled = true;
        els.payBtn.textContent = 'Tickets unavailable';
      }
      reservationMessage?.replaceChildren(document.createTextNode('Unable to reserve these tickets.'));
      reservationCountdown?.replaceChildren(document.createTextNode('--:--'));
      return;
    }

    const user = auth().getUser();
    const purchaserName = (user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim();
    const nameParts = purchaserName.split(/\s+/).filter(Boolean);
    const purchaserFirstName = user?.first_name || nameParts.shift() || purchaserName || 'Guest';
    const purchaserLastName = user?.last_name || nameParts.join(' ') || 'Customer';
    if (els.form && user) {
      const email = els.form.querySelector('[name="billing_email"]');
      if (email) email.value = user.email || '';
      const fn = els.form.querySelector('[name="billing_first_name"]');
      if (fn) fn.value = purchaserFirstName;
      const ln = els.form.querySelector('[name="billing_last_name"]');
      if (ln) ln.value = purchaserLastName;
      const phone = els.form.querySelector('[name="billing_phone"]');
      if (phone) phone.value = user.phone || '';
    }

    els.payBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (checkoutInFlight) return;
      if (!els.form?.reportValidity()) return;
      if (!checkoutReservation || reservationExpired || reservationSecondsRemaining() <= 0) {
        markReservationExpired();
        window.tkToast?.(tr('checkout.reservation_expired_message', 'Your reservation has expired.'), 'error');
        return;
      }
      checkoutInFlight = true;
      els.payBtn.disabled = true;
      els.payBtn.textContent = 'Processing…';
      let createdOrder = null;
      try {
        const fd = new FormData(els.form);
        const attendees = Array.from({ length: Math.max(1, Number(item.quantity || 1)) }, (_, index) => ({
          name: String(fd.get(`attendees[${index}][name]`) || '').trim(),
          email: String(fd.get(`attendees[${index}][email]`) || '').trim(),
          phone: String(fd.get(`attendees[${index}][phone]`) || '').trim() || null,
        }));
        createdOrder = await orders().createOrder({
          items: c.items.map((i) => ({ ticket_type_id: i.ticket_type_id, quantity: i.quantity })),
          billing_email: fd.get('billing_email'),
          billing_phone: fd.get('billing_phone') || null,
          billing_first_name: fd.get('billing_first_name'),
          billing_last_name: fd.get('billing_last_name'),
          billing_address: fd.get('billing_address') || null,
          billing_city: fd.get('billing_city') || null,
          billing_state: fd.get('billing_state') || null,
          billing_zip: fd.get('billing_zip') || null,
          billing_country: fd.get('billing_country') || null,
          attendees,
          checkout_reservation_id: checkoutReservation.id,
        });

        sessionStorage.setItem('event_sphere_last_order_id', String(createdOrder.id));
        const checkout = await orders().completeMockPayment(createdOrder.id);
        cart().clearCart();
        if (checkout.checkout_url) location.href = checkout.checkout_url;
        else location.href = `/checkout-success?order_id=${encodeURIComponent(createdOrder.id)}&mock=1`;
      } catch (err) {
        if (createdOrder?.id) {
          try {
            await orders().cancelOrder(createdOrder.id);
          } catch (_) {
            // Backend payment handlers may have already released the reservation.
          }
        }
        window.tkToast?.(err.message || tr('checkout.checkout_failed', 'Checkout failed'), 'error');
        checkoutInFlight = false;
        els.payBtn.disabled = false;
        els.payBtn.textContent = `${tr('checkout.pay', 'Pay')} ${formattedTotal}`;
      }
    });

    window.addEventListener('pagehide', () => {
      if (countdownInterval) clearInterval(countdownInterval);
    }, { once: true });

    document.querySelectorAll('[data-alt-pay]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.tkToast?.(`${btn.dataset.altPay} is not enabled yet. Use card mock checkout for testing.`, 'info');
      });
    });
  });
})();
