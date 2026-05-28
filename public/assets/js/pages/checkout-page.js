(function () {
  'use strict';

  const auth = () => window.EventSphereAuth;
  const cart = () => window.EventSphereCart;
  const orders = () => window.EventSphereOrders;
  const u = () => window.EventSphereUtils;

  document.addEventListener('DOMContentLoaded', () => {
    auth().requireAuth(['user', 'organizer', 'admin']);

    const c = cart().getCart();
    const summary = document.querySelector('[data-checkout-summary]');
    const form = document.querySelector('[data-checkout-form]');
    const payBtn = document.querySelector('[data-checkout-pay]');

    if (!c || !c.items?.length) {
      window.tkToast?.('Your cart is empty', 'info');
      setTimeout(() => { location.href = 'events.html'; }, 800);
      return;
    }

    const item = c.items[0];
    const subtotal = Number(item.unit_price) * Number(item.quantity);
    const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
    const refundFee = c.refund_protection ? 4.99 : 0;
    const total = subtotal + serviceFee + refundFee;

    if (summary) {
      const inner = `
        <div class="d-flex gap-3 mb-3 pb-3 border-bottom" style="border-color:var(--border) !important">
          <img src="${u().escapeHtml(c.event_image)}" style="width:70px;height:70px;object-fit:cover;border-radius:10px"/>
          <div><div class="fw-semibold">${u().escapeHtml(c.event_title)}</div>
          <small class="text-muted-pro">${u().escapeHtml(c.venue_name || '')}</small><br>
          <small class="text-muted-pro">${item.quantity}× ${u().escapeHtml(item.ticket_type_name)}</small></div>
        </div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro">Subtotal</span><span>${u().formatMoney(subtotal, c.currency)}</span></div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro">Service fee</span><span>${u().formatMoney(serviceFee, c.currency)}</span></div>
        ${refundFee ? `<div class="d-flex justify-content-between small mb-1"><span class="text-muted-pro">Refund protection</span><span>${u().formatMoney(refundFee, c.currency)}</span></div>` : ''}
        <hr class="divider"/>
        <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span>${u().formatMoney(total, c.currency)}</span></div>`;
      summary.innerHTML = `<h6 class="mb-3">Order summary</h6>${inner}`;
    }

    if (payBtn) payBtn.textContent = `Pay ${u().formatMoney(total, c.currency)}`;
    const refundInput = form?.querySelector('[name="refund_protection"]');
    if (refundInput) refundInput.checked = !!c.refund_protection;

    const user = auth().getUser();
    if (form && user) {
      const email = form.querySelector('[name="billing_email"]');
      if (email && !email.value) email.value = user.email || '';
      const fn = form.querySelector('[name="billing_first_name"]');
      if (fn && !fn.value) fn.value = user.first_name || '';
      const ln = form.querySelector('[name="billing_last_name"]');
      if (ln && !ln.value) ln.value = user.last_name || '';
    }

    payBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!form?.reportValidity()) return;
      payBtn.disabled = true;
      payBtn.textContent = 'Processing…';
      try {
        const fd = new FormData(form);
        const order = await orders().createOrder({
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
          refund_protection: !!fd.get('refund_protection'),
        });

        sessionStorage.setItem('event_sphere_last_order_id', String(order.id));
        const checkout = await orders().completeMockPayment(order.id);
        cart().clearCart();
        if (checkout.checkout_url) location.href = checkout.checkout_url;
        else location.href = `checkout-success.html?order_id=${encodeURIComponent(order.id)}&mock=1`;
      } catch (err) {
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
