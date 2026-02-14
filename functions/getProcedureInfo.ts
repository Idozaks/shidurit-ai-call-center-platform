import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const { procedureName } = await req.json();
    if (!procedureName) {
      return Response.json({ error: "Missing procedureName" }, { status: 400 });
    }

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Google AI API key not configured" }, { status: 500 });
    }

    const prompt = `תן מידע רפואי כללי על הפרוצדורה/טיפול: "${procedureName}".
כתוב בעברית, בצורה ברורה ונגישה ללקוח שאינו רופא.

כלול את הסעיפים הבאים:
1. תיאור כללי - מהו הטיפול ומה מטרתו
2. למי זה מתאים - אינדיקציות עיקריות
3. מהלך הטיפול - מה קורה בזמן הטיפול
4. משך הטיפול - כמה זמן זה לוקח בממוצע
5. תקופת החלמה - מה צפוי אחרי הטיפול
6. יתרונות עיקריים

חשוב: זהו מידע כללי בלבד ואינו מהווה ייעוץ רפואי. יש להתייעץ עם רופא מומחה.

Return a JSON object with this structure:
{
  "description": "תיאור כללי",
  "suitable_for": "למי מתאים",
  "process": "מהלך הטיפול",
  "duration": "משך הטיפול",
  "recovery": "תקופת החלמה",
  "benefits": ["יתרון 1", "יתרון 2", ...]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                description: { type: "STRING" },
                suitable_for: { type: "STRING" },
                process: { type: "STRING" },
                duration: { type: "STRING" },
                recovery: { type: "STRING" },
                benefits: { type: "ARRAY", items: { type: "STRING" } }
              }
            }
          }
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return Response.json({ error: "Gemini API error" }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(text);
    
    return Response.json(result);
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});