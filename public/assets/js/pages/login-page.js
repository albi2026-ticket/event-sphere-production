(function () {
  "use strict";

  const tr = (key, fallback, replacements = {}) => window.t?.(key, replacements) || fallback;
  const FALLBACK_MESSAGE = "Some details need attention. Review the form and try again.";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function flattenErrors(errors) {
    if (!errors || typeof errors !== "object") return [];
    return Object.entries(errors).flatMap(([field, messages]) => {
      const list = Array.isArray(messages) ? messages : [messages];
      return list.filter(Boolean).map((message) => ({ field, message: String(message) }));
    });
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".is-invalid").forEach((field) => {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
    });
    form.querySelectorAll("[data-auth-field-error]").forEach((el) => el.remove());
  }

  function setFieldError(form, fieldName, message) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (!field || !message) return;
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");

    const feedback = document.createElement("div");
    feedback.className = "invalid-feedback d-block";
    feedback.dataset.authFieldError = fieldName;
    feedback.textContent = message;

    const parent = field.closest(".input-group") || field;
    parent.insertAdjacentElement("afterend", feedback);
  }

  function normalizeLoginFieldMessage(field, rawMessage) {
    const message = String(rawMessage || "").toLowerCase();
    if (field === "email" && message.includes("required")) return tr("auth.email_required", "Please enter your email.");
    if (field === "email" && (message.includes("valid email") || message.includes("email field must be a valid"))) {
      return tr("auth.email_invalid", "Please enter a valid email address.");
    }
    if (field === "password" && message.includes("required")) return tr("auth.password_required", "Please enter your password.");
    if (message.includes("too many") || message.includes("throttle")) {
      return tr("auth.too_many_login_attempts", "Too many login attempts. Please wait before trying again.");
    }
    if (message.includes("credentials") || message.includes("auth.failed") || message.includes("match our records")) {
      return tr("auth.incorrect_email_or_password", "Incorrect email or password.");
    }
    if (field === "email" && (message.includes("not found") || message.includes("no account"))) {
      return tr("auth.email_not_found", "No account was found with this email address.");
    }
    if (message.includes("suspended")) {
      return tr("auth.account_suspended", "This account is suspended. Contact support for help.");
    }
    return "";
  }

  function mapLoginError(err) {
    const payload = err?.payload || {};
    const status = Number(err?.status || 0);
    const fieldErrors = {};
    const validationErrors = flattenErrors(payload.errors);

    validationErrors.forEach(({ field, message }) => {
      const normalized = normalizeLoginFieldMessage(field, message);
      if (normalized) fieldErrors[field] = normalized;
    });

    const combined = [payload.message, err?.originalMessage, err?.message, ...validationErrors.map((item) => item.message)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let summary = "";
    if (status === 0) {
      summary = tr("auth.network_error", "Unable to connect. Please check your internet connection.");
    } else if (status === 429 || combined.includes("too many") || combined.includes("throttle")) {
      summary = tr("auth.too_many_login_attempts", "Too many login attempts. Please wait before trying again.");
      fieldErrors.email = fieldErrors.email || summary;
    } else if (combined.includes("not found") || combined.includes("no account")) {
      summary = tr("auth.email_not_found", "No account was found with this email address.");
      fieldErrors.email = fieldErrors.email || summary;
    } else if (
      status === 401 ||
      combined.includes("credentials") ||
      combined.includes("auth.failed") ||
      combined.includes("match our records")
    ) {
      summary = tr("auth.incorrect_email_or_password", "Incorrect email or password.");
      fieldErrors.email = fieldErrors.email || summary;
      fieldErrors.password = fieldErrors.password || summary;
    } else if (Object.keys(fieldErrors).length) {
      summary = Object.values(fieldErrors)[0];
    } else if (status >= 500) {
      summary = tr("auth.server_error_moment", "Something went wrong. Please try again in a moment.");
    } else if (payload.message && status !== 422) {
      summary = tr("auth.sign_in_failed", "We couldn’t sign you in. Check your email and password, then try again.");
    }

    return {
      fieldErrors,
      summary: summary || tr("auth.check_input", FALLBACK_MESSAGE),
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("[data-login-form]");
    document.querySelectorAll("[data-social-auth]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.tkToast?.(
          tr("auth.social_sign_in_unavailable", "{provider} sign-in is not available yet. Please use email and password.", {
            provider: btn.dataset.socialAuth,
          }),
          "info",
        );
      });
    });
    const params = new URLSearchParams(location.search);
    if (params.get("reset") === "1") {
      window.tkToast?.(
        tr("auth.password_updated", "Password updated. Your account is secure."),
        "success",
      );
    }
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      clearFieldErrors(form);
      try {
        const emailInput = form.querySelector('[name="email"]');
        const passwordInput = form.querySelector('[name="password"]');
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const localErrors = {};
        if (!email) localErrors.email = tr("auth.email_required", "Please enter your email.");
        else if (!EMAIL_PATTERN.test(email)) localErrors.email = tr("auth.email_invalid", "Please enter a valid email address.");
        if (!password) localErrors.password = tr("auth.password_required", "Please enter your password.");
        if (Object.keys(localErrors).length) {
          Object.entries(localErrors).forEach(([field, message]) => setFieldError(form, field, message));
          window.tkToast?.(
            localErrors.email && localErrors.password
              ? tr("auth.email_password_required", "Please enter your email and password.")
              : Object.values(localErrors)[0],
            "error",
          );
          if (btn) btn.disabled = false;
          return;
        }
        const user = await window.EventSphereAuth.login(email, password);
        window.tkToast?.(tr("auth.welcome_back", "Welcome back to Tiketa."));
        window.EventSphereAuth.redirectByRole(user);
      } catch (err) {
        const mapped = mapLoginError(err);
        Object.entries(mapped.fieldErrors).forEach(([field, message]) => setFieldError(form, field, message));
        window.tkToast?.(mapped.summary, "error");
        if (btn) btn.disabled = false;
      }
    });
  });
})();
