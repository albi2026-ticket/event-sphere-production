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

  function inventorySummary(event) {
    const tiers = event.ticket_types || [];
    const total = Number(event.total_inventory ?? tiers.reduce((sum, tier) => sum + Number(tier.quantity_total || 0), 0));
    const sold = Number(event.sold_tickets ?? tiers.reduce((sum, tier) => sum + Number(tier.quantity_sold || 0), 0));
    const available = Number(event.available_inventory ?? tiers.reduce((sum, tier) => {
      const tierAvailable = tier.quantity_available ?? tier.remaining ?? Math.max(0, Number(tier.quantity_total || 0) - Number(tier.quantity_sold || 0) - Number(tier.quantity_reserved || 0));
      return sum + Number(tierAvailable || 0);
    }, 0));

    return { total, sold, available };
  }

  function salesStatus(event) {
    const apiState = event?.event_state?.key;

    if (apiState === 'ended') {
      return { key: 'ended', label: 'Event Ended', priceLabel: 'Sales Closed', canBuy: false };
    }
    if (apiState === 'sold_out') {
      return { key: 'sold_out', label: 'Sold Out', priceLabel: 'Sold Out', canBuy: false };
    }
    if (apiState === 'live') {
      return { key: 'live', label: 'Live', priceLabel: '', canBuy: true };
    }
    if (apiState === 'upcoming') {
      return { key: 'upcoming', label: 'Upcoming', priceLabel: '', canBuy: true };
    }

    if (u().isEventSalesClosed(event)) {
      return { key: 'ended', label: 'Event Ended', priceLabel: 'Sales Closed', canBuy: false };
    }

    const inventory = inventorySummary(event);
    if (inventory.available <= 0) {
      return { key: 'sold_out', label: 'Sold Out', priceLabel: 'Sold Out', canBuy: false };
    }

    const start = event?.starts_at ? new Date(event.starts_at) : null;
    if (start && !Number.isNaN(start.getTime()) && Date.now() >= start.getTime()) {
      return { key: 'live', label: 'Live', priceLabel: '', canBuy: true };
    }

    return { key: 'upcoming', label: 'Upcoming', priceLabel: '', canBuy: true };
  }

  function lowestAvailablePrice(event) {
    const tier = availableTicketTypes(event)[0] || (event.ticket_types || []).sort((a, b) => Number(a.price || 0) - Number(b.price || 0))[0];
    return tier ? { amount: tier.price, currency: tier.currency || event.currency } : { amount: event.base_price ?? 0, currency: event.currency || 'USD' };
  }

  function serviceFeePercentage(event) {
    return Number(event?.service_fee_percentage ?? 10);
  }

  function priceBreakdown(amount, event) {
    const ticketPrice = Number(amount || 0);
    const percentage = serviceFeePercentage(event);
    const serviceFee = Math.round(ticketPrice * (percentage / 100) * 100) / 100;

    return {
      ticketPrice,
      percentage,
      serviceFee,
      total: Math.round((ticketPrice + serviceFee) * 100) / 100,
    };
  }

  function priceBreakdownHtml(amount, currency, event, compact = false) {
    const breakdown = priceBreakdown(amount, event);
    if (compact) {
      return `<span class="price-breakdown small d-block">
        <span class="d-block">Ticket ${u().formatMoney(breakdown.ticketPrice, currency)}</span>
        <span class="d-block">Fee (${breakdown.percentage}%) ${u().formatMoney(breakdown.serviceFee, currency)}</span>
        <strong class="d-block">Total ${u().formatMoney(breakdown.total, currency)}</strong>
      </span>`;
    }

    return `<div class="price-breakdown small">
      <div class="d-flex justify-content-between gap-3"><span class="text-muted-pro">Ticket Price</span><span>${u().formatMoney(breakdown.ticketPrice, currency)}</span></div>
      <div class="d-flex justify-content-between gap-3"><span class="text-muted-pro">Service Fee (${breakdown.percentage}%)</span><span>${u().formatMoney(breakdown.serviceFee, currency)}</span></div>
      <div class="d-flex justify-content-between gap-3 fw-bold"><span>Total</span><span>${u().formatMoney(breakdown.total, currency)}</span></div>
    </div>`;
  }

  function renderEventCard(event, index) {
    const img = u().eventImage(event);
    const date = u().formatEventDate(event.starts_at, event.timezone);
    const price = lowestAvailablePrice(event);
    const status = salesStatus(event);
    const cat = status.key === 'ended' || status.key === 'sold_out'
      ? status.label.toUpperCase()
      : (event.category || 'EVENT').toUpperCase();
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
        <div class="foot"><div class="price">${status.canBuy ? `From ${u().formatMoney(price.amount, price.currency)}` : status.priceLabel}</div><a class="btn btn-glass btn-sm" href="event-details.html?slug=${encodeURIComponent(slug)}">View</a></div>
      </div>
    </article>
  </div>`;
  }

  window.EventSphereEvents = {
    listEvents,
    getEvent,
    availableTicketTypes,
    inventorySummary,
    salesStatus,
    lowestAvailablePrice,
    serviceFeePercentage,
    priceBreakdown,
    priceBreakdownHtml,
    renderEventCard,
  };
})();
