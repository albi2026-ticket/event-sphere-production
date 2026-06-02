(function () {
  'use strict';

  const auth = () => window.EventSphereAuth;
  const cart = () => window.EventSphereCart;
  const orders = () => window.EventSphereOrders;
  const u = () => window.EventSphereUtils;

  document.addEventListener('DOMContentLoaded', async () => {
    auth().requireAuth(['user', 'organizer', 'admin']);

    const c = cart().getCart();
    const summary = document.querySelector('[data-checkout-summary]');
    const form = document.querySelector('[data-checkout-form]');
    const payBtn = document.querySelector('[data-checkout-pay]');
    const attendeeFields = document.querySelector('[data-attendee-fields]');
    const backLink = document.querySelector('[data-checkout-back]');

    if (!c || !c.items?.length) {
      window.tkToast?.('Your cart is empty', 'info');
      setTimeout(() => { location.href = 'events.html'; }, 800);
      return;
    }

    const item = c.items[0];
    if (backLink) {
      backLink.href = c.source_url || (c.event_slug ? `event-details.html?slug=${encodeURIComponent(c.event_slug)}` : 'events.html');
    }
    const feePercentage = Number(c.service_fee_percentage ?? 10);
    const subtotal = Number(item.unit_price) * Number(item.quantity);
    const serviceFee = Math.round(subtotal * (feePercentage / 100) * 100) / 100;
    const total = subtotal + serviceFee;

    if (summary) {
      const inner = `
        <div class="d-flex gap-3 mb-3 pb-3 border-bottom" style="border-color:var(--border) !important">
          <img src="${u().escapeHtml(c.event_image)}" style="width:70px;height:70px;object-fit:cover;border-radius:10px"/>
          <div><div class="fw-semibold">${u().escapeHtml(c.event_title)}</div>
          <small class="text-muted-pro">${u().escapeHtml(c.venue_name || '')}</small><br>
          <small class="text-muted-pro">${item.quantity}× ${u().escapeHtml(item.ticket_type_name)}</small>
          ${c.max_tickets_per_user ? `<br><small class="text-muted-pro">Limit ${c.max_tickets_per_user} ticket${Number(c.max_tickets_per_user) === 1 ? '' : 's'} per user</small>` : ''}</div>
        </div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro">Subtotal</span><span>${u().formatMoney(subtotal, c.currency)}</span></div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro">Service fee (${feePercentage}%)</span><span>${u().formatMoney(serviceFee, c.currency)}</span></div>
        <hr class="divider"/>
        <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span>${u().formatMoney(total, c.currency)}</span></div>`;
      summary.innerHTML = `<h6 class="mb-3">Order summary</h6>${inner}`;
    }

    if (payBtn) payBtn.textContent = `Pay ${u().formatMoney(total, c.currency)}`;

    const user = auth().getUser();
    const purchaserName = (user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim();
    const nameParts = purchaserName.split(/\s+/).filter(Boolean);
    const purchaserFirstName = user?.first_name || nameParts.shift() || purchaserName || 'Guest';
    const purchaserLastName = user?.last_name || nameParts.join(' ') || 'Customer';
    if (form && user) {
      const email = form.querySelector('[name="billing_email"]');
      if (email) email.value = user.email || '';
      const fn = form.querySelector('[name="billing_first_name"]');
      if (fn) fn.value = purchaserFirstName;
      const ln = form.querySelector('[name="billing_last_name"]');
      if (ln) ln.value = purchaserLastName;
      const phone = form.querySelector('[name="billing_phone"]');
      if (phone) phone.value = user.phone || '';
    }

    if (attendeeFields) {
      const quantity = Math.max(1, Number(item.quantity || 1));
      attendeeFields.innerHTML = Array.from({ length: quantity }, (_, index) => {
        return `
          <div class="${index > 0 ? 'pt-3 mt-3 border-top' : ''}" style="${index > 0 ? 'border-color:var(--border) !important' : ''}">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="fw-semibold">Ticket ${index + 1}</div>
              <small class="text-muted-pro">${u().escapeHtml(item.ticket_type_name || 'Ticket')}</small>
            </div>
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">Full name</label><input class="form-control" name="attendees[${index}][name]" required placeholder="Attendee name"/></div>
              <div class="col-md-6"><label class="form-label">Email</label><input class="form-control" type="email" name="attendees[${index}][email]" required placeholder="attendee@email.com"/></div>
              <div class="col-md-6"><label class="form-label">Phone</label><input class="form-control" name="attendees[${index}][phone]" placeholder="+1 (555) 000-0000"/></div>
            </div>
          </div>`;
      }).join('');
    }

    payBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!form?.reportValidity()) return;
      payBtn.disabled = true;
      payBtn.textContent = 'Processing…';
      let createdOrder = null;
      try {
        const fd = new FormData(form);
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
        });

        sessionStorage.setItem('event_sphere_last_order_id', String(createdOrder.id));
        const checkout = await orders().completeMockPayment(createdOrder.id);
        cart().clearCart();
        if (checkout.checkout_url) location.href = checkout.checkout_url;
        else location.href = `checkout-success.html?order_id=${encodeURIComponent(createdOrder.id)}&mock=1`;
      } catch (err) {
        if (createdOrder?.id) {
          try {
            await orders().cancelOrder(createdOrder.id);
          } catch (_) {
            // Backend payment handlers may have already released the reservation.
          }
        }
        window.tkToast?.(err.message || 'Checkout failed', 'error');
        payBtn.disabled = false;
        payBtn.textContent = `Pay ${u().formatMoney(total, c.currency)}`;
      }
    });

    document.querySelectorAll('[data-alt-pay]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.tkToast?.(`${btn.dataset.altPay} is not enabled yet. Use card mock checkout for testing.`, 'info');
      });
    });
  });
})();
