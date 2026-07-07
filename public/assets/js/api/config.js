(function () {
  'use strict';

  const meta = document.querySelector('meta[name="api-base"]');
  const fromMeta = meta?.getAttribute('content')?.trim();
  const fromWindow = window.__EVENT_SPHERE_API__?.trim();
  const fallbackHost = location.hostname || '127.0.0.1';
  const fallback = `${location.protocol || 'http:'}//${fallbackHost}:8000/api`;

  const base = (fromWindow || fromMeta || fallback).replace(/\/$/, '');

  window.EventSphereConfig = {
    API_BASE_URL: base,
    TOKEN_KEY: 'event_sphere_token',
    USER_KEY: 'event_sphere_user',
    CART_KEY: 'event_sphere_cart',
    LOGIN_URL: '/login',
  };

  function cleanSlug(value) {
    return String(value || '').trim().replace(/^\/+|\/+$/g, '');
  }

  function detailUrl(basePath, slug) {
    const clean = cleanSlug(slug);
    return clean ? `${basePath}/${encodeURIComponent(clean)}` : basePath;
  }

  function canonicalDetailUrl(basePath, slug) {
    const clean = cleanSlug(slug).split(/[?#]/)[0];
    return clean ? `${basePath}/${encodeURIComponent(clean)}` : basePath;
  }

  function pathSlug(basePath) {
    const path = location.pathname.replace(/^\/site\//, '/').replace(/\.html$/, '');
    const prefix = `${basePath}/`;
    if (!path.startsWith(prefix)) return '';
    return decodeURIComponent(path.slice(prefix.length).split('/')[0] || '');
  }

  function detailSlug(basePath, aliases = []) {
    const params = new URLSearchParams(location.search);
    const fromPath = pathSlug(basePath);
    const keys = ['id', 'slug', ...aliases];
    const fromQuery = keys.map((key) => params.get(key)).find(Boolean) || '';
    return cleanSlug(fromPath || fromQuery);
  }

  function redirectLegacyDetail(basePath, aliases = []) {
    if (pathSlug(basePath)) return;
    const params = new URLSearchParams(location.search);
    const keys = ['id', 'slug', ...aliases];
    const slug = cleanSlug(keys.map((key) => params.get(key)).find(Boolean));
    if (!slug) return;
    location.replace(detailUrl(basePath, slug));
  }

  function setCanonical(path) {
    const cleanPath = `/${cleanSlug(path || location.pathname)}`.replace(/\/$/, '') || '/';
    const href = cleanPath === '' ? '/' : cleanPath;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = href || '/';
  }

  window.EventSphereRoutes = {
    eventUrl: (slug) => detailUrl('/event', slug),
    restaurantUrl: (slug) => detailUrl('/restaurant', slug),
    eventSlug: () => detailSlug('/event'),
    restaurantSlug: () => detailSlug('/restaurant', ['venue']),
    redirectLegacyEvent: () => redirectLegacyDetail('/event'),
    redirectLegacyRestaurant: () => redirectLegacyDetail('/restaurant', ['venue']),
    setCanonical,
    setEventCanonical: (slug) => setCanonical(canonicalDetailUrl('/event', slug)),
    setRestaurantCanonical: (slug) => setCanonical(canonicalDetailUrl('/restaurant', slug)),
  };
})();
