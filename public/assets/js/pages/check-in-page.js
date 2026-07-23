(function () {
  "use strict";

  const api = () => window.EventSphereApi;
  const auth = () => window.EventSphereAuth;
  const u = () => window.EventSphereUtils;

  const state = {
    user: null,
    roleBase: "/organizer",
    events: [],
    result: null,
    stats: null,
    logs: [],
    stream: null,
    scanner: null,
    timer: null,
    lastPayload: "",
  };

  const $ = (sel) => document.querySelector(sel);
  const rows = (value) =>
    Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
  const esc = (value) => u().escapeHtml(value ?? "");
  const tr = (key, fallback) => window.t?.(key) || fallback || key;
  const qs = (params) =>
    new URLSearchParams(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && String(value).trim() !== "",
      ),
    ).toString();

  function badge(value) {
    const key = String(value || "unknown").toLowerCase();
    const classKey = key.replace(/\s+/g, "_");
    return `<span class="badge status-badge status-${esc(classKey)}">${esc(key.replace(/_/g, " "))}</span>`;
  }

  function dateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "-"
      : d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  }

  function selectedEventId() {
    return $("[data-scanner-event]")?.value || "";
  }

  function parsePayload(raw) {
    const value = String(raw || "").trim();
    if (!value) return {};
    try {
      const json = JSON.parse(value);
      return { token: json.token || "", ticket_uuid: json.ticket_uuid || json.uuid || "" };
    } catch {
      return value.startsWith("ES-") ? { ticket_code: value } : { token: value };
    }
  }

  async function loadEvents() {
    const endpoint =
      state.roleBase === "/admin"
        ? "/admin/events?per_page=100&sort=newest"
        : state.roleBase === "/scanner"
          ? "/scanner/events"
          : "/organizer/events?per_page=100&sort=newest";
    const res = await api().fetch(endpoint);
    state.events = rows(res.data);
    const select = $("[data-scanner-event]");
    if (select) {
      select.innerHTML =
        `<option value="">${esc(tr("availability.select_event", "Select event"))}</option>` +
        state.events
          .map((event) => `<option value="${event.id}">${esc(event.title)}</option>`)
          .join("");
      const requestedEventId = new URLSearchParams(location.search).get("event_id");
      const hasRequestedEvent = state.events.some(
        (event) => String(event.id) === String(requestedEventId),
      );
      if (hasRequestedEvent) select.value = String(requestedEventId);
      else if (state.events[0]) select.value = String(state.events[0].id);
    }
  }

  async function loadStats() {
    const eventId = selectedEventId();
    let endpoint;
    if (state.roleBase === "/admin") {
      endpoint = `/admin/tickets/check-in-stats${eventId ? `?event_id=${encodeURIComponent(eventId)}` : ""}`;
    } else if (state.roleBase === "/scanner" && eventId) {
      endpoint = `/scanner/events/${eventId}/check-in-stats`;
    } else if (eventId) {
      endpoint = `/organizer/events/${eventId}/check-in-stats`;
    } else {
      state.stats = { tickets_sold: 0, checked_in: 0, remaining: 0 };
      renderStats();
      return;
    }
    const { data } = await api().fetch(endpoint);
    state.stats = data;
    renderStats();
  }

  async function loadLogs() {
    const query = qs({ per_page: 8, event_id: selectedEventId() });
    const res = await api().fetch(`${state.roleBase}/validation-logs${query ? `?${query}` : ""}`);
    state.logs = rows(res.data);
    renderLogs();
  }

  function renderStats() {
    const row = $("[data-scanner-stats]");
    const stats = state.stats || { tickets_sold: 0, checked_in: 0, remaining: 0 };
    if (!row) return;
    row.innerHTML = `
      <div class="col-md-4"><div class="kpi"><div class="label">${esc(tr("events.tickets_sold", "Tickets Sold"))}</div><div class="value">${stats.tickets_sold ?? 0}</div></div></div>
      <div class="col-md-4"><div class="kpi"><div class="label">${esc(tr("events.checked_in", "Checked In"))}</div><div class="value">${stats.checked_in ?? 0}</div></div></div>
      <div class="col-md-4"><div class="kpi"><div class="label">${esc(tr("events.remaining", "Remaining"))}</div><div class="value">${stats.remaining ?? 0}</div></div></div>`;
  }

  function renderLogs() {
    const body = $("[data-scanner-logs]");
    if (!body) return;
    body.innerHTML =
      state.logs
        .map(
          (log) => `
      <tr>
        <td data-label="Result">${badge(log.result)}</td>
        <td data-label="Attendee"><div class="fw-semibold">${esc(log.attendee?.name || "-")}</div><small class="text-muted-pro">${esc(log.attendee?.email || "")}</small></td>
        <td data-label="Ticket">${esc(log.ticket_code || log.ticket_uuid || "-")}</td>
        <td data-label="Time">${dateTime(log.scanned_at)}</td>
      </tr>
    `,
        )
        .join("") ||
      `<tr><td colspan="4"><div class="dashboard-empty"><i class="bi bi-clock-history"></i><div><strong data-i18n="empty.no_scan_history">${esc(tr("empty.no_scan_history", "No scan history yet."))}</strong><span class="d-block text-muted-pro" data-i18n="scanner.no_scans_copy">${esc(tr("scanner.no_scans_copy", "Open an assigned event and start scanning ticket QR codes as guests arrive."))}</span><button class="btn btn-glass btn-sm mt-2" type="button" data-scanner-start data-i18n="buttons.start_scan">${esc(tr("buttons.start_scan", "Start scanning"))}</button></div></div></td></tr>`;
  }

  function renderResult(data) {
    const wrap = $("[data-scanner-result]");
    const validation = data?.validation;
    const ticket = data?.ticket;
    if (!wrap || !validation) return;
    const result = validation.result || "invalid";
    const cls =
      result === "valid" ? "is-valid" : result === "already_used" ? "is-used" : "is-invalid";
    wrap.className = `checkin-result ${cls}`;
    wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="eyebrow">${esc(validation.title || "Scan result")}</div>
          <h5 class="mt-2">${esc(ticket?.attendee?.name || "Unknown attendee")}</h5>
          <p>${esc(validation.reason || "")}</p>
        </div>
        ${badge(result)}
      </div>
      <div class="dashboard-detail-grid mt-3">
        <div><dt>${esc(tr("scanner.attendee", "Attendee"))}</dt><dd>${esc(ticket?.attendee?.name || "-")}</dd></div>
        <div><dt>${esc(tr("scanner.ticket", "Ticket"))}</dt><dd>${esc(ticket?.ticket_type?.name || "-")}</dd></div>
        <div><dt>${esc(tr("scanner.seat", "Seat"))}</dt><dd>${esc(ticket?.seat_label || "-")}</dd></div>
        <div><dt>${esc(tr("events.checked_in", "Checked In"))}</dt><dd>${ticket?.checked_in_at ? dateTime(ticket.checked_in_at) : "-"}</dd></div>
      </div>
      ${validation.can_check_in ? `<button class="btn btn-primary-grad mt-3" type="button" data-scanner-checkin><i class="bi bi-check2-circle me-1"></i>${esc(tr("scanner.check_in", "Check In"))}</button>` : ""}`;
  }

  async function validateTicket(payload, method = "qr") {
    const body = { ...payload, event_id: selectedEventId(), method };
    try {
      const { data } = await api().fetch(`${state.roleBase}/tickets/validate`, {
        method: "POST",
        body,
      });
      state.result = { ...data, payload: body };
      renderResult(state.result);
      await Promise.all([loadStats(), loadLogs()]);
    } catch (err) {
      const message =
        err.originalMessage ||
        err.message ||
        tr("toast.scan_failed", "We couldn’t read this ticket. Try scanning again or use manual lookup.");
      state.result = {
        payload: body,
        validation: {
          result: "invalid",
          title: tr("notifications.invalid_ticket_title", "Ticket not valid"),
          can_check_in: false,
          reason: message,
        },
        ticket: null,
      };
      renderResult(state.result);
      window.tkToast?.(message, "error");
      await loadLogs().catch(() => {});
    }
  }

  async function checkIn() {
    if (!state.result?.payload) return;
    try {
      const { data } = await api().fetch(`${state.roleBase}/tickets/check-in`, {
        method: "POST",
        body: state.result.payload,
      });
      state.result = { ...data, payload: state.result.payload };
      renderResult(state.result);
      window.EventSphereNotifications?.add({
        type: "system",
        title: tr("notifications.check_in_completed_title", "Check-in complete"),
        message: tr(
          "notifications.check_in_completed_message",
          "The ticket is checked in and ready for entry.",
        ),
      });
      window.tkToast?.(tr("toast.ticket_checked_in", "Ticket checked in. The guest is cleared for entry."));
    } catch (err) {
      if (err.payload?.data?.validation) renderResult(err.payload.data);
      else {
        const message =
          err.originalMessage ||
          err.message ||
          tr("toast.check_in_failed", "We couldn’t check in this ticket. It may already be used, cancelled, or for another event.");
        renderResult({
          validation: {
            result: "invalid",
            title: tr("notifications.invalid_ticket_title", "Ticket not valid"),
            can_check_in: false,
            reason: message,
          },
          ticket: null,
        });
      }
      window.tkToast?.(err.message || tr("toast.check_in_failed", "We couldn’t check in this ticket. It may already be used, cancelled, or for another event."), "error");
    }
    await Promise.all([loadStats(), loadLogs()]);
  }

  async function lookup(search) {
    const wrap = $("[data-scanner-lookup-results]");
    if (!wrap) return;
    wrap.innerHTML = `<div class="dashboard-empty" role="status" aria-label="${esc(window.t?.("loading.looking_up_tickets") || "Looking up tickets...")}">${window.EventSphereSkeleton?.dashboardBlock?.(3) || `<span data-i18n="loading.looking_up_tickets">${window.t?.("loading.looking_up_tickets") || "Looking up tickets..."}</span>`}</div>`;
    const query = qs({ q: search, event_id: selectedEventId() });
    const res = await api().fetch(`${state.roleBase}/tickets/lookup${query ? `?${query}` : ""}`);
    const tickets = rows(res.data);
    wrap.innerHTML =
      tickets
        .map(
          (ticket) => `
      <button class="dashboard-mini-row w-100 text-start" type="button" data-scanner-ticket-code="${esc(ticket.ticket_code)}">
        <div><div class="fw-semibold">${esc(ticket.attendee?.name || "Guest")}</div><small>${esc(ticket.event?.title || "-")} · ${esc(ticket.order?.order_number || "-")}</small></div>
        ${badge(ticket.status)}
      </button>
    `,
        )
        .join("") ||
      `<div class="dashboard-empty"><i class="bi bi-search"></i><div><strong data-i18n="empty.no_search_results">${window.t?.("empty.no_search_results") || "No search results for that query."}</strong><span class="d-block" data-i18n="organizer.ticket_lookup_empty_copy">${window.t?.("organizer.ticket_lookup_empty_copy") || "Try a ticket code, attendee name, email, or order number."}</span><button class="btn btn-glass btn-sm mt-2" type="button" data-scanner-clear-search data-i18n="empty.clear_search_action">${window.t?.("empty.clear_search_action") || "Clear search"}</button></div></div>`;
  }

  async function startCamera() {
    const video = $("[data-scanner-video]");
    const empty = $("[data-scanner-empty]");
    if (!video) return;
    if (!window.TiketaQrCameraScanner) {
      if (empty)
        empty.innerHTML = `<i class="bi bi-camera-video-off"></i><span>${esc(tr("scanner.camera_not_supported", "Camera QR scanning is not supported in this browser. Use manual lookup."))}</span>`;
      return;
    }
    stopCamera();
    state.scanner = new window.TiketaQrCameraScanner({
      video,
      maxScansPerSecond: 2,
      preferredCamera: "environment",
      onDecode: async (raw) => {
        if (!raw || raw === state.lastPayload) return;
        state.lastPayload = raw;
        await validateTicket(parsePayload(raw), "mobile_scanner").catch((err) =>
          window.tkToast?.(err.message || tr("toast.scan_failed", "We couldn’t read this ticket. Try scanning again or use manual lookup."), "error"),
        );
      },
    });
    await state.scanner.start();
    if (empty) empty.hidden = true;
  }

  function stopCamera() {
    clearInterval(state.timer);
    state.timer = null;
    state.lastPayload = "";
    state.scanner?.stop?.();
    state.scanner = null;
    state.stream?.getTracks?.().forEach((track) => track.stop());
    state.stream = null;
    const video = $("[data-scanner-video]");
    if (video) video.srcObject = null;
    const empty = $("[data-scanner-empty]");
    if (empty) {
      empty.hidden = false;
      empty.innerHTML = `<i class="bi bi-camera-video"></i><span>${esc(tr("scanner.start_camera_or_manual", "Start the camera or use manual lookup."))}</span>`;
    }
  }

  function bind() {
    $("[data-scanner-event]")?.addEventListener("change", async () => {
      state.result = null;
      await Promise.all([loadStats(), loadLogs()]);
    });
    $("[data-scanner-start]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      startCamera().catch((err) => window.tkToast?.(err.message || tr("toast.camera_unavailable", "Camera is unavailable. Use manual lookup."), "error"));
    });
    $("[data-scanner-stop]")?.addEventListener("click", stopCamera);
    $("[data-scanner-manual-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const search = String(new FormData(event.currentTarget).get("q") || "").trim();
      if (search)
        await lookup(search).catch((err) =>
          window.tkToast?.(err.message || tr("toast.lookup_failed", "No matching tickets found. Check the code, attendee name, or order number."), "error"),
        );
    });
    document.addEventListener("click", async (event) => {
      const ticket = event.target.closest("[data-scanner-ticket-code]");
      if (ticket) await validateTicket({ ticket_code: ticket.dataset.scannerTicketCode }, "manual");
      const start = event.target.closest("[data-scanner-start]");
      if (start) {
        await startCamera().catch((err) => window.tkToast?.(err.message || tr("toast.camera_unavailable", "Camera is unavailable. Use manual lookup."), "error"));
        return;
      }
      const clearSearch = event.target.closest("[data-scanner-clear-search]");
      if (clearSearch) {
        const form = $("[data-scanner-manual-form]");
        const input = form?.querySelector("[name='q']");
        if (input) input.value = "";
        const results = $("[data-scanner-lookup-results]");
        if (results) results.innerHTML = "";
        input?.focus();
        return;
      }
      if (event.target.closest("[data-scanner-checkin]")) await checkIn();
    });
    window.addEventListener("beforeunload", stopCamera);
    document.addEventListener("tiketa:language-changed", () => {
      loadEvents().catch(() => {});
      renderStats();
      renderLogs();
      if (state.result) renderResult(state.result);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    state.user = auth().requireAuth(["organizer", "scanner", "admin"], {
      requireApprovedOrganizer: false,
    });
    if (!state.user) return;
    state.roleBase =
      state.user.role === "admin"
        ? "/admin"
        : state.user.role === "scanner"
          ? "/scanner"
          : "/organizer";
    $("[data-admin-back]")?.toggleAttribute("hidden", state.user.role !== "admin");
    $("[data-organizer-back]")?.toggleAttribute("hidden", state.user.role !== "organizer");
    $("[data-scanner-back]")?.toggleAttribute("hidden", state.user.role !== "scanner");
    bind();
    await loadEvents();
    await Promise.all([loadStats(), loadLogs()]);
  });
})();
