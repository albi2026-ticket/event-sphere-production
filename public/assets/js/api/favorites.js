(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;

  async function listFavorites() {
    const { data } = await api().fetch('/me/favorites');
    return Array.isArray(data) ? data : [];
  }

  async function toggleFavorite(eventId) {
    const { data } = await api().fetch('/me/favorites/toggle', {
      method: 'POST',
      body: { event_id: eventId },
    });
    return data;
  }

  async function syncFavoriteButtons() {
    if (!auth().isLoggedIn()) return;
    try {
      const favs = await listFavorites();
      const ids = new Set(favs.map((f) => String(f.event_id || f.id)));
      document.querySelectorAll('[data-event-id][data-fav]').forEach((btn) => {
        const id = btn.getAttribute('data-event-id');
        btn.classList.toggle('active', ids.has(String(id)));
      });
    } catch {
      /* ignore */
    }
  }

  window.EventSphereFavorites = { listFavorites, toggleFavorite, syncFavoriteButtons };
})();
