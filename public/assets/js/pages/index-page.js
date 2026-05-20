(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {
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
