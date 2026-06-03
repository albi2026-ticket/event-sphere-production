(function () {
  'use strict';

  let activeTrendingFilter = 'all';

  const categoryAliases = {
    concert: { key: 'concerts', label: 'Concerts' },
    concerts: { key: 'concerts', label: 'Concerts' },
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

  const categoryPriority = ['concerts', 'sports', 'festivals', 'theater', 'comedy', 'family', 'nightlife', 'conferences'];

  function iso(date) {
    return date.toISOString().slice(0, 10);
  }

  function trendingParams(filter) {
    const params = { sort: 'newest', per_page: 3 };
    const now = new Date();

    if (filter === 'week') {
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      params.date_from = iso(now);
      params.date_to = iso(end);
    }

    if (filter === 'month') {
      params.date_from = iso(now);
      params.date_to = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }

    if (filter === 'near') {
      const city = document.querySelector('[data-home-city]')?.value.trim()
        || window.EventSphereAuth?.getUser?.()?.default_city
        || '';
      if (city) params.city = city;
    }

    return params;
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

  async function fetchNewestPublishedEvents() {
    const first = await window.EventSphereEvents.listEvents({ sort: 'newest', per_page: 100 });
    const events = [...first.events];
    const lastPage = Number(first.meta?.last_page || 1);

    for (let page = 2; page <= lastPage; page += 1) {
      const result = await window.EventSphereEvents.listEvents({ sort: 'newest', per_page: 100, page });
      events.push(...result.events);
    }

    return events;
  }

  function groupedCategories(events) {
    const groups = new Map();
    events.forEach((event) => {
      const { key, label } = categoryInfo(event.category);
      if (!groups.has(key)) groups.set(key, { key, label, events: [] });
      groups.get(key).events.push(event);
    });

    return [...groups.values()].sort(categorySort);
  }

  function renderCategorySections(categories) {
    const wrap = document.querySelector('[data-home-category-sections]');
    if (!wrap) return;

    wrap.innerHTML = categories.map((category) => {
      const cards = category.events.slice(0, 3).map((event, index) => window.EventSphereEvents.renderEventCard(event, index)).join('');
      return `<section class="section-sm" data-home-category-section="${window.EventSphereUtils.escapeHtml(category.key)}">
        <div class="container-xxl">
          <div class="section-title fade-up in">
            <div><div class="eyebrow">${window.EventSphereUtils.escapeHtml(category.label)}</div><h2 class="mt-2">${category.key === 'sports' ? 'Game day, every day' : `Newest ${window.EventSphereUtils.escapeHtml(category.label)} events`}</h2></div>
            <a class="btn btn-ghost" href="events.html?category=${encodeURIComponent(category.label)}">Browse ${window.EventSphereUtils.escapeHtml(category.label)} <i class="bi bi-arrow-right ms-1"></i></a>
          </div>
          <div class="row g-4 fade-up in">${cards}</div>
        </div>
      </section>`;
    }).join('');
  }

  async function loadTrending(grid) {
    const filter = activeTrendingFilter;
    if (filter === 'near' && !trendingParams(filter).city) {
      window.tkToast?.('Enter a city to see nearby events.', 'info');
      document.querySelector('[data-home-city]')?.focus();
      return;
    }

    grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-4">Loading events...</div>';
    const { events } = await window.EventSphereEvents.listEvents(trendingParams(filter));
    if (filter !== activeTrendingFilter) return;

    const section = document.querySelector('[data-home-trending-section]');
    if (!events.length) {
      if (section) section.hidden = true;
      grid.innerHTML = '';
      return;
    }

    if (section) section.hidden = false;
    grid.innerHTML = events.slice(0, 3).map((event, index) => window.EventSphereEvents.renderEventCard(event, index)).join('');
    window.EventSphereFavorites?.syncFavoriteButtons();
  }

  async function loadHomepageCategories() {
    const events = await fetchNewestPublishedEvents();
    const categories = groupedCategories(events);
    renderCategorySections(categories);
    window.EventSphereFavorites?.syncFavoriteButtons();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const runHomeSearch = () => {
      const qs = new URLSearchParams();
      const query = document.querySelector('[data-home-search]')?.value.trim();
      const city = document.querySelector('[data-home-city]')?.value.trim();
      const date = document.querySelector('[data-home-date]')?.value;
      if (query) qs.set('q', query);
      if (city) qs.set('city', city);
      if (date) qs.set('date_from', date);
      location.href = `events.html${qs.toString() ? `?${qs}` : ''}`;
    };

    document.querySelector('[data-home-search-btn]')?.addEventListener('click', runHomeSearch);
    document.querySelectorAll('[data-home-search], [data-home-city], [data-home-date]').forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          runHomeSearch();
        }
      });
    });

    const grid = document.querySelector('[data-home-trending]');
    document.querySelectorAll('[data-home-trending-filter]').forEach((chip) => {
      chip.addEventListener('click', async () => {
        const filter = chip.dataset.homeTrendingFilter || 'all';
        if (filter === 'near' && !trendingParams(filter).city) {
          window.tkToast?.('Enter a city to see nearby events.', 'info');
          document.querySelector('[data-home-city]')?.focus();
          return;
        }
        activeTrendingFilter = filter;
        document.querySelectorAll('[data-home-trending-filter]').forEach((item) => item.classList.toggle('active', item === chip));
        try {
          await loadTrending(grid);
        } catch {
          grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-4">Events could not be loaded.</div>';
        }
      });
    });

    try {
      await Promise.all([
        grid ? loadTrending(grid) : Promise.resolve(),
        loadHomepageCategories(),
      ]);
    } catch {
      document.querySelector('[data-home-category-sections]')?.replaceChildren();
      if (grid) grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-4">Events could not be loaded.</div>';
    }
  });
})();
