(function () {
  "use strict";

  const api = () => window.EventSphereApi;
  const cfg = () => window.EventSphereConfig;
  const tr = (key, fallback, replacements = {}) => window.t?.(key, replacements) || fallback;

  function authDebug(stage, details = {}) {
    console.info("[Tiketa auth debug]", stage, {
      path: location.pathname,
      ...details,
    });
  }

  function migrateAuthStorage() {
    [cfg().TOKEN_KEY, cfg().USER_KEY].forEach((key) => {
      const existing = localStorage.getItem(key);
      const legacy = sessionStorage.getItem(key);
      if (!existing && legacy) {
        localStorage.setItem(key, legacy);
        authDebug("MIGRATE: copied legacy auth storage", { key });
      }
      if (legacy) {
        sessionStorage.removeItem(key);
        authDebug("MIGRATE: removed legacy sessionStorage key", { key });
      }
    });
  }

  function getToken() {
    migrateAuthStorage();
    const token = localStorage.getItem(cfg().TOKEN_KEY);
    authDebug("TOKEN READ", { tokenExists: !!token });
    return token;
  }

  function setSession(token, user) {
    migrateAuthStorage();
    localStorage.setItem(cfg().TOKEN_KEY, token);
    if (user) localStorage.setItem(cfg().USER_KEY, JSON.stringify(user));
    authDebug("LOGIN: token saved", {
      tokenSaved: !!localStorage.getItem(cfg().TOKEN_KEY),
      userSaved: !!localStorage.getItem(cfg().USER_KEY),
      userId: user?.id || null,
      role: user?.role || null,
    });
    document.dispatchEvent(
      new CustomEvent("event-sphere:auth-changed", { detail: { user: user || null } }),
    );
    paintAuthNav();
  }

  function clearSession(reason = "unspecified") {
    authDebug("LOGOUT: clearing auth storage", {
      reason,
      tokenBeforeClear: !!localStorage.getItem(cfg().TOKEN_KEY),
      userBeforeClear: !!localStorage.getItem(cfg().USER_KEY),
    });
    localStorage.removeItem(cfg().TOKEN_KEY);
    localStorage.removeItem(cfg().USER_KEY);
    sessionStorage.removeItem(cfg().TOKEN_KEY);
    sessionStorage.removeItem(cfg().USER_KEY);
    document.dispatchEvent(
      new CustomEvent("event-sphere:auth-changed", { detail: { user: null } }),
    );
    paintAuthNav();
  }

  function getUser() {
    migrateAuthStorage();
    const raw = localStorage.getItem(cfg().USER_KEY);
    authDebug("USER READ", { userExists: !!raw });
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function refreshUser() {
    const { data } = await api().fetch("/user");
    localStorage.setItem(cfg().USER_KEY, JSON.stringify(data));
    authDebug("PAGE LOAD: current user refreshed", {
      userSaved: !!localStorage.getItem(cfg().USER_KEY),
      userId: data?.id || null,
      role: data?.role || null,
    });
    document.dispatchEvent(
      new CustomEvent("event-sphere:auth-changed", { detail: { user: data } }),
    );
    paintAuthNav();
    return data;
  }

  async function syncLanguage(language = window.TiketaLanguage?.getLanguage?.()) {
    if (!getToken() || !["en", "sq"].includes(language)) return null;
    const { data } = await api().fetch("/user/language", {
      method: "PATCH",
      body: { preferred_language: language },
      skipAuthRedirect: true,
    });
    localStorage.setItem(cfg().USER_KEY, JSON.stringify(data));
    document.dispatchEvent(
      new CustomEvent("event-sphere:auth-changed", { detail: { user: data } }),
    );
    return data;
  }

  async function login(email, password, deviceName) {
    const { raw } = await api().fetch("/login", {
      method: "POST",
      body: { email, password, device_name: deviceName || "tiketa-web" },
      skipAuthRedirect: true,
    });
    setSession(raw.token, raw.user);
    await syncLanguage().catch(() => {});
    return raw.user;
  }

  async function register(payload) {
    const { raw } = await api().fetch("/register", {
      method: "POST",
      body: { ...payload, preferred_language: window.TiketaLanguage?.getLanguage?.() || "en" },
      skipAuthRedirect: true,
    });
    setSession(raw.token, raw.user);
    return raw.user;
  }

  async function resendVerificationEmail() {
    const { raw } = await api().fetch("/email/verification-notification", {
      method: "POST",
      body: {},
    });

    return raw;
  }

  async function requestPasswordReset(email) {
    const { raw } = await api().fetch("/forgot-password", {
      method: "POST",
      body: { email },
      skipAuthRedirect: true,
    });

    return raw;
  }

  async function resetPassword(payload) {
    const { raw } = await api().fetch("/reset-password", {
      method: "POST",
      body: payload,
      skipAuthRedirect: true,
    });

    return raw;
  }

  async function logout() {
    try {
      if (getToken()) await api().fetch("/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearSession("explicit logout");
    location.href = cfg().LOGIN_URL;
  }

  function roleHome(role) {
    if (role === "admin") return "/admin";
    if (role === "organizer") return "/organizer";
    if (role === "owner") return "/owner-venue";
    if (role === "scanner") return "/scanner-dashboard";
    return "/dashboard";
  }

  function redirectByRole(user) {
    const u = user || getUser();
    if (!u) {
      location.href = cfg().LOGIN_URL;
      return;
    }
    location.href = u.role === "scanner" ? roleHome(u.role) : "/welcome";
  }

  function requireAuth(roles, options = {}) {
    const user = getUser();
    if (!getToken() || !user) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `${cfg().LOGIN_URL}?next=${next}`;
      return null;
    }
    if (roles?.length && !roles.includes(user.role) && user.role !== "admin") {
      window.tkToast?.(
        tr(
          "auth.forbidden",
          "This account does not have access here. Switch to the right account or return to your dashboard.",
        ),
        "error",
      );
      location.href = roleHome(user.role);
      return null;
    }
    if (
      user.role === "organizer" &&
      user.organizer_status === "pending" &&
      options.requireApprovedOrganizer !== false
    ) {
      const onOrganizer = location.pathname.includes("organizer");
      if (onOrganizer) {
        window.tkToast?.(
          tr("auth.organizer_pending", "Your organizer account is waiting for approval."),
          "info",
        );
        location.href = "/dashboard";
        return null;
      }
    }
    return user;
  }

  function setVisible(el, visible) {
    el.hidden = !visible;
    el.style.display = visible ? "" : "none";
  }

  function paintAuthNav() {
    const user = getUser();
    const role = user?.role || null;
    const roleConfig = {
      admin: { label: "Dashboard", href: "/admin" },
      organizer: { label: "Manage Events", href: "/organizer" },
      owner: { label: "Manage restaurants", href: "/owner-venue" },
      scanner: { label: "Scanner", href: "/scanner-dashboard" },
      user: { label: "My Tickets", href: "/dashboard" },
    };
    const current = roleConfig[role] || roleConfig.user;

    document.querySelectorAll("[data-auth-guest]").forEach((el) => {
      setVisible(el, !user);
    });
    document.querySelectorAll("[data-auth-user]").forEach((el) => {
      setVisible(el, !!user);
    });
    document.querySelectorAll("[data-auth-role-nav]").forEach((el) => {
      const roles = String(el.dataset.authRoleNav || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      setVisible(el, !!user && roles.includes(role));
    });
    document.querySelectorAll("[data-auth-hide-role]").forEach((el) => {
      const roles = String(el.dataset.authHideRole || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      setVisible(el, !user || !roles.includes(role));
    });
    document.querySelectorAll("[data-auth-dashboard-link]").forEach((el) => {
      if (!user) return;
      el.textContent = current.label;
      el.setAttribute("href", current.href);
    });
    document.querySelectorAll("[data-auth-name]").forEach((el) => {
      if (user) el.textContent = user.name || user.email;
    });
    document.querySelectorAll("[data-logout]").forEach((el) => {
      if (el.dataset.logoutBound === "true") return;
      el.dataset.logoutBound = "true";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    });
    paintVerificationBanner(user);
  }

  function hasVerifiedEmail(user) {
    return user?.email_verified === true || !!user?.email_verified_at;
  }

  function paintVerificationBanner(user = getUser()) {
    let banner = document.querySelector("[data-email-verification-banner]");
    const shouldShow = !!user && !hasVerifiedEmail(user);

    if (!shouldShow) {
      banner?.remove();
      return;
    }

    if (!banner) {
      banner = document.createElement("div");
      banner.setAttribute("data-email-verification-banner", "true");
      banner.className = "email-verify-banner";
      banner.innerHTML = `
        <div class="email-verify-banner-inner">
          <span><i class="bi bi-shield-exclamation me-2"></i><span data-i18n="auth.verify_account_banner">${tr("auth.verify_account_banner", "Please verify your email address to secure your account.")}</span></span>
          <div class="email-verify-actions">
            <button class="btn btn-primary-grad btn-sm" type="button" data-send-verification-email data-i18n="auth.verify_email_button">${tr("auth.verify_email_button", "Verify email")}</button>
            <button class="btn btn-glass btn-sm" type="button" data-send-verification-email data-i18n="auth.resend_verification_email">${tr("auth.resend_verification_email", "Resend verification email")}</button>
          </div>
        </div>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    }

    banner.querySelectorAll("[data-send-verification-email]").forEach((button) => {
      if (button.dataset.verificationBound === "true") return;
      button.dataset.verificationBound = "true";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const response = await resendVerificationEmail();
          window.tkToast?.(
            response.status === "already-verified"
              ? tr("auth.email_already_verified", "Your email is already verified.")
              : tr("auth.verification_sent", "Verification email sent. Please check your inbox."),
            "info",
          );
          if (response.status !== "already-verified") {
            window.EventSphereNotifications?.add({
              type: "system",
              title: tr("auth.verification_sent_title", "Verification email sent"),
              message: tr("auth.verification_sent_body", "Check your inbox to finish securing your account."),
            });
          }
          await refreshUser();
        } catch (err) {
          window.tkToast?.(
            err.message || tr("auth.verification_failed", "We couldn’t send the verification email. Check your connection and try again."),
            "error",
          );
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function syncAuthNav() {
    paintAuthNav();
    const params = new URLSearchParams(location.search);
    const shouldShowVerifiedMessage = params.get("verified") === "1";
    const pageLoadToken = getToken();
    const pageLoadUser = getUser();

    authDebug("PAGE LOAD: auth state", {
      tokenExists: !!pageLoadToken,
      userExists: !!pageLoadUser,
      apiBaseUrl: cfg().API_BASE_URL,
    });

    if (shouldShowVerifiedMessage && !pageLoadToken) {
      window.tkToast?.(
        tr("auth.email_verified_success", "Email verified. Your account is ready to use."),
        "success",
      );
      return;
    }

    if (!pageLoadToken) return;

    try {
      const user = await refreshUser();
      if (shouldShowVerifiedMessage && hasVerifiedEmail(user)) {
        window.EventSphereNotifications?.add({
          type: "system",
          title: tr("auth.email_verified_title", "Email verified"),
          message: tr("auth.email_verified_success", "Email verified. Your account is ready to use."),
        });
        window.tkToast?.(
          tr("auth.email_verified_success", "Email verified. Your account is ready to use."),
          "success",
        );
      }
    } catch (error) {
      authDebug("PAGE LOAD: current user refresh failed", {
        status: error?.status || 0,
        message: error?.message || "",
        tokenPreserved: error?.status !== 401,
      });
      if (error?.status === 401) {
        clearSession("current user returned 401");
      }
    }
  }

  document.addEventListener("DOMContentLoaded", syncAuthNav);
  document.addEventListener("event-sphere:partials-loaded", syncAuthNav);
  document.addEventListener("tiketa:language-changed", (event) => {
    syncLanguage(event.detail?.language).catch(() => {});
  });

  window.EventSphereAuth = {
    getToken,
    getUser,
    setSession,
    clearSession,
    refreshUser,
    syncLanguage,
    login,
    register,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    logout,
    redirectByRole,
    requireAuth,
    roleHome,
    paintAuthNav,
    hasVerifiedEmail,
    isLoggedIn: () => !!getToken(),
  };
})();
