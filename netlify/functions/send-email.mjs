// Direct send-email function called by the contact form.
// This works alongside Netlify Forms' built-in submission handling.

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const data = await req.json();

    // Remove hidden fields
    const { "form-name": formName, "bot-field": botField, ...formData } = data;

    // If bot field is filled, this is spam
    if (botField) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log the submission details for Netlify's function logs
    console.log("=== New Contact Form Submission ===");
    console.log(`Naam: ${formData.naam || ""}`);
    console.log(`Bedrijfsnaam: ${formData.bedrijfsnaam || ""}`);
    console.log(`Email: ${formData.email || ""}`);
    console.log(`Telefoon: ${formData.telefoon || ""}`);
    console.log(`Interesse: ${formData.interesse || ""}`);
    console.log(`Bericht: ${formData.bericht || ""}`);
    console.log("==================================");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
