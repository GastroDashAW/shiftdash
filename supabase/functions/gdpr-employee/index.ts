import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, employee_id } = body;

    if (!employee_id || typeof employee_id !== "string") {
      return new Response(JSON.stringify({ error: "employee_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export") {
      return await handleExport(supabase, employee_id, corsHeaders);
    } else if (action === "anonymize") {
      return await handleAnonymize(supabase, employee_id, corsHeaders);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use 'export' or 'anonymize'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleExport(supabase: any, employeeId: string, corsHeaders: Record<string, string>) {
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    return new Response(JSON.stringify({ error: "Employee not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch all related data
  const [timeEntries, leaveRequests, monthlySummaries, scheduleAssignments, overtimeVerifications, pushSubs, profile] = await Promise.all([
    supabase.from("time_entries").select("*").eq("employee_id", employeeId).order("date"),
    supabase.from("leave_requests").select("*").eq("employee_id", employeeId).order("start_date"),
    supabase.from("monthly_summaries").select("*").eq("employee_id", employeeId).order("year").order("month"),
    supabase.from("schedule_assignments").select("*").eq("employee_id", employeeId).order("date"),
    supabase.from("overtime_verifications").select("*").eq("employee_id", employeeId).order("created_at"),
    supabase.from("push_subscriptions").select("id, employee_id, created_at").eq("employee_id", employeeId),
    employee.user_id
      ? supabase.from("profiles").select("*").eq("user_id", employee.user_id).single()
      : { data: null },
  ]);

  const exportData = {
    export_date: new Date().toISOString(),
    export_type: "DSGVO Art. 15 – Recht auf Auskunft",
    employee: employee,
    profile: profile.data || null,
    time_entries: timeEntries.data || [],
    leave_requests: leaveRequests.data || [],
    monthly_summaries: monthlySummaries.data || [],
    schedule_assignments: scheduleAssignments.data || [],
    overtime_verifications: overtimeVerifications.data || [],
    push_subscriptions_count: (pushSubs.data || []).length,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAnonymize(supabase: any, employeeId: string, corsHeaders: Record<string, string>) {
  const { data: employee } = await supabase
    .from("employees")
    .select("id, user_id, is_active")
    .eq("id", employeeId)
    .single();

  if (!employee) {
    return new Response(JSON.stringify({ error: "Employee not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (employee.is_active === true) {
    return new Response(JSON.stringify({ error: "Cannot anonymize active employees. Mark as inactive first." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonymizedName = `Gelöscht-${employeeId.substring(0, 6)}`;

  // Delete related data
  await Promise.all([
    supabase.from("push_subscriptions").delete().eq("employee_id", employeeId),
    supabase.from("overtime_verifications").delete().eq("employee_id", employeeId),
    supabase.from("schedule_assignments").delete().eq("employee_id", employeeId),
    supabase.from("leave_requests").delete().eq("employee_id", employeeId),
    supabase.from("notifications_log").delete().eq("employee_id", employeeId),
  ]);

  // Anonymize employee record (keep for historical aggregates)
  await supabase.from("employees").update({
    first_name: anonymizedName,
    last_name: "",
    monthly_salary: null,
    hourly_rate: null,
    vacation_surcharge_percent: null,
    holiday_surcharge_percent: null,
    overtime_balance_hours: 0,
    user_id: null,
    available_days: [],
    allowed_shift_types: [],
  }).eq("id", employeeId);

  // Anonymize time entries (keep hours for accounting, remove notes)
  await supabase.from("time_entries").update({
    notes: null,
    adjusted_clock_in: null,
    adjusted_clock_out: null,
  }).eq("employee_id", employeeId);

  // Delete profile if user_id existed
  if (employee.user_id) {
    await supabase.from("profiles").delete().eq("user_id", employee.user_id);
    // Delete the auth user
    await supabase.auth.admin.deleteUser(employee.user_id);
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Employee data anonymized. Name set to "${anonymizedName}". Related personal data deleted.`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
