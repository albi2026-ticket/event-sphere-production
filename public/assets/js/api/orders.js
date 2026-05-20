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

  async function getPaymentStatus(orderId) {
    const { data } = await api().fetch(`/orders/${orderId}/payment-status`);
    return data;
  }

  async function listMyOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const { data, meta } = await api().fetch(`/me/orders${qs ? `?${qs}` : ''}`);
    return { orders: Array.isArray(data) ? data : [], meta };
  }

  window.EventSphereOrders = {
    createOrder,
    startCheckout,
    getPaymentStatus,
    listMyOrders,
  };
})();
