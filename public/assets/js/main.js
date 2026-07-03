/* TicketHub — shared frontend logic */
(function () {
  'use strict';

  /* ---------- Theme toggle ---------- */
  const THEME_KEY = 'tickethub-theme';
  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.className = 'bi ' + (t === 'light' ? 'bi-moon-stars' : 'bi-sun');
    });
    document.dispatchEvent(new CustomEvent('event-sphere:theme-changed', { detail: { theme: t } }));
  };
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Toasts ---------- */
  function ensureStack() {
    let s = document.querySelector('.toast-stack');
    if (!s) { s = document.createElement('div'); s.className = 'toast-stack'; document.body.appendChild(s); }
    return s;
  }
  window.tkToast = function (msg, type = 'success') {
    const s = ensureStack();
    const t = document.createElement('div');
    t.className = 'toast-pro ' + type;
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
    t.innerHTML = `<i class="bi ${icon}"></i><div>${msg}</div>`;
    s.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = 'all .25s'; }, 2800);
    setTimeout(() => t.remove(), 3200);
  };

  /* ---------- In-app notifications ---------- */
  const NOTIFICATION_KEY = 'eventsphere-notifications';
  let serverNotifications = [];
  let serverUnreadCount = 0;
  let notificationRefreshInFlight = null;
  const notificationIcon = {
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
    event_updated: 'bi-calendar-event',
    event_cancelled: 'bi-calendar-x',
    system: 'bi-shield-check',
  };

  function html(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[char]);
  }

  function notificationUserKey() {
    const user = window.EventSphereAuth?.getUser?.();
    return user?.id ? `${NOTIFICATION_KEY}:${user.id}` : `${NOTIFICATION_KEY}:guest`;
  }

  function localNotifications() {
    const key = notificationUserKey();
    try {
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(stored)) return stored;
    } catch {
      /* reset invalid local notification cache */
    }
    localStorage.setItem(key, JSON.stringify([]));
    return [];
  }

  function normalizeNotification(item) {
    return {
      id: item.id,
      type: item.type || 'system',
      title: item.title || 'Notification',
      message: item.message || '',
      link: item.link || '',
      created_at: item.created_at || new Date().toISOString(),
      is_read: Boolean(item.is_read ?? item.read),
    };
  }

  function readNotifications() {
    return window.EventSphereAuth?.isLoggedIn?.()
      ? serverNotifications
      : localNotifications();
  }

  function writeNotifications(items) {
    localStorage.setItem(notificationUserKey(), JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('event-sphere:notifications-changed', { detail: { notifications: items } }));
  }

  function addNotification(item) {
    const notifications = readNotifications();
    const notification = {
      id: item.id || `notification-${Date.now()}`,
      type: item.type || 'system',
      title: item.title || 'Notification',
      message: item.message || '',
      link: item.link || '',
      created_at: item.created_at || new Date().toISOString(),
      is_read: Boolean(item.is_read ?? item.read),
      source: item.source || 'local',
    };
    writeNotifications([notification, ...notifications].slice(0, 30));
    return notification;
  }

  async function refreshNotifications(force = false) {
    if (!window.EventSphereAuth?.isLoggedIn?.() || !window.EventSphereApi?.fetch) {
      serverNotifications = [];
      serverUnreadCount = 0;
      renderNotifications();
      return [];
    }

    if (notificationRefreshInFlight && !force) return notificationRefreshInFlight;

    notificationRefreshInFlight = Promise.all([
      window.EventSphereApi.fetch('/notifications?per_page=10', { skipAuthRedirect: true }),
      window.EventSphereApi.fetch('/notifications/unread-count', { skipAuthRedirect: true }),
    ]).then(([notifications, count]) => {
      serverNotifications = (Array.isArray(notifications.data) ? notifications.data : []).map(normalizeNotification);
      serverUnreadCount = Number(count.data?.count || 0);
      renderNotifications();
      return serverNotifications;
    }).catch(() => {
      serverNotifications = [];
      serverUnreadCount = 0;
      renderNotifications();
      return [];
    }).finally(() => {
      notificationRefreshInFlight = null;
    });

    return notificationRefreshInFlight;
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

  function renderNotifications() {
    const panel = document.querySelector('[data-notification-panel]');
    const list = document.querySelector('[data-notification-list]');
    const badge = document.querySelector('[data-notification-count]');
    const empty = document.querySelector('[data-notification-empty]');
    if (!panel || !list || !badge) return;

    const notifications = readNotifications();
    const unread = window.EventSphereAuth?.isLoggedIn?.()
      ? serverUnreadCount
      : notifications.filter((item) => !item.is_read).length;
    badge.textContent = String(unread);
    badge.hidden = unread === 0;
    if (empty) empty.hidden = notifications.length > 0;
    list.innerHTML = notifications.map((item) => `
      <button class="notification-item${item.is_read ? '' : ' unread'}" type="button" data-notification-id="${html(item.id)}">
        <span class="notification-icon"><i class="bi ${notificationIcon[item.type] || notificationIcon.system}"></i></span>
        <span class="notification-copy">
          <span class="notification-title">${html(item.title)}</span>
          <span class="notification-message">${html(item.message)}</span>
          <span class="notification-time">${relativeTime(item.created_at)}</span>
        </span>
      </button>
    `).join('');
  }

  async function markNotificationRead(id) {
    if (window.EventSphereAuth?.isLoggedIn?.() && window.EventSphereApi?.fetch) {
      await window.EventSphereApi.fetch(`/notifications/${id}/read`, { method: 'PATCH', body: {}, skipAuthRedirect: true });
      serverNotifications = serverNotifications.map((item) => String(item.id) === String(id) ? { ...item, is_read: true } : item);
      serverUnreadCount = Math.max(0, serverUnreadCount - 1);
      renderNotifications();
      return;
    }

    writeNotifications(readNotifications().map((item) => String(item.id) === String(id) ? { ...item, is_read: true } : item));
  }

  async function markAllNotificationsRead() {
    if (window.EventSphereAuth?.isLoggedIn?.() && window.EventSphereApi?.fetch) {
      await window.EventSphereApi.fetch('/notifications/read-all', { method: 'PATCH', body: {}, skipAuthRedirect: true });
      serverNotifications = serverNotifications.map((item) => ({ ...item, is_read: true }));
      serverUnreadCount = 0;
      renderNotifications();
      return;
    }

    writeNotifications(readNotifications().map((item) => ({ ...item, is_read: true })));
  }

  let notificationsBound = false;
  function setupNotifications() {
    renderNotifications();
    if (window.EventSphereAuth?.isLoggedIn?.()) {
      refreshNotifications().catch(() => {});
    }
    if (notificationsBound) return;
    notificationsBound = true;
    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-notification-toggle]');
      const root = event.target.closest('[data-notification-root]');
      const panel = document.querySelector('[data-notification-panel]');
      if (toggle && panel) {
        event.preventDefault();
        const open = panel.hidden;
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) refreshNotifications(true);
        else renderNotifications();
        return;
      }
      const markAll = event.target.closest('[data-notification-mark-all]');
      if (markAll) {
        markAllNotificationsRead().catch(() => window.tkToast?.(window.t?.('toast.notification_update_failed') || 'Notification update failed', 'error'));
        return;
      }
      const item = event.target.closest('[data-notification-id]');
      if (item) {
        const notification = readNotifications().find((entry) => String(entry.id) === String(item.dataset.notificationId));
        markNotificationRead(item.dataset.notificationId)
          .then(() => {
            if (notification?.link) location.href = notification.link;
          })
          .catch(() => window.tkToast?.(window.t?.('toast.notification_update_failed') || 'Notification update failed', 'error'));
        return;
      }
      if (!root && panel) {
        panel.hidden = true;
        document.querySelector('[data-notification-toggle]')?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  window.EventSphereNotifications = {
    list: readNotifications,
    add: addNotification,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
    refresh: refreshNotifications,
    render: renderNotifications,
    syncFromServer(items = []) {
      if (!Array.isArray(items)) return;
      serverNotifications = items.map(normalizeNotification);
      renderNotifications();
    },
  };
  document.addEventListener('DOMContentLoaded', setupNotifications);
  document.addEventListener('event-sphere:partials-loaded', setupNotifications);
  document.addEventListener('event-sphere:auth-changed', () => refreshNotifications(true));
  document.addEventListener('event-sphere:notifications-changed', () => renderNotifications());

  /* ---------- Favorites ---------- */
  const FAV_KEY = 'tickethub-favs';
  const favs = () => JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  const setFavs = (a) => localStorage.setItem(FAV_KEY, JSON.stringify(a));
  function paintFavs() {
    const list = favs();
    document.querySelectorAll('[data-fav]').forEach(b => {
      const active = list.includes(b.dataset.fav);
      b.classList.toggle('active', active);
      const icon = b.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-heart-fill', active);
        icon.classList.toggle('bi-heart', !active);
      }
    });
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const eventId = b.dataset.eventId;
    if (eventId && !window.EventSphereAuth?.isLoggedIn?.()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `/login?next=${next}`;
      return;
    }
    if (eventId && window.EventSphereFavorites) {
      try {
        const result = await window.EventSphereFavorites.toggleFavorite(Number(eventId));
        window.EventSphereFavorites.updateFavoriteButtons?.(eventId, result?.is_favorited);
        window.tkToast(
          result?.is_favorited
            ? (window.t?.('toast.saved_to_favorites') || 'Saved to favorites')
            : (window.t?.('toast.removed_from_favorites') || 'Removed from favorites'),
          result?.is_favorited ? 'success' : 'info'
        );
      } catch (err) {
        window.tkToast(err.message || window.t?.('toast.favorite_update_failed') || 'Favorite update failed', 'error');
      }
      return;
    }
    const id = b.dataset.fav;
    const list = favs();
    const i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); window.tkToast(window.t?.('toast.removed_from_favorites') || 'Removed from favorites', 'info'); }
    else { list.push(id); window.tkToast(window.t?.('toast.saved_to_favorites') || 'Saved to favorites'); }
    setFavs(list); paintFavs();
  });

  /* ---------- Fade-in on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  const observeFades = () => document.querySelectorAll('.fade-up:not(.in)').forEach(el => io.observe(el));

  /* ---------- Footer reveal ---------- */
  const footerIo = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          footerIo.unobserve(en.target);
        }
      });
    }, { threshold: 0.08 })
    : null;
  function observeFooters() {
    document.querySelectorAll('.footer:not([data-footer-reveal-bound])').forEach((footer) => {
      footer.dataset.footerRevealBound = 'true';
      footer.classList.add('footer-reveal');
      if (footerIo) footerIo.observe(footer);
      else footer.classList.add('in');
    });
  }

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    const target = +el.dataset.count;
    const dur = 1400; const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { animateCounter(en.target); cio.unobserve(en.target); } });
  });

  /* ---------- Countdown ---------- */
  function startCountdown(el) {
    if (!el.dataset.countdown) return;
    if (el._countdownTimer) clearInterval(el._countdownTimer);
    const target = new Date(el.dataset.countdown).getTime();
    const end = el.dataset.countdownEnd ? new Date(el.dataset.countdownEnd).getTime() : null;
    const tick = () => {
      if (Number.isNaN(target)) return;
      if (end && Date.now() >= end) {
        el.innerHTML = '<div class="unit"><b>Event</b><span>Ended</span></div>';
        clearInterval(el._countdownTimer);
        return;
      }
      const d = target - Date.now();
      if (d <= 0) {
        el.innerHTML = '<div class="unit"><b>Event</b><span>Started</span></div>';
        if (!end) clearInterval(el._countdownTimer);
        return;
      }
      const days = Math.floor(d / 864e5);
      const hrs = Math.floor((d % 864e5) / 36e5);
      const min = Math.floor((d % 36e5) / 6e4);
      el.innerHTML = `
        <div class="unit"><b>${days}</b><span>Days</span></div>
        <div class="unit"><b>${String(hrs).padStart(2,'0')}</b><span>Hours</span></div>
        <div class="unit"><b>${String(min).padStart(2,'0')}</b><span>Min</span></div>`;
    };
    tick(); el._countdownTimer = setInterval(tick, 30000);
  }
  window.EventSphereStartCountdown = startCountdown;

  /* ---------- Search autocomplete ---------- */
  const sampleEvents = [];
  document.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-autocomplete]');
    if (!inp) return;
    const wrap = inp.closest('.ac-wrap');
    if (!wrap) return;
    let menu = wrap.querySelector('.ac-menu');
    const q = inp.value.trim().toLowerCase();
    if (!q) { if (menu) menu.remove(); return; }
    if (!sampleEvents.length) { if (menu) menu.remove(); return; }
    const hits = sampleEvents.filter(s => s.toLowerCase().includes(q)).slice(0, 6);
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'ac-menu glass';
      menu.style.cssText = 'position:absolute;z-index:50;left:0;right:0;top:100%;margin-top:8px;padding:.4rem;max-height:280px;overflow:auto';
      wrap.style.position = 'relative';
      wrap.appendChild(menu);
    }
    menu.innerHTML = hits.length
      ? hits.map(h => `<div class="px-3 py-2 rounded" data-ac-value="${h.replace(/"/g, '&quot;')}" style="cursor:pointer" onmouseover="this.style.background='var(--card-2)'" onmouseout="this.style.background=''"><i class="bi bi-search me-2 text-muted-pro"></i>${h}</div>`).join('')
      : `<div class="px-3 py-2 text-muted-pro" data-i18n="empty.no_matches">${window.t?.('empty.no_matches') || 'No matches'}</div>`;
  });
  document.addEventListener('click', (e) => {
    const suggestion = e.target.closest('[data-ac-value]');
    if (suggestion) {
      const wrap = suggestion.closest('.ac-wrap');
      const input = wrap?.querySelector('[data-autocomplete]');
      if (input) {
        input.value = suggestion.dataset.acValue || '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      suggestion.closest('.ac-menu')?.remove();
      return;
    }
    if (!e.target.closest('.ac-wrap')) document.querySelectorAll('.ac-menu').forEach(m => m.remove());
  });

  /* ---------- Seat map ---------- */
  function buildSeatmap(el) {
    const rows = +el.dataset.rows || 10;
    const cols = +el.dataset.cols || 16;
    const html = [];
    html.push('<div class="stage">STAGE</div>');
    for (let r = 0; r < rows; r++) {
      const row = [];
      const letter = String.fromCharCode(65 + r);
      row.push(`<div class="seat-row"><span class="me-2 text-muted-pro small" style="width:18px">${letter}</span>`);
      for (let c = 0; c < cols; c++) {
        const isTaken = Math.random() < 0.18;
        const isVip = r < 2;
        const cls = isTaken ? 'taken' : isVip ? 'vip' : '';
        const price = isVip ? 220 : 95;
        row.push(`<div class="seat ${cls}" data-seat="${letter}${c+1}" data-price="${price}" title="${letter}${c+1} — $${price}"></div>`);
      }
      row.push('</div>');
      html.push(row.join(''));
    }
    html.push(`<div class="seat-legend">
      <span class="av">Available</span><span class="vp">VIP</span><span class="sl">Selected</span><span class="tk">Taken</span>
    </div>`);
    el.innerHTML = html.join('');
  }
  document.addEventListener('click', (e) => {
    const s = e.target.closest('.seat:not(.taken)');
    if (!s) return;
    s.classList.toggle('selected');
    updateSeatSummary();
  });
  function updateSeatSummary() {
    const sel = document.querySelectorAll('.seat.selected');
    const sum = Array.from(sel).reduce((a, b) => a + (+b.dataset.price || 0), 0);
    const list = Array.from(sel).map(s => s.dataset.seat).join(', ') || 'None';
    const t = document.querySelector('[data-seat-total]'); if (t) t.textContent = '$' + sum;
    const l = document.querySelector('[data-seat-list]'); if (l) l.textContent = list;
    const c = document.querySelector('[data-seat-count]'); if (c) c.textContent = sel.length;
  }

  /* ---------- Quantity stepper & dynamic price ---------- */
  function updateQtyTotal(wrap) {
    const input = wrap?.querySelector('input');
    if (!input) return;
    const unit = Number(wrap.dataset.price || 0);
    const min = Number(input.min || 1);
    const max = input.max ? Number(input.max) : Number.POSITIVE_INFINITY;
    const currency = wrap.dataset.currency || 'USD';
    const value = Math.max(min, Math.min(Number(input.value || min), max));
    input.value = value;
    const out = wrap.querySelector('[data-qty-total]');
    if (out && window.EventSphereUtils?.formatMoney) {
      out.textContent = window.EventSphereUtils.formatMoney(value * unit, currency);
    } else if (out) {
      out.textContent = '$' + (value * unit).toFixed(2);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-qty]');
    if (!btn) return;
    const wrap = btn.closest('.qty-wrap');
    const input = wrap.querySelector('input');
    const min = Number(input.min || 1);
    const max = input.max ? Number(input.max) : Number.POSITIVE_INFINITY;
    let v = Number(input.value || min);
    v = btn.dataset.qty === '+' ? Math.min(max, v + 1) : Math.max(min, v - 1);
    input.value = v;
    updateQtyTotal(wrap);
  });

  document.addEventListener('input', (e) => {
    const input = e.target.closest('.qty-wrap input');
    if (!input) return;
    updateQtyTotal(input.closest('.qty-wrap'));
  });

  /* ---------- Mobile dash sidebar ---------- */
  function dashboardSidebar() {
    const side = document.querySelector('.dash-side');
    if (!side) return null;
    let backdrop = document.querySelector('[data-dash-backdrop]');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'dash-backdrop';
      backdrop.dataset.dashBackdrop = 'true';
      backdrop.setAttribute('aria-label', 'Close dashboard menu');
      document.body.appendChild(backdrop);
    }
    return { side, backdrop };
  }

  function setDashboardSidebar(open) {
    const parts = dashboardSidebar();
    if (!parts) return;
    const { side, backdrop } = parts;
    side.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    document.body.classList.toggle('dash-menu-open', open);
    document.querySelectorAll('[data-toggle-side]').forEach((button) => {
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  window.EventSphereDashboardNav = {
    open: () => setDashboardSidebar(true),
    close: () => setDashboardSidebar(false),
    toggle: () => {
      const parts = dashboardSidebar();
      if (parts) setDashboardSidebar(!parts.side.classList.contains('open'));
    },
  };

  document.addEventListener('click', (e) => {
    const parts = dashboardSidebar();
    if (!parts) return;
    const toggle = e.target.closest('[data-toggle-side]');
    if (toggle) {
      e.preventDefault();
      setDashboardSidebar(!parts.side.classList.contains('open'));
      return;
    }
    if (e.target.closest('[data-dash-backdrop]') || (parts.side.classList.contains('open') && e.target.closest('.dash-side a'))) {
      setDashboardSidebar(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setDashboardSidebar(false);
  });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    paintFavs();
    observeFades();
    observeFooters();
    document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
    document.querySelectorAll('[data-countdown]').forEach(startCountdown);
    document.querySelectorAll('[data-seatmap]').forEach(buildSeatmap);
    dashboardSidebar();
    setDashboardSidebar(false);

    // Year
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

    // Active nav link by filename
    const path = location.pathname.split('/').pop() || '/';
    document.querySelectorAll('.nav-link-pro').forEach(a => {
      const h = a.getAttribute('href') || '';
      if (h.endsWith(path)) a.classList.add('active');
    });
  });
  document.addEventListener('event-sphere:partials-loaded', observeFooters);
})();
