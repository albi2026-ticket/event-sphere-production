(function () {
  'use strict';

  const cfg = () => window.EventSphereConfig;

  function getCart() {
    try {
      return JSON.parse(sessionStorage.getItem(cfg().CART_KEY) || 'null') || null;
    } catch {
      return null;
    }
  }

  function setCart(cart) {
    if (!cart) sessionStorage.removeItem(cfg().CART_KEY);
    else sessionStorage.setItem(cfg().CART_KEY, JSON.stringify(cart));
  }

  function setFromEvent(event, ticketTypeId, quantity) {
    const tt = event.ticket_types?.find((t) => t.id === ticketTypeId) ||
      event.ticketTypes?.find((t) => t.id === ticketTypeId);
    if (!tt) throw new Error('Ticket type not found');

    setCart({
      event_slug: event.slug,
      event_id: event.id,
      event_title: event.title,
      event_image: window.EventSphereUtils.eventImage(event),
      venue_name: event.venue_name,
      city: event.city,
      starts_at: event.starts_at,
      timezone: event.timezone,
      currency: event.currency || tt.currency,
      items: [{ ticket_type_id: tt.id, ticket_type_name: tt.name, quantity, unit_price: tt.price }],
      refund_protection: false,
    });
  }

  function clearCart() {
    setCart(null);
  }

  window.EventSphereCart = { getCart, setCart, setFromEvent, clearCart };
})();
