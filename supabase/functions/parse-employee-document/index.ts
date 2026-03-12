import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert file to base64 for AI vision
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const mimeType = file.type || "application/octet-stream";

    const systemPrompt = `Du bist ein Experte für das Auslesen von Personaldokumenten (Arbeitsverträge, Personalformulare, Lohnausweise etc.) im Schweizer Gastronomie-Kontext (L-GAV).

Extrahiere aus dem Dokument alle erkennbaren Mitarbeiterdaten. Gib die Daten als JSON-Array zurück.

Für jeden erkannten Mitarbeiter extrahiere folgende Felder (soweit erkennbar):
- first_name: Vorname
- last_name: Nachname
- employee_type: "fixed" (Monatslohn/Fixangestellt) oder "hourly" (Stundenlohn)
- cost_center: Kostenstelle/Abteilung, einer von: "Geschäftsführung", "Küche", "Service", "Office" (ableiten aus Kontext)
- position: Position, einer von: "GF", "GF-Stv", "Küchenchef", "Koch", "Service", "Office" (ableiten aus Kontext)
- monthly_salary: Monatslohn in CHF (nur bei Fixangestellten)
- hourly_rate: Stundenlohn in CHF (nur bei Stundenlohn)
- weekly_hours: Wochenarbeitsstunden (Standard: 42)
- pensum_percent: Beschäftigungsgrad in % (Standard: 100)
- vacation_days_per_year: Ferientage pro Jahr (Standard: 20)

Wenn ein Feld nicht erkennbar ist, lasse es weg. Gib NUR das JSON-Array zurück, keine zusätzlichen Erklärungen.
Wenn keine Mitarbeiterdaten erkennbar sind, gib ein leeres Array [] zurück.`;

    // Use tool calling for structured output
    const aiPayload: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_employees",
            description: "Extract employee data from the document",
            parameters: {
              type: "object",
              properties: {
                employees: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      first_name: { type: "string" },
                      last_name: { type: "string" },
                      employee_type: { type: "string", enum: ["fixed", "hourly"] },
                      cost_center: { type: "string", enum: ["Geschäftsführung", "Küche", "Service", "Office"] },
                      position: { type: "string", enum: ["GF", "GF-Stv", "Küchenchef", "Koch", "Service", "Office"] },
                      monthly_salary: { type: "number" },
                      hourly_rate: { type: "number" },
                      weekly_hours: { type: "number" },
                      pensum_percent: { type: "number" },
                      vacation_days_per_year: { type: "number" },
                    },
                    required: ["first_name", "last_name"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["employees"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_employees" } },
    };

    // For images and PDFs, use vision (multimodal)
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (isImage || isPdf) {
      aiPayload.messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Analysiere dieses Dokument und extrahiere alle Mitarbeiterdaten.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
            },
          },
        ],
      });
    } else {
      // For text-based documents (Word etc.), decode as text
      const textDecoder = new TextDecoder("utf-8");
      const textContent = textDecoder.decode(new Uint8Array(arrayBuffer));
      aiPayload.messages.push({
        role: "user",
        content: `Analysiere dieses Dokument und extrahiere alle Mitarbeiterdaten:\n\n${textContent}`,
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiPayload),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte später erneut versuchen." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-Kontingent aufgebraucht. Bitte Guthaben aufladen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI-Analyse fehlgeschlagen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();

    // Extract from tool call
    let employees: any[] = [];
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        employees = parsed.employees || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    return new Response(JSON.stringify({ employees }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("parse-employee-document error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unbekannter Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
