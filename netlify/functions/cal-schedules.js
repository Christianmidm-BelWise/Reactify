const { json, calRequest, parseBody } = require("./_cal");

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

function extractSchedules(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.schedules)) return payload.data.schedules;
  if (Array.isArray(payload?.schedules)) return payload.schedules;
  return [];
}

function extractSchedule(payload) {
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  if (payload?.schedule) return payload.schedule;
  return payload || {};
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    if (event.httpMethod === "GET") {
      // /schedules geeft doorgaans alleen samenvattingen terug. Haal daarom
      // ieder schema afzonderlijk op, zodat availability altijd actueel is.
      const listResponse = await calRequest("/schedules", {
        method: "GET",
        version: "2024-06-11",
        auth: true,
      });
      if (!listResponse.ok) return json(listResponse.status, listResponse.data);

      const summaries = extractSchedules(listResponse.data);
      const enriched = await Promise.all(summaries.map(async summary => {
        const id = summary?.id || summary?.scheduleId || summary?.schedule_id;
        if (!id) return summary;

        const detailResponse = await calRequest(`/schedules/${encodeURIComponent(id)}`, {
          method: "GET",
          version: "2024-06-11",
          auth: true,
        });
        if (!detailResponse.ok) return summary;

        const detail = extractSchedule(detailResponse.data);
        return {
          ...summary,
          ...detail,
          availability: detail.availability || detail.availabilities || summary.availability || summary.availabilities || [],
          overrides: detail.overrides || summary.overrides || [],
        };
      }));

      return json(200, {
        status: "success",
        data: enriched,
        schedules: enriched,
      });
    }


    if (event.httpMethod === "PATCH") {
      const body = parseBody(event);
      if (!body) return json(400, { status: "error", error: "Ongeldige JSON body." });
      const id = body.id || body.scheduleId || body.schedule_id || event.queryStringParameters?.id;
      if (!id) return json(400, { status: "error", error: "Beschikbaarheidsschema ontbreekt." });
      const availability = Array.isArray(body.availability) ? body.availability : undefined;
      const payload = clean({
        name: body.name,
        timeZone: body.timeZone || body.time_zone,
        isDefault: typeof body.isDefault === "boolean" ? body.isDefault : undefined,
        availability,
        overrides: Array.isArray(body.overrides) ? body.overrides : undefined,
      });
      const response = await calRequest(`/schedules/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: payload,
        version: "2024-06-11",
        auth: true,
      });
      return json(response.status, response.data);
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (!body) return json(400, { status: "error", error: "Ongeldige JSON body." });
      if (!body.name) return json(400, { status: "error", error: "Naam van beschikbaarheid ontbreekt." });
      const availability = Array.isArray(body.availability) && body.availability.length
        ? body.availability
        : [{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], startTime: "09:00", endTime: "17:00" }];
      const payload = clean({
        name: body.name,
        timeZone: body.timeZone || "Europe/Brussels",
        isDefault: Boolean(body.isDefault),
        availability,
        overrides: Array.isArray(body.overrides) ? body.overrides : undefined,
      });
      const response = await calRequest("/schedules", { method: "POST", body: payload, version: "2024-06-11", auth: true });
      return json(response.status, response.data);
    }

    return json(405, { status: "error", error: "Method not allowed." });
  } catch (error) {
    return json(500, { status: "error", error: "Cal.com schedules request mislukt.", details: error.message });
  }
};
