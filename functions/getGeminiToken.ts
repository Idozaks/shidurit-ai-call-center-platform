import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { system_prompt, persona_name, company_name } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Google AI API key not configured" }, { status: 500 });
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/authTokens?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uses: 1,
          expire_time: expireTime,
          new_session_expire_time: newSessionExpireTime,
        }),
      }
    );

    const rawText = await response.text();
    console.log("Response status:", response.status, "body:", rawText);

    if (!response.ok) {
      return Response.json({ error: "Failed to create ephemeral token", details: rawText }, { status: 500 });
    }

    const tokenData = JSON.parse(rawText);

    return Response.json({
      token: tokenData.name,
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      system_prompt: system_prompt || "",
      persona_name: persona_name || "נועה",
      company_name: company_name || "",
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});