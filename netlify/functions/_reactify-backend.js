function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id, X-API-Key",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getBackendBase() {
  return (process.env.REACTIFY_BACKEND_URL || process.env.BACKEND_URL || "").replace(/\/$/, "");
}

async function proxy(event, path, { method = event.httpMethod } = {}) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  const base = getBackendBase();
  if (!base) {
    return json(500, {
      status: "error",
      error: "REACTIFY_BACKEND_URL ontbreekt in Netlify environment variables.",
    });
  }

  const qs = event.rawQuery ? `?${event.rawQuery}` : "";
  const headers = { "Content-Type": "application/json" };
  if (event.headers.authorization) headers.Authorization = event.headers.authorization;
  if (event.headers["x-tenant-id"]) headers["X-Tenant-Id"] = event.headers["x-tenant-id"];
  if (event.headers["x-api-key"]) headers["X-API-Key"] = event.headers["x-api-key"];

  try {
    const response = await fetch(`${base}${path}${qs}`, {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : event.body,
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { status: response.ok ? "success" : "error", raw: text }; }

    return json(response.status, data);
  } catch (error) {
    return json(502, { status: "error", error: "Backend proxy mislukt.", details: error.message });
  }
}

module.exports = { json, proxy };
