import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduledShift {
  shiftName: string;
  shortCode: string;
  startTime: string | null; // HH:MM format
  endTime: string | null;   // HH:MM format
  color: string;
}

export function useScheduledShift(employeeId: string | null, date?: string) {
  const [shift, setShift] = useState<ScheduledShift | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId) return;

    const targetDate = date || new Date().toISOString().split('T')[0];
    setLoading(true);

    supabase
      .from('schedule_assignments')
      .select('shift_type_id, shift_types(name, short_code, start_time, end_time, color)')
      .eq('employee_id', employeeId)
      .eq('date', targetDate)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.shift_types) {
          const st = data.shift_types as any;
          setShift({
            shiftName: st.name,
            shortCode: st.short_code,
            startTime: st.start_time ? st.start_time.substring(0, 5) : null,
            endTime: st.end_time ? st.end_time.substring(0, 5) : null,
            color: st.color,
          });
        } else {
          setShift(null);
        }
        setLoading(false);
      });
  }, [employeeId, date]);

  return { shift, loading };
}

/**
 * Compare actual clock-in time with scheduled shift start.
 * If clocked in before shift start, return adjusted time (shift start).
 */
export function getAdjustedClockIn(
  actualClockIn: Date,
  shiftStartTime: string | null
): { adjustedTime: Date; wasEarly: boolean } {
  if (!shiftStartTime) return { adjustedTime: actualClockIn, wasEarly: false };

  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  const shiftStart = new Date(actualClockIn);
  shiftStart.setHours(hours, minutes, 0, 0);

  if (actualClockIn < shiftStart) {
    return { adjustedTime: shiftStart, wasEarly: true };
  }

  return { adjustedTime: actualClockIn, wasEarly: false };
}

/**
 * Check if clock-out is after scheduled shift end.
 */
export function checkOvertimeClockOut(
  actualClockOut: Date,
  shiftEndTime: string | null
): { isOvertime: boolean; overtimeMinutes: number; scheduledEnd: Date | null } {
  if (!shiftEndTime) return { isOvertime: false, overtimeMinutes: 0, scheduledEnd: null };

  const [hours, minutes] = shiftEndTime.split(':').map(Number);
  const shiftEnd = new Date(actualClockOut);
  shiftEnd.setHours(hours, minutes, 0, 0);

  if (actualClockOut > shiftEnd) {
    const diffMs = actualClockOut.getTime() - shiftEnd.getTime();
    const overtimeMinutes = Math.ceil(diffMs / (1000 * 60));
    return { isOvertime: true, overtimeMinutes, scheduledEnd: shiftEnd };
  }

  return { isOvertime: false, overtimeMinutes: 0, scheduledEnd: shiftEnd };
}
