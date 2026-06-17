const API_BASE = "https://api.cal.com/v2";

function getApiKey() {
  return process.env.CAL_API_KEY;
}

function getUsername() {
  return process.env.CAL_USERNAME || "christian-damian-62o7zs";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

async function calRequest(path, { method = "GET", body, version = "2024-08-13", auth = true } = {}) {
  const apiKey = getApiKey();
  if (auth && !apiKey) {
    return { ok: false, status: 500, data: { status: "error", error: "CAL_API_KEY ontbreekt in Netlify environment variables." } };
  }

  const headers = {
    "Content-Type": "application/json",
    "cal-api-version": version,
  };

  if (auth) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch (error) {
    data = { status: "error", error: "Kon Cal.com response niet lezen.", details: error.message };
  }

  return { ok: response.ok, status: response.status, data };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return null;
  }
}

module.exports = { json, calRequest, parseBody, getUsername };
