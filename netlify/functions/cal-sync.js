(function () {
  "use strict";

  const API_URL = "/.netlify/functions/cal-bookings";
  const CONVERSATIONS_API = "/.netlify/functions/conversations";
  const CACHE_KEY = "reactify.calBookingsCache";
  const CACHE_TIME_KEY = "reactify.calBookingsCacheUpdatedAt";
  const LEGACY_LOCAL_APPOINTMENTS = "reactify.localAppointments";
  const PLATFORM_KEY = "reactify_platform_data_v3";
  const POLL_MS = 30000;
  let busy = false;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writePlatform(data) {
    localStorage.setItem(PLATFORM_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("reactify:data", { detail: data }));
  }

  function normalizePhone(value) {
    let s = String(value || "").trim().replace(/[^0-9+]/g, "");
    if (!s) return "";
    if (s.startsWith("00")) s = "+" + s.slice(2);
    const d = s.replace(/\D/g, "");
    if (d.startsWith("32")) return "+32" + d.slice(2);
    if (d.startsWith("0")) return "+32" + d.slice(1);
    if (d.length === 9 && d.startsWith("4")) return "+32" + d;
    return s.startsWith("+") ? "+" + d : d;
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clearLegacyAppointments() {
    localStorage.removeItem(LEGACY_LOCAL_APPOINTMENTS);
    const platform = readJSON(PLATFORM_KEY, null);
    if (platform && Array.isArray(platform.appointments) && platform.appointments.length) {
      platform.appointments = [];
      writePlatform(platform);
    }
  }

  function normalize(payload) {
    const rows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.bookings)
        ? payload.bookings
        : [];
    return rows.filter((item) => {
      const status = String(item?.status || "accepted").toLowerCase();
      return status === "accepted" || status === "pending";
    });
  }

  function bookingContact(booking) {
    const attendee = Array.isArray(booking?.attendees) ? (booking.attendees[0] || {}) : (booking?.attendee || {});
    const fields = booking?.bookingFieldsResponses || booking?.responses || {};
    const metadata = booking?.metadata || {};
    return {
      name: String(attendee.name || fields.name || booking?.name || metadata.customer_name || "").trim(),
      email: normalizeEmail(attendee.email || fields.email || booking?.email || metadata.customer_email || ""),
      phone: normalizePhone(attendee.phoneNumber || attendee.phone || fields.phoneNumber || fields.phone || booking?.phone || metadata.customer_phone || ""),
    };
  }

  function isUsefulName(name) {
    const value = String(name || "").trim();
    if (!value) return false;
    return value.replace(/\D/g, "").length < 9;
  }

  function syncBookingContacts(bookings) {
    const data = readJSON(PLATFORM_KEY, { clients: [], conversations: [], appointments: [], settings: {} });
    data.clients = Array.isArray(data.clients) ? data.clients : [];
    data.conversations = Array.isArray(data.conversations) ? data.conversations : [];
    let changed = false;
    const backendPatches = [];

    for (const booking of bookings) {
      const info = bookingContact(booking);
      if (!info.name && !info.email && !info.phone) continue;

      let client = data.clients.find((c) =>
        (info.phone && normalizePhone(c.phone) === info.phone) ||
        (info.email && normalizeEmail(c.email) === info.email)
      );

      if (!client) {
        client = {
          id: uid("client"),
          name: isUsefulName(info.name) ? info.name : (info.email || info.phone || "Nieuwe lead"),
          email: info.email,
          phone: info.phone,
          type: "Lead",
          status: "positief",
          sentiment: "positief",
          description: "",
          note: "",
          source: "Cal.com",
          createdAt: new Date().toISOString(),
          updatedAt: booking?.createdAt || booking?.created_at || booking?.start || new Date().toISOString(),
          color: "#5B2E91",
        };
        data.clients.unshift(client);
        changed = true;
      } else {
        const before = JSON.stringify([client.name, client.email, client.phone, client.source]);
        if (isUsefulName(info.name) && (!isUsefulName(client.name) || client.name === client.phone)) client.name = info.name;
        if (info.email) client.email = info.email;
        if (info.phone) client.phone = info.phone;
        client.source = client.source || "Cal.com";
        client.updatedAt = booking?.updatedAt || booking?.updated_at || booking?.start || new Date().toISOString();
        if (JSON.stringify([client.name, client.email, client.phone, client.source]) !== before) changed = true;
      }

      // Een succesvolle Cal.com-boeking betekent dat de klant geholpen is.
      // Markeer elk gekoppeld gesprek als Afgerond, maar maak geen lege chat aan.
      for (const conversation of data.conversations.filter((c) => c.clientId === client.id)) {
        if (!["afgesloten", "closed", "completed"].includes(String(conversation.status || "").toLowerCase())) {
          conversation.status = "afgesloten";
          conversation.updatedAt = booking?.updatedAt || booking?.updated_at || booking?.createdAt || booking?.created_at || new Date().toISOString();
          conversation.ai = conversation.ai || {};
          conversation.ai.summary = "De afspraak is succesvol ingepland.";
          conversation.ai.recommendedAction = "Geen verdere actie nodig. Het gesprek is afgerond.";
          changed = true;
          if (conversation.backendId) backendPatches.push({ conversationId: conversation.backendId, name: info.name, email: info.email, phone: info.phone });
        }
      }
    }

    if (changed) writePlatform(data);

    // Backendstatus ook bewaren zodat alle pagina's dezelfde status zien.
    const uniquePatches = new Map();
    for (const patch of backendPatches) uniquePatches.set(patch.conversationId, patch);
    for (const patch of uniquePatches.values()) {
      fetch(CONVERSATIONS_API, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, status: "afgesloten", aiEnabled: false }),
      }).catch(() => {});
    }
  }

  async function syncCalBookings(options = {}) {
    if (busy) return readJSON(CACHE_KEY, []);
    busy = true;
    try {
      clearLegacyAppointments();
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.status === "error") {
        throw new Error(payload?.error || "Cal.com-afspraken konden niet worden geladen.");
      }
      const bookings = normalize(payload);
      localStorage.setItem(CACHE_KEY, JSON.stringify(bookings));
      localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
      syncBookingContacts(bookings);
      window.dispatchEvent(new CustomEvent("reactify:calbookings", { detail: { bookings } }));
      return bookings;
    } catch (error) {
      if (!options.silent) console.warn("Cal.com synchronisatie mislukt:", error.message);
      return readJSON(CACHE_KEY, []);
    } finally {
      busy = false;
    }
  }

  window.ReactifyCalSync = {
    sync: syncCalBookings,
    getCached: () => readJSON(CACHE_KEY, []),
    clearLegacyAppointments,
    syncBookingContacts,
  };

  function boot() {
    clearLegacyAppointments();
    const cached = readJSON(CACHE_KEY, []);
    if (cached.length) syncBookingContacts(cached);
    syncCalBookings({ silent: true });
    window.setInterval(() => syncCalBookings({ silent: true }), POLL_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncCalBookings({ silent: true });
    });
    window.addEventListener("focus", () => syncCalBookings({ silent: true }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
