(function () {
  "use strict";

  const tr = (key, fallback) => window.t?.(key) || fallback;

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("[data-forgot-password-form]");
    const success = document.querySelector("[data-reset-success]");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      success?.classList.add("d-none");

      try {
        const email = form.querySelector('[name="email"]').value.trim();
        await window.EventSphereAuth.requestPasswordReset(email);
        success?.classList.remove("d-none");
        window.tkToast?.(tr("auth.reset_link_sent", "Password reset link sent. Please check your email."), "success");
      } catch (err) {
        window.tkToast?.(
          err.message || tr("auth.reset_link_failed", "We couldn’t send a reset link. Check the email address and try again."),
          "error",
        );
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });
})();
