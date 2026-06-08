(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const cfg = () => window.EventSphereConfig;

  function getToken() {
    return sessionStorage.getItem(cfg().TOKEN_KEY);
  }

  function setSession(token, user) {
    sessionStorage.setItem(cfg().TOKEN_KEY, token);
    if (user) sessionStorage.setItem(cfg().USER_KEY, JSON.stringify(user));
    document.dispatchEvent(new CustomEvent('event-sphere:auth-changed', { detail: { user: user || null } }));
    paintAuthNav();
  }

  function clearSession() {
    sessionStorage.removeItem(cfg().TOKEN_KEY);
    sessionStorage.removeItem(cfg().USER_KEY);
    document.dispatchEvent(new CustomEvent('event-sphere:auth-changed', { detail: { user: null } }));
    paintAuthNav();
  }

  function getUser() {
    const raw = sessionStorage.getItem(cfg().USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function refreshUser() {
    const { data } = await api().fetch('/user');
    sessionStorage.setItem(cfg().USER_KEY, JSON.stringify(data));
    document.dispatchEvent(new CustomEvent('event-sphere:auth-changed', { detail: { user: data } }));
    paintAuthNav();
    return data;
  }

  async function login(email, password, deviceName) {
    const { raw } = await api().fetch('/login', {
      method: 'POST',
      body: { email, password, device_name: deviceName || 'tickethub-web' },
      skipAuthRedirect: true,
    });
    setSession(raw.token, raw.user);
    return raw.user;
  }

  async function register(payload) {
    const { raw } = await api().fetch('/register', {
      method: 'POST',
      body: payload,
      skipAuthRedirect: true,
    });
    setSession(raw.token, raw.user);
    return raw.user;
  }

  async function resendVerificationEmail() {
    const { raw } = await api().fetch('/email/verification-notification', {
      method: 'POST',
      body: {},
    });

    return raw;
  }

  async function requestPasswordReset(email) {
    const { raw } = await api().fetch('/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuthRedirect: true,
    });

    return raw;
  }

  async function resetPassword(payload) {
    const { raw } = await api().fetch('/reset-password', {
      method: 'POST',
      body: payload,
      skipAuthRedirect: true,
    });

    return raw;
  }

  async function logout() {
    try {
      if (getToken()) await api().fetch('/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearSession();
    location.href = cfg().LOGIN_URL;
  }

  function roleHome(role) {
    if (role === 'admin') return 'admin.html';
    if (role === 'organizer') return 'organizer.html';
    return 'dashboard.html';
  }

  function redirectByRole(user) {
    const u = user || getUser();
    if (!u) {
      location.href = cfg().LOGIN_URL;
      return;
    }
    const params = new URLSearchParams(location.search);
    const next = params.get('next');
    if (next && !next.includes('login')) {
      location.href = decodeURIComponent(next);
      return;
    }
    location.href = roleHome(u.role);
  }

  function requireAuth(roles, options = {}) {
    const user = getUser();
    if (!getToken() || !user) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.href = `${cfg().LOGIN_URL}?next=${next}`;
      return null;
    }
    if (roles?.length && !roles.includes(user.role) && user.role !== 'admin') {
      window.tkToast?.('You do not have access to this page.', 'error');
      location.href = roleHome(user.role);
      return null;
    }
    if (user.role === 'organizer' && user.organizer_status === 'pending' && options.requireApprovedOrganizer !== false) {
      const onOrganizer = location.pathname.includes('organizer');
      if (onOrganizer) {
        window.tkToast?.('Organizer account pending approval.', 'info');
        location.href = 'dashboard.html';
        return null;
      }
    }
    return user;
  }

  function setVisible(el, visible) {
    el.hidden = !visible;
    el.style.display = visible ? '' : 'none';
  }

  function paintAuthNav() {
    const user = getUser();
    const role = user?.role || null;
    const roleConfig = {
      admin: { label: 'Dashboard', href: 'admin.html' },
      organizer: { label: 'Manage Events', href: 'organizer.html' },
      user: { label: 'My Tickets', href: 'dashboard.html' },
    };
    const current = roleConfig[role] || roleConfig.user;

    document.querySelectorAll('[data-auth-guest]').forEach((el) => {
      setVisible(el, !user);
    });
    document.querySelectorAll('[data-auth-user]').forEach((el) => {
      setVisible(el, !!user);
    });
    document.querySelectorAll('[data-auth-role-nav]').forEach((el) => {
      setVisible(el, !!user && el.dataset.authRoleNav === role);
    });
    document.querySelectorAll('[data-auth-dashboard-link]').forEach((el) => {
      if (!user) return;
      el.textContent = current.label;
      el.setAttribute('href', current.href);
    });
    document.querySelectorAll('[data-auth-name]').forEach((el) => {
      if (user) el.textContent = user.name || user.email;
    });
    document.querySelectorAll('[data-logout]').forEach((el) => {
      if (el.dataset.logoutBound === 'true') return;
      el.dataset.logoutBound = 'true';
      el.addEventListener('click', (e) => {
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
    let banner = document.querySelector('[data-email-verification-banner]');
    const shouldShow = !!user && !hasVerifiedEmail(user);

    if (!shouldShow) {
      banner?.remove();
      return;
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.setAttribute('data-email-verification-banner', 'true');
      banner.className = 'email-verify-banner';
      banner.innerHTML = `
        <div class="email-verify-banner-inner">
          <span><i class="bi bi-shield-exclamation me-2"></i>Please verify your email address to secure your account.</span>
          <div class="email-verify-actions">
            <button class="btn btn-primary-grad btn-sm" type="button" data-send-verification-email>Verify Email</button>
            <button class="btn btn-glass btn-sm" type="button" data-send-verification-email>Resend Verification Email</button>
          </div>
        </div>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    }

    banner.querySelectorAll('[data-send-verification-email]').forEach((button) => {
      if (button.dataset.verificationBound === 'true') return;
      button.dataset.verificationBound = 'true';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const response = await resendVerificationEmail();
          window.tkToast?.(response.status === 'already-verified'
            ? 'Email already verified'
            : 'Verification email sent. Check the Laravel log on localhost.', 'info');
          if (response.status !== 'already-verified') {
            window.EventSphereNotifications?.add({
              type: 'system',
              title: 'Verification Email Sent',
              message: 'Check your inbox to finish securing your account.',
            });
          }
          await refreshUser();
        } catch (err) {
          window.tkToast?.(err.message || 'Verification email failed', 'error');
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function syncAuthNav() {
    paintAuthNav();
    if (!getToken()) return;
    try {
      const user = await refreshUser();
      const params = new URLSearchParams(location.search);
      if (params.get('verified') === '1' && hasVerifiedEmail(user)) {
        window.EventSphereNotifications?.add({
          type: 'system',
          title: 'Email Verified',
          message: 'Your email address has been verified successfully.',
        });
        window.tkToast?.('Email verified successfully', 'success');
      }
    } catch {
      clearSession();
    }
  }

  document.addEventListener('DOMContentLoaded', syncAuthNav);
  document.addEventListener('event-sphere:partials-loaded', syncAuthNav);

  window.EventSphereAuth = {
    getToken,
    getUser,
    setSession,
    clearSession,
    refreshUser,
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
