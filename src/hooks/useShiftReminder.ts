import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getSwissDateString } from '@/lib/date';

interface ShiftInfo {
  startTime: string;
  endTime: string;
  shiftName: string;
}

export function useShiftReminder() {
  const { employeeId } = useAuth();
  const [banner, setBanner] = useState<{ type: 'start' | 'end'; message: string } | null>(null);

  useEffect(() => {
    if (!employeeId) return;

    const check = async () => {
      const today = getSwissDateString();
      const now = new Date();
      const swissNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
      const currentMinutes = swissNow.getHours() * 60 + swissNow.getMinutes();

      // Get today's assignments for this employee
      const { data: assignments } = await supabase
        .from('schedule_assignments')
        .select('shift_type_id')
        .eq('employee_id', employeeId)
        .eq('date', today);

      if (!assignments?.length) { setBanner(null); return; }

      const shiftTypeIds = assignments.map(a => a.shift_type_id);
      const { data: shifts } = await supabase
        .from('shift_types')
        .select('name, start_time, end_time')
        .in('id', shiftTypeIds);

      if (!shifts?.length) { setBanner(null); return; }

      // Check if clocked in today
      const { data: entries } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out')
        .eq('employee_id', employeeId)
        .eq('date', today);

      const isClockedIn = entries?.some(e => e.clock_in && !e.clock_out);
      const hasClockedIn = entries?.some(e => e.clock_in);

      for (const shift of shifts) {
        if (!shift.start_time || !shift.end_time) continue;
        const [sh, sm] = shift.start_time.split(':').map(Number);
        const [eh, em] = shift.end_time.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        // 5 minutes before start, employee hasn't clocked in
        if (!hasClockedIn && currentMinutes >= startMin - 5 && currentMinutes <= startMin + 15) {
          const diff = startMin - currentMinutes;
          setBanner({
            type: 'start',
            message: diff > 0
              ? `⏰ Deine Schicht "${shift.name}" beginnt in ${diff} Minuten – jetzt einstempeln!`
              : `⏰ Deine Schicht "${shift.name}" hat begonnen – jetzt einstempeln!`,
          });
          return;
        }

        // Near shift end, still clocked in
        if (isClockedIn && currentMinutes >= endMin - 5 && currentMinutes <= endMin + 15) {
          setBanner({
            type: 'end',
            message: `🔔 Deine Schicht "${shift.name}" endet bald – vergiss nicht auszustempeln!`,
          });
          return;
        }
      }

      setBanner(null);
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [employeeId]);

  return banner;
}
