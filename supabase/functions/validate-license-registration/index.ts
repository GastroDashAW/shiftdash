import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { getCorsHeaders } from "../_shared/cors.ts";

const InputSchema = z.object({
  license_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ status: "invalid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: license, error } = await supabaseAdmin
      .from("licenses")
      .select("id, email, status, owner_id")
      .eq("id", parsed.data.license_id)
      .maybeSingle();

    if (error || !license) {
      return new Response(JSON.stringify({ status: "invalid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Active licenses are valid for registration – the user still needs to set their password
    // Only block if some other condition applies in the future

    return new Response(JSON.stringify({
      status: "pending",
      email: license.email,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Interner Serverfehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});