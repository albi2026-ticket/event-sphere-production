(function () {
  'use strict';

  function resetLinkData() {
    const rawSearch = String(location.search || '').replace(/&amp;/g, '&');
    const params = new URLSearchParams(rawSearch);
    const pathParts = location.pathname.split('/').filter(Boolean);
    const pathToken = pathParts[pathParts.length - 1] !== 'reset-password.html' ? pathParts[pathParts.length - 1] : '';

    return {
      token: params.get('token') || pathToken || '',
      email: params.get('email') || params.get('amp;email') || '',
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-reset-password-form]');
    const error = document.querySelector('[data-reset-error]');
    if (!form) return;

    const reset = resetLinkData();
    form.querySelector('[name="token"]').value = reset.token;
    form.querySelector('[name="email"]').value = reset.email;

    if (!reset.token || !reset.email) {
      error.textContent = 'This reset link is missing required information. Please request a new password reset link.';
      error.classList.remove('d-none');
      form.querySelector('button[type="submit"]').disabled = true;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      error?.classList.add('d-none');

      const payload = {
        token: form.querySelector('[name="token"]').value,
        email: form.querySelector('[name="email"]').value,
        password: form.querySelector('[name="password"]').value,
        password_confirmation: form.querySelector('[name="password_confirmation"]').value,
      };

      if (payload.password !== payload.password_confirmation) {
        error.textContent = 'Passwords do not match.';
        error.classList.remove('d-none');
        if (btn) btn.disabled = false;
        return;
      }
      if (payload.password.length < 8) {
        error.textContent = 'Password is too short.';
        error.classList.remove('d-none');
        if (btn) btn.disabled = false;
        return;
      }

      try {
        await window.EventSphereAuth.resetPassword(payload);
        window.EventSphereNotifications?.add({
          type: 'system',
          title: 'Password Changed',
          message: 'Your password was updated successfully.',
        });
        window.tkToast?.('Your password has been updated successfully.', 'success');
        window.setTimeout(() => {
          location.href = 'login.html?reset=1';
        }, 700);
      } catch (err) {
        error.textContent = err.message || 'Unable to reset password. Please request a new reset link.';
        error.classList.remove('d-none');
        window.tkToast?.(error.textContent, 'error');
        if (btn) btn.disabled = false;
      }
    });
  });
})();
