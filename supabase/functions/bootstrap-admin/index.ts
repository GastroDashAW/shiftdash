import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { email, password } = await req.json();

  // Create user
  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Administrator" },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });

  // Create profile
  await adminClient.from("profiles").insert({
    user_id: newUser.user.id,
    full_name: "Administrator",
    email,
  });

  return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
