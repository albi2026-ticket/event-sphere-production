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

  async function getFavoriteStatus(eventId) {
    const { data } = await api().fetch(`/me/favorites/${eventId}/status`);
    return data;
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
    const buttons = Array.from(document.querySelectorAll('[data-event-id][data-fav]'));
    buttons.forEach((btn) => paintFavoriteButton(btn, false));
    if (!auth().isLoggedIn()) return;
    try {
      const uniqueIds = [...new Set(buttons.map((btn) => btn.getAttribute('data-event-id')).filter(Boolean))];
      if (uniqueIds.length === 1) {
        const status = await getFavoriteStatus(uniqueIds[0]);
        updateFavoriteButtons(uniqueIds[0], status?.is_favorited);
        return;
      }

      const favs = await listFavorites();
      const ids = new Set(favs.map((f) => String(f.event_id || f.id)));
      buttons.forEach((btn) => {
        const id = btn.getAttribute('data-event-id');
        paintFavoriteButton(btn, ids.has(String(id)));
      });
    } catch {
      /* ignore */
    }
  }

  window.EventSphereFavorites = { listFavorites, getFavoriteStatus, toggleFavorite, removeFavorite, syncFavoriteButtons, updateFavoriteButtons };
})();
