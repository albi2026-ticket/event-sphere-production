(function () {
  'use strict';

  const api = () => window.EventSphereApi;

  async function createOrder(payload) {
    const { data } = await api().fetch('/orders', { method: 'POST', body: payload });
    return data;
  }

  async function startCheckout(orderId) {
    const { data } = await api().fetch(`/orders/${orderId}/checkout-session`, { method: 'POST' });
    return data;
  }

  async function cancelOrder(orderId) {
    const { data } = await api().fetch(`/orders/${orderId}/cancel`, { method: 'POST' });
    return data;
  }

  async function completeMockPayment(orderId) {
    const { data } = await api().fetch('/payment/mock-success', {
      method: 'POST',
      body: { order_id: orderId },
    });
    return data;
  }

  async function getPaymentStatus(orderId) {
    const { data } = await api().fetch(`/orders/${orderId}/payment-status`);
    return data;
  }

  async function getOrder(orderId) {
    const { data } = await api().fetch(`/me/orders/${orderId}`);
    return data;
  }

  async function downloadReceipt(orderId, orderNumber) {
    const blob = await api().fetchBlob(`/me/orders/${orderId}/receipt`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${orderNumber || orderId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function listMyOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const { data, meta } = await api().fetch(`/me/orders${qs ? `?${qs}` : ''}`);
    return { orders: Array.isArray(data) ? data : [], meta };
  }

  window.EventSphereOrders = {
    createOrder,
    startCheckout,
    cancelOrder,
    completeMockPayment,
    getPaymentStatus,
    getOrder,
    downloadReceipt,
    listMyOrders,
  };
})();
