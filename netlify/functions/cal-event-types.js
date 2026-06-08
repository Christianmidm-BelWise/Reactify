const { json, calRequest, parseBody, getUsername } = require("./_cal");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    if (event.httpMethod === "GET") {
      const username = event.queryStringParameters?.username || getUsername();
      const path = `/event-types?username=${encodeURIComponent(username)}&sortCreatedAt=desc`;
      const response = await calRequest(path, {
        method: "GET",
        version: "2024-06-14",
        auth: true,
      });
      return json(response.status, response.data);
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (!body) return json(400, { status: "error", error: "Ongeldige JSON body." });
      if (!body.title) return json(400, { status: "error", error: "Titel van afspraaktype ontbreekt." });

      const length = Number(body.lengthInMinutes || 30);
      const payload = {
        title: body.title,
        slug: slugify(body.slug || body.title),
        lengthInMinutes: length,
        lengthInMinutesOptions: [length],
        description: body.description || "",
        disableGuests: true,
        slotInterval: Number(body.slotInterval || length),
        minimumBookingNotice: Number(body.minimumBookingNotice || 60),
        beforeEventBuffer: Number(body.beforeEventBuffer || 0),
        afterEventBuffer: Number(body.afterEventBuffer || 0),
        hidden: Boolean(body.hidden),
        bookingRequiresAuthentication: false,
        interfaceLanguage: "nl",
      };

      if (body.scheduleId) payload.scheduleId = Number(body.scheduleId);

      const response = await calRequest("/event-types", {
        method: "POST",
        body: payload,
        version: "2024-06-14",
        auth: true,
      });
      return json(response.status, response.data);
    }

    return json(405, { status: "error", error: "Method not allowed." });
  } catch (error) {
    return json(500, { status: "error", error: "Cal.com event types request mislukt.", details: error.message });
  }
};
