(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-login-form]');
    document.querySelectorAll('[data-social-auth]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.tkToast?.(`${btn.dataset.socialAuth} sign-in is not enabled yet. Use email and password.`, 'info');
      });
    });
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === '1') {
      window.tkToast?.('Your password has been updated successfully.', 'success');
    }
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
     if (btn) btn.disabled = true;
      try {
        const email = form.querySelector('[name="email"]').value.trim();
        const password = form.querySelector('[name="password"]').value;
        const user = await window.EventSphereAuth.login(email, password);
        window.tkToast?.('Welcome back!');
        window.EventSphereAuth.redirectByRole(user);
      } catch (err) {
        window.tkToast?.(err.message || 'Sign in failed', 'error');
       if (btn) btn.disabled = false;
      }
    });
  });
})();
