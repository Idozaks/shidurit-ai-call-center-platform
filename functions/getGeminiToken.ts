import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const body = await req.json();
    const { system_prompt, persona_name, company_name } = body;

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Google AI API key not configured" }, { status: 500 });
    }

    return Response.json({
      apiKey,
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