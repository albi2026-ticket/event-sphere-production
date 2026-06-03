(function () {
  'use strict';

  let activeTrendingFilter = 'all';

  function iso(date) {
    return date.toISOString().slice(0, 10);
  }

  function trendingParams(filter) {
    const params = { trending: 1, sort: 'trending', per_page: 4 };
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

  async function loadTrending(grid) {
    const filter = activeTrendingFilter;
    if (filter === 'near' && !trendingParams(filter).city) {
      window.tkToast?.('Enter a city to see nearby trending events.', 'info');
      document.querySelector('[data-home-city]')?.focus();
      return;
    }

    grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-4">Loading trending events...</div>';
    const { events } = await window.EventSphereEvents.listEvents(trendingParams(filter));
    if (filter !== activeTrendingFilter) return;

    grid.innerHTML = events.length
      ? events.map((e, i) => window.EventSphereEvents.renderEventCard(e, i)).join('')
      : '<div class="col-12 text-center text-muted-pro py-4">No trending events found.</div>';
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
    if (!grid) return;
    const fallbackTrendingHtml = grid.innerHTML;
    document.querySelectorAll('[data-home-trending-filter]').forEach((chip) => {
      chip.addEventListener('click', async () => {
        const filter = chip.dataset.homeTrendingFilter || 'all';
        if (filter === 'near' && !trendingParams(filter).city) {
          window.tkToast?.('Enter a city to see nearby trending events.', 'info');
          document.querySelector('[data-home-city]')?.focus();
          return;
        }
        activeTrendingFilter = filter;
        document.querySelectorAll('[data-home-trending-filter]').forEach((item) => item.classList.toggle('active', item === chip));
        try {
          await loadTrending(grid);
        } catch {
          grid.innerHTML = fallbackTrendingHtml;
        }
      });
    });

    try {
      await loadTrending(grid);
    } catch {
      grid.innerHTML = fallbackTrendingHtml;
      /* keep static fallback */
    }
  });
})();
