(function () {
  "use strict";

  const headerHTML = `
<header>
<nav class="navbar navbar-expand-lg nav-blur nav-res">
  <div class="container-xxl">
    <a class="brand" href="/restaurants"><span class="brand-logo"><i class="bi bi-cup-hot-fill"></i></span>Tiketa <span class="text-gold ms-1 d-none d-sm-inline brand-context">· Reservations</span></a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#resNav"><i class="bi bi-list fs-3" style="color:var(--text)"></i></button>
    <div class="collapse navbar-collapse" id="resNav">
      <ul class="navbar-nav mx-auto gap-1">
        <li class="nav-item"><a class="nav-link nav-link-pro" href="/restaurants" data-i18n="header.home">Home</a></li>
        <li class="nav-item"><a class="nav-link nav-link-pro" href="/how-reservations-work" data-i18n="footer.how_reservations_work">How Reservations Work</a></li>
        <li class="nav-item"><a class="nav-link nav-link-pro" href="/become-restaurant-partner" data-i18n="footer.become_restaurant_partner">Become a Restaurant Partner</a></li>
      </ul>
      <div class="d-flex align-items-center gap-2">
        <button class="icon-btn" data-theme-toggle data-i18n-attr="aria-label:header.theme"><i class="bi bi-sun" data-theme-icon></i></button>
        <a class="btn btn-ghost" href="/login" data-auth-guest data-i18n="header.login">Login</a>
        <a class="btn btn-gold" href="/register" data-auth-guest data-i18n="header.register">Register</a>
        <a class="btn btn-gold" href="#" data-auth-user data-logout data-i18n="header.logout" hidden>Logout</a>
      </div>
    </div>
  </div>
</nav>
</header>`;

  function inject() {
    document.querySelectorAll("[data-restaurant-header]").forEach((el) => {
      el.outerHTML = headerHTML;
    });
    window.TiketaLanguage?.ensureSwitcher?.();
  }

  document.addEventListener("DOMContentLoaded", inject);
})();
