(function () {
  "use strict";

  const tr = (key, fallback, replacements = {}) => window.t?.(key, replacements) || fallback;

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
        tr("auth.password_updated", "Your password has been updated successfully."),
        "success",
      );
    }
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        const emailInput = form.querySelector('[name="email"]');
        const passwordInput = form.querySelector('[name="password"]');
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!emailInput.checkValidity()) throw new Error(tr("auth.email_invalid", "Please enter a valid email address."));
        if (!password) throw new Error(tr("auth.password_required", "Please enter your password."));
        const user = await window.EventSphereAuth.login(email, password);
        window.tkToast?.(tr("auth.welcome_back", "Welcome back to Tiketa."));
        window.EventSphereAuth.redirectByRole(user);
      } catch (err) {
        window.tkToast?.(
          err.message || tr("auth.sign_in_failed", "We couldn't sign you in. Please try again."),
          "error",
        );
        if (btn) btn.disabled = false;
      }
    });
  });
})();
