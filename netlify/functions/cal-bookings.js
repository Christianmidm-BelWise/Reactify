const { json, calRequest, parseBody, getUsername } = require("./_cal");

function clean(obj) {
  if (Array.isArray(obj)) return obj.map(clean).filter(v => v !== undefined && v !== null && v !== "");
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const c = clean(v);
      if (c !== undefined && c !== null && c !== "" && !(Array.isArray(c) && !c.length)) out[k] = c;
    }
    return out;
  }
  return obj;
}

function getAttendee(body) {
  const a = body.attendee || {};
  return clean({
    name: a.name || body.name || body.bookingName,
    email: a.email || body.email || body.bookingEmail,
    phoneNumber: a.phoneNumber || a.phone || body.phone || body.bookingPhone,
    timeZone: a.timeZone || body.timeZone || "Europe/Brussels",
    language: a.language || "nl",
  });
}

function buildLocation(body) {
  const type = body.locationType;
  const value = body.locationValue;
  if (!type || type === "cal_video") return undefined;
  if (type === "zoom") return { type: "link", link: value };
  if (type === "address") return { type: "address", address: value };
  if (type === "phone") return { type: "phone", phone: value || body.attendee?.phoneNumber };
  if (type === "custom" || type === "link") return { type: "link", link: value };
  return undefined;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    if (event.httpMethod === "GET") {
      const all = [];
      let cursor = event.queryStringParameters?.cursor || "";
      for (let i = 0; i < 5; i++) {
        const qs = new URLSearchParams();
        qs.set("take", event.queryStringParameters?.take || "100");
        if (cursor) qs.set("cursor", cursor);
        const response = await calRequest(`/bookings?${qs.toString()}`, { method: "GET", version: "2024-08-13", auth: true });
        if (!response.ok) return json(response.status, response.data);
        const data = response.data;
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.bookings) ? data.bookings : [];
        all.push(...items);
        cursor = data?.pagination?.nextCursor || data?.nextCursor || "";
        if (!cursor) return json(200, { ...data, data: all });
      }
      return json(200, { status: "success", data: all });
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (!body) return json(400, { status: "error", error: "Ongeldige JSON body." });
      if (!body.start) return json(400, { status: "error", error: "Startdatum ontbreekt." });
      if (!body.eventTypeId && !body.eventTypeSlug) return json(400, { status: "error", error: "Afspraaktype ontbreekt." });

      const attendee = getAttendee(body);
      if (!attendee.name || !attendee.email) return json(400, { status: "error", error: "Klantnaam en e-mail zijn verplicht voor Cal.com." });

      const common = clean({
        start: new Date(body.start).toISOString(),
        eventTypeId: body.eventTypeId ? Number(body.eventTypeId) : undefined,
        eventTypeSlug: body.eventTypeSlug || undefined,
        username: body.username || getUsername(),
        attendee,
        bookingFieldsResponses: body.bookingFieldsResponses || { title: body.title || "Reactify afspraak", notes: body.notes || "" },
        metadata: { ...(body.metadata || {}), source: body.metadata?.source || "reactify" },
        location: buildLocation(body),
        allowConflicts: Boolean(body.allowConflicts),
        allowBookingOutOfBounds: Boolean(body.allowBookingOutOfBounds),
      });

      const attempts = [
        common,
        clean({ ...common, attendees: [attendee], attendee: undefined }),
        clean({ ...common, location: undefined }),
        clean({ ...common, eventTypeSlug: undefined, username: undefined }),
      ];

      const errors = [];
      for (const payload of attempts) {
        const response = await calRequest("/bookings", { method: "POST", body: payload, version: "2024-08-13", auth: true });
        if (response.ok) return json(response.status, response.data);
        errors.push({ status: response.status, data: response.data, payload });
      }
      return json(400, { status: "error", error: "Cal.com kon de afspraak niet aanmaken.", details: errors });
    }

    return json(405, { status: "error", error: "Method not allowed." });
  } catch (error) {
    return json(500, { status: "error", error: "Cal.com bookings request mislukt.", details: error.message });
  }
};
