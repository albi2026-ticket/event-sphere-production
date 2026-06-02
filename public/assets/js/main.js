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

  /* ---------- Favorites ---------- */
  const FAV_KEY = 'tickethub-favs';
  const favs = () => JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  const setFavs = (a) => localStorage.setItem(FAV_KEY, JSON.stringify(a));
  function paintFavs() {
    const list = favs();
    document.querySelectorAll('[data-fav]').forEach(b => {
      b.classList.toggle('active', list.includes(b.dataset.fav));
    });
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const eventId = b.dataset.eventId;
    if (eventId && window.EventSphereAuth?.isLoggedIn?.() && window.EventSphereFavorites) {
      try {
        const result = await window.EventSphereFavorites.toggleFavorite(Number(eventId));
        b.classList.toggle('active', result?.is_favorited);
        window.tkToast(result?.is_favorited ? 'Saved to favorites' : 'Removed from favorites', result?.is_favorited ? 'success' : 'info');
      } catch (err) {
        window.tkToast(err.message || 'Favorite update failed', 'error');
      }
      return;
    }
    const id = b.dataset.fav;
    const list = favs();
    const i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); window.tkToast('Removed from favorites', 'info'); }
    else { list.push(id); window.tkToast('Saved to favorites'); }
    setFavs(list); paintFavs();
  });

  /* ---------- Fade-in on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  const observeFades = () => document.querySelectorAll('.fade-up:not(.in)').forEach(el => io.observe(el));

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
      : '<div class="px-3 py-2 text-muted-pro">No matches</div>';
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
    const max = Number(input.max || 10);
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
    const max = Number(input.max || 10);
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
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-toggle-side]')) {
      document.querySelector('.dash-side')?.classList.toggle('open');
    }
  });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    paintFavs();
    observeFades();
    document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
    document.querySelectorAll('[data-countdown]').forEach(startCountdown);
    document.querySelectorAll('[data-seatmap]').forEach(buildSeatmap);

    // Year
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

    // Active nav link by filename
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link-pro').forEach(a => {
      const h = a.getAttribute('href') || '';
      if (h.endsWith(path)) a.classList.add('active');
    });
  });
})();
