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
  }

  function clearSession() {
    sessionStorage.removeItem(cfg().TOKEN_KEY);
    sessionStorage.removeItem(cfg().USER_KEY);
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

  function paintAuthNav() {
    const user = getUser();
    document.querySelectorAll('[data-auth-guest]').forEach((el) => {
      el.style.display = user ? 'none' : '';
    });
    document.querySelectorAll('[data-auth-user]').forEach((el) => {
      el.style.display = user ? '' : 'none';
    });
    document.querySelectorAll('[data-auth-name]').forEach((el) => {
      if (user) el.textContent = user.name || user.email;
    });
    document.querySelectorAll('[data-logout]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', paintAuthNav);

  window.EventSphereAuth = {
    getToken,
    getUser,
    setSession,
    clearSession,
    refreshUser,
    login,
    register,
    logout,
    redirectByRole,
    requireAuth,
    roleHome,
    paintAuthNav,
    isLoggedIn: () => !!getToken(),
  };
})();
