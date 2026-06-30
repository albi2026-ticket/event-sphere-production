(function () {
  'use strict';

  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;

  const categoryAliases = {
    concert: 'concerts',
    concerts: 'concerts',
    sports: 'sports',
    sport: 'sports',
    festivals: 'festivals',
    festival: 'festivals',
    theater: 'theater',
    theatre: 'theater',
    comedy: 'comedy',
    family: 'family',
    conferences: 'conferences',
    conference: 'conferences',
  };

  const categoryRoutes = () => window.EventSphereCategories || {
    slug(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },
  };

  let state = { page: 1, sort: 'trending', q: '', category: '', city: '', max_price: '', date_from: '', date_to: '', view: 'grid', loadRequestId: 0 };
  const eventCache = new Map();
  const eventRequests = new Map();
  let categoryRequest = null;
  let lastRenderedKey = '';
  let lastRenderedEvents = [];
  let lastRenderedMeta = null;
  let searchTimer = null;

  function debounce(callback, delay = 300) {
    return (...args) => {
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => callback(...args), delay);
    };
  }

  function onIdle(callback) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 800 });
      return;
    }

    window.setTimeout(callback, 0);
  }

  function elements() {
    return {
      applyBtn: document.querySelector('[data-events-apply-filters]'),
      categoryChips: document.querySelector('[data-events-category-chips]'),
      cityInput: document.querySelector('[data-filter-city]'),
      clearFilters: document.querySelector('[data-events-clear-filters]'),
      dateFilter: document.querySelector('[data-filter-date]'),
      grid: document.getElementById('grid'),
      pagination: document.getElementById('events-pagination'),
      priceInput: document.querySelector('[data-filter-max-price]'),
      search: document.querySelector('[data-events-search]'),
      searchBtn: document.querySelector('[data-events-search-btn]'),
      sortChips: document.querySelectorAll('[data-events-sort]'),
      viewButtons: document.querySelectorAll('[data-events-view]'),
    };
  }

  function bindCategoryChips(root) {
    if (!root || root.dataset.boundCategoryChips === 'true') return;
    root.dataset.boundCategoryChips = 'true';
    root.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-filter-category-chip]');
      if (!chip || !root.contains(chip)) return;
      event.preventDefault();
      const category = normalizeCategory(chip.dataset.filterCategoryChip || '');
      readFilterControls(category);
      state.page = 1;
      syncCategoryChips();
      syncUrl('push');
      load();
    });
  }

  async function loadCategories() {
    const wrap = document.querySelector('[data-events-category-chips]');
    if (!wrap) return;
    if (categoryRequest) return categoryRequest;

    categoryRequest = (async () => {
      const base = window.EventSphereConfig?.API_BASE_URL || document.querySelector('meta[name="api-base"]')?.content;
      const response = await fetch(`${base.replace(/\/$/, '')}/categories`, { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      const categories = Array.isArray(payload.data) ? payload.data : [];
      if (!categories.length) return;
      wrap.innerHTML = '<span class="chip active" data-filter-category-chip="">All</span>' + categories
        .map((category) => `<span class="chip" data-filter-category-chip="${u().escapeHtml(normalizeCategory(category.slug || category.name))}">${u().escapeHtml(category.name)}</span>`)
        .join('');
      bindCategoryChips(wrap);
      syncCategoryChips();
    })();

    try {
      await categoryRequest;
    } catch {
      /* keep static fallback */
    } finally {
      categoryRequest = null;
    }
  }

  function normalizeCategory(value) {
    const raw = (value || '').trim();
    if (!raw || raw.toLowerCase() === 'all') return '';
    const slug = categoryRoutes().slug(raw);
    return categoryAliases[slug] || slug;
  }

  function normalizeSort(value) {
    return ['trending', 'newest', 'soonest', 'lowest_price'].includes(value) ? value : 'trending';
  }

  function dateRange(value) {
    const now = new Date();
    const iso = (date) => date.toISOString().slice(0, 10);
    if (value === 'today') return { date_from: iso(now), date_to: iso(now) };
    if (value === 'weekend') {
      const day = now.getDay();
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + ((6 - day + 7) % 7));
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      return { date_from: iso(saturday), date_to: iso(sunday) };
    }
    if (value === 'month') {
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { date_from: iso(now), date_to: iso(end) };
    }
    return { date_from: '', date_to: '' };
  }

  function readFilterControls(category = state.category) {
    const range = dateRange(document.querySelector('[data-filter-date]')?.value || '');
    const priceValue = document.querySelector('[data-filter-max-price]')?.value || '';
    state.category = normalizeCategory(category);
    state.city = document.querySelector('[data-filter-city]')?.value || '';
    state.max_price = priceValue && priceValue !== '500' ? priceValue : '';
    state.date_from = range.date_from;
    state.date_to = range.date_to;
  }

  function categoryUrl(category) {
    const qs = new URLSearchParams();
    Object.entries({ ...state, category }).forEach(([key, value]) => {
      if (value && !['page', 'view'].includes(key)) qs.set(key, value);
    });
    return `${location.pathname.split('/').pop() || 'events.html'}${qs.toString() ? `?${qs}` : ''}`;
  }

  function syncUrl(mode = 'replace') {
    const url = categoryUrl(state.category);
    if (mode === 'push') history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }

  function syncCategoryChips() {
    document.querySelectorAll('[data-filter-category-chip]').forEach((chip) => {
      const value = chip.dataset.filterCategoryChip || '';
      chip.classList.toggle('active', state.category ? normalizeCategory(value) === state.category : value === '');
    });
  }

  function syncStateFromUrl() {
    const params = new URLSearchParams(location.search);
    state.q = params.get('q') || '';
    state.category = normalizeCategory(params.get('category') || params.get('cat') || '');
    state.city = params.get('city') || '';
    state.date_from = params.get('date_from') || '';
    state.date_to = params.get('date_to') || '';
    state.max_price = params.get('max_price') || '';
    state.sort = normalizeSort(params.get('sort') || state.sort);
    state.page = Number(params.get('page') || 1) || 1;
  }

  function syncControlsFromState() {
    const search = document.querySelector('[data-events-search]');
    if (search) search.value = state.q;
    const cityInput = document.querySelector('[data-filter-city]');
    if (cityInput) cityInput.value = state.city;
    const priceInput = document.querySelector('[data-filter-max-price]');
    if (priceInput && state.max_price) priceInput.value = state.max_price;
    syncCategoryChips();
    syncSortChips();
  }

  function syncSortChips() {
    const labelBySort = { trending: 'Trending', newest: 'Newest', soonest: 'Soonest', lowest_price: 'Lowest price' };
    document.querySelectorAll('[data-events-sort]').forEach((chip) => {
      chip.classList.toggle('active', chip.textContent.trim() === (labelBySort[state.sort] || 'Trending'));
    });
  }

  function renderEvents(events) {
    if (state.view === 'list') {
      return events.map((event) => {
        const date = u().formatEventDate(event.starts_at, event.timezone);
        const price = eventsApi().lowestAvailablePrice(event);
        const status = eventsApi().salesStatus(event);
        return `
          <div class="col-12">
            <article class="card-pro p-3 d-flex gap-3 align-items-center flex-wrap">
              <img loading="lazy" decoding="async" src="${u().escapeHtml(u().eventImage(event))}" alt="" style="width:120px;height:86px;object-fit:cover;border-radius:10px"/>
              <div class="flex-grow-1">
                <div class="meta"><i class="bi bi-calendar3"></i> ${u().escapeHtml(date)}</div>
                <h3 class="title mb-1"><a href="event-details.html?slug=${encodeURIComponent(event.slug)}" style="color:inherit">${u().escapeHtml(event.title)}</a></h3>
                <div class="venue"><i class="bi bi-geo-alt"></i> ${u().escapeHtml(event.venue_name || '')}${event.city ? `, ${u().escapeHtml(event.city)}` : ''}</div>
              </div>
              <div class="text-end">
                <div class="price mb-2">${status.canBuy ? `From ${u().formatMoney(price.amount, price.currency)}` : status.priceLabel}</div>
                <a class="btn btn-glass btn-sm" href="event-details.html?slug=${encodeURIComponent(event.slug)}">View</a>
              </div>
              <span class="fav" data-fav="event-${event.id}" data-event-id="${event.id}" style="position:static"><i class="bi bi-heart"></i></span>
            </article>
          </div>`;
      }).join('');
    }

    return events.map((e, i) => eventsApi().renderEventCard(e, i)).join('');
  }

  function eventRequestParams() {
    return {
      page: state.page,
      per_page: 9,
      sort: state.sort,
      q: state.q || undefined,
      category: state.category || undefined,
      city: state.city || undefined,
      max_price: state.max_price || undefined,
      date_from: state.date_from || undefined,
      date_to: state.date_to || undefined,
    };
  }

  function requestKey(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
    });
    return qs.toString();
  }

  async function fetchEvents(params) {
    const key = requestKey(params);
    if (eventCache.has(key)) return eventCache.get(key);
    if (eventRequests.has(key)) return eventRequests.get(key);

    const request = eventsApi().listEvents(params)
      .then((result) => {
        eventCache.set(key, result);
        return result;
      })
      .finally(() => {
        eventRequests.delete(key);
      });

    eventRequests.set(key, request);
    return request;
  }

  function renderPage(events, meta, grid, pagination) {
    if (!events.length) {
      grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-5">No events found.</div>';
    } else {
      grid.innerHTML = renderEvents(events);
    }

    if (pagination) {
      pagination.innerHTML = meta ? u().paginateLinks(meta) : '';
    }

    onIdle(() => window.EventSphereFavorites?.syncFavoriteButtons());
    syncUrl();
  }

  async function load() {
    const { grid, pagination } = elements();
    if (!grid) return;

    const params = eventRequestParams();
    const key = requestKey(params);
    if (key === lastRenderedKey && lastRenderedEvents.length) {
      renderPage(lastRenderedEvents, lastRenderedMeta, grid, pagination);
      return;
    }

    const requestId = state.loadRequestId + 1;
    state.loadRequestId = requestId;

    if (eventCache.has(key)) {
      const { events, meta } = eventCache.get(key);
      lastRenderedKey = key;
      lastRenderedEvents = events;
      lastRenderedMeta = meta;
      renderPage(events, meta, grid, pagination);
      return;
    }

    grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-5">Loading events…</div>';

    try {
      const { events, meta } = await fetchEvents(params);
      if (requestId !== state.loadRequestId) return;
      lastRenderedKey = key;
      lastRenderedEvents = events;
      lastRenderedMeta = meta;
      renderPage(events, meta, grid, pagination);
    } catch (err) {
      if (requestId !== state.loadRequestId) return;
      grid.innerHTML = `<div class="col-12 text-center text-danger py-5">${u().escapeHtml(err.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncStateFromUrl();

    const els = elements();
    const search = els.search;
    const cityInput = els.cityInput;
    const priceInput = els.priceInput;
    syncControlsFromState();

    const runSearch = () => {
      state.q = search?.value.trim() || '';
      state.page = 1;
      load();
    };
    const debouncedSearch = debounce(runSearch, 350);
    if (search) {
      search.addEventListener('input', () => {
        if ((search.value.trim() || '') === state.q) return;
        debouncedSearch();
      });
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (searchTimer) window.clearTimeout(searchTimer);
          runSearch();
        }
      });
    }
    els.searchBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (searchTimer) window.clearTimeout(searchTimer);
      runSearch();
    });

    els.sortChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        els.sortChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const map = { Trending: 'trending', Newest: 'newest', Soonest: 'soonest', 'Lowest price': 'lowest_price' };
        state.sort = map[chip.textContent.trim()] || 'trending';
        state.page = 1;
        load();
      });
    });

    bindCategoryChips(els.categoryChips);

    const applyBtn = els.applyBtn;
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const activeCategory = document.querySelector('[data-filter-category-chip].active')?.dataset.filterCategoryChip || '';
        readFilterControls(activeCategory);
        state.page = 1;
        load();
      });
    }

    els.clearFilters?.addEventListener('click', (event) => {
      event.preventDefault();
      state = { page: 1, sort: 'trending', q: '', category: '', city: '', max_price: '', date_from: '', date_to: '', view: state.view };
      syncSortChips();
      syncCategoryChips();
      if (search) search.value = '';
      if (cityInput) cityInput.value = '';
      if (priceInput) priceInput.value = '500';
      const dateFilter = els.dateFilter;
      if (dateFilter) dateFilter.value = '';
      load();
    });

    window.addEventListener('popstate', () => {
      syncStateFromUrl();
      syncControlsFromState();
      load();
    });

    priceInput?.addEventListener('input', () => {
      const label = priceInput.closest('.filter-group')?.querySelector('.text-muted-pro');
      if (label) label.textContent = `$0 – $${priceInput.value}`;
    });

    els.pagination?.addEventListener('click', (ev) => {
      const link = ev.target.closest('[data-page]');
      if (!link || !els.pagination.contains(link)) return;
      ev.preventDefault();
      const p = Number(link.dataset.page);
      const meta = lastRenderedMeta;
      if (p >= 1 && (!meta || p <= meta.last_page)) {
        state.page = p;
        load();
      }
    });

    els.viewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.viewButtons.forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        state.view = btn.dataset.eventsView || 'grid';
        if (lastRenderedEvents.length) {
          renderPage(lastRenderedEvents, lastRenderedMeta, els.grid, els.pagination);
          return;
        }
        load();
      });
    });

    loadCategories();
    load();
  });
})();
