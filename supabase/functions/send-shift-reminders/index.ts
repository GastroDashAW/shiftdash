import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    webpush.setVapidDetails('mailto:info@gastrodash.ch', vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Swiss time
    const now = new Date();
    const swissFormatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Zurich',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const parts = swissFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    const today = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const currentHour = parseInt(getPart('hour'));
    const currentMinute = parseInt(getPart('minute'));
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Check business settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('push_reminders_enabled, reminder_minutes_before')
      .limit(1)
      .single();

    if (!settings?.push_reminders_enabled) {
      return new Response(JSON.stringify({ message: 'Push reminders disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const reminderMinutes = settings.reminder_minutes_before || 5;

    // Get today's assignments with shift types
    const { data: assignments } = await supabase
      .from('schedule_assignments')
      .select('employee_id, shift_type_id')
      .eq('date', today);

    if (!assignments?.length) {
      return new Response(JSON.stringify({ message: 'No assignments today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shiftTypeIds = [...new Set(assignments.map(a => a.shift_type_id))];
    const { data: shiftTypes } = await supabase
      .from('shift_types')
      .select('id, name, start_time, end_time')
      .in('id', shiftTypeIds);
    const shiftMap = new Map((shiftTypes || []).map(s => [s.id, s]));

    // Get all subscriptions
    const employeeIds = [...new Set(assignments.map(a => a.employee_id))];
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('employee_id, subscription')
      .in('employee_id', employeeIds);
    const subMap = new Map((subscriptions || []).map(s => [s.employee_id, s.subscription]));

    let sent = 0;
    const notifications: any[] = [];
    const expiredSubscriptionUserIds: string[] = [];

    for (const assignment of assignments) {
      const shift = shiftMap.get(assignment.shift_type_id);
      if (!shift?.start_time || !shift?.end_time) continue;

      const sub = subMap.get(assignment.employee_id);
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) continue;

      const [sh, sm] = shift.start_time.split(':').map(Number);
      const [eh, em] = shift.end_time.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      let payload = null;

      // Start reminder
      if (currentTotalMinutes === startMin - reminderMinutes) {
        payload = {
          title: `Schichtbeginn in ${reminderMinutes} Minuten`,
          body: `Deine Schicht "${shift.name}" beginnt um ${shift.start_time.slice(0, 5)} Uhr.`,
          tag: 'shift-start-reminder',
          url: '/clock',
        };
      }

      // End reminder (15 min before)
      if (currentTotalMinutes === endMin - 15) {
        payload = {
          title: 'Schicht endet bald',
          body: `Deine Schicht "${shift.name}" endet um ${shift.end_time.slice(0, 5)} Uhr. Vergiss nicht auszustempeln.`,
          tag: 'shift-end-reminder',
          url: '/clock',
        };
      }

      if (payload) {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload));
          sent++;
          notifications.push({
            employee_id: assignment.employee_id,
            notification_type: payload.tag,
            title: payload.title,
            body: payload.body,
            status: 'sent',
          });
        } catch (err: any) {
          const statusCode = err.statusCode;
          console.error(`[Push] Failed for employee ${assignment.employee_id}: ${statusCode} ${err.message}`);

          // 410 Gone or 404 Not Found → subscription expired/invalid
          if (statusCode === 410 || statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('employee_id', assignment.employee_id);
            console.log(`[Push] Removed expired subscription for employee ${assignment.employee_id}`);
          }

          notifications.push({
            employee_id: assignment.employee_id,
            notification_type: payload.tag,
            title: payload.title,
            body: payload.body,
            status: statusCode === 429 ? 'rate_limited' : 'failed',
          });
        }
      }
    }

    // Log notifications
    if (notifications.length > 0) {
      await supabase.from('notifications_log').insert(notifications);
    }

    return new Response(JSON.stringify({ sent, total: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[send-shift-reminders] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
