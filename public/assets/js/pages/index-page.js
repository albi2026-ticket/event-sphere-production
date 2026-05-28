(function () {
  'use strict';

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
    try {
      const { events } = await window.EventSphereEvents.listEvents({ trending: 1, per_page: 4 });
      if (events.length) {
        grid.innerHTML = events.map((e, i) => window.EventSphereEvents.renderEventCard(e, i)).join('');
        window.EventSphereFavorites?.syncFavoriteButtons();
      }
    } catch {
      /* keep static fallback */
    }
  });
})();
