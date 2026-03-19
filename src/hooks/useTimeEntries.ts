import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimeEntry } from '@/types';
import { getEndOfMonthString } from '@/lib/date';

export function useTimeEntries({ employeeId, month, year }: { employeeId: string; month: number; year: number }) {
  return useQuery({
    queryKey: ['time-entries', employeeId, year, month],
    queryFn: async (): Promise<TimeEntry[]> => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = getEndOfMonthString(year, month);
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    enabled: !!employeeId,
  });
}
