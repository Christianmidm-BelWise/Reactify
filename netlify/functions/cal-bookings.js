exports.handler = async function () {
  try {
    const apiKey = process.env.CAL_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "CAL_API_KEY ontbreekt in Netlify environment variables.",
        }),
      };
    }

    const response = await fetch("https://api.cal.com/v2/bookings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "cal-api-version": "2024-08-13",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Cal.com API error",
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Kon Cal.com bookings niet ophalen.",
        details: error.message,
      }),
    };
  }
};
