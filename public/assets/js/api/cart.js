(function () {
  "use strict";

  const cfg = () => window.EventSphereConfig;

  function getCart() {
    try {
      return JSON.parse(sessionStorage.getItem(cfg().CART_KEY) || "null") || null;
    } catch {
      return null;
    }
  }

  function setCart(cart) {
    if (!cart) sessionStorage.removeItem(cfg().CART_KEY);
    else sessionStorage.setItem(cfg().CART_KEY, JSON.stringify(cart));
  }

  function setFromEvent(event, ticketTypeId, quantity) {
    const tt =
      event.ticket_types?.find((t) => t.id === ticketTypeId) ||
      event.ticketTypes?.find((t) => t.id === ticketTypeId);
    if (!tt) throw new Error("We couldn’t find that ticket type. Refresh the event and choose a ticket again.");
    const maxTicketsPerUser = Number(event.max_tickets_per_user || 0);
    if (maxTicketsPerUser > 0 && quantity > maxTicketsPerUser) {
      throw new Error(
        `This event has a limit of ${maxTicketsPerUser} ticket${maxTicketsPerUser === 1 ? "" : "s"} per user.`,
      );
    }

    setCart({
      event_slug: event.slug,
      event_id: event.id,
      source_url:
        window.EventSphereRoutes?.eventUrl?.(event.slug) ||
        `/event/${encodeURIComponent(event.slug)}`,
      event_title: event.title,
      event_image: window.EventSphereUtils.eventImage(event),
      venue_name: event.venue_name,
      city: event.city,
      starts_at: event.starts_at,
      timezone: event.timezone,
      currency: event.currency || tt.currency,
      service_fee_percentage: Number(event.service_fee_percentage ?? 10),
      max_tickets_per_user: maxTicketsPerUser || null,
      items: [{ ticket_type_id: tt.id, ticket_type_name: tt.name, quantity, unit_price: tt.price }],
    });
  }

  function clearCart() {
    setCart(null);
  }

  window.EventSphereCart = { getCart, setCart, setFromEvent, clearCart };
})();
