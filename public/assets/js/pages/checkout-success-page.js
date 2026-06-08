(function () {
  'use strict';

  const auth = () => window.EventSphereAuth;
  const orders = () => window.EventSphereOrders;

  document.addEventListener('DOMContentLoaded', async () => {
    auth().requireAuth(['user', 'organizer', 'admin']);

    const params = new URLSearchParams(location.search);
    const orderId = params.get('order_id') || sessionStorage.getItem('event_sphere_last_order_id');
    const statusEl = document.querySelector('[data-payment-status]');
    const link = document.querySelector('[data-dashboard-link]');

    if (!orderId) {
      if (statusEl) statusEl.textContent = 'Order reference missing.';
      return;
    }

    let attempts = 0;
    const poll = async () => {
      try {
        const data = await orders().getPaymentStatus(orderId);
        if (data.payment_status === 'paid' || data.status === 'paid') {
          if (statusEl) statusEl.textContent = `Order ${data.order_number || ''} confirmed. Your tickets are ready.`;
          if (link) link.href = 'dashboard.html';
          const notificationKey = `order-confirmed-${data.id || orderId}`;
          const exists = window.EventSphereNotifications?.list?.().some((item) => item.id === notificationKey);
          if (!exists) {
            window.EventSphereNotifications?.add({
              id: notificationKey,
              type: 'order',
              title: 'Order Confirmed',
              message: `Payment successful${data.order_number ? ` for order ${data.order_number}` : ''}. Your tickets are ready.`,
            });
          }
          return;
        }
        if (statusEl) statusEl.textContent = `Payment status: ${data.payment_status || 'pending'}…`;
        if (++attempts < 20) setTimeout(poll, 2000);
        else if (statusEl) statusEl.textContent = 'Payment is still processing. Check your dashboard shortly.';
      } catch (err) {
        if (statusEl) statusEl.textContent = err.message;
      }
    };

    poll();
  });
})();
