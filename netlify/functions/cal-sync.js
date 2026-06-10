(function () {
  "use strict";

  const API_URL = "/.netlify/functions/cal-bookings";
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

  function clearLegacyAppointments() {
    localStorage.removeItem(LEGACY_LOCAL_APPOINTMENTS);
    const platform = readJSON(PLATFORM_KEY, null);
    if (platform && Array.isArray(platform.appointments) && platform.appointments.length) {
      platform.appointments = [];
      localStorage.setItem(PLATFORM_KEY, JSON.stringify(platform));
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
  };

  function boot() {
    clearLegacyAppointments();
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
