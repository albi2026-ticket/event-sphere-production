(function () {
  'use strict';

  const categoryAliases = {
    concert: { key: 'concerts', label: 'Concerts' },
    concerts: { key: 'concerts', label: 'Concerts' },
    music: { key: 'concerts', label: 'Concerts' },
    sport: { key: 'sports', label: 'Sports' },
    sports: { key: 'sports', label: 'Sports' },
    festival: { key: 'festivals', label: 'Festivals' },
    festivals: { key: 'festivals', label: 'Festivals' },
    conference: { key: 'conferences', label: 'Conferences' },
    conferences: { key: 'conferences', label: 'Conferences' },
    theatre: { key: 'theater', label: 'Theater' },
    theater: { key: 'theater', label: 'Theater' },
    comedy: { key: 'comedy', label: 'Comedy' },
    family: { key: 'family', label: 'Family' },
    nightlife: { key: 'nightlife', label: 'Nightlife' },
  };

  const categoryPriority = ['sports', 'concerts', 'festivals', 'comedy', 'theater', 'conferences', 'family', 'nightlife'];
  let homepageData = null;

  function tr(key, fallback, params = {}) {
    const value = window.t?.(key, params);
    if (value && value !== key) return value;
    return Object.entries(params).reduce(
      (text, [param, replacement]) => text.replaceAll(`{${param}}`, replacement),
      fallback,
    );
  }

  async function hydrateNavCategories() {
    const menus = document.querySelectorAll('[data-nav-categories]');
    if (!menus.length) return;
    try {
      const base = window.EventSphereConfig?.API_BASE_URL || document.querySelector('meta[name="api-base"]')?.content;
      const response = await fetch(`${base.replace(/\/$/, '')}/categories`, { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      const categories = Array.isArray(payload.data) ? payload.data : [];
      if (!categories.length) return;
      menus.forEach((menu) => {
        menu.innerHTML = categories.map((category) => `<li><a class="dropdown-item text-white-50" href="${window.EventSphereCategories.href(category.slug || category.name)}"><i class="bi ${category.icon || 'bi-tag'} me-2"></i>${category.name}</a></li>`).join('');
      });
    } catch {
      /* keep static fallback */
    }
  }

  function eventTimestamp(event, field) {
    const date = event?.[field] ? new Date(event[field]) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  function hasEventImage(event) {
    return Boolean(event?.banner_image_url || event?.images?.length);
  }

  function isPublicActiveEvent(event) {
    const status = window.EventSphereEvents.salesStatus(event);
    if (status.key === 'ended' || event.event_state?.key === 'ended') return false;
    return event.status === 'published' && (!event.visibility || event.visibility === 'public');
  }

  function sortByHeroPriority(events) {
    return [...events].sort((a, b) => {
      return (Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
        || (Number(Boolean(b.is_trending)) - Number(Boolean(a.is_trending)))
        || (discoveryScore(b) - discoveryScore(a))
        || (Number(hasEventImage(b)) - Number(hasEventImage(a)))
        || (eventTimestamp(b, 'created_at') - eventTimestamp(a, 'created_at'))
        || (eventTimestamp(a, 'starts_at') - eventTimestamp(b, 'starts_at'));
    });
  }

  function discoveryScore(event) {
    return Number(event.popularity_score || 0)
      || (Number(event.recent_tickets_sold_count || 0) * 5)
      + (Number(event.tickets_sold_count || event.sold_tickets || 0) * 3)
      + (Number(event.favorites_count || 0) * 2)
      + Math.floor(Number(event.views_count || 0) / 10);
  }

  function sortByTrending(events) {
    return [...events].sort((a, b) => {
      return (discoveryScore(b) - discoveryScore(a))
        || (Number(Boolean(b.is_trending)) - Number(Boolean(a.is_trending)))
        || (eventTimestamp(a, 'starts_at') - eventTimestamp(b, 'starts_at'));
    });
  }

  function sortByNewest(events) {
    return [...events].sort((a, b) => eventTimestamp(b, 'created_at') - eventTimestamp(a, 'created_at'));
  }

  function sortBySoonest(events) {
    return [...events].sort((a, b) => eventTimestamp(a, 'starts_at') - eventTimestamp(b, 'starts_at'));
  }

  function countdownLabel(startsAt) {
    const start = startsAt ? new Date(startsAt) : null;
    if (!start || Number.isNaN(start.getTime())) return 'Date TBA';
    const diff = start.getTime() - Date.now();
    if (diff <= 0) return 'Live now';

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const days = Math.floor(diff / day);
    const hours = Math.floor((diff % day) / hour);
    const minutes = Math.floor((diff % hour) / minute);

    if (days >= 1) return `${days} Day${days === 1 ? '' : 's'}${hours ? ` ${hours} Hr` : ''}`;
    if (hours >= 1) return `${hours} Hr ${minutes} Min`;
    return `${Math.max(1, minutes)} Min`;
  }

  function locationLabel(event) {
    return [event.venue_name, event.city, event.country].filter(Boolean).join(', ') || 'Location TBA';
  }

  function categoryInfo(category) {
    const raw = String(category || 'Other').trim() || 'Other';
    const normalized = raw.toLowerCase();
    return categoryAliases[normalized] || { key: normalized, label: raw };
  }

  function categorySort(a, b) {
    const aIndex = categoryPriority.indexOf(a.key);
    const bIndex = categoryPriority.indexOf(b.key);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.label.localeCompare(b.label);
  }

  function groupedCategories(events) {
    const groups = new Map();
    events.forEach((event) => {
      const { key, label } = categoryInfo(event.category);
      if (!groups.has(key)) groups.set(key, { key, label, events: [] });
      groups.get(key).events.push(event);
    });

    return [...groups.values()]
      .filter((group) => group.events.length)
      .map((group) => ({ ...group, events: sortByNewest(group.events) }))
      .sort(categorySort);
  }

  function uniqueEvents(...groups) {
    const seen = new Set();
    return groups.flat().filter((event) => {
      const key = String(event?.id || '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchHomepageData() {
    const qs = new URLSearchParams({
      featured_limit: 8,
      trending_limit: 8,
      upcoming_limit: 8,
      category_limit: 3,
    });
    const result = await window.EventSphereApi.fetch(`/homepage?${qs.toString()}`);
    const payload = result.data || {};
    const featured = payload.featured_events;
    const trending = payload.trending_events;
    const upcoming = payload.upcoming_events;
    const categories = payload.categories;

    return {
      featured: Array.isArray(featured) ? featured.filter(isPublicActiveEvent) : [],
      trending: Array.isArray(trending) ? trending.filter(isPublicActiveEvent) : [],
      upcoming: Array.isArray(upcoming) ? upcoming.filter(isPublicActiveEvent) : [],
      categories: Array.isArray(categories) ? categories : [],
    };
  }

  function preloadImage(src) {
    if (!src) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
    const img = new Image();
    img.src = src;
  }

  function renderHeroSlide(event, index) {
    const u = window.EventSphereUtils;
    const img = u.eventImage(event);
    const detailsHref = window.EventSphereRoutes?.eventUrl?.(event.slug) || `/event/${encodeURIComponent(event.slug)}`;
    const status = window.EventSphereEvents.salesStatus(event);
    const ticketType = window.EventSphereEvents.availableTicketTypes(event)[0];
    const buyDisabled = !status.canBuy || (!ticketType && event.price_from === undefined && event.base_price === undefined);
    const statusLabel = status.key === 'sold_out' || status.key === 'live' ? status.label : '';

    return `<article class="hero-slide${index === 0 ? ' active' : ''}" data-hero-slide data-index="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
      <div class="hero-slide-bg"><img src="${u.escapeHtml(img)}" alt="" ${index === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'}></div>
      <div class="hero-slide-overlay"></div>
      <div class="container-xxl hero-slide-content">
        <div class="hero-slide-copy">
          <div class="hero-badges">
            <span class="hero-eyebrow"><span style="width:8px;height:8px;border-radius:50%;background:var(--success)"></span>${u.escapeHtml(event.category || 'Featured Event')}</span>
            ${statusLabel ? `<span class="status-badge status-${u.escapeHtml(status.key)}">${u.escapeHtml(statusLabel)}</span>` : ''}
          </div>
          <h1 class="mt-3">${u.escapeHtml(event.title)}</h1>
          <div class="hero-slide-meta">
            <span><i class="bi bi-calendar3"></i>${u.escapeHtml(u.formatEventDate(event.starts_at, event.timezone))}</span>
            <span><i class="bi bi-geo-alt"></i>${u.escapeHtml(locationLabel(event))}</span>
          </div>
          <div class="hero-countdown"><i class="bi bi-clock"></i><span>Starts In</span><strong data-hero-countdown="${u.escapeHtml(event.starts_at || '')}">${u.escapeHtml(countdownLabel(event.starts_at))}</strong></div>
          <div class="hero-actions">
            <a class="btn btn-primary-grad btn-lg${buyDisabled ? ' disabled' : ''}" href="${detailsHref}" data-hero-buy="${u.escapeHtml(String(event.id))}" aria-disabled="${buyDisabled ? 'true' : 'false'}"><i class="bi bi-ticket-perforated"></i><span data-i18n="buttons.buy_tickets">${window.t?.('buttons.buy_tickets') || 'Buy Tickets'}</span></a>
            <a class="btn btn-glass btn-lg" href="${detailsHref}"><i class="bi bi-info-circle"></i><span data-i18n="buttons.view_details">${window.t?.('buttons.view_details') || 'View Details'}</span></a>
          </div>
        </div>
      </div>
    </article>`;
  }

  function setupHeroSlider(events) {
    const root = document.querySelector('[data-hero-slider]');
    const slidesWrap = document.querySelector('[data-hero-slides]');
    const loading = document.querySelector('[data-hero-loading]');
    const dotsWrap = document.querySelector('[data-hero-dots]');
    const prev = document.querySelector('[data-hero-prev]');
    const next = document.querySelector('[data-hero-next]');
    if (!root || !slidesWrap || !dotsWrap) return;

    const preferredEvents = events.filter((event) => event.is_featured || event.is_trending);
    const heroEvents = sortByHeroPriority(preferredEvents.length ? preferredEvents : events).slice(0, 5);
    if (loading) loading.hidden = true;
    if (!heroEvents.length) {
      root.innerHTML = `<div class="hero-empty"><div><h1 data-i18n="empty.no_upcoming_events">${window.t?.('empty.no_upcoming_events') || 'No upcoming events yet'}</h1><p class="text-muted-pro mb-0" data-i18n="empty.published_events_appear">${window.t?.('empty.published_events_appear') || 'Published events will appear here as organizers add them.'}</p></div></div>`;
      return;
    }

    preloadImage(window.EventSphereUtils.eventImage(heroEvents[0]));
    slidesWrap.innerHTML = heroEvents.map(renderHeroSlide).join('');
    dotsWrap.innerHTML = heroEvents.map((event, index) =>
      `<button class="hero-dot${index === 0 ? ' active' : ''}" type="button" data-hero-dot="${index}" aria-label="Show ${window.EventSphereUtils.escapeHtml(event.title)}"></button>`,
    ).join('');

    const controlsHidden = heroEvents.length < 2;
    if (prev) prev.hidden = controlsHidden;
    if (next) next.hidden = controlsHidden;
    dotsWrap.hidden = controlsHidden;

    let active = 0;
    let timer = null;
    let touchStartX = 0;
    const slides = () => [...root.querySelectorAll('[data-hero-slide]')];
    const dots = () => [...root.querySelectorAll('[data-hero-dot]')];

    const show = (index) => {
      active = (index + heroEvents.length) % heroEvents.length;
      slides().forEach((slide, slideIndex) => {
        const isActive = slideIndex === active;
        slide.classList.toggle('active', isActive);
        slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      dots().forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === active));
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      if (heroEvents.length > 1) timer = window.setInterval(() => show(active + 1), 4000);
    };
    const restart = () => {
      stop();
      start();
    };

    prev?.addEventListener('click', () => { show(active - 1); restart(); });
    next?.addEventListener('click', () => { show(active + 1); restart(); });
    dotsWrap.addEventListener('click', (event) => {
      const dot = event.target.closest('[data-hero-dot]');
      if (!dot) return;
      show(Number(dot.dataset.heroDot || 0));
      restart();
    });
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches?.[0]?.clientX || 0;
    }, { passive: true });
    root.addEventListener('touchend', (event) => {
      const endX = event.changedTouches?.[0]?.clientX || 0;
      const delta = endX - touchStartX;
      if (Math.abs(delta) < 48) return;
      show(active + (delta < 0 ? 1 : -1));
      restart();
    }, { passive: true });
    root.addEventListener('click', (event) => {
      const buy = event.target.closest('[data-hero-buy]');
      if (!buy || buy.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      const featuredEvent = heroEvents.find((item) => String(item.id) === buy.dataset.heroBuy);
      const ticketType = featuredEvent ? window.EventSphereEvents.availableTicketTypes(featuredEvent)[0] : null;
      if (!featuredEvent || !ticketType) {
        location.href = buy.href;
        return;
      }
      try {
        window.EventSphereCart.setFromEvent(featuredEvent, Number(ticketType.id), Number(ticketType.min_per_order || 1));
        location.href = window.EventSphereAuth?.isLoggedIn?.()
          ? '/checkout'
          : `/login?next=${encodeURIComponent('/checkout')}`;
      } catch (err) {
        window.tkToast?.(err.message || 'Unable to start checkout.', 'error');
      }
    });

    start();
  }

  function renderEventGrid(sectionSelector, gridSelector, events, limit) {
    const section = document.querySelector(sectionSelector);
    const grid = document.querySelector(gridSelector);
    if (!section || !grid) return;
    const visibleEvents = events.slice(0, limit);
    section.hidden = !visibleEvents.length;
    grid.innerHTML = visibleEvents.map((event, index) => window.EventSphereEvents.renderEventCard(event, index)).join('');
  }

  function renderTrending(events) {
    const trending = sortByTrending(events);
    renderEventGrid('[data-home-trending-section]', '[data-home-trending]', trending, 4);
  }

  function renderUpcomingWeek(events) {
    const now = Date.now();
    const weekEnd = now + (7 * 24 * 60 * 60 * 1000);
    const weekEvents = sortBySoonest(events.filter((event) => {
      const start = eventTimestamp(event, 'starts_at');
      const status = window.EventSphereEvents.salesStatus(event);
      return (start >= now && start <= weekEnd) || (status.key === 'live' && start <= weekEnd);
    }));
    renderEventGrid('[data-home-week-section]', '[data-home-week]', weekEvents, 4);
  }

  function renderCategorySections(categories) {
    const wrap = document.querySelector('[data-home-category-sections]');
    if (!wrap) return;
    const categoryGroups = categories?.length
      ? categories.map((category) => ({
        key: category.slug || category.key || categoryInfo(category.name).key,
        label: category.name || category.label || category.slug || 'Events',
        events: Array.isArray(category.events) ? category.events.filter(isPublicActiveEvent) : [],
      })).filter((category) => category.events.length)
      : [];

    wrap.innerHTML = categoryGroups.map((category) => {
      const cards = category.events.slice(0, 3).map((event, index) => window.EventSphereEvents.renderEventCard(event, index)).join('');
      return `<section class="section-sm" data-home-category-section="${window.EventSphereUtils.escapeHtml(category.key)}">
        <div class="container-xxl">
          <div class="section-title fade-up in">
            <div><div class="eyebrow">${window.EventSphereUtils.escapeHtml(category.label)}</div><h2 class="mt-2">${window.EventSphereUtils.escapeHtml(category.key === 'sports' ? tr('homepage.game_day_title', 'Game day, every day') : tr('homepage.newest_category_events', 'Newest {category} events', { category: category.label }))}</h2></div>
            <a class="btn btn-ghost" href="${window.EventSphereCategories.href(category.key)}">${window.EventSphereUtils.escapeHtml(tr('homepage.browse_category', 'Browse {category}', { category: category.label }))} <i class="bi bi-arrow-right ms-1"></i></a>
          </div>
          <div class="row g-4 fade-up in">${cards}</div>
        </div>
      </section>`;
    }).join('');
  }

  function startHeroCountdowns() {
    window.setInterval(() => {
      document.querySelectorAll('[data-hero-countdown]').forEach((el) => {
        el.textContent = countdownLabel(el.dataset.heroCountdown);
      });
    }, 1000);
  }

  function setNewsletterMessage(form, type, message) {
    const el = form?.querySelector('[data-newsletter-message]');
    if (!el) return;
    el.className = `newsletter-message ${type ? `is-${type}` : ''}`;
    el.textContent = message || '';
  }

  function setupNewsletter() {
    document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
      const input = form.querySelector('[data-newsletter-email]');
      const submit = form.querySelector('[data-newsletter-submit]');
      if (!input || !submit) return;

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = input.value.trim();
        if (!email || !input.checkValidity()) {
          setNewsletterMessage(form, 'error', tr('homepage.newsletter_invalid', 'Enter a valid email address.'));
          input.focus();
          return;
        }

        submit.disabled = true;
        setNewsletterMessage(form, '', tr('homepage.newsletter_subscribing', 'Subscribing...'));
        try {
          await window.EventSphereApi.fetch('/newsletter-subscriptions', {
            method: 'POST',
            body: {
              email,
              source: form.dataset.newsletterSource || 'events',
              language: window.TiketaLanguage?.getLanguage?.() || 'en',
            },
          });
          form.reset();
          setNewsletterMessage(form, 'success', tr('homepage.newsletter_success', 'You are subscribed. Watch your inbox for Tiketa updates.'));
        } catch (err) {
          setNewsletterMessage(form, 'error', err.message || tr('homepage.newsletter_failed', 'Subscription failed. Please try again.'));
        } finally {
          submit.disabled = false;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    setupNewsletter();
    hydrateNavCategories();
    document.querySelector('[data-home-trending]')?.insertAdjacentHTML('beforeend', window.EventSphereSkeleton?.eventCards?.(4, 'col-md-6 col-xl-3') || '');
    document.querySelector('[data-home-week]')?.insertAdjacentHTML('beforeend', window.EventSphereSkeleton?.eventCards?.(4, 'col-md-6 col-xl-3') || '');

    try {
      const data = await fetchHomepageData();
      homepageData = data;
      setupHeroSlider(uniqueEvents(data.featured, data.trending, data.upcoming));
      renderTrending(data.trending);
      renderUpcomingWeek(data.upcoming);
      renderCategorySections(data.categories);
      window.EventSphereFavorites?.syncFavoriteButtons();
      startHeroCountdowns();
      document.addEventListener('tiketa:language-changed', () => {
        if (homepageData?.categories) {
          renderCategorySections(homepageData.categories);
          window.EventSphereFavorites?.syncFavoriteButtons();
        }
      });
    } catch {
      document.querySelector('[data-hero-loading]')?.replaceChildren();
      document.querySelector('[data-home-trending-section]')?.setAttribute('hidden', '');
      document.querySelector('[data-home-week-section]')?.setAttribute('hidden', '');
      document.querySelector('[data-home-category-sections]')?.replaceChildren();
    }
  });
})();
