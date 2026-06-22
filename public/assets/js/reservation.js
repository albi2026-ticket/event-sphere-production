/* =========================================================
   Event Sphere - Reservations: public venue discovery
   ========================================================= */
(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const fallbackImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80';

  const state = {
    venues: [],
    loading: false,
    lookupsLoaded: false,
    filters: {
      q: '',
      city: '',
      venue_type: '',
      cuisine: '',
      facility: '',
      sort: 'featured',
    },
  };

  function venueImage(venue) {
    return venue.images?.[0]?.url || venue.images?.[0]?.image_path || venue.logo_image || fallbackImage;
  }

  function titleCase(value) {
    return String(value || 'Venue').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function preview(items, fallback) {
    const names = (items || []).map((item) => item.name).filter(Boolean).slice(0, 3);
    return names.length ? names.join(', ') : fallback;
  }

  function card(venue) {
    const facilities = preview(venue.facilities, 'Facilities coming soon');
    const cuisines = preview(venue.cuisine_types, titleCase(venue.venue_type));
    const detailsUrl = `venue.html?venue=${encodeURIComponent(venue.slug)}`;
    return `
    <div class="col-lg-3 col-md-6">
      <a class="text-decoration-none" href="${detailsUrl}">
        <article class="venue-card">
          <div class="img-wrap">
            <img src="${esc(venueImage(venue))}" alt="${esc(venue.name)}" loading="lazy" />
            <div class="badges">
              ${venue.featured ? '<span class="chip-available"><i class="bi bi-stars"></i> Featured</span>' : '<span class="chip-available"><i class="bi bi-circle-fill" style="font-size:.4rem"></i> Reservations</span>'}
              <span class="fav"><i class="bi bi-heart"></i></span>
            </div>
          </div>
          <div class="body">
            <div class="d-flex justify-content-between gap-2">
              <h3 class="title m-0">${esc(venue.name)}</h3>
              <span class="rating"><i class="bi bi-cup-hot-fill"></i> ${esc(titleCase(venue.venue_type))}</span>
            </div>
            <div class="meta"><span>${esc(cuisines)}</span><span class="dot"></span><span><i class="bi bi-geo-alt"></i> ${esc(venue.city || '')}</span></div>
            <p class="desc m-0">${esc(venue.description || facilities)}</p>
            <div class="venue-preview-tags">${(venue.facilities || []).slice(0, 3).map((item) => `<span>${esc(item.name)}</span>`).join('')}</div>
            <div class="footer-row">
              <span class="small text-muted-pro"><i class="bi bi-egg-fried text-gold"></i> ${esc(facilities)}</span>
              <span class="btn btn-gold btn-sm">View</span>
            </div>
          </div>
        </article>
      </a>
    </div>`;
  }

  function fill(id, venues) {
    const el = document.getElementById(id);
    if (!el) return;
    if (state.loading) {
      el.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="col-lg-3 col-md-6">
          <article class="venue-card"><div class="img-wrap reservation-skeleton"></div><div class="body"><div class="reservation-skeleton-line"></div><div class="reservation-skeleton-line short"></div><div class="reservation-skeleton-line"></div></div></article>
        </div>
      `).join('');
      return;
    }
    el.innerHTML = venues.map(card).join('');
  }

  function render() {
    const venues = state.venues;
    const restaurants = venues.filter((venue) => venue.venue_type === 'restaurant');
    const bars = venues.filter((venue) => ['bar', 'lounge'].includes(venue.venue_type));
    const featured = venues.filter((venue) => venue.featured);

    fill('featuredGrid', (featured.length ? featured : venues).slice(0, 8));
    fill('popularGrid', (restaurants.length ? restaurants : venues).slice(0, 4));
    fill('barsGrid', (bars.length ? bars : venues).slice(0, 4));
    fill('trendingGrid', venues.slice(0, 4));
    fill('newGrid', [...venues].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 4));
    fill('nearbyGrid', venues.slice(0, 4));

    $('[data-venue-count]')?.replaceChildren(document.createTextNode(state.loading ? 'Loading venues...' : `${venues.length} venues`));
    $('[data-venue-empty]')?.toggleAttribute('hidden', state.loading || venues.length > 0);
  }

  function queryString() {
    const params = new URLSearchParams({ per_page: '48' });
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }

  async function loadVenues() {
    state.loading = true;
    render();
    try {
      const { data } = await api().fetch(`/venues?${queryString()}`, { skipAuthRedirect: true });
      state.venues = Array.isArray(data) ? data : [];
    } catch (err) {
      state.venues = [];
      window.tkToast?.(err?.message || 'Unable to load venues.', 'error');
    } finally {
      state.loading = false;
      render();
    }
  }

  function setOptions(selector, items, label) {
    const select = $(selector);
    if (!select) return;
    select.innerHTML = `<option value="">${label}</option>${items.map((item) => `<option value="${esc(item.slug)}">${esc(item.name)}</option>`).join('')}`;
  }

  async function loadLookups() {
    if (state.lookupsLoaded) return;
    try {
      const [cuisines, facilities] = await Promise.all([
        api().fetch('/cuisine-types', { skipAuthRedirect: true }),
        api().fetch('/venue-facilities', { skipAuthRedirect: true }),
      ]);
      setOptions('[data-venue-filter="cuisine"]', cuisines.data || [], 'All cuisines');
      setOptions('[data-venue-filter="facility"]', facilities.data || [], 'All facilities');
      state.lookupsLoaded = true;
    } catch {
      /* keep filters usable with base options */
    }
  }

  function bindFilters() {
    const form = $('[data-venue-search-form]');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      state.filters.q = String(form.elements.q?.value || '').trim();
      state.filters.city = String(form.elements.city?.value || '').trim();
      loadVenues();
    });

    form?.addEventListener('input', (event) => {
      if (!['q', 'city'].includes(event.target.name)) return;
      clearTimeout(form._venueTimer);
      form._venueTimer = setTimeout(() => {
        state.filters[event.target.name] = String(event.target.value || '').trim();
        loadVenues();
      }, 250);
    });

    document.querySelectorAll('[data-venue-filter]').forEach((control) => {
      control.addEventListener('change', () => {
        state.filters[control.dataset.venueFilter] = control.value;
        loadVenues();
      });
    });

    $('[data-venue-clear]')?.addEventListener('click', () => {
      state.filters = { q: '', city: '', venue_type: '', cuisine: '', facility: '', sort: 'featured' };
      if (form) form.reset();
      document.querySelectorAll('[data-venue-filter]').forEach((control) => {
        control.value = control.dataset.venueFilter === 'sort' ? 'featured' : '';
      });
      loadVenues();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindFilters();
    await loadLookups();
    await loadVenues();
  });
})();
