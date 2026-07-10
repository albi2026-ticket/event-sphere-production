(function () {
  "use strict";

  const tr = (key, fallback) => window.t?.(key) || fallback;

  function resetLinkData() {
    const rawSearch = String(location.search || "").replace(/&amp;/g, "&");
    const params = new URLSearchParams(rawSearch);
    const pathParts = location.pathname.split("/").filter(Boolean);
    const pathToken =
      pathParts[pathParts.length - 1] !== "/reset-password" ? pathParts[pathParts.length - 1] : "";

    return {
      token: params.get("token") || pathToken || "",
      email: params.get("email") || params.get("amp;email") || "",
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("[data-reset-password-form]");
    const error = document.querySelector("[data-reset-error]");
    if (!form) return;

    const reset = resetLinkData();
    form.querySelector('[name="token"]').value = reset.token;
    form.querySelector('[name="email"]').value = reset.email;

    if (!reset.token || !reset.email) {
      error.textContent =
        tr("auth.reset_link_invalid", "This reset link is not valid. Please request a new password reset link.");
      error.classList.remove("d-none");
      form.querySelector('button[type="submit"]').disabled = true;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      error?.classList.add("d-none");

      const payload = {
        token: form.querySelector('[name="token"]').value,
        email: form.querySelector('[name="email"]').value,
        password: form.querySelector('[name="password"]').value,
        password_confirmation: form.querySelector('[name="password_confirmation"]').value,
      };

      if (payload.password !== payload.password_confirmation) {
        error.textContent = tr("auth.passwords_do_not_match", "Passwords do not match.");
        error.classList.remove("d-none");
        if (btn) btn.disabled = false;
        return;
      }
      if (payload.password.length < 8) {
        error.textContent = tr("auth.password_too_short", "Password must contain at least 8 characters.");
        error.classList.remove("d-none");
        if (btn) btn.disabled = false;
        return;
      }

      try {
        await window.EventSphereAuth.resetPassword(payload);
        window.EventSphereNotifications?.add({
          type: "system",
          title: tr("auth.password_changed_title", "Password changed"),
          message: tr("auth.password_updated", "Your password was updated successfully."),
        });
        window.tkToast?.(tr("auth.password_updated", "Your password was updated successfully."), "success");
        window.setTimeout(() => {
          location.href = "/login?reset=1";
        }, 700);
      } catch (err) {
        error.textContent =
          err.message || tr("auth.reset_failed", "We couldn't reset your password. Please request a new reset link.");
        error.classList.remove("d-none");
        window.tkToast?.(error.textContent, "error");
        if (btn) btn.disabled = false;
      }
    });
  });
})();
