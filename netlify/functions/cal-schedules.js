const { json, calRequest, parseBody } = require("./_cal");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    if (event.httpMethod === "GET") {
      const response = await calRequest("/schedules", {
        method: "GET",
        version: "2024-06-11",
        auth: true,
      });
      return json(response.status, response.data);
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (!body) return json(400, { status: "error", error: "Ongeldige JSON body." });
      if (!body.name) return json(400, { status: "error", error: "Naam van beschikbaarheid ontbreekt." });

      const payload = {
        name: body.name,
        timeZone: body.timeZone || "Europe/Brussels",
        isDefault: Boolean(body.isDefault),
        availability: Array.isArray(body.availability) && body.availability.length
          ? body.availability
          : [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], startTime: "09:00", endTime: "17:00" }],
      };

      if (Array.isArray(body.overrides) && body.overrides.length) payload.overrides = body.overrides;

      const response = await calRequest("/schedules", {
        method: "POST",
        body: payload,
        version: "2024-06-11",
        auth: true,
      });
      return json(response.status, response.data);
    }

    return json(405, { status: "error", error: "Method not allowed." });
  } catch (error) {
    return json(500, { status: "error", error: "Cal.com schedules request mislukt.", details: error.message });
  }
};
