(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-forgot-password-form]');
    const success = document.querySelector('[data-reset-success]');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      success?.classList.add('d-none');

      try {
        const email = form.querySelector('[name="email"]').value.trim();
        await window.EventSphereAuth.requestPasswordReset(email);
        success?.classList.remove('d-none');
        window.tkToast?.('Password reset link has been sent to your email.', 'success');
      } catch (err) {
        window.tkToast?.(err.message || 'Unable to send reset link', 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });
})();
