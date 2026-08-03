/* Injects shared header + footer into pages that include <div data-partial="header"></div> */
(function () {
  const CategoryRoutes = window.EventSphereCategories || {
    slug(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },
    href(value) {
      const slug = this.slug(value);
      return slug ? `/events/list?category=${encodeURIComponent(slug)}` : "/events/list";
    },
  };
  window.EventSphereCategories = CategoryRoutes;

  const headerHTML = `
<header>
<nav class="navbar navbar-expand-lg nav-blur">
  <div class="container-xxl">
    <a class="brand" href="/welcome"><span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>Tiketa</a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"><i class="bi bi-list fs-3" style="color:var(--text)"></i></button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav mx-auto gap-1">
        <li class="nav-item"><a class="nav-link nav-link-pro" href="/events" data-i18n="header.home">Home</a></li>
        <li class="nav-item" data-auth-hide-role="owner"><a class="nav-link nav-link-pro" href="/events/list" data-i18n="header.events">Events</a></li>
        <li class="nav-item dropdown" data-auth-hide-role="owner">
          <a class="nav-link nav-link-pro dropdown-toggle" data-bs-toggle="dropdown" href="#" data-i18n="header.categories">Categories</a>
          <ul class="dropdown-menu mt-2" data-nav-categories style="background:var(--card);border:1px solid var(--border);border-radius:14px">
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href("Concerts")}"><i class="bi bi-music-note-beamed me-2"></i>Concerts</a></li>
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href("Sports")}"><i class="bi bi-trophy me-2"></i>Sports</a></li>
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href("Festivals")}"><i class="bi bi-stars me-2"></i>Festivals</a></li>
            <li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href("Conferences")}"><i class="bi bi-mic me-2"></i>Conferences</a></li>
          </ul>
        </li>
      </ul>
      <div class="d-flex align-items-center gap-2">
        <button class="icon-btn" data-theme-toggle data-i18n-attr="aria-label:header.theme"><i class="bi bi-sun" data-theme-icon></i></button>
        <div class="notification-root" data-notification-root data-auth-user hidden>
          <button class="icon-btn notification-toggle" type="button" data-notification-toggle aria-label="Notifications" data-i18n-attr="aria-label:header.notifications" aria-expanded="false">
            <i class="bi bi-bell"></i>
            <span class="notification-badge" data-notification-count hidden>0</span>
          </button>
          <div class="notification-panel" data-notification-panel hidden>
            <div class="notification-head">
              <div><strong data-i18n="header.notifications">Notifications</strong><span data-i18n="header.notifications_copy">In-app updates</span></div>
              <button type="button" data-notification-mark-all data-i18n="header.mark_all_read">Mark all read</button>
            </div>
            <div class="notification-list" data-notification-list></div>
            <div class="notification-empty" data-notification-empty data-i18n="header.no_notifications" hidden>You’re all caught up. Important Tiketa updates will appear here.</div>
            <a class="notification-view-all" href="/notifications" data-i18n="header.view_all_notifications">View all notifications</a>
          </div>
        </div>
        <a class="btn btn-ghost" href="/login" data-auth-guest data-i18n="header.sign_in">Sign In</a>
        <a class="btn btn-primary-grad" href="/register" data-auth-guest data-i18n="header.register">Register</a>
        <a class="btn btn-ghost" href="/dashboard" data-auth-user data-auth-dashboard-link data-i18n="header.my_tickets" hidden>My Tickets</a>
        <a class="btn btn-primary-grad" href="#" data-auth-user data-logout data-i18n="header.sign_out" hidden>Sign Out</a>
      </div>
    </div>
  </div>
</nav>
</header>`;
  const footerHTML = `
<footer class="footer footer-premium">
  <div class="container-xxl">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand mb-3" href="/welcome"><span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>Tiketa</a>
        <p data-i18n="footer.tagline">The premium marketplace to discover, buy, and manage tickets for live events with confidence.</p>
        <div class="footer-social" aria-label="Social links">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X Twitter"><i class="bi bi-twitter-x"></i></a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
        </div>
      </div>
    </div>

    <div class="footer-links-grid">
      <div class="footer-link-group">
        <h6 data-i18n="footer.company">Company</h6>
        <a href="/about" data-i18n="footer.about">About Tiketa</a>
        <a href="/contact" data-i18n="footer.contact">Contact Us</a>
        <a href="/careers" data-i18n="footer.careers">Careers</a>
        <a href="/blog" data-i18n="footer.blog">Blog</a>
      </div>
      <div class="footer-link-group">
        <h6 data-i18n="footer.support">Support</h6>
        <a href="/help-center" data-i18n="footer.help_center">Help Center</a>
        <a href="/faqs" data-i18n="footer.faqs">FAQs</a>
        <a href="/ticket-support" data-i18n="footer.ticket_support">Ticket Support</a>
        <a href="/refund-policy" data-i18n="footer.refund_policy">Refund Policy</a>
      </div>
      <div class="footer-link-group">
        <h6 data-i18n="footer.organizers">Organizers</h6>
        <a href="/become-organizer" data-i18n="footer.become_organizer">Become an Organizer</a>
        <a href="/organizer-guide" data-i18n="footer.organizer_guide">Organizer Guide</a>
        <a href="/create-event" data-i18n="footer.create_event">Create Event</a>
      </div>
      <div class="footer-link-group">
        <h6 data-i18n="footer.legal">Legal</h6>
        <a href="/terms-of-service" data-i18n="footer.terms">Terms of Service</a>
        <a href="/privacy-policy" data-i18n="footer.privacy">Privacy Policy</a>
        <a href="/cookie-policy" data-i18n="footer.cookies">Cookie Policy</a>
        <a href="/refund-policy" data-i18n="footer.refund_policy">Refund Policy</a>
        <a href="/organizer-terms" data-i18n="footer.organizer_terms">Organizer Terms</a>
        <a href="/venue-owner-terms" data-i18n="footer.venue_owner_terms">Venue Owner Terms</a>
        <a href="/acceptable-use-content-policy" data-i18n="footer.acceptable_use">Acceptable Use</a>
        <a href="/copyright-takedown-policy" data-i18n="footer.copyright_policy">Copyright</a>
        <a href="/data-deletion-privacy-requests" data-i18n="footer.privacy_requests">Privacy Requests</a>
        <a href="/gdpr-information" data-i18n="footer.gdpr">GDPR</a>
        <a href="/legal-contact" data-i18n="footer.legal_contact">Legal Contact</a>
      </div>
    </div>

    <div class="legal">
      <div><span data-i18n="footer.copyright">© Tiketa</span> <span data-year></span></div>
      <div class="footer-badges">
        <span><i class="bi bi-shield-check"></i> <span data-i18n="footer.secure_purchases">Secure Ticket Purchases</span></span>
        <span><i class="bi bi-qr-code"></i> <span data-i18n="footer.qr_entry">QR Ticket Entry</span></span>
        <span><i class="bi bi-patch-check"></i> <span data-i18n="footer.verified_organizers">Verified Organizers</span></span>
      </div>
    </div>
  </div>
</footer>`;
  document.querySelectorAll('[data-partial="header"]').forEach((el) => (el.outerHTML = headerHTML));
  document.querySelectorAll('[data-partial="footer"]').forEach((el) => (el.outerHTML = footerHTML));
  function getApiClient() {
    if (window.EventSphereApi?.fetch) return Promise.resolve(window.EventSphereApi);
    return new Promise((resolve) => {
      const resolveClient = () => resolve(window.EventSphereApi);
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", resolveClient, { once: true });
      } else {
        setTimeout(resolveClient, 0);
      }
    });
  }

  async function hydrateCategories() {
    const menus = document.querySelectorAll("[data-nav-categories]");
    if (!menus.length) return;
    try {
      const api = await getApiClient();
      if (!api?.fetch) return;
      const { data } = await api.fetch("/categories");
      const categories = Array.isArray(data) ? data : [];
      if (!categories.length) return;
      menus.forEach((menu) => {
        menu.innerHTML = categories
          .map(
            (category) =>
              `<li><a class="dropdown-item text-white-50" href="${CategoryRoutes.href(category.slug || category.name)}"><i class="bi ${category.icon || "bi-tag"} me-2"></i>${category.name}</a></li>`,
          )
          .join("");
      });
    } catch {
      /* keep static fallback */
    }
  }
  hydrateCategories();
  document.dispatchEvent(new CustomEvent("event-sphere:partials-loaded"));
})();
