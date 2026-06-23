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
    discoveryView: 'featured',
    discoveryExpanded: false,
    filters: {
      q: '',
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
    return String(value || 'Restaurant / Bar').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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
            </div>
          </div>
          <div class="body">
            <div class="d-flex justify-content-between gap-2">
              <h3 class="title m-0">${esc(venue.name)}</h3>
              <span class="rating"><i class="bi bi-cup-hot-fill"></i> ${esc(titleCase(venue.venue_type))}</span>
            </div>
            <div class="meta"><span>${esc(cuisines)}</span><span class="dot"></span><span><i class="bi bi-geo-alt"></i> ${esc(venue.city || '')}</span></div>
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

  function newestFirst(venues) {
    return [...venues].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function discoveryVenues(venues) {
    if (state.discoveryView === 'new') {
      return newestFirst(venues);
    }

    if (state.discoveryView === 'popular') {
      return venues;
    }

    const featured = venues.filter((venue) => venue.featured);
    return featured.length ? featured : venues;
  }

  function updateDiscoveryHeading(count) {
    const title = $('[data-main-discovery-title]');
    const subtitle = $('[data-main-discovery-subtitle]');
    const emptyTitle = $('[data-venue-empty-title]');
    const emptyCopy = $('[data-venue-empty-copy]');

    const headings = {
      featured: {
        title: 'Featured <span class="grad-res-text">Restaurants & Bars</span>',
        subtitle: 'Discover our hand-picked restaurants and bars.',
      },
      popular: {
        title: 'Popular <span class="grad-res-text">This Week</span>',
        subtitle: 'Explore places guests are discovering right now.',
      },
      new: {
        title: 'New on <span class="grad-res-text">Event Sphere</span>',
        subtitle: 'Freshly added restaurants, bars, lounges, and cafés.',
      },
    };

    const current = headings[state.discoveryView] || headings.featured;
    if (title) title.innerHTML = current.title;
    if (subtitle) subtitle.textContent = current.subtitle;

    if (emptyTitle) {
      emptyTitle.textContent = state.filters.q
        ? 'No matching places found for your search.'
        : 'No Restaurants & Bars found.';
    }
    if (emptyCopy) {
      emptyCopy.textContent = state.filters.q
        ? 'Try searching another restaurant, bar, café, lounge, or city.'
        : 'Check back soon for new restaurants and bars.';
    }

    $('[data-venue-count]')?.replaceChildren(document.createTextNode(
      state.loading ? 'Loading restaurants & bars...' : `${count} restaurants & bars`
    ));
  }

  function render() {
    const venues = state.venues;
    const mainVenues = discoveryVenues(venues);
    const visibleMainVenues = state.discoveryExpanded ? mainVenues : mainVenues.slice(0, 8);

    fill('featuredGrid', visibleMainVenues);
    fill('popularGrid', venues.slice(0, 4));
    fill('newGrid', newestFirst(venues).slice(0, 4));

    updateDiscoveryHeading(mainVenues.length);
    $('[data-venue-empty]')?.toggleAttribute('hidden', state.loading || mainVenues.length > 0);

    document.querySelectorAll('[data-discovery-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.discoveryView === state.discoveryView);
      button.setAttribute('aria-pressed', button.dataset.discoveryView === state.discoveryView ? 'true' : 'false');
    });
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
      window.tkToast?.(err?.message || 'Unable to load restaurants & bars.', 'error');
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
      loadVenues();
    });

    form?.addEventListener('input', (event) => {
      if (event.target.name !== 'q') return;
      clearTimeout(form._venueTimer);
      form._venueTimer = setTimeout(() => {
        state.filters.q = String(event.target.value || '').trim();
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
      state.filters = { q: '', venue_type: '', cuisine: '', facility: '', sort: 'featured' };
      state.discoveryView = 'featured';
      state.discoveryExpanded = false;
      if (form) form.reset();
      document.querySelectorAll('[data-venue-filter]').forEach((control) => {
        control.value = control.dataset.venueFilter === 'sort' ? 'featured' : '';
      });
      loadVenues();
    });

    document.querySelectorAll('[data-discovery-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.dataset.discoveryView || 'featured';
        state.discoveryView = view;
        state.discoveryExpanded = true;
        state.filters.sort = view === 'new' ? 'newest' : 'featured';
        const sortControl = $('[data-venue-filter="sort"]');
        if (sortControl) sortControl.value = state.filters.sort;
        loadVenues().then(() => {
          $('[data-main-discovery-title]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindFilters();
    await loadLookups();
    await loadVenues();
  });
})();
