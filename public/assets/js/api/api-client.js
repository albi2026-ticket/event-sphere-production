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
      const err = new Error(payload?.message || 'Unauthorized');
      err.status = 401;
      err.payload = payload;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(
        payload?.message ||
          (payload?.errors ? Object.values(payload.errors).flat().join(' ') : null) ||
          `Request failed (${response.status})`,
      );
      err.status = response.status;
      err.payload = payload;
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
  };
})();
