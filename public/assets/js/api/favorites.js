(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;

  async function listFavorites(params = {}) {
    const qs = new URLSearchParams({ per_page: 100, ...params });
    const { data } = await api().fetch(`/me/favorites?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  }

  async function toggleFavorite(eventId) {
    const { data } = await api().fetch('/me/favorites/toggle', {
      method: 'POST',
      body: { event_id: eventId },
    });
    return data;
  }

  async function removeFavorite(eventId) {
    await api().fetch(`/me/favorites/${eventId}`, { method: 'DELETE' });
    return { event_id: eventId, is_favorited: false };
  }

  function paintFavoriteButton(btn, isFavorited) {
    btn.classList.toggle('active', !!isFavorited);
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-heart-fill', !!isFavorited);
      icon.classList.toggle('bi-heart', !isFavorited);
    }
    btn.setAttribute('aria-pressed', isFavorited ? 'true' : 'false');
    btn.setAttribute('title', isFavorited ? 'Remove from favorites' : 'Save to favorites');
  }

  function updateFavoriteButtons(eventId, isFavorited) {
    document.querySelectorAll(`[data-event-id="${eventId}"][data-fav]`).forEach((btn) => {
      paintFavoriteButton(btn, isFavorited);
    });
  }

  async function syncFavoriteButtons() {
    document.querySelectorAll('[data-event-id][data-fav]').forEach((btn) => paintFavoriteButton(btn, false));
    if (!auth().isLoggedIn()) return;
    try {
      const favs = await listFavorites();
      const ids = new Set(favs.map((f) => String(f.event_id || f.id)));
      document.querySelectorAll('[data-event-id][data-fav]').forEach((btn) => {
        const id = btn.getAttribute('data-event-id');
        paintFavoriteButton(btn, ids.has(String(id)));
      });
    } catch {
      /* ignore */
    }
  }

  window.EventSphereFavorites = { listFavorites, toggleFavorite, removeFavorite, syncFavoriteButtons, updateFavoriteButtons };
})();
