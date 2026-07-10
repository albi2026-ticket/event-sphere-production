(function () {
  "use strict";

  const tr = (key, fallback, replacements = {}) => window.t?.(key, replacements) || fallback;

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
      try {
        const emailInput = form.querySelector('[name="email"]');
        const passwordInput = form.querySelector('[name="password"]');
        const password = passwordInput.value;
        if (!emailInput.checkValidity()) throw new Error(tr("auth.email_invalid", "Please enter a valid email address."));
        if (password.length < 8) {
          throw new Error(tr("auth.password_too_short", "Password must contain at least 8 characters."));
        }
        const payload = {
          first_name: form.querySelector('[name="first_name"]').value.trim(),
          last_name: form.querySelector('[name="last_name"]').value.trim(),
          email: emailInput.value.trim(),
          password,
          password_confirmation: password,
        };
        const user = await window.EventSphereAuth.register(payload);
        window.tkToast?.(tr("auth.welcome_to_tiketa", "Welcome to Tiketa."));
        window.EventSphereAuth.redirectByRole(user);
      } catch (err) {
        window.tkToast?.(
          err.message || tr("auth.registration_failed", "We couldn't create your account. Please try again."),
          "error",
        );
        if (btn) btn.disabled = false;
      }
    });
  });
})();
