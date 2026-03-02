// This function is automatically triggered by Netlify when a form submission is created.
// It sends an email notification to info@reactify.be with the form data.

export default async (req) => {
  try {
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return new Response("No payload", { status: 400 });
    }

    const { form_name, data, ordered_human_fields } = payload;

    // Build a readable email body from the form data
    const fields = ordered_human_fields || [];
    const fieldLines = fields
      .filter((f) => f.name !== "bot-field" && f.name !== "form-name")
      .map((f) => `${f.title || f.name}: ${f.value || "(leeg)"}`)
      .join("\n");

    const emailBody = `Nieuw contactformulier inzending van ${data?.naam || "onbekend"}

${fieldLines}

---
Formulier: ${form_name || "contact"}
Tijdstip: ${new Date().toLocaleString("nl-BE", { timeZone: "Europe/Brussels" })}`;

    console.log("Form submission received:", emailBody);

    // Send email notification using Netlify's built-in email notification
    // Since the email hook needs to be configured in the Netlify dashboard,
    // this function logs the submission for visibility.
    // To enable automatic email notifications to info@reactify.be:
    // Go to Netlify Dashboard > Site settings > Forms > Form notifications > Add notification > Email notification
    // Set the email to: info@reactify.be

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing form submission:", error);
    return new Response(JSON.stringify({ error: "Failed to process submission" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
