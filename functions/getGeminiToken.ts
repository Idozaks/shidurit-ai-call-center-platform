import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { GoogleGenAI } from 'npm:@google/genai@1.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { system_prompt, persona_name, company_name } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Google AI API key not configured" }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime,
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return Response.json({
      token: token.name,
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      system_prompt: system_prompt || "",
      persona_name: persona_name || "נועה",
      company_name: company_name || "",
    });
  } catch (error) {
    console.error("Error creating token:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});