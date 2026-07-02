(function () {
  'use strict';

  const footerHTML = `
<footer class="footer">
  <div class="container-xxl">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand mb-3" href="reservations.html"><span class="brand-logo" style="background:var(--grad-res)"><i class="bi bi-cup-hot-fill"></i></span>Tiketa</a>
        <p data-i18n="footer.dining_tagline">Discover and reserve restaurants, bars, lounges, and cafes with a polished hospitality booking experience.</p>
        <div class="footer-social" data-i18n-attr="aria-label:footer.social_links">
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X Twitter"><i class="bi bi-twitter-x"></i></a>
          <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
        </div>
      </div>
    </div>

    <div class="footer-links-grid">
      <div>
        <h6 data-i18n="footer.company">Company</h6>
        <a href="about-dining.html" data-i18n="footer.about_dining">About Tiketa Dining</a>
        <a href="contact-dining.html" data-i18n="footer.contact">Contact</a>
        <a href="careers.html" data-i18n="footer.careers">Careers</a>
      </div>
      <div>
        <h6 data-i18n="footer.restaurant_owners">Restaurant Owners</h6>
        <a href="become-restaurant-partner.html" data-i18n="footer.become_restaurant_partner">Become a Restaurant Partner</a>
        <a href="restaurant-owner-guide.html" data-i18n="footer.owner_guide">Owner Guide</a>
        <a href="list-your-restaurant.html" data-i18n="footer.list_your_restaurant">List Your Restaurant</a>
      </div>
      <div>
        <h6 data-i18n="footer.reservations">Reservations</h6>
        <a href="how-reservations-work.html" data-i18n="footer.how_reservations_work">How Reservations Work</a>
        <a href="reservation-support.html" data-i18n="footer.reservation_support">Reservation Support</a>
        <a href="reservation-policy.html" data-i18n="footer.reservation_policy">Reservation Policy</a>
      </div>
      <div>
        <h6 data-i18n="footer.legal">Legal</h6>
        <a href="terms-of-service.html" data-i18n="footer.terms_short">Terms</a>
        <a href="privacy-policy.html" data-i18n="footer.privacy_short">Privacy</a>
        <a href="cookie-policy.html" data-i18n="footer.cookies_short">Cookies</a>
      </div>
    </div>

    <div class="legal">
      <div><span data-i18n="footer.copyright">© Tiketa</span> <span data-year></span> · <span data-i18n="footer.hospitality_reservations">Hospitality reservations</span></div>
      <div class="footer-badges">
        <span><i class="bi bi-calendar-check"></i> <span data-i18n="footer.reservation_requests">Reservation Requests</span></span>
        <span><i class="bi bi-shop-window"></i> <span data-i18n="footer.verified_venues">Verified Venues</span></span>
        <span><i class="bi bi-stars"></i> <span data-i18n="footer.curated_hospitality">Curated Hospitality</span></span>
      </div>
    </div>
  </div>
</footer>`;

  function inject() {
    document.querySelectorAll('[data-restaurant-footer]').forEach((el) => {
      el.outerHTML = footerHTML;
    });
    window.TiketaLanguage?.applyTranslations?.();
  }

  document.addEventListener('DOMContentLoaded', inject);
})();
