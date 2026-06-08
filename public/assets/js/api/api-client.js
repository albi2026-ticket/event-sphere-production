(function () {
  'use strict';

  const cfg = () => window.EventSphereConfig;

  function getToken() {
    return sessionStorage.getItem(cfg().TOKEN_KEY);
  }

  function unwrapJson(payload) {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }
    return payload;
  }

  function flattenErrors(errors) {
    if (!errors || typeof errors !== 'object') return [];
    return Object.entries(errors).flatMap(([field, messages]) => {
      const list = Array.isArray(messages) ? messages : [messages];
      return list.map((message) => ({ field, message: String(message || '') }));
    });
  }

  function userFriendlyMessage(payload, status) {
    const original = [
      payload?.message,
      ...flattenErrors(payload?.errors).map((item) => item.message),
    ].filter(Boolean).join(' ').toLowerCase();
    const fields = flattenErrors(payload?.errors).map((item) => item.field);

    if (original.includes('credentials') || original.includes('auth.failed')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (original.includes('email has already been taken') || original.includes('email') && original.includes('already been taken')) {
      return 'This email is already registered. Please use another email or login.';
    }
    if (fields.includes('email') && (original.includes('valid email') || original.includes('email field must be a valid'))) {
      return 'Please enter a valid email address.';
    }
    if (fields.includes('password') && (original.includes('confirmation') || original.includes('match'))) {
      return 'Passwords do not match.';
    }
    if (fields.includes('password') && (original.includes('at least') || original.includes('min') || original.includes('8'))) {
      return 'Password is too short.';
    }
    if (status === 422 || payload?.errors) {
      return 'Please check your input and try again.';
    }
    if (status === 401) {
      return 'Please sign in to continue.';
    }
    return payload?.message || `Request failed (${status})`;
  }

  async function apiFetch(path, options = {}) {
    const base = cfg().API_BASE_URL;
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = Object.assign(
      { Accept: 'application/json' },
      options.headers || {},
    );

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const init = {
      method: options.method || 'GET',
      headers,
      body: options.body,
    };

    if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
      init.body = JSON.stringify(init.body);
    }

    const response = await fetch(url, init);
    let payload = null;

    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }

    if (response.status === 401) {
      sessionStorage.removeItem(cfg().TOKEN_KEY);
      sessionStorage.removeItem(cfg().USER_KEY);
      if (!options.skipAuthRedirect) {
        const login = cfg().LOGIN_URL;
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = `${login}?next=${next}`;
      }
      console.error('Event Sphere API error', { status: response.status, path, payload });
      const err = new Error(userFriendlyMessage(payload, response.status));
      err.status = 401;
      err.payload = payload;
      err.originalMessage = payload?.message || 'Unauthorized';
      throw err;
    }

    if (!response.ok) {
      console.error('Event Sphere API error', { status: response.status, path, payload });
      const err = new Error(userFriendlyMessage(payload, response.status));
      err.status = response.status;
      err.payload = payload;
      err.originalMessage = payload?.message || (payload?.errors ? Object.values(payload.errors).flat().join(' ') : null);
      throw err;
    }

    return {
      data: unwrapJson(payload),
      meta: payload?.meta,
      raw: payload,
      response,
    };
  }

  async function apiFetchBlob(path, options = {}) {
    const base = cfg().API_BASE_URL;
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = Object.assign({ Accept: '*/*' }, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { method: options.method || 'GET', headers });
    if (response.status === 401) {
      sessionStorage.removeItem(cfg().TOKEN_KEY);
      sessionStorage.removeItem(cfg().USER_KEY);
      location.href = cfg().LOGIN_URL;
      throw new Error('Unauthorized');
    }
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.blob();
  }

  window.EventSphereApi = {
    fetch: apiFetch,
    fetchBlob: apiFetchBlob,
    getToken,
    unwrap: unwrapJson,
    friendlyMessage: userFriendlyMessage,
  };
})();
