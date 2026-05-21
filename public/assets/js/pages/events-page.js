(function () {
  'use strict';

  const eventsApi = () => window.EventSphereEvents;
  const u = () => window.EventSphereUtils;

  let state = { page: 1, sort: 'trending', q: '', category: '', city: '', max_price: '' };

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
      });

      if (!events.length) {
        grid.innerHTML = '<div class="col-12 text-center text-muted-pro py-5">No events found.</div>';
      } else {
        grid.innerHTML = events.map((e, i) => eventsApi().renderEventCard(e, i)).join('');
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
    } catch (err) {
      grid.innerHTML = `<div class="col-12 text-center text-danger py-5">${u().escapeHtml(err.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const search = document.querySelector('[data-events-search]');
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

    document.querySelectorAll('.filter-card .filter-group:first-of-type .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-card .filter-group:first-of-type .chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    const applyBtn = document.querySelector('[data-events-apply-filters]');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const activeCategory = document.querySelector('.filter-card .filter-group:first-of-type .chip.active')?.textContent.trim();
        state.category = activeCategory && activeCategory !== 'All'
          ? activeCategory
          : (document.querySelector('[data-filter-category]')?.value || '');
        state.city = document.querySelector('[data-filter-city]')?.value || '';
        state.max_price = document.querySelector('[data-filter-max-price]')?.value || '';
        state.page = 1;
        load();
      });
    }

    load();
  });
})();
