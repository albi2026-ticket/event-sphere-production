(function () {
  'use strict';

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  const state = {
    events: [],
    selectedEvent: null,
    pendingImages: [],
    busy: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  document.addEventListener('DOMContentLoaded', async () => {
    const user = auth().requireAuth(['organizer', 'admin'], { requireApprovedOrganizer: true });
    if (!user) return;

    wireEventForm();
    wireTierControls();
    wireImageUpload();
    wireEventActions();
    wireUtilityActions();

    try {
      await Promise.all([loadDashboard(), loadEvents()]);
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load organizer dashboard', 'error');
    }
  });

  async function loadDashboard() {
    const { data: summary } = await api().fetch('/organizer/dashboard/summary');
    const cards = summary.cards || {};

    const kpiRow = $('[data-organizer-kpis]');
    if (kpiRow) {
      kpiRow.innerHTML = `
        <div class="col-md-3"><div class="kpi"><div class="label">Revenue</div><div class="value">${u().formatMoney(cards.total_revenue, 'USD')}</div></div></div>
        <div class="col-md-3"><div class="kpi"><div class="label">Tickets sold</div><div class="value">${cards.tickets_sold ?? 0}</div></div></div>
        <div class="col-md-3"><div class="kpi"><div class="label">Events</div><div class="value">${cards.events_count ?? 0}</div></div></div>
        <div class="col-md-3"><div class="kpi"><div class="label">Attendees</div><div class="value">${cards.attendees_count ?? 0}</div></div></div>`;
    }

    await Promise.all([loadCharts(), loadAttendees()]);
  }

  async function loadCharts() {
    const { data: trends } = await api().fetch('/organizer/analytics/sales-trends');
    const revChart = document.getElementById('chartRev');
    if (revChart && window.Chart && Array.isArray(trends)) {
      const labels = trends.map((t) => String(t.period).slice(0, 10));
      const values = trends.map((t) => Number(t.revenue));
      if (window._chartRev) window._chartRev.destroy();
      window._chartRev = new Chart(revChart, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue', data: values, borderColor: '#5B8CFF', tension: 0.35, fill: true, backgroundColor: 'rgba(91,140,255,.12)' }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94A3B8' } }, x: { ticks: { color: '#94A3B8' } } } },
      });
    }

    const { data: analytics } = await api().fetch('/organizer/analytics');
    const catChart = document.getElementById('chartCat');
    if (catChart && window.Chart && analytics?.revenue_by_event) {
      const byEvent = Array.isArray(analytics.revenue_by_event) ? analytics.revenue_by_event : [];
      if (window._chartCat) window._chartCat.destroy();
      window._chartCat = new Chart(catChart, {
        type: 'doughnut',
        data: {
          labels: byEvent.map((e) => e.title),
          datasets: [{ data: byEvent.map((e) => Number(e.revenue)), backgroundColor: ['#5B8CFF', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899'] }],
        },
        options: { plugins: { legend: { labels: { color: '#94A3B8' } } } },
      });
    }
  }

  async function loadAttendees() {
    const attBody = $('[data-organizer-attendees] tbody');
    if (!attBody) return;

    const res = await api().fetch('/organizer/orders/recent?per_page=5');
    const orders = Array.isArray(res.data) ? res.data : [];
    attBody.innerHTML = orders.map((o) =>
      `<tr><td>${u().escapeHtml(o.user?.name || o.billing_first_name || 'Guest')}</td><td>${u().escapeHtml(o.items?.[0]?.event_title || '—')}</td><td>${o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}</td><td>${u().formatMoney(o.total, o.currency)}</td><td><span class="badge" style="background:rgba(34,197,94,.15);color:#86efac">${u().escapeHtml(o.payment_status)}</span></td><td></td></tr>`,
    ).join('') || '<tr><td colspan="6" class="text-muted-pro">No recent orders</td></tr>';
  }

  async function loadEvents(selectId = null) {
    const body = $('[data-organizer-events]');
    if (body) body.innerHTML = '<tr><td colspan="6" class="text-muted-pro">Loading events...</td></tr>';

    const res = await api().fetch('/organizer/events?per_page=100&sort=newest');
    state.events = Array.isArray(res.data) ? res.data : [];
    renderEvents();

    if (selectId) {
      await selectEvent(selectId);
    } else if (state.selectedEvent) {
      const refreshed = state.events.find((event) => event.id === state.selectedEvent.id);
      if (refreshed) fillForm(refreshed);
    }
  }

  function renderEvents() {
    const body = $('[data-organizer-events]');
    if (!body) return;

    if (!state.events.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-muted-pro">No events yet. Create your first event above.</td></tr>';
      return;
    }

    body.innerHTML = state.events.map((event) => {
      const tiers = event.ticket_types || [];
      const total = tiers.reduce((sum, tier) => sum + Number(tier.quantity_total || 0), 0);
      const sold = tiers.reduce((sum, tier) => sum + Number(tier.quantity_sold || 0), 0);
      const reserved = tiers.reduce((sum, tier) => sum + Number(tier.quantity_reserved || 0), 0);
      const available = Math.max(0, total - sold - reserved);
      const statusStyle = statusBadgeStyle(event.status);

      return `<tr data-event-row="${event.id}">
        <td><div class="fw-semibold">${u().escapeHtml(event.title)}</div><small class="text-muted-pro">${u().escapeHtml(event.city || '')}${event.venue_name ? ` · ${u().escapeHtml(event.venue_name)}` : ''}</small></td>
        <td><span class="badge" style="${statusStyle}">${u().escapeHtml(event.status)}</span></td>
        <td>${tiers.length}</td>
        <td>${available} available / ${total} total</td>
        <td>${u().escapeHtml(u().formatEventDate(event.starts_at, event.timezone))}</td>
        <td class="text-end"><button class="btn btn-glass btn-sm" type="button" data-event-edit="${event.id}">Manage</button></td>
      </tr>`;
    }).join('');
  }

  function statusBadgeStyle(status) {
    if (status === 'published') return 'background:rgba(34,197,94,.15);color:#86efac';
    if (status === 'rejected' || status === 'cancelled') return 'background:rgba(239,68,68,.18);color:#fca5a5';
    if (status === 'pending_review') return 'background:rgba(245,158,11,.18);color:#fcd34d';
    return 'background:rgba(91,140,255,.15);color:#93b4ff';
  }

  function wireEventForm() {
    const form = $('[data-organizer-event-form]');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEvent({ publish: false, forceStatus: state.selectedEvent?.status || 'draft' });
    });

    $('[data-organizer-save-draft]')?.addEventListener('click', async () => {
      await saveEvent({ publish: false, forceStatus: 'draft' });
    });

    $('[data-organizer-publish]')?.addEventListener('click', async () => {
      await saveEvent({ publish: true, forceStatus: 'draft' });
    });
  }

  function wireTierControls() {
    $('[data-tier-add]')?.addEventListener('click', () => {
      addTierRow({ name: 'New tier', price: '0.00', quantity_total: 100 });
    });

    document.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-tier-delete]');
      if (!deleteBtn) return;
      e.preventDefault();
      const row = deleteBtn.closest('[data-tier-row]');
      const id = row?.dataset.ticketTypeId;

      if (id) {
        if (!confirm('Delete this ticket tier?')) return;
        try {
          setBusy(true);
          await api().fetch(`/organizer/ticket-types/${id}`, { method: 'DELETE' });
          window.tkToast?.('Ticket tier deleted');
          row.remove();
          await refreshSelectedEvent();
          await loadEvents(state.selectedEvent?.id);
        } catch (err) {
          window.tkToast?.(err.message || 'Ticket tier delete failed', 'error');
        } finally {
          setBusy(false);
        }
        return;
      }

      const rows = $$('[data-tier-row]');
      if (rows.length <= 1) {
        window.tkToast?.('At least one ticket tier is required.', 'info');
        return;
      }
      row?.remove();
    });

    document.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-event-edit]');
      if (!editBtn) return;
      e.preventDefault();
      await selectEvent(Number(editBtn.dataset.eventEdit));
    });
  }

  function wireImageUpload() {
    const area = $('[data-organizer-upload-area]');
    const input = $('[data-organizer-image-input]');

    $('[data-organizer-browse-image]')?.addEventListener('click', (e) => {
      e.preventDefault();
      input?.click();
    });

    input?.addEventListener('change', () => {
      setPendingImages(Array.from(input.files || []));
    });

    area?.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.style.borderColor = 'rgba(91,140,255,.65)';
    });

    area?.addEventListener('dragleave', () => {
      area.style.borderColor = '';
    });

    area?.addEventListener('drop', (e) => {
      e.preventDefault();
      area.style.borderColor = '';
      const files = Array.from(e.dataTransfer?.files || []);
      if (!files.length) return;
      setPendingImages(files);
    });

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-image-delete]');
      if (!btn) return;
      e.preventDefault();
      if (!confirm('Delete this event image?')) return;
      try {
        setBusy(true);
        await api().fetch(`/organizer/event-images/${btn.dataset.imageDelete}`, { method: 'DELETE' });
        window.tkToast?.('Image deleted');
        await refreshSelectedEvent();
        await loadEvents(state.selectedEvent?.id);
      } catch (err) {
        window.tkToast?.(err.message || 'Image delete failed', 'error');
      } finally {
        setBusy(false);
      }
    });

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-image-primary]');
      if (!btn) return;
      e.preventDefault();
      try {
        setBusy(true);
        await api().fetch(`/organizer/event-images/${btn.dataset.imagePrimary}`, {
          method: 'PATCH',
          body: { is_primary: true, type: 'banner' },
        });
        window.tkToast?.('Primary image updated');
        await refreshSelectedEvent();
        await loadEvents(state.selectedEvent?.id);
      } catch (err) {
        window.tkToast?.(err.message || 'Image update failed', 'error');
      } finally {
        setBusy(false);
      }
    });
  }

  function wireEventActions() {
    $('[data-organizer-new-event]')?.addEventListener('click', () => {
      resetForm();
      $('#create')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('[data-organizer-delete-event]')?.addEventListener('click', async () => {
      if (!state.selectedEvent) return;
      if (!confirm('Delete this event? Events with tickets or orders must be moved to draft or cancelled instead.')) return;
      try {
        setBusy(true);
        await api().fetch(`/organizer/events/${state.selectedEvent.id}`, { method: 'DELETE' });
        window.tkToast?.('Event deleted');
        resetForm();
        await Promise.all([loadEvents(), loadDashboard()]);
      } catch (err) {
        window.tkToast?.(err.message || 'Event delete failed', 'error');
      } finally {
        setBusy(false);
      }
    });
  }

  function wireUtilityActions() {
    document.querySelectorAll('[data-organizer-range]').forEach((button) => {
      button.addEventListener('click', async () => {
        document.querySelectorAll('[data-organizer-range]').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        try {
          await loadCharts();
          window.tkToast?.(`Analytics refreshed for ${button.textContent.trim()}`);
        } catch (err) {
          window.tkToast?.(err.message || 'Analytics refresh failed', 'error');
        }
      });
    });

    $('[data-organizer-open-camera]')?.addEventListener('click', () => {
      window.tkToast?.('Camera scanning needs a browser camera/QR implementation. Use manual ticket validation APIs for now.', 'info');
    });
  }

  async function selectEvent(id) {
    try {
      setBusy(true);
      const { data } = await api().fetch(`/organizer/events/${id}`);
      fillForm(data);
      $('#create')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      window.tkToast?.(err.message || 'Failed to load event', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function refreshSelectedEvent() {
    if (!state.selectedEvent) return;
    const { data } = await api().fetch(`/organizer/events/${state.selectedEvent.id}`);
    fillForm(data);
  }

  function fillForm(event) {
    const form = $('[data-organizer-event-form]');
    if (!form) return;

    state.selectedEvent = event;
    state.pendingImages = [];
    form.elements.event_id.value = event.id;
    form.elements.title.value = event.title || '';
    form.elements.category.value = event.category || 'Concert';
    form.elements.starts_at.value = toDatetimeLocal(event.starts_at);
    form.elements.venue_name.value = event.venue_name || '';
    form.elements.city.value = event.city || '';
    form.elements.description.value = event.description || '';

    $('[data-organizer-form-title]').textContent = 'Manage event';
    $('[data-organizer-submit]').textContent = 'Save event';
    $('[data-organizer-delete-event]').style.display = '';
    updateStatusButtons(event.status);
    updateImageName(null);

    const wrap = $('[data-organizer-tiers]');
    if (wrap) {
      wrap.innerHTML = '';
      const tiers = event.ticket_types || [];
      if (tiers.length) tiers.forEach(addTierRow);
      else addTierRow({ name: 'General Admission', price: '0.00', quantity_total: 100 });
    }

    renderGallery(event.images || []);
  }

  function resetForm() {
    const form = $('[data-organizer-event-form]');
    if (!form) return;
    state.selectedEvent = null;
    state.pendingImages = [];
    form.reset();
    form.elements.event_id.value = '';
    $('[data-organizer-form-title]').textContent = 'Create event';
    $('[data-organizer-submit]').textContent = 'Create event';
    $('[data-organizer-delete-event]').style.display = 'none';
    updateStatusButtons('draft');
    updateImageName(null);
    renderGallery([]);

    const wrap = $('[data-organizer-tiers]');
    if (wrap) {
      wrap.innerHTML = '';
      addTierRow({ name: 'General Admission', price: '89.00', quantity_total: 5000 });
      addTierRow({ name: 'VIP Pit', price: '320.00', quantity_total: 500 });
    }
  }

  function addTierRow(tier) {
    const wrap = $('[data-organizer-tiers]');
    if (!wrap) return;

    const row = document.createElement('div');
    row.className = 'card-pro p-3 mb-2 d-flex gap-2 align-items-center';
    row.dataset.tierRow = '';
    if (tier.id) row.dataset.ticketTypeId = tier.id;
    row.innerHTML = `<input class="form-control" name="tier_name" value="${u().escapeHtml(tier.name || '')}" aria-label="Tier name"/>
      <input class="form-control" name="tier_price" type="number" min="0" step="0.01" value="${u().escapeHtml(tier.price ?? '0.00')}" style="max-width:100px" aria-label="Tier price"/>
      <input class="form-control" name="tier_quantity" type="number" min="0" step="1" value="${u().escapeHtml(tier.quantity_total ?? 0)}" style="max-width:110px" aria-label="Tier quantity"/>
      <button class="btn btn-glass" type="button" data-tier-delete><i class="bi bi-trash"></i></button>`;
    wrap.appendChild(row);
  }

  function renderGallery(images) {
    const gallery = $('[data-organizer-gallery]');
    if (!gallery) return;

    if (!images.length) {
      gallery.innerHTML = '<div class="col-12 small text-muted-pro">No uploaded images yet.</div>';
      return;
    }

    gallery.innerHTML = images.map((image) => `
      <div class="col-6">
        <div class="card-pro p-2">
          <img src="${u().escapeHtml(image.optimized_url || image.url)}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px"/>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <small class="text-muted-pro">${image.is_primary ? 'Primary' : u().escapeHtml(image.type || 'gallery')}</small>
            <div class="d-flex gap-1">
              <button class="btn btn-glass btn-sm" type="button" data-image-primary="${image.id}" ${image.is_primary ? 'disabled' : ''}>Primary</button>
              <button class="btn btn-glass btn-sm" type="button" data-image-delete="${image.id}"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  async function saveEvent({ publish, forceStatus }) {
    const form = $('[data-organizer-event-form]');
    if (!form || state.busy) return;
    if (!form.reportValidity()) return;

    const tiers = collectTiers();
    if (!tiers.length) {
      window.tkToast?.('Add at least one ticket tier.', 'error');
      return;
    }
    const targetStatus = publish ? 'published' : forceStatus;
    if (targetStatus === 'published' && !tiers.some((tier) => tier.quantity_total > 0 && tier.status !== 'inactive')) {
      window.tkToast?.('Published events need an active ticket tier with inventory.', 'error');
      return;
    }

    try {
      setBusy(true);
      const payload = eventPayload(forceStatus);
      let event = state.selectedEvent;

      if (event) {
        const { data } = await api().fetch(`/organizer/events/${event.id}`, {
          method: 'PATCH',
          body: payload,
        });
        event = data;
      } else {
        const { data } = await api().fetch('/organizer/events', {
          method: 'POST',
          body: { ...payload, status: 'draft' },
        });
        event = data;
      }

      await syncTicketTiers(event.id, tiers);
      await uploadPendingImages(event);

      if (publish) {
        const { data } = await api().fetch(`/organizer/events/${event.id}`, {
          method: 'PATCH',
          body: { status: 'published' },
        });
        event = data;
      }

      state.selectedEvent = event;
      window.tkToast?.(publish ? 'Event published' : 'Event saved');
      await Promise.all([loadEvents(event.id), loadDashboard()]);
    } catch (err) {
      window.tkToast?.(err.message || 'Event save failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  function eventPayload(status) {
    const form = $('[data-organizer-event-form]');
    const fd = new FormData(form);
    return {
      title: String(fd.get('title') || '').trim(),
      category: fd.get('category'),
      description: String(fd.get('description') || '').trim() || null,
      venue_name: String(fd.get('venue_name') || '').trim(),
      city: String(fd.get('city') || '').trim(),
      starts_at: fd.get('starts_at'),
      status,
      visibility: 'public',
      currency: 'USD',
    };
  }

  function collectTiers() {
    return $$('[data-tier-row]').map((row, index) => {
      const name = $('[name="tier_name"]', row)?.value.trim();
      const price = Number($('[name="tier_price"]', row)?.value || 0);
      const quantity = Number($('[name="tier_quantity"]', row)?.value || 0);
      return {
        id: row.dataset.ticketTypeId ? Number(row.dataset.ticketTypeId) : null,
        name,
        price,
        quantity_total: quantity,
        currency: 'USD',
        min_per_order: 1,
        max_per_order: 10,
        status: quantity > 0 ? 'active' : 'inactive',
        sort_order: index + 1,
      };
    }).filter((tier) => {
      if (!tier.name) return false;
      if (Number.isNaN(tier.price) || tier.price < 0) return false;
      if (Number.isNaN(tier.quantity_total) || tier.quantity_total < 0) return false;
      return true;
    });
  }

  async function syncTicketTiers(eventId, tiers) {
    for (const tier of tiers) {
      if (tier.id) {
        await api().fetch(`/organizer/ticket-types/${tier.id}`, {
          method: 'PATCH',
          body: tier,
        });
      } else {
        await api().fetch(`/organizer/events/${eventId}/ticket-types`, {
          method: 'POST',
          body: tier,
        });
      }
    }
  }

  async function uploadPendingImages(event) {
    if (!state.pendingImages.length) return;

    const existingImages = event.images || [];
    for (const [index, image] of state.pendingImages.entries()) {
      const fd = new FormData();
      fd.append('image', image);
      fd.append('type', index === 0 && existingImages.length === 0 ? 'banner' : 'gallery');
      fd.append('is_primary', index === 0 && existingImages.length === 0 ? '1' : '0');
      fd.append('sort_order', String(existingImages.length + index));
      fd.append('alt_text', event.title || 'Event image');

      await api().fetch(`/organizer/events/${event.id}/images`, {
        method: 'POST',
        body: fd,
      });
    }

    state.pendingImages = [];
    updateImageName(null);
  }

  function setPendingImages(files) {
    const validFiles = files.filter((file) => file && file.type.startsWith('image/'));
    if (validFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      window.tkToast?.('Image must be 5MB or smaller.', 'error');
      return;
    }
    state.pendingImages = validFiles;
    updateImageName(validFiles);
  }

  function updateImageName(files) {
    const label = $('[data-organizer-image-name]');
    if (!label) return;
    if (!files || !files.length) {
      label.textContent = 'No images selected';
      return;
    }
    label.textContent = files.length === 1 ? files[0].name : `${files.length} images selected`;
  }

  function updateStatusButtons(status) {
    const draftButton = $('[data-organizer-save-draft]');
    const publishButton = $('[data-organizer-publish]');
    if (draftButton) draftButton.textContent = status === 'published' ? 'Move to draft' : 'Save draft';
    if (publishButton) publishButton.textContent = status === 'published' ? 'Update published' : 'Publish';
  }

  function setBusy(busy) {
    state.busy = busy;
    $$('[data-organizer-event-form] button, [data-organizer-events] button').forEach((button) => {
      button.disabled = busy;
    });
  }

  function toDatetimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }
})();
