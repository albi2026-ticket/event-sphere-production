(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-register-form]');
    document.querySelectorAll('[data-social-auth]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.tkToast?.(`${btn.dataset.socialAuth} sign-up is not enabled yet. Use email registration.`, 'info');
      });
    });
    document.querySelectorAll('[data-policy-link]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.tkToast?.(`${link.dataset.policyLink} page is not published yet.`, 'info');
      });
    });
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        const password = form.querySelector('[name="password"]').value;
        const payload = {
          first_name: form.querySelector('[name="first_name"]').value.trim(),
          last_name: form.querySelector('[name="last_name"]').value.trim(),
          email: form.querySelector('[name="email"]').value.trim(),
          password,
          password_confirmation: password,
        };
        const user = await window.EventSphereAuth.register(payload);
        window.tkToast?.('Welcome to TicketHub!');
        window.EventSphereAuth.redirectByRole(user);
      } catch (err) {
        window.tkToast?.(err.message || 'Registration failed', 'error');
        if (btn) btn.disabled = false;
      }
    });
  });
})();
