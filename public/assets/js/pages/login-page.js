(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-login-form]');
    document.querySelectorAll('[data-social-auth]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.tkToast?.(`${btn.dataset.socialAuth} sign-in is not enabled yet. Use email and password.`, 'info');
      });
    });
    document.querySelector('[data-forgot-password]')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.tkToast?.('Password reset email flow is available through the API but has no email UI yet.', 'info');
    });
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
