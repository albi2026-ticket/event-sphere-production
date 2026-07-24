(function () {
  "use strict";

  const cfg = () => window.EventSphereConfig;

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

  function unwrapJson(payload) {
    if (payload && typeof payload === "object" && "data" in payload) {
      return payload.data;
    }
    return payload;
  }

  function flattenErrors(errors) {
    if (!errors || typeof errors !== "object") return [];
    return Object.entries(errors).flatMap(([field, messages]) => {
      const list = Array.isArray(messages) ? messages : [messages];
      return list.map((message) => ({ field, message: String(message || "") }));
    });
  }

  function tr(key, fallback, replacements = {}) {
    return window.t?.(key, replacements) || fallback;
  }

  function userFriendlyMessage(payload, status) {
    const original = [
      payload?.message,
      ...flattenErrors(payload?.errors).map((item) => item.message),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const fields = flattenErrors(payload?.errors).map((item) => item.field);

    if (original.includes("credentials") || original.includes("auth.failed")) {
      return tr(
        "auth.error_sign_in",
        "We couldn’t sign you in. The email or password does not match a Tiketa account.",
      );
    }
    if (
      original.includes("email has already been taken") ||
      (original.includes("email") && original.includes("already been taken"))
    ) {
      return tr(
        "auth.email_already_registered",
        "This email is already registered. Please sign in or use another email.",
      );
    }
    if (
      fields.includes("email") &&
      (original.includes("valid email") || original.includes("email field must be a valid"))
    ) {
      return tr("auth.email_invalid", "Please enter a valid email address.");
    }
    if (
      fields.includes("password") &&
      (original.includes("confirmation") || original.includes("match"))
    ) {
      return tr("auth.passwords_do_not_match", "Passwords do not match.");
    }
    if (
      fields.includes("password") &&
      (original.includes("at least") || original.includes("min") || original.includes("8"))
    ) {
      return tr("auth.password_too_short", "Password must contain at least 8 characters.");
    }
    if (status === 422 || payload?.errors) {
      return tr("auth.check_input", "Some details need attention. Review the form and try again.");
    }
    if (status === 401) {
      return tr("auth.session_expired", "Your session expired to keep your account secure. Sign in again to continue.");
    }
    if (status === 403) {
      return tr(
        "auth.forbidden",
        "This account does not have access here. Switch to the right account or return to your dashboard.",
      );
    }
    if (status === 404) {
      return tr(
        "errors.404.description",
        "The link may be outdated, private, or moved. Go home, browse events, or check the URL.",
      );
    }
    if (status === 409) {
      return tr(
        "errors.conflict.description",
        "This was changed somewhere else before Tiketa could save your update. Refresh and try again.",
      );
    }
    if (status === 429) {
      return tr(
        "errors.rate_limited.description",
        "Tiketa received too many requests in a short time. Wait a moment, then try again.",
      );
    }
    if (status >= 500) {
      return tr(
        "errors.server.description",
        "Something on our side stopped this from loading. Try again in a moment.",
      );
    }
    return payload?.message || tr("auth.request_failed", "We couldn’t complete the request. Check your connection and try again.");
  }

  function connectionErrorMessage(error) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return tr(
        "errors.offline.description",
        "Tiketa needs an internet connection for this action. Reconnect, then try again.",
      );
    }

    const message = String(error?.message || "").toLowerCase();
    if (message.includes("failed to fetch") || message.includes("network")) {
      return tr(
        "errors.network.description",
        "Your connection may be unstable. Check Wi‑Fi or mobile data, then try again.",
      );
    }

    return tr(
      "errors.api_unavailable.description",
      "The service did not respond in time. Wait a moment, then try again.",
    );
  }

  async function apiFetch(path, options = {}) {
    const base = cfg().API_BASE_URL;
    const url = path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    try {
      const language =
        window.TiketaLanguage?.getLanguage?.() ||
        localStorage.getItem("preferred_language") ||
        "en";
      headers["X-Tiketa-Language"] = ["en", "sq"].includes(language) ? language : "en";
    } catch {
      headers["X-Tiketa-Language"] = "en";
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    authDebug("API REQUEST: Authorization header", {
      path,
      method: options.method || "GET",
      hasAuthorization: !!headers.Authorization,
      skipAuthRedirect: !!options.skipAuthRedirect,
    });

    const init = {
      method: options.method || "GET",
      headers,
      body: options.body,
    };

    if (init.body && typeof init.body === "object" && !(init.body instanceof FormData)) {
      init.body = JSON.stringify(init.body);
    }

    let response;
    try {
      response = await fetch(url, init);
    } catch (networkError) {
      const err = new Error(connectionErrorMessage(networkError));
      err.status = 0;
      err.originalMessage = networkError?.message || err.message;
      throw err;
    }
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
      authDebug("LOGOUT: token removal triggered by API 401", {
        path,
        skipAuthRedirect: !!options.skipAuthRedirect,
        tokenBeforeClear: !!localStorage.getItem(cfg().TOKEN_KEY),
      });
      localStorage.removeItem(cfg().TOKEN_KEY);
      localStorage.removeItem(cfg().USER_KEY);
      sessionStorage.removeItem(cfg().TOKEN_KEY);
      sessionStorage.removeItem(cfg().USER_KEY);
      if (!options.skipAuthRedirect) {
        const login = cfg().LOGIN_URL;
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = `${login}?next=${next}`;
      }
      console.error("Tiketa API error", { status: response.status, path, payload });
      const err = new Error(userFriendlyMessage(payload, response.status));
      err.status = 401;
      err.payload = payload;
      err.originalMessage =
        payload?.message || tr("auth.session_expired", "Your session expired to keep your account secure. Sign in again to continue.");
      throw err;
    }

    if (!response.ok) {
      console.error("Tiketa API error", { status: response.status, path, payload });
      const err = new Error(userFriendlyMessage(payload, response.status));
      err.status = response.status;
      err.payload = payload;
      err.originalMessage =
        payload?.message ||
        (payload?.errors ? Object.values(payload.errors).flat().join(" ") : null);
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
    const url = path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = Object.assign({ Accept: "*/*" }, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    authDebug("API REQUEST: Authorization header", {
      path,
      method: options.method || "GET",
      hasAuthorization: !!headers.Authorization,
      blob: true,
    });

    let response;
    try {
      response = await fetch(url, { method: options.method || "GET", headers });
    } catch (networkError) {
      throw new Error(connectionErrorMessage(networkError));
    }
    if (response.status === 401) {
      authDebug("LOGOUT: token removal triggered by blob API 401", {
        path,
        tokenBeforeClear: !!localStorage.getItem(cfg().TOKEN_KEY),
      });
      localStorage.removeItem(cfg().TOKEN_KEY);
      localStorage.removeItem(cfg().USER_KEY);
      sessionStorage.removeItem(cfg().TOKEN_KEY);
      sessionStorage.removeItem(cfg().USER_KEY);
      location.href = cfg().LOGIN_URL;
      throw new Error(tr("auth.session_expired", "Your session expired to keep your account secure. Sign in again to continue."));
    }
    if (!response.ok) throw new Error(userFriendlyMessage(null, response.status));
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
