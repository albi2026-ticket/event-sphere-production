/* Injects shared header + footer into pages that include <div data-partial="header"></div> */
(function(){
  const CategoryRoutes = window.EventSphereCategories || {
    slug(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },
    href(value) {
      const slug = this.slug(value);
      return slug ? `events.html?category=${encodeURIComponent(slug)}` : 'events.html';
    },
  };
  window.EventSphereCategories = CategoryRoutes;

  const headerHTML = `
<nav class="navbar navbar-expand-lg nav-blur">
  <div class="container-xxl">
    <a class="brand" href="index.html"><span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>Event Sphere</a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"><i class="bi bi-list fs-3" style="color:var(--text)"></i></button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav mx-auto gap-1">
        <li class="nav-item"><a class="nav-link nav-link-pro" href="index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link nav-link-pro" href="events.html">Events</a></li>
        <li class="nav-item dropdown">
          <a class="nav-link nav-link-pro dropdown-toggle" data-bs-toggle="dropdown" href="#">Categories</a>
          <ul class="dropdown-menu mt-2" data-nav-categories style="background:var(--card);border:1px solid var(--border);border-radius:14px">
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href('Concerts')}"><i class="bi bi-music-note-beamed me-2"></i>Concerts</a></li>
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href('Sports')}"><i class="bi bi-trophy me-2"></i>Sports</a></li>
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href('Festivals')}"><i class="bi bi-stars me-2"></i>Festivals</a></li>
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href('Conferences')}"><i class="bi bi-mic me-2"></i>Conferences</a></li>
          </ul>
        </li>
      </ul>
      <div class="d-flex align-items-center gap-2">
        <button class="icon-btn" data-theme-toggle><i class="bi bi-sun" data-theme-icon></i></button>
        <a class="btn btn-ghost" href="login.html" data-auth-guest>Sign In</a>
        <a class="btn btn-primary-grad" href="register.html" data-auth-guest>Register</a>
        <a class="btn btn-ghost" href="dashboard.html" data-auth-user data-auth-dashboard-link hidden>My Tickets</a>
        <a class="btn btn-primary-grad" href="#" data-auth-user data-logout hidden>Sign Out</a>
      </div>
    </div>
  </div>
</nav>`;
  const footerHTML = `
<footer class="footer">
  <div class="container-xxl">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand mb-3" href="index.html"><span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>Event Sphere</a>
        <p>The premium marketplace to discover, buy, and manage tickets for live events with confidence.</p>
        <div class="footer-social" aria-label="Social links">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X Twitter"><i class="bi bi-twitter-x"></i></a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
        </div>
      </div>
    </div>

    <div class="footer-links-grid">
      <div>
        <h6>Company</h6>
        <a href="about.html">About Event Sphere</a>
        <a href="help-center.html#contact">Contact Us</a>
        <a href="careers.html">Careers</a>
        <span>Blog</span>
      </div>
      <div>
        <h6>Support</h6>
        <a href="help-center.html">Help Center</a>
        <a href="faqs.html">FAQs</a>
        <a href="help-center.html#ticket-support">Ticket Support</a>
        <a href="refund-policy.html">Refund Policy</a>
      </div>
      <div>
        <h6>Organizers</h6>
        <a href="organizer.html">Become an Organizer</a>
        <a href="organizer-guide.html">Organizer Guide</a>
        <a href="organizer.html">Create Event</a>
      </div>
      <div>
        <h6>Legal</h6>
        <a href="terms-of-service.html">Terms of Service</a>
        <a href="privacy-policy.html">Privacy Policy</a>
        <a href="privacy-policy.html#cookies">Cookie Policy</a>
      </div>
    </div>

    <div class="legal">
      <div>© Event Sphere <span data-year></span></div>
      <div class="footer-badges">
        <span><i class="bi bi-shield-check"></i> Secure Ticket Purchases</span>
        <span><i class="bi bi-qr-code"></i> QR Ticket Entry</span>
        <span><i class="bi bi-patch-check"></i> Verified Organizers</span>
      </div>
    </div>
  </div>
</footer>`;
  document.querySelectorAll('[data-partial="header"]').forEach(el => el.outerHTML = headerHTML);
  document.querySelectorAll('[data-partial="footer"]').forEach(el => el.outerHTML = footerHTML);
  async function hydrateCategories() {
    const menus = document.querySelectorAll('[data-nav-categories]');
    if (!menus.length) return;
    try {
      const base = document.querySelector('meta[name="api-base"]')?.content || 'http://127.0.0.1:8000/api';
      const response = await fetch(`${base.replace(/\/$/, '')}/categories`, { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      const categories = Array.isArray(payload.data) ? payload.data : [];
      if (!categories.length) return;
      menus.forEach((menu) => {
        menu.innerHTML = categories.map((category) => `<li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href(category.slug || category.name)}"><i class="bi ${category.icon || 'bi-tag'} me-2"></i>${category.name}</a></li>`).join('');
      });
    } catch {
      /* keep static fallback */
    }
  }
  hydrateCategories();
  document.dispatchEvent(new CustomEvent('event-sphere:partials-loaded'));
})();
