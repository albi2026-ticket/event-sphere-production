(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const state = {
    notifications: [],
    meta: null,
    page: 1,
    loading: false,
    error: null,
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[char]);
  }

  function relativeTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Just now';
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function icon(type) {
    const map = {
      reservation_created: 'bi-calendar-plus',
      reservation_confirmed: 'bi-patch-check',
      reservation_cancelled: 'bi-calendar-x',
      reservation_cancelled_by_user: 'bi-person-x',
      ticket_purchased: 'bi-ticket-perforated',
      ticket_refunded: 'bi-arrow-counterclockwise',
      new_ticket_sale: 'bi-receipt',
      venue_created: 'bi-shop',
      venue_deactivated: 'bi-pause-circle',
      event_approved: 'bi-calendar-check',
      event_rejected: 'bi-calendar-x',
    };
    return map[type] || 'bi-bell';
  }

  function render() {
    const list = document.querySelector('[data-notifications-list]');
    const pager = document.querySelector('[data-notifications-pagination]');
    if (!list) return;

    if (state.loading) {
      list.innerHTML = '<div class="dashboard-empty"><span class="spinner-border spinner-border-sm"></span><span>Loading notifications...</span></div>';
      if (pager) pager.innerHTML = '';
      return;
    }

    if (state.error) {
      list.innerHTML = `<div class="dashboard-empty text-danger"><i class="bi bi-exclamation-triangle"></i><span>${esc(state.error)}</span><button class="btn btn-glass btn-sm" type="button" data-notifications-retry>Retry</button></div>`;
      if (pager) pager.innerHTML = '';
      return;
    }

    list.innerHTML = state.notifications.length ? state.notifications.map((item) => `
      <div class="notification-item ${item.is_read ? '' : 'unread'}" data-notification-row="${item.id}">
        <span class="notification-icon"><i class="bi ${icon(item.type)}"></i></span>
        <span class="notification-copy">
          <span class="notification-title">${esc(item.title)}</span>
          <span class="notification-message">${esc(item.message)}</span>
          <span class="notification-time">${relativeTime(item.created_at)}</span>
        </span>
        <span class="dashboard-actions ms-auto">
          ${item.is_read ? '' : `<button class="btn btn-glass btn-sm" type="button" data-mark-notification-read="${item.id}">Mark as read</button>`}
          ${item.link ? `<button class="btn btn-primary-grad btn-sm" type="button" data-open-notification="${item.id}">Open</button>` : ''}
        </span>
      </div>
    `).join('') : '<div class="dashboard-empty"><i class="bi bi-bell"></i><span>No notifications yet.</span></div>';

    if (pager && state.meta?.last_page > 1) {
      const current = Number(state.meta.current_page || state.page);
      pager.innerHTML = `<div class="dashboard-pagination"><button class="btn btn-glass btn-sm" type="button" data-notifications-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}>Previous</button><span class="text-muted-pro small">Page ${current} of ${state.meta.last_page}</span><button class="btn btn-glass btn-sm" type="button" data-notifications-page="${current + 1}" ${current >= state.meta.last_page ? 'disabled' : ''}>Next</button></div>`;
    } else if (pager) {
      pager.innerHTML = '';
    }
  }

  async function load(page = 1) {
    state.loading = true;
    state.error = null;
    render();
    try {
      const res = await api().fetch(`/notifications?per_page=15&page=${page}`);
      state.notifications = Array.isArray(res.data) ? res.data : [];
      state.meta = res.meta || res.raw?.meta || null;
      state.page = page;
    } catch (err) {
      state.error = err.message || 'Failed to load notifications';
    } finally {
      state.loading = false;
      render();
    }
  }

  async function markRead(id) {
    await api().fetch(`/notifications/${id}/read`, { method: 'PATCH', body: {} });
    state.notifications = state.notifications.map((item) => String(item.id) === String(id) ? { ...item, is_read: true } : item);
    window.EventSphereNotifications?.refresh?.(true);
    render();
  }

  function bindActions() {
    document.addEventListener('click', async (event) => {
      const retry = event.target.closest('[data-notifications-retry]');
      if (retry) {
        await load(state.page);
        return;
      }

      const page = event.target.closest('[data-notifications-page]');
      if (page) {
        await load(Number(page.dataset.notificationsPage || 1));
        return;
      }

      const read = event.target.closest('[data-mark-notification-read]');
      if (read) {
        read.disabled = true;
        try {
          await markRead(read.dataset.markNotificationRead);
        } catch (err) {
          read.disabled = false;
          window.tkToast?.(err.message || 'Notification update failed', 'error');
        }
        return;
      }

      const open = event.target.closest('[data-open-notification]');
      if (open) {
        open.disabled = true;
        const item = state.notifications.find((notification) => String(notification.id) === String(open.dataset.openNotification));
        try {
          await markRead(open.dataset.openNotification);
          if (item?.link) location.href = item.link;
        } catch (err) {
          open.disabled = false;
          window.tkToast?.(err.message || 'Notification update failed', 'error');
        }
        return;
      }

      const readAll = event.target.closest('[data-notifications-read-all]');
      if (readAll) {
        readAll.disabled = true;
        try {
          await api().fetch('/notifications/read-all', { method: 'PATCH', body: {} });
          state.notifications = state.notifications.map((item) => ({ ...item, is_read: true }));
          window.EventSphereNotifications?.refresh?.(true);
          render();
        } catch (err) {
          window.tkToast?.(err.message || 'Notification update failed', 'error');
        } finally {
          readAll.disabled = false;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!auth().requireAuth(['user', 'organizer', 'admin'], { requireApprovedOrganizer: false })) return;
    bindActions();
    await load(1);
  });
})();
