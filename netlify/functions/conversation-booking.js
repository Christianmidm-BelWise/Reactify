const { json } = require("./_reactify-backend");
const calBookings = require("./cal-bookings");

exports.handler = async function(event, context) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { status: "error", error: "Method not allowed." });
  return calBookings.handler(event, context);
};
