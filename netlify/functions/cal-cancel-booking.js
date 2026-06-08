const { json, calRequest, parseBody } = require("./_cal");

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") {
    return json(405, { status: "error", error: "Method not allowed." });
  }

  try {
    const body = parseBody(event) || {};
    const uid = body.uid || body.bookingUid || body.id || event.queryStringParameters?.uid;
    if (!uid) return json(400, { status: "error", error: "Booking uid ontbreekt." });

    const reason = body.cancellationReason || "Verwijderd via Reactify agenda";

    const attempts = [
      { path: `/bookings/${encodeURIComponent(uid)}/cancel`, method: "POST", body: { cancellationReason: reason }, version: "2024-08-13" },
      { path: `/bookings/${encodeURIComponent(uid)}/cancel`, method: "PATCH", body: { cancellationReason: reason }, version: "2024-08-13" },
      { path: `/bookings/${encodeURIComponent(uid)}`, method: "DELETE", body: { cancellationReason: reason }, version: "2024-08-13" },
    ];

    const errors = [];
    for (const attempt of attempts) {
      const response = await calRequest(attempt.path, {
        method: attempt.method,
        body: attempt.body,
        version: attempt.version,
        auth: true,
      });
      if (response.ok) return json(response.status, response.data);
      errors.push({ method: attempt.method, path: attempt.path, status: response.status, data: response.data });
    }

    return json(400, {
      status: "error",
      error: "Cal.com kon deze afspraak niet verwijderen/annuleren.",
      details: errors,
    });
  } catch (error) {
    return json(500, { status: "error", error: "Afspraak verwijderen mislukt.", details: error.message });
  }
};
