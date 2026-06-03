(function () {
  'use strict';

  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;

  const categoryAliases = {
    concerts: 'Concerts',
    concert: 'Concerts',
    sports: 'Sports',
    sport: 'Sports',
    festivals: 'Festivals',
    festival: 'Festivals',
    theater: 'Theater',
    theatre: 'Theater',
    comedy: 'Comedy',
    family: 'Family',
    conferences: 'Conferences',
    conference: 'Conferences',
  };

  let state = { page: 1, sort: 'trending', q: '', category: '', city: '', max_price: '', date_from: '', date_to: '', view: 'grid' };

  function normalizeCategory(value) {
    const raw = (value || '').trim();
    if (!raw || raw.toLowerCase() === 'all') return '';
    return categoryAliases[raw.toLowerCase()] || raw;
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

  function syncUrl() {
    const qs = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
      if (value && !['page', 'view'].includes(key)) qs.set(key, value);
    });
    history.replaceState(null, '', `events.html${qs.toString() ? `?${qs}` : ''}`);
  }

  function syncCategoryChips() {
    document.querySelectorAll('[data-filter-category-chip]').forEach((chip) => {
      const value = chip.dataset.filterCategoryChip || '';
      chip.classList.toggle('active', state.category ? value === state.category : value === '');
    });
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
              <img src="${u().escapeHtml(u().eventImage(event))}" alt="" style="width:120px;height:86px;object-fit:cover;border-radius:10px"/>
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

  async function load() {
    const grid = document.getElementById('grid');
    const pagination = document.getElementById('events-pagination');
    if (!grid) return;

    grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-5">Loading events…</div>';

    try {
      const { events, meta } = await eventsApi().listEvents({
        page: state.page,
        per_page: 9,
        sort: state.sort,
        q: state.q || undefined,
        category: state.category || undefined,
        city: state.city || undefined,
        max_price: state.max_price || undefined,
        date_from: state.date_from || undefined,
        date_to: state.date_to || undefined,
      });

      if (!events.length) {
        grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-5">No events found.</div>';
      } else {
        grid.innerHTML = renderEvents(events);
      }

      if (pagination) {
        pagination.innerHTML = meta ? u().paginateLinks(meta) : '';
        pagination.querySelectorAll('[data-page]').forEach((a) => {
          a.addEventListener('click', (ev) => {
            ev.preventDefault();
            const p = Number(a.dataset.page);
            if (p >= 1 && (!meta || p <= meta.last_page)) {
              state.page = p;
              load();
            }
          });
        });
      }

      window.EventSphereFavorites?.syncFavoriteButtons();
      syncUrl();
    } catch (err) {
      grid.innerHTML = `<div class="col-12 text-center text-danger py-5">${u().escapeHtml(err.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    state.q = params.get('q') || '';
    state.category = normalizeCategory(params.get('category') || params.get('cat') || '');
    state.city = params.get('city') || '';
    state.date_from = params.get('date_from') || '';
    state.date_to = params.get('date_to') || '';
    state.max_price = params.get('max_price') || '';

    const search = document.querySelector('[data-events-search]');
    if (search) search.value = state.q;
    const cityInput = document.querySelector('[data-filter-city]');
    if (cityInput) cityInput.value = state.city;
    const priceInput = document.querySelector('[data-filter-max-price]');
    if (priceInput && state.max_price) priceInput.value = state.max_price;
    state.sort = normalizeSort(params.get('sort') || state.sort);
    syncCategoryChips();
    syncSortChips();

    const runSearch = () => {
      state.q = search?.value.trim() || '';
      state.page = 1;
      load();
    };
    if (search) {
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
      });
    }
    document.querySelector('[data-events-search-btn]')?.addEventListener('click', (e) => {
      e.preventDefault();
      runSearch();
    });

    document.querySelectorAll('[data-events-sort]').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-events-sort]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const map = { Trending: 'trending', Newest: 'newest', Soonest: 'soonest', 'Lowest price': 'lowest_price' };
        state.sort = map[chip.textContent.trim()] || 'trending';
        state.page = 1;
        load();
      });
    });

    document.querySelectorAll('[data-filter-category-chip]').forEach((chip) => {
      chip.addEventListener('click', () => {
        readFilterControls(chip.dataset.filterCategoryChip || '');
        state.page = 1;
        syncCategoryChips();
        load();
      });
    });

    const applyBtn = document.querySelector('[data-events-apply-filters]');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const activeCategory = document.querySelector('[data-filter-category-chip].active')?.dataset.filterCategoryChip || '';
        readFilterControls(activeCategory);
        state.page = 1;
        load();
      });
    }

    document.querySelector('[data-events-clear-filters]')?.addEventListener('click', (event) => {
      event.preventDefault();
      state = { page: 1, sort: 'trending', q: '', category: '', city: '', max_price: '', date_from: '', date_to: '', view: state.view };
      syncSortChips();
      syncCategoryChips();
      if (search) search.value = '';
      if (cityInput) cityInput.value = '';
      if (priceInput) priceInput.value = '500';
      const dateFilter = document.querySelector('[data-filter-date]');
      if (dateFilter) dateFilter.value = '';
      load();
    });

    priceInput?.addEventListener('input', () => {
      const label = priceInput.closest('.filter-group')?.querySelector('.text-muted-pro');
      if (label) label.textContent = `$0 – $${priceInput.value}`;
    });

    document.querySelectorAll('[data-events-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-events-view]').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        state.view = btn.dataset.eventsView || 'grid';
        load();
      });
    });

    load();
  });
})();
