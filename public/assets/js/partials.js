/* Injects shared header + footer into pages that include <div data-partial="header"></div> */
(function(){
  const headerHTML = `
<nav class="navbar navbar-expand-lg nav-blur">
  <div class="container-xxl">
    <a class="brand" href="index.html"><span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>TicketHub</a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"><i class="bi bi-list fs-3" style="color:var(--text)"></i></button>
    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav mx-auto gap-1">
        <li class="nav-item"><a class="nav-link nav-link-pro" href="index.html">Home</a></li>
        <li class="nav-item"><a class="nav-link nav-link-pro" href="events.html">Events</a></li>
        <li class="nav-item dropdown">
          <a class="nav-link nav-link-pro dropdown-toggle" data-bs-toggle="dropdown" href="#">Categories</a>
          <ul class="dropdown-menu mt-2" style="background:var(--card);border:1px solid var(--border);border-radius:14px">
            <li><a class="dropdown-item text-white-50" href="events.html"><i class="bi bi-music-note-beamed me-2"></i>Concerts</a></li>
            <li><a class="dropdown-item text-white-50" href="events.html"><i class="bi bi-trophy me-2"></i>Sports</a></li>
            <li><a class="dropdown-item text-white-50" href="events.html"><i class="bi bi-stars me-2"></i>Festivals</a></li>
            <li><a class="dropdown-item text-white-50" href="events.html"><i class="bi bi-mic me-2"></i>Conferences</a></li>
          </ul>
        </li>
        <li class="nav-item"><a class="nav-link nav-link-pro" href="dashboard.html">My Tickets</a></li>
        <li class="nav-item"><a class="nav-link nav-link-pro" href="organizer.html">Sell</a></li>
      </ul>
      <div class="d-flex align-items-center gap-2">
        <button class="icon-btn" data-theme-toggle><i class="bi bi-sun" data-theme-icon></i></button>
        <a class="icon-btn position-relative" href="dashboard.html" data-auth-user style="display:none"><i class="bi bi-bell"></i><span class="position-absolute top-0 end-0 translate-middle badge rounded-pill" style="background:var(--secondary);font-size:.6rem">3</span></a>
        <a class="btn btn-ghost d-none d-md-inline-flex" href="login.html" data-auth-guest>Sign in</a>
        <a class="btn btn-primary-grad" href="register.html" data-auth-guest>Get started</a>
        <a class="btn btn-ghost d-none d-md-inline-flex" href="dashboard.html" data-auth-user data-auth-name style="display:none">Account</a>
        <a class="btn btn-primary-grad" href="#" data-auth-user data-logout style="display:none">Sign out</a>
      </div>
    </div>
  </div>
</nav>`;
  const footerHTML = `
<footer class="footer">
  <div class="container-xxl">
    <div class="row g-4">
      <div class="col-lg-4">
        <a class="brand mb-3" href="index.html"><span class="brand-logo"><i class="bi bi-ticket-perforated-fill"></i></span>TicketHub</a>
        <p class="mt-3" style="max-width:340px">The premium marketplace to discover, buy and resell tickets to the world's best live events.</p>
        <div class="d-flex gap-2 mt-3"><a href="#" class="icon-btn"><i class="bi bi-twitter-x"></i></a><a href="#" class="icon-btn"><i class="bi bi-instagram"></i></a><a href="#" class="icon-btn"><i class="bi bi-tiktok"></i></a><a href="#" class="icon-btn"><i class="bi bi-youtube"></i></a></div>
      </div>
      <div class="col-6 col-lg-2"><h6>Discover</h6><a href="events.html">Concerts</a><a href="events.html">Sports</a><a href="events.html">Festivals</a><a href="events.html">Theater</a></div>
      <div class="col-6 col-lg-2"><h6>Sell</h6><a href="organizer.html">Organizer tools</a><a href="organizer.html">List tickets</a><a href="#">Pricing</a><a href="#">Resources</a></div>
      <div class="col-6 col-lg-2"><h6>Company</h6><a href="#">About</a><a href="#">Careers</a><a href="#">Press</a><a href="#">Contact</a></div>
      <div class="col-6 col-lg-2"><h6>Support</h6><a href="#">Help center</a><a href="#">Refund policy</a><a href="#">Terms</a><a href="#">Privacy</a></div>
    </div>
    <div class="legal"><div>© <span data-year></span> TicketHub Inc.</div><div class="d-flex gap-3"><a href="#">Cookies</a><a href="#">Accessibility</a><a href="#">Sitemap</a></div></div>
  </div>
</footer>`;
  document.querySelectorAll('[data-partial="header"]').forEach(el => el.outerHTML = headerHTML);
  document.querySelectorAll('[data-partial="footer"]').forEach(el => el.outerHTML = footerHTML);
})();
