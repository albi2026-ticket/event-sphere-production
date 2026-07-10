(function () {
  "use strict";

  const cfg = () => window.EventSphereConfig;

  function getToken() {
    return sessionStorage.getItem(cfg().TOKEN_KEY);
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
        "We couldn't sign you in. Please check your email and password and try again.",
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
      return tr("auth.check_input", "Please check your details and try again.");
    }
    if (status === 401) {
      return tr("auth.session_expired", "Your session has expired. Please sign in again.");
    }
    if (status === 403) {
      return tr(
        "auth.forbidden",
        "You don’t have access to this page. Please use the right account or return to your dashboard.",
      );
    }
    if (status >= 500) {
      return tr(
        "errors.server.description",
        "We’re having trouble loading this right now. Please try again in a moment.",
      );
    }
    return payload?.message || tr("auth.request_failed", "Something went wrong. Please try again.");
  }

  function connectionErrorMessage(error) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return tr(
        "errors.offline.description",
        "You appear to be offline. Check your internet connection and try again.",
      );
    }

    const message = String(error?.message || "").toLowerCase();
    if (message.includes("failed to fetch") || message.includes("network")) {
      return tr(
        "errors.network.description",
        "We couldn’t connect. Please check your connection and try again.",
      );
    }

    return tr(
      "errors.api_unavailable.description",
      "Tiketa is taking longer than expected. Please try again in a moment.",
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
        payload?.message || tr("auth.session_expired", "Your session has expired. Please sign in again.");
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

    let response;
    try {
      response = await fetch(url, { method: options.method || "GET", headers });
    } catch (networkError) {
      throw new Error(connectionErrorMessage(networkError));
    }
    if (response.status === 401) {
      sessionStorage.removeItem(cfg().TOKEN_KEY);
      sessionStorage.removeItem(cfg().USER_KEY);
      location.href = cfg().LOGIN_URL;
      throw new Error(tr("auth.session_expired", "Your session has expired. Please sign in again."));
    }
    if (!response.ok) throw new Error(tr("auth.request_failed", "Something went wrong. Please try again."));
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
