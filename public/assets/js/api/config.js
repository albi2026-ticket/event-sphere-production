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
    LOGIN_URL: 'login.html',
  };
})();
