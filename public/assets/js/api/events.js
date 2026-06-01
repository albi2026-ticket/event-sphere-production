(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const u = () => window.EventSphereUtils;

  async function listEvents(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const path = `/events${qs.toString() ? `?${qs}` : ''}`;
    const result = await api().fetch(path);
    return { events: Array.isArray(result.data) ? result.data : [], meta: result.meta };
  }

  async function getEvent(slug) {
    const { data } = await api().fetch(`/events/${encodeURIComponent(slug)}`);
    return data;
  }

  function availableTicketTypes(event) {
    return (event.ticket_types || [])
      .filter((tier) => tier.status !== 'inactive' && tier.status !== 'paused' && Number(tier.quantity_available ?? tier.remaining ?? 0) > 0)
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  function lowestAvailablePrice(event) {
    const tier = availableTicketTypes(event)[0] || (event.ticket_types || []).sort((a, b) => Number(a.price || 0) - Number(b.price || 0))[0];
    return tier ? { amount: tier.price, currency: tier.currency || event.currency } : { amount: event.base_price ?? 0, currency: event.currency || 'USD' };
  }

  function renderEventCard(event, index) {
    const img = u().eventImage(event);
    const date = u().formatEventDate(event.starts_at, event.timezone);
    const price = lowestAvailablePrice(event);
    const cat = (event.category || 'EVENT').toUpperCase();
    const slug = event.slug;
    const favKey = `event-${event.id}`;

    return `
  <div class="col-md-6 col-xl-4">
    <article class="card-pro fade-up in">
      <div class="thumb">
        <span class="badge-soft">${u().escapeHtml(cat)}</span>
        <span class="fav" data-fav="${favKey}" data-event-id="${event.id}"><i class="bi bi-heart"></i></span>
        <img loading="lazy" src="${u().escapeHtml(img)}" alt=""/>
      </div>
      <div class="body">
        <div class="meta"><i class="bi bi-calendar3"></i> ${u().escapeHtml(date)}</div>
        <h3 class="title"><a href="event-details.html?slug=${encodeURIComponent(slug)}" style="color:inherit">${u().escapeHtml(event.title)}</a></h3>
        <div class="venue"><i class="bi bi-geo-alt"></i> ${u().escapeHtml(event.venue_name || '')}${event.city ? `, ${u().escapeHtml(event.city)}` : ''}</div>
        <div class="foot"><div class="price">From ${u().formatMoney(price.amount, price.currency)}</div><a class="btn btn-glass btn-sm" href="event-details.html?slug=${encodeURIComponent(slug)}">View</a></div>
      </div>
    </article>
  </div>`;
  }

  window.EventSphereEvents = {
    listEvents,
    getEvent,
    availableTicketTypes,
    lowestAvailablePrice,
    renderEventCard,
  };
})();
