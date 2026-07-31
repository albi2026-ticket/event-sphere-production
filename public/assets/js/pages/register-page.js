(function () {
  "use strict";

  const tr = (key, fallback, replacements = {}) => window.t?.(key, replacements) || fallback;
  const FALLBACK_MESSAGE = "Some details need attention. Review the form and try again.";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const FIELD_LABELS = {
    first_name: "First name",
    last_name: "Last name",
    name: "Name",
    email: "Email",
    password: "Password",
    password_confirmation: "Confirm password",
  };

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

    const parent = field.closest(".form-check") || field.closest(".input-group") || field;
    parent.insertAdjacentElement("afterend", feedback);
  }

  function friendlyBackendValidationMessage(field, rawMessage) {
    const message = String(rawMessage || "");
    const lower = message.toLowerCase();

    if (field === "email" && lower.includes("required")) return tr("auth.email_required", "Please enter your email.");
    if (field === "email" && (lower.includes("valid email") || lower.includes("email field must be a valid"))) {
      return tr("auth.email_invalid", "Please enter a valid email address.");
    }
    if (field === "email" && (lower.includes("already been taken") || lower.includes("already exists"))) {
      return tr("auth.email_already_exists", "An account with this email already exists.");
    }
    if (field === "password" && lower.includes("required")) return tr("auth.password_required", "Please enter your password.");
    if (
      field === "password_confirmation" ||
      (field === "password" && (lower.includes("confirmation") || lower.includes("match")))
    ) {
      return tr("auth.passwords_do_not_match", "Passwords do not match.");
    }
    if ((field === "first_name" || field === "last_name" || field === "name") && lower.includes("required")) {
      return `${FIELD_LABELS[field]} is required.`;
    }

    if (["email", "password", "first_name", "last_name", "name"].includes(field)) {
      return message;
    }

    return "";
  }

  function mapRegisterError(err) {
    const payload = err?.payload || {};
    const status = Number(err?.status || 0);
    const fieldErrors = {};
    const validationErrors = flattenErrors(payload.errors);

    validationErrors.forEach(({ field, message }) => {
      const normalized = friendlyBackendValidationMessage(field, message);
      if (normalized && !fieldErrors[field]) fieldErrors[field] = normalized;
    });

    const combined = [payload.message, err?.originalMessage, err?.message, ...validationErrors.map((item) => item.message)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let summary = "";
    if (status === 0) {
      summary = tr("auth.network_error", "Unable to connect. Please check your internet connection.");
    } else if (status >= 500) {
      summary = tr("auth.server_error", "Something went wrong. Please try again.");
    } else if (combined.includes("already been taken") || combined.includes("already exists")) {
      summary = tr("auth.email_already_exists", "An account with this email already exists.");
      fieldErrors.email = fieldErrors.email || summary;
    } else if (combined.includes("confirmation") || combined.includes("do not match")) {
      summary = tr("auth.passwords_do_not_match", "Passwords do not match.");
      fieldErrors.password_confirmation = fieldErrors.password_confirmation || summary;
    } else if (Object.keys(fieldErrors).length === 1) {
      summary = Object.values(fieldErrors)[0];
    } else if (Object.keys(fieldErrors).length > 1 || status === 422) {
      summary = tr("auth.check_input", FALLBACK_MESSAGE);
    } else if (payload.message && status !== 422) {
      summary = tr("auth.registration_failed", "We couldn’t create your account. Review the highlighted fields and try again.");
    }

    return {
      fieldErrors,
      summary: summary || tr("auth.check_input", FALLBACK_MESSAGE),
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("[data-register-form]");
    document.querySelectorAll("[data-social-auth]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.tkToast?.(
          tr("auth.social_sign_up_unavailable", "{provider} sign-up is not available yet. Please use email registration.", {
            provider: btn.dataset.socialAuth,
          }),
          "info",
        );
      });
    });
    document.querySelectorAll("[data-policy-link]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.tkToast?.(
          tr("auth.policy_unavailable", "{page} is not available yet.", {
            page: link.dataset.policyLink,
          }),
          "info",
        );
      });
    });
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      clearFieldErrors(form);
      try {
        const emailInput = form.querySelector('[name="email"]');
        const passwordInput = form.querySelector('[name="password"]');
        const confirmInput = form.querySelector('[name="password_confirmation"]');
        const firstNameInput = form.querySelector('[name="first_name"]');
        const lastNameInput = form.querySelector('[name="last_name"]');
        const termsInput = form.querySelector(".form-check-input[required]");
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const passwordConfirmation = confirmInput.value;
        const localErrors = {};
        if (!firstNameInput.value.trim()) localErrors.first_name = tr("auth.first_name_required", "Please enter your first name.");
        if (!lastNameInput.value.trim()) localErrors.last_name = tr("auth.last_name_required", "Please enter your last name.");
        if (!email) localErrors.email = tr("auth.email_required", "Please enter your email.");
        else if (!EMAIL_PATTERN.test(email)) localErrors.email = tr("auth.email_invalid", "Please enter a valid email address.");
        if (!password) localErrors.password = tr("auth.password_required", "Please enter your password.");
        else if (password.length < 8) localErrors.password = tr("auth.password_too_short", "Password must contain at least 8 characters.");
        if (!passwordConfirmation) {
          localErrors.password_confirmation = tr("auth.password_confirmation_required", "Please confirm your password.");
        } else if (password && password !== passwordConfirmation) {
          localErrors.password_confirmation = tr("auth.passwords_do_not_match", "Passwords do not match.");
        }
        if (termsInput && !termsInput.checked) {
          localErrors.terms = tr("auth.terms_required", "Please accept the terms to continue.");
        }
        if (Object.keys(localErrors).length) {
          Object.entries(localErrors).forEach(([field, message]) => setFieldError(form, field, message));
          window.tkToast?.(
            Object.keys(localErrors).length === 1
              ? Object.values(localErrors)[0]
              : tr("auth.check_input", FALLBACK_MESSAGE),
            "error",
          );
          if (btn) btn.disabled = false;
          return;
        }
        const payload = {
          first_name: firstNameInput.value.trim(),
          last_name: lastNameInput.value.trim(),
          email,
          password,
          password_confirmation: passwordConfirmation,
        };
        const user = await window.EventSphereAuth.register(payload);
        window.tkToast?.(tr("auth.welcome_to_tiketa", "Welcome to Tiketa."));
        window.EventSphereAuth.redirectByRole(user);
      } catch (err) {
        const mapped = mapRegisterError(err);
        Object.entries(mapped.fieldErrors).forEach(([field, message]) => setFieldError(form, field, message));
        window.tkToast?.(mapped.summary, "error");
        if (btn) btn.disabled = false;
      }
    });
  });
})();
